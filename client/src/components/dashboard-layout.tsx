import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AuthUser } from "@shared/schema";
import {
  Bot,
  LayoutDashboard,
  Settings2,
  LogOut,
  Menu,
  X,
  Plus,
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
  { id: "overview", label: "Overview", icon: LayoutDashboard, available: true },
  { id: "sites", label: "My sites", icon: Bot, available: true },
  { id: "create", label: "Create site", icon: Plus, available: true },
  { id: "bot-config", label: "Bot config", icon: Settings2, available: true },
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-400 text-black shadow-[0_0_24px_rgba(74,222,128,0.15)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-white font-display font-bold text-sm">PairSite</p>
            <p className="text-gray-600 font-mono text-[10px]">Creator workspace</p>
          </div>
        </Link>

        <nav className="flex-1 px-3 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gray-600">Workspace</p>
          <div className="space-y-1">
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
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs transition-colors ${
                  isActive
                    ? "bg-white/[0.07] text-white"
                    : item.available
                    ? "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                    : "text-gray-700 cursor-not-allowed"
                }`}
              >
                {isActive && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-green-400" />}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
          </div>
          <div className="mt-8 border-t border-gray-800/60 pt-5">
            <p className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gray-600">Coming soon</p>
            <div className="space-y-1 px-3 text-xs font-mono text-gray-700">
              <p>Custom domains</p><p>Analytics</p><p>Billing</p>
            </div>
          </div>
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-gray-800/50">
          <div className="px-3 py-2 mb-2">
            <p className="text-gray-600 font-mono text-[10px] uppercase tracking-wider">Signed in as</p>
            <p className="text-gray-300 font-mono text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
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
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-60 border-r border-gray-800/60 bg-[#080909]/95 backdrop-blur-sm z-20">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-400 text-black"><Bot className="w-3.5 h-3.5" /></div>
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
      <main className="lg:pl-60 relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
