import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SessionResponse, SessionStatus } from "@shared/schema";
import {
  ArrowUpRight,
  Copy,
  Check,
  Wifi,
  QrCode,
  Shield,
  Zap,
  Terminal,
  RefreshCw,
  Trash2,
  Activity,
  Hash,
  Smartphone,
  Link2,
  ExternalLink,
  Rocket,
  AlertCircle,
  Loader2,
  Bot,
} from "lucide-react";
import { SiWhatsapp, SiGithub } from "react-icons/si";

function GlassCard({
  children,
  className = "",
  hoverable = false,
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`relative backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl transition-all duration-300 ${
        hoverable ? "hover:border-green-500/40 hover:scale-[1.02] group" : ""
      } ${className}`}
      style={{ boxShadow: "0 0 40px rgba(0, 255, 0, 0.08)" }}
    >
      {children}
    </div>
  );
}

function GlowText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-green-400 ${className}`} style={{ textShadow: "0 0 20px rgba(0, 255, 0, 0.5)" }}>
      {children}
    </span>
  );
}

function PulsingDot({ status }: { status: SessionStatus }) {
  const colorMap: Record<SessionStatus, string> = {
    pending: "bg-yellow-400",
    connecting: "bg-blue-400",
    connected: "bg-green-400",
    failed: "bg-red-400",
    terminated: "bg-gray-400",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === "pending" || status === "connecting") && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colorMap[status]}`} />
    </span>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const labelMap: Record<SessionStatus, string> = {
    pending: "Awaiting Connection",
    connecting: "Connecting...",
    connected: "Connected",
    failed: "Failed",
    terminated: "Terminated",
  };
  const colorMap: Record<SessionStatus, string> = {
    pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    connecting: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    connected: "text-green-400 border-green-400/30 bg-green-400/5",
    failed: "text-red-400 border-red-400/30 bg-red-400/5",
    terminated: "text-gray-400 border-gray-400/30 bg-gray-400/5",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs tracking-wider ${colorMap[status]}`}
      data-testid="badge-session-status"
    >
      <PulsingDot status={status} />
      {labelMap[status]}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <GlassCard hoverable className="p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 shrink-0">
          <Icon className="w-5 h-5 text-green-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-mono text-sm font-semibold mb-1">{title}</h3>
          <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-green-500/40 group-hover:text-green-400 transition-all duration-300 group-hover:rotate-45 shrink-0 mt-1" />
      </div>
    </GlassCard>
  );
}

function LogEntry({ text, type = "info" }: { text: string; type?: "info" | "success" | "error" | "warning" }) {
  const colors = {
    info: "text-gray-500",
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  };
  return (
    <div className={`font-mono text-[10px] ${colors[type]} flex items-start gap-2`}>
      <span className="text-gray-700 shrink-0">{new Date().toLocaleTimeString()}</span>
      <span>{text}</span>
    </div>
  );
}

function useWebSocket(sessionId: string | null) {
  const [wsData, setWsData] = useState<{
    status: SessionStatus;
    pairingCode: string | null;
    qrCode: string | null;
    credentialsBase64: string | null;
  } | null>(null);
  const [logs, setLogs] = useState<Array<{ text: string; type: "info" | "success" | "error" | "warning" }>>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = useCallback((text: string, type: "info" | "success" | "error" | "warning" = "info") => {
    setLogs((prev) => [...prev.slice(-20), { text, type }]);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsData(null);
      setLogs([]);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", sessionId }));
      addLog("Connected to server, subscribing to session events...", "info");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.event === "status") {
          setWsData((prev) => ({
            status: msg.data.status || prev?.status || "pending",
            pairingCode: msg.data.pairingCode || prev?.pairingCode || null,
            qrCode: msg.data.qrCode || prev?.qrCode || null,
            credentialsBase64: msg.data.credentialsBase64 || prev?.credentialsBase64 || null,
          }));

          if (msg.data.status === "connected") {
            addLog("WhatsApp linked successfully!", "success");
          } else if (msg.data.status === "failed") {
            addLog(`Connection failed: ${msg.data.error || "Unknown error"}`, "error");
          } else if (msg.data.status === "connecting") {
            const detail = msg.data.message || msg.data.error || "Connecting to WhatsApp servers...";
            addLog(detail, "info");
          }
        }

        if (msg.event === "pairing_code") {
          setWsData((prev) => ({
            ...prev!,
            pairingCode: msg.data.code,
          }));
          addLog(`Pairing code received: ${msg.data.code}`, "success");
        }

        if (msg.event === "qr") {
          setWsData((prev) => ({
            ...prev!,
            qrCode: msg.data.qrCode,
          }));
          addLog("QR code generated - scan with WhatsApp", "success");
        }

        if (msg.event === "action") {
          if (msg.data.type === "group_joined") {
            addLog("Auto-joined WOLFBOT group", "success");
          } else if (msg.data.type === "channel_followed") {
            addLog("Auto-followed WOLFBOT channel", "success");
          } else if (msg.data.type === "credentials_sent") {
            addLog("Session credentials sent to your WhatsApp", "success");
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      addLog("WebSocket connection error", "error");
    };

    ws.onclose = () => {
      addLog("Connection to server closed", "warning");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, addLog]);

  return { wsData, logs };
}

export default function Home() {
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<"pairing" | "qr">("pairing");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [initialResponse, setInitialResponse] = useState<SessionResponse | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);

  const { wsData, logs } = useWebSocket(currentSessionId);

  const generateMutation = useMutation({
    mutationFn: async (method: "pairing" | "qr") => {
      const res = await apiRequest("POST", "/api/generate-session", {
        method,
        phoneNumber: method === "pairing" ? phoneNumber : undefined,
      });
      return (await res.json()) as SessionResponse;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      setInitialResponse(data);
      toast({ title: "Session Created", description: `Session ${data.sessionId} initialized` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/terminate-session", {
        sessionId: currentSessionId,
      });
    },
    onSuccess: () => {
      setCurrentSessionId(null);
      setInitialResponse(null);
      setPhoneNumber("");
      toast({ title: "Session Terminated", description: "All session data cleaned up" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = useCallback(
    (text: string, type: "code" | "session") => {
      navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedSession(true);
        setTimeout(() => setCopiedSession(false), 2000);
      }
    },
    []
  );

  const displayStatus: SessionStatus = wsData?.status || initialResponse?.status || "pending";
  const displayPairingCode = wsData?.pairingCode || initialResponse?.pairingCode || null;
  const displayQrCode = wsData?.qrCode || initialResponse?.qrCode || null;
  const displayCredentials = wsData?.credentialsBase64 || null;

  const formatPairingCode = (code: string): string => {
    if (code.length === 8) {
      return `${code.slice(0, 4)}-${code.slice(4)}`;
    }
    return code;
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse, rgba(0,255,0,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(ellipse, rgba(0,255,0,0.2) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <header className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 mb-6">
            <Bot className="w-3.5 h-3.5 text-green-400" />
            <span className="font-mono text-xs text-green-400 tracking-wider" data-testid="text-version">
              v2.0.0-beta
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            <GlowText>WOLF</GlowText>
            <span className="text-white">BOT</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm max-w-md mx-auto leading-relaxed">
            Session ID Generator &amp; WhatsApp Linking Service
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
              <Shield className="w-3 h-3" /> E2E Encrypted
            </span>
            <span className="text-gray-700">|</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
              <Zap className="w-3 h-3" /> Real-time Sync
            </span>
            <span className="text-gray-700">|</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
              <Activity className="w-3 h-3" /> Multi-Device
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
          <div className="md:col-span-3 space-y-6">
            <GlassCard className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Terminal className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white font-mono">WolfBot Pair</h2>
                  <p className="text-xs text-gray-500 font-mono">Initialize a new WhatsApp connection</p>
                </div>
              </div>

              <div className="flex gap-2 mb-6 p-1 rounded-lg bg-black/50 border border-gray-800/50">
                <button
                  data-testid="button-method-pairing"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs transition-all ${
                    activeMethod === "pairing"
                      ? "bg-green-500/15 text-green-400 border border-green-500/30"
                      : "text-gray-500 border border-transparent hover:text-gray-300"
                  }`}
                  onClick={() => setActiveMethod("pairing")}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Pairing Code
                </button>
                <button
                  data-testid="button-method-qr"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs transition-all ${
                    activeMethod === "qr"
                      ? "bg-green-500/15 text-green-400 border border-green-500/30"
                      : "text-gray-500 border border-transparent hover:text-gray-300"
                  }`}
                  onClick={() => setActiveMethod("qr")}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
              </div>

              {activeMethod === "pairing" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                      Phone Number (with country code)
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        data-testid="input-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-800 rounded-lg font-mono text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/40 transition-colors"
                      />
                    </div>
                    <p className="text-gray-600 text-[10px] font-mono mt-1.5">
                      Include country code without + (e.g. 2348012345678)
                    </p>
                  </div>
                </div>
              )}

              {activeMethod === "qr" && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/30 border border-gray-800/50">
                    <QrCode className="w-4 h-4 text-green-500/50" />
                    <p className="text-gray-500 text-xs font-mono">
                      QR code will be generated from WhatsApp servers
                    </p>
                  </div>
                </div>
              )}

              <button
                data-testid="button-generate"
                disabled={generateMutation.isPending || (activeMethod === "pairing" && !phoneNumber) || !!currentSessionId}
                onClick={() => generateMutation.mutate(activeMethod)}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 bg-green-500/10 border border-green-500/30 rounded-lg font-mono text-sm text-green-400 transition-all hover:bg-green-500/20 hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to WhatsApp...
                  </>
                ) : currentSessionId ? (
                  <>
                    <Activity className="w-4 h-4" />
                    Session Active
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Session
                  </>
                )}
              </button>
            </GlassCard>

            {currentSessionId && (
              <GlassCard className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Wifi className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white font-mono">Active Session</h2>
                      <p className="text-xs text-gray-500 font-mono">Real-time WhatsApp connection</p>
                    </div>
                  </div>
                  <StatusBadge status={displayStatus} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                      Session ID
                    </label>
                    <div
                      className="flex items-center justify-between gap-3 p-3 bg-black/50 rounded-lg border border-gray-800/50 cursor-pointer transition-all hover:border-green-500/20"
                      onClick={() => handleCopy(currentSessionId, "session")}
                      data-testid="button-copy-session"
                    >
                      <span className="font-mono text-green-400 text-sm tracking-wider truncate" data-testid="text-session-id">
                        {currentSessionId}
                      </span>
                      {copiedSession ? (
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {displayPairingCode && (
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Pairing Code (alphanumeric)
                      </label>
                      <div
                        className="flex items-center justify-between gap-3 p-4 bg-black/50 rounded-lg border border-green-500/20 cursor-pointer transition-all hover:border-green-500/40"
                        onClick={() => handleCopy(displayPairingCode, "code")}
                        data-testid="button-copy-pairing"
                      >
                        <span
                          className="font-mono text-xl sm:text-2xl md:text-3xl tracking-[0.2em] sm:tracking-[0.3em] font-bold"
                          style={{ color: "#00ff00", textShadow: "0 0 20px rgba(0, 255, 0, 0.4)" }}
                          data-testid="text-pairing-code"
                        >
                          {formatPairingCode(displayPairingCode)}
                        </span>
                        {copied ? (
                          <Check className="w-5 h-5 text-green-400 shrink-0" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-600 text-xs font-mono mt-2">
                        Enter this code in WhatsApp &gt; Linked Devices &gt; Link a Device
                      </p>
                    </div>
                  )}

                  {!displayPairingCode && activeMethod === "pairing" && displayStatus !== "connected" && displayStatus !== "failed" && (
                    <div className="flex items-center justify-center gap-3 p-4 sm:p-6 bg-black/30 rounded-lg border border-gray-800/30">
                      <Loader2 className="w-5 h-5 text-green-400 animate-spin shrink-0" />
                      <span className="text-gray-400 font-mono text-xs sm:text-sm">Requesting pairing code from WhatsApp...</span>
                    </div>
                  )}

                  {displayQrCode && (
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Scan QR Code with WhatsApp
                      </label>
                      <div className="flex justify-center p-6 bg-white rounded-lg">
                        <img
                          src={displayQrCode}
                          alt="WhatsApp QR Code"
                          className="w-48 h-48 sm:w-56 sm:h-56"
                          data-testid="img-qr-code"
                        />
                      </div>
                      <p className="text-gray-600 text-xs font-mono mt-2 text-center">
                        Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Scan QR
                      </p>
                    </div>
                  )}

                  {!displayQrCode && activeMethod === "qr" && displayStatus !== "connected" && displayStatus !== "failed" && (
                    <div className="flex items-center justify-center gap-3 p-4 sm:p-6 bg-black/30 rounded-lg border border-gray-800/30">
                      <Loader2 className="w-5 h-5 text-green-400 animate-spin shrink-0" />
                      <span className="text-gray-400 font-mono text-xs sm:text-sm">Generating QR code from WhatsApp servers...</span>
                    </div>
                  )}

                  {displayStatus === "connected" && displayCredentials && (
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Session Credentials
                      </label>
                      <div className="p-3 bg-black/50 rounded-lg border border-green-500/20">
                        <code className="font-mono text-xs text-green-400/80 break-all leading-relaxed" data-testid="text-credentials">
                          WOLF-BOT:~{displayCredentials}
                        </code>
                      </div>
                    </div>
                  )}

                  {displayStatus === "failed" && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-red-400 font-mono text-sm font-medium">Connection Failed</p>
                        <p className="text-red-400/60 font-mono text-xs mt-0.5">Terminate and try again with a valid number</p>
                      </div>
                    </div>
                  )}
                </div>

                {logs.length > 0 && (
                  <div className="mt-5 p-3 bg-black/50 rounded-lg border border-gray-800/30 max-h-32 overflow-y-auto">
                    <label className="block text-gray-500 text-[10px] uppercase tracking-wider font-mono mb-2">
                      Connection Log
                    </label>
                    <div className="space-y-1" data-testid="connection-log">
                      {logs.map((log, i) => (
                        <LogEntry key={i} text={log.text} type={log.type} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6 flex-wrap">
                  <button
                    data-testid="button-terminate"
                    onClick={() => terminateMutation.mutate()}
                    disabled={terminateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/5 border border-red-500/20 rounded-lg font-mono text-xs text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/30"
                  >
                    {terminateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Terminate Session
                  </button>
                </div>
              </GlassCard>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Link2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-mono">Quick Links</h2>
                  <p className="text-xs text-gray-500 font-mono">Resources & Deploy</p>
                </div>
              </div>
              <div className="space-y-3">
                <a
                  href="/analytics"
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg bg-black/30 border border-green-500/20 transition-all duration-200 hover:border-green-500/40 hover:bg-green-500/5 group cursor-pointer"
                  data-testid="link-analytics"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-mono font-medium">Live Analytics</p>
                    <p className="text-gray-500 text-[10px] font-mono truncate">Real-time session monitoring</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors shrink-0" />
                </a>
                <a
                  href="https://github.com/7silent-wolf/silentwolf.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg bg-black/30 border border-gray-800/30 transition-all duration-200 hover:border-green-500/30 hover:bg-green-500/5 group cursor-pointer"
                  data-testid="link-github-repo"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <SiGithub className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-mono font-medium">Github Repo</p>
                    <p className="text-gray-500 text-[10px] font-mono truncate">7silent-wolf/silentwolf</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors shrink-0" />
                </a>
                <a
                  href="https://inspiring-genie-ebae09.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg bg-black/30 border border-gray-800/30 transition-all duration-200 hover:border-green-500/30 hover:bg-green-500/5 group cursor-pointer"
                  data-testid="link-deploy-wolfbot"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-mono font-medium">Deploy WolfBot</p>
                    <p className="text-gray-500 text-[10px] font-mono truncate">inspiring-genie-ebae09.netlify.app</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors shrink-0" />
                </a>
              </div>
            </GlassCard>

            <div className="space-y-3">
              <FeatureCard
                icon={Shield}
                title="End-to-End Encrypted"
                desc="All session data is encrypted and secure"
              />
              <FeatureCard
                icon={Zap}
                title="Instant Generation"
                desc="Real WhatsApp server connections"
              />
              <FeatureCard
                icon={Activity}
                title="Real-time Status"
                desc="Live WebSocket connection updates"
              />
              <FeatureCard
                icon={SiWhatsapp}
                title="WhatsApp Multi-Device"
                desc="Compatible with multi-device linking"
              />
            </div>

            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-yellow-500/70" />
                <span className="text-xs font-mono text-yellow-500/70 uppercase tracking-wider">Notice</span>
              </div>
              <p className="text-gray-500 text-xs font-mono leading-relaxed">
                This tool connects to real WhatsApp servers via Baileys. Keep your session ID private. Sessions auto-expire after 5 minutes of inactivity.
              </p>
            </GlassCard>
          </div>
        </div>

        <footer className="mt-10 sm:mt-16 text-center border-t border-gray-800/50 pt-6 sm:pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-green-500/40" />
            <span className="font-mono text-xs text-gray-600">WOLFBOT Pair</span>
          </div>
          <p className="text-gray-700 text-[10px] font-mono">
            Built with security in mind. All connections are end-to-end encrypted.
          </p>
        </footer>
      </div>
    </div>
  );
}
