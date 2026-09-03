import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AuthUser } from "@shared/schema";
import {
  Bot,
  LayoutDashboard,
  Globe,
  Settings2,
  BarChart3,
  ScrollText,
  CreditCard,
  UserCog,
  LogOut,
  Menu,
  X,
  Lock,
} from "lucide-react";

export type DashboardTab =
  | "overview"
  | "sites"
  | "create"
  | "bot-config"
  | "domain"
  | "analytics"
  | "logs"
  | "billing"
  | "settings";

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, available: true },
  { id: "sites", label: "My Sites", icon: Bot, available: true },
  { id: "create", label: "Create Site", icon: Globe, available: true },
  { id: "bot-config", label: "Bot Config", icon: Settings2, available: false },
  { id: "domain", label: "Domain", icon: Globe, available: false },
  { id: "analytics", label: "Analytics", icon: BarChart3, available: false },
  { id: "logs", label: "Session Logs", icon: ScrollText, available: false },
  { id: "billing", label: "Billing", icon: CreditCard, available: false },
  { id: "settings", label: "Settings", icon: UserCog, available: false },
];

export function DashboardLayout({
  user,
  active,
  onNavigate,
  children,
}: {
  user: AuthUser;
  active: DashboardTab;
  onNavigate: (tab: DashboardTab) => void;
  children: ReactNode;
}) {
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const qc = useQueryClient();

  async function handleLogout() {
    await apiRequest("POST", "/api/auth/logout");
    qc.setQueryData(["/api/auth/me"], null);
    setLocation("/login");
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        <Link href="/" className="flex items-center gap-3 px-5 py-6">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 animate-glow-pulse">
            <Bot className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-white font-display font-bold text-sm">PairSite</p>
            <p className="text-gray-600 font-mono text-[10px]">Developer Workspace</p>
          </div>
        </Link>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.available) return;
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                disabled={!item.available}
                data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-green-500/10 border border-green-500/30 text-green-400"
                    : item.available
                    ? "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    : "text-gray-700 cursor-not-allowed border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {!item.available && <Lock className="w-3 h-3 ml-auto shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-gray-800/50">
          <div className="px-3 py-2 mb-2">
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">Signed in as</p>
            <p className="text-gray-300 font-mono text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="neon-bg" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 border-r border-gray-800/50 bg-black/60 backdrop-blur-sm z-20">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-green-400" />
          <span className="text-white font-display font-bold text-sm">PairSite</span>
        </div>
        <button onClick={() => setMobileOpen(true)} data-testid="button-mobile-menu" className="text-gray-400 p-1">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-72 bg-black border-r border-gray-800/50 relative">
            <button
              onClick={() => setMobileOpen(false)}
              data-testid="button-mobile-menu-close"
              className="absolute top-4 right-4 text-gray-400 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64 relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
