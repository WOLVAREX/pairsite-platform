import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Wifi,
  Activity,
  PowerOff,
  BarChart3,
  ArrowLeft,
  RefreshCw,
  Bot,
  Hash,
  QrCode,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface AnalyticsData {
  connected: number;
  active: number;
  inactive: number;
  totalThisMonth: number;
  sessions: {
    sessionId: string;
    status: "pending" | "connecting" | "connected" | "failed" | "terminated";
    connectionMethod: "pairing" | "qr";
    createdAt: string;
    linkedAt: string | null;
  }[];
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl transition-all duration-300 ${className}`}
      style={{ boxShadow: "0 0 40px rgba(0, 255, 0, 0.06)" }}
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

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: "green" | "blue" | "red" | "yellow";
  isLoading: boolean;
}) {
  const colors = {
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      icon: "text-green-400",
      value: "text-green-400",
      glow: "rgba(0, 255, 0, 0.4)",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: "text-blue-400",
      value: "text-blue-400",
      glow: "rgba(59, 130, 246, 0.4)",
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: "text-red-400",
      value: "text-red-400",
      glow: "rgba(239, 68, 68, 0.4)",
    },
    yellow: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      icon: "text-yellow-400",
      value: "text-yellow-400",
      glow: "rgba(234, 179, 8, 0.4)",
    },
  };

  const c = colors[accent];

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <div
          className={`w-2 h-2 rounded-full animate-pulse`}
          style={{ backgroundColor: c.glow.replace("0.4", "1") }}
        />
      </div>
      {isLoading ? (
        <div className="h-8 w-12 bg-gray-800/60 rounded animate-pulse mb-1" />
      ) : (
        <p
          className={`text-3xl sm:text-4xl font-bold font-mono ${c.value} mb-1`}
          style={{ textShadow: `0 0 20px ${c.glow}` }}
          data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {value}
        </p>
      )}
      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">{label}</p>
    </GlassCard>
  );
}

function StatusBadge({ status }: { status: AnalyticsData["sessions"][0]["status"] }) {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono uppercase tracking-wider">
          <CheckCircle2 className="w-3 h-3" />
          Connected
        </span>
      );
    case "connecting":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono uppercase tracking-wider">
          <Loader2 className="w-3 h-3 animate-spin" />
          Connecting
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-mono uppercase tracking-wider">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-wider">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case "terminated":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-[10px] font-mono uppercase tracking-wider">
          <PowerOff className="w-3 h-3" />
          Terminated
        </span>
      );
    default:
      return null;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Analytics() {
  const { data, isLoading, dataUpdatedAt, refetch, isRefetching } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
    refetchInterval: 3000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, rgba(0,255,0,0.12) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, rgba(0,255,0,0.15) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button
                data-testid="button-back"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-gray-800/50 text-gray-400 hover:text-green-400 hover:border-green-500/30 transition-all font-mono text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight">
                <GlowText>WOLF</GlowText>
                <span className="text-white">BOT</span>
                <span className="text-gray-500 font-normal ml-2">/ Analytics</span>
              </h1>
              <p className="text-gray-600 text-[10px] font-mono mt-0.5">
                Live session tracking — auto-refreshes every 3s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:block text-gray-600 text-[10px] font-mono">
                Updated {lastUpdated}
              </span>
            )}
            <button
              data-testid="button-refresh"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-all font-mono text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Connected"
            value={data?.connected ?? 0}
            icon={Wifi}
            accent="green"
            isLoading={isLoading}
          />
          <StatCard
            label="Active"
            value={data?.active ?? 0}
            icon={Activity}
            accent="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Inactive"
            value={data?.inactive ?? 0}
            icon={PowerOff}
            accent="red"
            isLoading={isLoading}
          />
          <StatCard
            label="Total This Month"
            value={data?.totalThisMonth ?? 0}
            icon={BarChart3}
            accent="yellow"
            isLoading={isLoading}
          />
        </div>

        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-green-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">Live Sessions</h2>
                <p className="text-[10px] text-gray-500 font-mono">All in-memory sessions</p>
              </div>
            </div>
            {!isLoading && data && (
              <span className="text-gray-600 text-[10px] font-mono">
                {data.sessions.length} session{data.sessions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data || data.sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="p-4 rounded-full bg-green-500/5 border border-green-500/10 mb-4">
                <Bot className="w-8 h-8 text-green-500/30" />
              </div>
              <p className="text-gray-500 font-mono text-sm">No active sessions</p>
              <p className="text-gray-700 font-mono text-xs mt-1">
                Sessions will appear here once created
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="text-left px-5 sm:px-6 py-3 text-gray-600 text-[10px] font-mono uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="text-left px-4 py-3 text-gray-600 text-[10px] font-mono uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-gray-600 text-[10px] font-mono uppercase tracking-wider hidden sm:table-cell">
                      Method
                    </th>
                    <th className="text-left px-4 py-3 text-gray-600 text-[10px] font-mono uppercase tracking-wider hidden md:table-cell">
                      Created
                    </th>
                    <th className="text-left px-4 sm:px-6 py-3 text-gray-600 text-[10px] font-mono uppercase tracking-wider hidden lg:table-cell">
                      Linked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session, idx) => (
                    <tr
                      key={session.sessionId}
                      data-testid={`row-session-${session.sessionId}`}
                      className={`border-b border-gray-800/20 transition-colors hover:bg-green-500/[0.03] ${
                        idx === data.sessions.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 sm:px-6 py-3.5">
                        <span className="font-mono text-xs text-green-400/80 tracking-wider">
                          {session.sessionId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-gray-400 text-[10px] font-mono">
                          {session.connectionMethod === "pairing" ? (
                            <Hash className="w-3 h-3 text-gray-600" />
                          ) : (
                            <QrCode className="w-3 h-3 text-gray-600" />
                          )}
                          {session.connectionMethod === "pairing" ? "Pairing" : "QR Code"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-[10px] font-mono">
                            {formatDate(session.createdAt)}
                          </span>
                          <span className="text-gray-600 text-[10px] font-mono">
                            {formatTime(session.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 hidden lg:table-cell">
                        {session.linkedAt ? (
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-[10px] font-mono">
                              {formatDate(session.linkedAt)}
                            </span>
                            <span className="text-gray-600 text-[10px] font-mono">
                              {formatTime(session.linkedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-700 text-[10px] font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <GlassCard className="mt-6 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-500/70" />
            <span className="text-xs font-mono text-yellow-500/70 uppercase tracking-wider">Note</span>
          </div>
          <p className="text-gray-500 text-xs font-mono leading-relaxed">
            Analytics are tracked in server memory and reset when the server restarts. The "Inactive" count
            includes all terminated and failed sessions since the last restart. "Total This Month" counts all
            sessions created in the current calendar month since the last restart.
          </p>
        </GlassCard>

        <footer className="mt-8 text-center border-t border-gray-800/50 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-green-500/40" />
            <span className="font-mono text-xs text-gray-600">WOLFBOT Analytics</span>
          </div>
          <p className="text-gray-700 text-[10px] font-mono">
            Real-time session monitoring dashboard
          </p>
        </footer>
      </div>
    </div>
  );
}
