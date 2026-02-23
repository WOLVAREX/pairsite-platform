import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createSessionSchema } from "@shared/schema";
import {
  createWhatsAppSession,
  getSessionStatus,
  terminateSession,
  addSessionListener,
  removeSessionListener,
} from "./whatsapp";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/ws")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    let currentSessionId: string | null = null;
    let currentListener: ((event: string, data: any) => void) | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && msg.sessionId) {
          if (currentSessionId && currentListener) {
            removeSessionListener(currentSessionId, currentListener);
          }

          currentSessionId = msg.sessionId;
          currentListener = (event: string, data: any) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event, data, sessionId: currentSessionId }));
            }
          };
          addSessionListener(msg.sessionId, currentListener);

          const status = getSessionStatus(msg.sessionId);
          if (status) {
            ws.send(JSON.stringify({ event: "status", data: status, sessionId: msg.sessionId }));
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    ws.on("close", () => {
      if (currentSessionId && currentListener) {
        removeSessionListener(currentSessionId, currentListener);
      }
    });
  });

  app.post("/api/generate-session", async (req, res) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { method, phoneNumber } = parsed.data;

      if (method === "pairing" && (!phoneNumber || phoneNumber.replace(/[^0-9]/g, "").length < 10)) {
        return res.status(400).json({ error: "Valid phone number with country code is required for pairing method" });
      }

      log(`Creating ${method} session${phoneNumber ? ` for ${phoneNumber}` : ""}`, "whatsapp");

      const session = await createWhatsAppSession(method, phoneNumber);

      return res.json({
        sessionId: session.sessionId,
        pairingCode: session.pairingCode,
        qrCode: session.qrCode,
        status: session.status,
        message: method === "pairing"
          ? "Connecting to WhatsApp servers... Pairing code will be sent via WebSocket."
          : "Connecting to WhatsApp servers... QR code will be sent via WebSocket.",
      });
    } catch (err: any) {
      log(`Error creating session: ${err.message}`, "whatsapp");
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/session/:sessionId/status", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const status = getSessionStatus(sessionId);

      if (!status) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.json({
        status: status.status,
        sessionId: status.sessionId,
        pairingCode: status.pairingCode,
        qrCode: status.qrCode,
        credentialsBase64: status.credentialsBase64,
        message: getStatusMessage(status.status),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/terminate-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const deleted = await terminateSession(sessionId);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.json({ success: true, message: "Session terminated and cleanup complete" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  return httpServer;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "pending": return "Waiting for connection...";
    case "connecting": return "Establishing WhatsApp link...";
    case "connected": return "Successfully connected to WhatsApp";
    case "failed": return "Connection failed. Please try again.";
    case "terminated": return "Session has been terminated.";
    default: return "Unknown status";
  }
}
