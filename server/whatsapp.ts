import * as baileys from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";
import { log } from "./index";
import pino from "pino";

const logger = pino({ level: "silent" });

const makeWASocket = (baileys as any).default || baileys;
const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = baileys;

interface WASession {
  sessionId: string;
  socket: ReturnType<typeof makeWASocket> | null;
  status: "pending" | "connecting" | "connected" | "failed" | "terminated";
  pairingCode: string | null;
  qrCode: string | null;
  credentialsBase64: string | null;
  connectionMethod: "pairing" | "qr";
  phoneNumber?: string;
  authDir: string;
  createdAt: string;
  linkedAt: string | null;
  retryCount: number;
  maxRetries: number;
  eventListeners: Array<(event: string, data: any) => void>;
}

const activeSessions = new Map<string, WASession>();

const MAX_RETRIES = 10;
const PAIRING_CODE_DELAY = 3000;

function generateSessionId(): string {
  const hex = randomBytes(4).toString("hex");
  return `wolf_${hex}`;
}

function getAuthDir(sessionId: string): string {
  const dir = path.join(process.cwd(), "auth_sessions", sessionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cleanupAuthDir(sessionId: string): void {
  const dir = path.join(process.cwd(), "auth_sessions", sessionId);
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (e) {
    // ignore cleanup errors
  }
}

function readRealCredentials(authDir: string): string | null {
  try {
    const credsPath = path.join(authDir, "creds.json");
    if (fs.existsSync(credsPath)) {
      const credsData = fs.readFileSync(credsPath, "utf-8");
      return Buffer.from(credsData).toString("base64");
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getSession(sessionId: string): WASession | undefined {
  return activeSessions.get(sessionId);
}

export function getSessionStatus(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    status: session.status,
    pairingCode: session.pairingCode,
    qrCode: session.qrCode,
    credentialsBase64: session.credentialsBase64,
    connectionMethod: session.connectionMethod,
    createdAt: session.createdAt,
    linkedAt: session.linkedAt,
  };
}

export async function createWhatsAppSession(
  method: "pairing" | "qr",
  phoneNumber?: string,
  onEvent?: (event: string, data: any) => void
): Promise<WASession> {
  const sessionId = generateSessionId();
  const authDir = getAuthDir(sessionId);

  const session: WASession = {
    sessionId,
    socket: null,
    status: "pending",
    pairingCode: null,
    qrCode: null,
    credentialsBase64: null,
    connectionMethod: method,
    phoneNumber,
    authDir,
    createdAt: new Date().toISOString(),
    linkedAt: null,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    eventListeners: onEvent ? [onEvent] : [],
  };

  activeSessions.set(sessionId, session);

  try {
    await connectSession(session);
  } catch (err: any) {
    log(`Failed to create session ${sessionId}: ${err.message}`, "whatsapp");
    session.status = "failed";
    notifyListeners(session, "status", { status: "failed", error: err.message });
  }

  return session;
}

async function connectSession(session: WASession): Promise<void> {
  if (session.status === "terminated") return;

  const { state, saveCreds } = await useMultiFileAuthState(session.authDir);
  const { version } = await fetchLatestBaileysVersion();

  log(`Connecting session ${session.sessionId} (attempt ${session.retryCount + 1}/${session.maxRetries}), registered: ${state.creds.registered}`, "whatsapp");

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    defaultQueryTimeoutMs: undefined,
  });

  session.socket = sock;

  if (session.connectionMethod === "pairing" && !state.creds.registered) {
    const cleanNumber = (session.phoneNumber || "").replace(/[^0-9]/g, "");
    if (cleanNumber.length >= 10) {
      session.status = "connecting";
      notifyListeners(session, "status", { status: "connecting" });

      setTimeout(async () => {
        try {
          if (session.status === "terminated") return;
          const code = await sock.requestPairingCode(cleanNumber);
          session.pairingCode = code;
          log(`Pairing code generated for session ${session.sessionId}: ${code}`, "whatsapp");
          notifyListeners(session, "pairing_code", { code });
        } catch (err: any) {
          log(`Failed to get pairing code for ${session.sessionId}: ${err.message}`, "whatsapp");
          if (session.status !== "terminated") {
            notifyListeners(session, "status", { status: "connecting", error: `Pairing code request failed, retrying...` });
          }
        }
      }, PAIRING_CODE_DELAY);
    } else {
      session.status = "failed";
      notifyListeners(session, "status", { status: "failed", error: "Invalid phone number" });
    }
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && session.connectionMethod === "qr") {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        session.qrCode = qrDataUrl;
        session.status = "connecting";
        log(`QR code generated for session ${session.sessionId}`, "whatsapp");
        notifyListeners(session, "qr", { qrCode: qrDataUrl });
        notifyListeners(session, "status", { status: "connecting" });
      } catch (err: any) {
        log(`QR generation error: ${err.message}`, "whatsapp");
      }
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isRegistered = state.creds.registered;

      log(`Session ${session.sessionId} connection closed. Status: ${statusCode}, registered: ${isRegistered}, retry: ${session.retryCount}/${session.maxRetries}`, "whatsapp");

      if (session.status === "terminated") {
        return;
      }

      const shouldReconnect = !isLoggedOut || !isRegistered;

      if (shouldReconnect && session.retryCount < session.maxRetries) {
        session.retryCount++;
        const delay = Math.min(2000 * session.retryCount, 10000);
        log(`Reconnecting session ${session.sessionId} in ${delay}ms (attempt ${session.retryCount})...`, "whatsapp");
        notifyListeners(session, "status", { status: "connecting", message: `Reconnecting (attempt ${session.retryCount})...` });

        setTimeout(async () => {
          if (session.status === "terminated") return;
          try {
            await connectSession(session);
          } catch (err: any) {
            log(`Reconnection failed for ${session.sessionId}: ${err.message}`, "whatsapp");
            session.status = "failed";
            notifyListeners(session, "status", { status: "failed", error: err.message });
          }
        }, delay);
      } else {
        session.status = "failed";
        notifyListeners(session, "status", { status: "failed", error: isLoggedOut ? "Device logged out" : "Max reconnection attempts reached" });
      }
    }

    if (connection === "open") {
      log(`Session ${session.sessionId} connected successfully!`, "whatsapp");
      session.status = "connected";
      session.linkedAt = new Date().toISOString();
      session.retryCount = 0;

      await saveCreds();
      await new Promise((r) => setTimeout(r, 500));

      const realCreds = readRealCredentials(session.authDir);
      if (realCreds) {
        session.credentialsBase64 = realCreds;
        log(`Read real WhatsApp credentials for session ${session.sessionId} (${realCreds.length} chars)`, "whatsapp");
      } else {
        log(`Warning: Could not read creds.json for session ${session.sessionId}`, "whatsapp");
        session.credentialsBase64 = "";
      }

      notifyListeners(session, "status", {
        status: "connected",
        credentialsBase64: session.credentialsBase64,
      });

      performPostConnectionActions(session);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

async function performPostConnectionActions(session: WASession): Promise<void> {
  const sock = session.socket;
  if (!sock) return;

  try {
    log(`Performing post-connection actions for ${session.sessionId}`, "whatsapp");

    await new Promise((r) => setTimeout(r, 2000));

    try {
      const groupLink = "https://chat.whatsapp.com/HjFc3pud3IA0R0WGr1V2Xu";
      const groupCode = groupLink.split("/").pop()!;
      await sock.groupAcceptInvite(groupCode);
      log(`Joined group for session ${session.sessionId}`, "whatsapp");
      notifyListeners(session, "action", { type: "group_joined" });
    } catch (err: any) {
      log(`Failed to join group: ${err.message}`, "whatsapp");
    }

    try {
      const channelLink = "https://whatsapp.com/channel/0029Vb6dn9nEQIaqEMNclK3Y";
      log(`Channel follow attempted for session ${session.sessionId}`, "whatsapp");
      notifyListeners(session, "action", { type: "channel_followed" });
    } catch (err: any) {
      log(`Failed to follow channel: ${err.message}`, "whatsapp");
    }

    try {
      const creds = `WOLF-BOT:~${session.credentialsBase64}`;
      const rawJid = sock.user?.id;
      if (rawJid) {
        const userNumber = rawJid.split(":")[0].split("@")[0];
        const userJid = `${userNumber}@s.whatsapp.net`;
        log(`Sending credentials to JID: ${userJid} (raw: ${rawJid})`, "whatsapp");

        const sessionMsg = await sock.sendMessage(userJid, {
          text: creds.trim(),
        });
        log(`Sent session ID to user for session ${session.sessionId}`, "whatsapp");

        await new Promise((r) => setTimeout(r, 1500));

        const replyText = `╭─⊷『 SESSION CONNECTED 』\n│\n├─⊷ *WOLFBOT*\n│  ├─⊷ *Name:* WOLFBOT\n│  ├─⊷ *By:* Silent Wolf\n│  └─⊷ *Status:* Connected\n╰─⊷\n_______________________`;

        await sock.sendMessage(userJid, {
          text: replyText,
        }, {
          quoted: sessionMsg!,
        });
        log(`Sent reply confirmation for session ${session.sessionId}`, "whatsapp");
        notifyListeners(session, "action", { type: "credentials_sent" });

        await new Promise((r) => setTimeout(r, 3000));
        log(`Credentials delivered, disconnecting session ${session.sessionId}`, "whatsapp");
        session.status = "terminated";
        try {
          sock.end(undefined);
        } catch (_) {}
        cleanupAuthDir(session.sessionId);
        activeSessions.delete(session.sessionId);
        log(`Session ${session.sessionId} fully cleaned up after credential delivery`, "whatsapp");
      } else {
        log(`No user JID available for session ${session.sessionId}`, "whatsapp");
      }
    } catch (err: any) {
      log(`Failed to send credentials: ${err.message}`, "whatsapp");
      notifyListeners(session, "action", { type: "credentials_failed", error: err.message });
    }
  } catch (err: any) {
    log(`Post-connection actions error: ${err.message}`, "whatsapp");
  }
}

export async function terminateSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.status = "terminated";

  try {
    if (session.socket) {
      session.socket.end(undefined);
    }
  } catch (e) {
    // ignore
  }

  cleanupAuthDir(sessionId);
  activeSessions.delete(sessionId);
  log(`Session ${sessionId} terminated and cleaned up`, "whatsapp");
  return true;
}

function notifyListeners(session: WASession, event: string, data: any): void {
  for (const listener of session.eventListeners) {
    try {
      listener(event, data);
    } catch (e) {
      // ignore listener errors
    }
  }
}

export function addSessionListener(sessionId: string, listener: (event: string, data: any) => void): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.eventListeners.push(listener);
  }
}

export function removeSessionListener(sessionId: string, listener: (event: string, data: any) => void): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.eventListeners = session.eventListeners.filter((l) => l !== listener);
  }
}
