import { useQuery } from "@tanstack/react-query";
import type { AnalyticsData } from "@shared/schema";
import {
  Activity,
  Wifi,
  WifiOff,
  Calendar,
  CalendarDays,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Terminal,
  Loader2,
} from "lucide-react";

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl ${className}`}
      style={{ boxShadow: "0 0 40px rgba(0, 255, 0, 0.08)" }}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "green",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: "green" | "red" | "yellow" | "blue";
}) {
  const accentColors = {
    green: {
      iconBg: "bg-green-500/10 border-green-500/20",
      iconColor: "text-green-400",
      valueShadow: "0 0 20px rgba(0, 255, 0, 0.4)",
      valueColor: "#00ff00",
      barBg: "bg-green-500/20",
    },
    red: {
      iconBg: "bg-red-500/10 border-red-500/20",
      iconColor: "text-red-400",
      valueShadow: "0 0 20px rgba(255, 60, 60, 0.4)",
      valueColor: "#ff3c3c",
      barBg: "bg-red-500/20",
    },
    yellow: {
      iconBg: "bg-yellow-500/10 border-yellow-500/20",
      iconColor: "text-yellow-400",
      valueShadow: "0 0 20px rgba(255, 200, 0, 0.4)",
      valueColor: "#ffc800",
      barBg: "bg-yellow-500/20",
    },
    blue: {
      iconBg: "bg-blue-500/10 border-blue-500/20",
      iconColor: "text-blue-400",
      valueShadow: "0 0 20px rgba(60, 130, 255, 0.4)",
      valueColor: "#3c82ff",
      barBg: "bg-blue-500/20",
    },
  };

  const a = accentColors[accent];

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`p-2.5 rounded-lg border ${a.iconBg} shrink-0`}>
          <Icon className={`w-5 h-5 ${a.iconColor}`} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-gray-700 shrink-0" />
      </div>
      <div className="mt-2">
        <span
          className="font-mono text-2xl sm:text-3xl font-bold block"
          style={{ color: a.valueColor, textShadow: a.valueShadow }}
          data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {value.toLocaleString()}
        </span>
        <p className="text-gray-500 font-mono text-xs mt-1 uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className={`h-0.5 rounded-full mt-3 ${a.barBg}`}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(value * 10, 100)}%`,
            backgroundColor: a.valueColor,
            boxShadow: `0 0 8px ${a.valueColor}40`,
          }}
        />
      </div>
    </GlassCard>
  );
}

function ConnectionRow({
  sessionId,
  method,
  status,
  createdAt,
}: {
  sessionId: string;
  method: string;
  status: string;
  createdAt: string;
}) {
  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/5 border-yellow-400/20",
    connecting: "text-blue-400 bg-blue-400/5 border-blue-400/20",
    connected: "text-green-400 bg-green-400/5 border-green-400/20",
    failed: "text-red-400 bg-red-400/5 border-red-400/20",
    terminated: "text-gray-400 bg-gray-400/5 border-gray-400/20",
  };

  const dotColors: Record<string, string> = {
    pending: "bg-yellow-400",
    connecting: "bg-blue-400",
    connected: "bg-green-400",
    failed: "bg-red-400",
    terminated: "bg-gray-400",
  };

  const timeAgo = getTimeAgo(new Date(createdAt));

  return (
    <div
      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-black/20 border border-gray-800/30 flex-wrap"
      data-testid={`row-connection-${sessionId}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={`flex h-2 w-2 rounded-full shrink-0 ${dotColors[status] || "bg-gray-400"}`} />
        <span className="font-mono text-xs text-green-400/80 truncate">{sessionId}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <span className="font-mono text-[10px] text-gray-600 uppercase">{method}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] ${statusColors[status] || statusColors.terminated}`}
        >
          {status}
        </span>
        <span className="font-mono text-[10px] text-gray-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Analytics() {
  const { data, isLoading, refetch, isFetching } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
    refetchInterval: 5000,
    staleTime: 3000,
  });

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
        <header className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-mono">
                <span className="text-green-400" style={{ textShadow: "0 0 20px rgba(0, 255, 0, 0.5)" }}>
                  WOLF
                </span>
                BOT Analytics
              </h1>
              <p className="text-gray-500 font-mono text-xs">Real-time connection monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 border border-gray-800/50 font-mono text-xs text-gray-400 transition-all hover:border-green-500/30 hover:text-green-400"
              data-testid="link-back-home"
            >
              <Terminal className="w-3.5 h-3.5" />
              Generator
            </a>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 font-mono text-xs text-green-400 transition-all hover:bg-green-500/20 disabled:opacity-50"
              data-testid="button-refresh-analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard
                icon={Wifi}
                label="Active Sessions"
                value={data?.activeSessions ?? 0}
                accent="green"
              />
              <StatCard
                icon={WifiOff}
                label="Inactive Sessions"
                value={data?.inactiveSessions ?? 0}
                accent="red"
              />
              <StatCard
                icon={Calendar}
                label="Today's Connections"
                value={data?.totalToday ?? 0}
                accent="yellow"
              />
              <StatCard
                icon={CalendarDays}
                label="Monthly Connections"
                value={data?.totalThisMonth ?? 0}
                accent="blue"
              />
            </div>

            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Terminal className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white font-mono">Recent Connections</h2>
                    <p className="text-xs text-gray-500 font-mono">Last 20 session attempts</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/5 border border-green-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                  <span className="font-mono text-[10px] text-green-400 tracking-wider">LIVE</span>
                </div>
              </div>

              {data?.recentConnections && data.recentConnections.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {data.recentConnections.map((conn) => (
                    <ConnectionRow
                      key={conn.id}
                      sessionId={conn.sessionId}
                      method={conn.connectionMethod}
                      status={conn.status}
                      createdAt={conn.createdAt?.toString() ?? new Date().toISOString()}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-mono text-sm">No connections recorded yet</p>
                  <p className="text-gray-700 font-mono text-xs mt-1">
                    Generate a session to see analytics
                  </p>
                </div>
              )}
            </GlassCard>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-gray-700 font-mono text-[10px]">Auto-refreshing every 5 seconds</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
