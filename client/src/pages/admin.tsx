import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuickLink } from "@shared/schema";
import {
  Shield,
  Link2,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  LogOut,
  BarChart3,
  Rocket,
  Bot,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { Link } from "wouter";

function QuickLinkIcon({ icon }: { icon: string }) {
  if (icon === "Github") return <SiGithub className="w-4 h-4 text-green-400" />;
  if (icon === "Rocket") return <Rocket className="w-4 h-4 text-green-400" />;
  return <BarChart3 className="w-4 h-4 text-green-400" />;
}

function LoginScreen({ onLogin }: { onLogin: (password: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/admin/verify", { password });
      onLogin(password);
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-white font-mono font-bold text-lg">Admin Panel</h1>
            <p className="text-gray-500 font-mono text-xs">WolfBot Management</p>
          </div>
        </div>
        <div className="backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                data-testid="input-admin-password"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 font-mono text-xs" data-testid="text-login-error">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              data-testid="button-admin-login"
              className="w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-400 font-mono text-sm py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditLinkRow({ link, adminPassword, onSaved }: { link: QuickLink; adminPassword: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(link.label);
  const [subtitle, setSubtitle] = useState(link.subtitle);
  const [url, setUrl] = useState(link.url);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<QuickLink>) =>
      apiRequest("PATCH", `/api/admin/quick-links/${link.key}`, data, {
        "x-admin-password": adminPassword,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
      onSaved();
      setEditing(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to update link", variant: "destructive" }),
  });

  const toggleVisible = () => updateMutation.mutate({ visible: !link.visible });
  const saveEdit = () => updateMutation.mutate({ label, subtitle, url });
  const cancelEdit = () => { setLabel(link.label); setSubtitle(link.subtitle); setUrl(link.url); setEditing(false); };

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 ${link.visible ? "border-green-500/20 bg-black/20" : "border-gray-800/30 bg-black/10 opacity-60"}`}
      data-testid={`row-link-${link.key}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <QuickLinkIcon icon={link.icon} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label"
                data-testid={`input-label-${link.key}`}
                className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-green-500/50 transition-colors"
              />
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle"
                data-testid={`input-subtitle-${link.key}`}
                className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-gray-400 font-mono text-xs focus:outline-none focus:border-green-500/50 transition-colors"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL"
                data-testid={`input-url-${link.key}`}
                className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-gray-400 font-mono text-xs focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          ) : (
            <div>
              <p className="text-white font-mono text-sm font-medium truncate">{link.label}</p>
              <p className="text-gray-500 font-mono text-[10px] truncate">{link.subtitle}</p>
              <p className="text-gray-700 font-mono text-[10px] truncate mt-0.5">{link.url}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                data-testid={`button-save-${link.key}`}
                className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEdit}
                data-testid={`button-cancel-${link.key}`}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                data-testid={`button-edit-${link.key}`}
                className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleVisible}
                disabled={updateMutation.isPending}
                data-testid={`button-toggle-${link.key}`}
                className={`p-1.5 rounded-lg transition-colors ${link.visible ? "bg-green-500/10 hover:bg-green-500/20 text-green-400" : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-600"}`}
              >
                {link.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState<string | null>(() => sessionStorage.getItem("wolf_admin_pw"));
  const { toast } = useToast();

  const { data: links = [], refetch } = useQuery<QuickLink[]>({
    queryKey: ["/api/quick-links"],
    enabled: !!adminPassword,
  });

  function handleLogin(password: string) {
    sessionStorage.setItem("wolf_admin_pw", password);
    setAdminPassword(password);
    toast({ title: "Access granted", description: "Welcome to the admin dashboard" });
  }

  function handleLogout() {
    sessionStorage.removeItem("wolf_admin_pw");
    setAdminPassword(null);
  }

  if (!adminPassword) return <LoginScreen onLogin={handleLogin} />;

  const sorted = [...links].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-[#080808] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-white font-mono font-bold">Admin Dashboard</h1>
              <p className="text-gray-500 font-mono text-xs">WolfBot Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <button
                data-testid="button-goto-home"
                className="px-3 py-2 rounded-lg bg-black/30 border border-gray-800/30 hover:border-green-500/30 text-gray-400 hover:text-white font-mono text-xs transition-all"
              >
                Home
              </button>
            </Link>
            <button
              onClick={handleLogout}
              data-testid="button-logout"
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Link2 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">Quick Links</h2>
              <p className="text-xs text-gray-500 font-mono">Toggle visibility or edit any link</p>
            </div>
          </div>
          <div className="space-y-3">
            {sorted.map((link) => (
              <EditLinkRow
                key={link.key}
                link={link}
                adminPassword={adminPassword}
                onSaved={() => refetch()}
              />
            ))}
            {sorted.length === 0 && (
              <p className="text-gray-600 font-mono text-sm text-center py-6">No links found</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Bot className="w-3 h-3 text-gray-700" />
          <span className="text-gray-700 font-mono text-[10px]">WOLFBOT Admin v2.0.0</span>
        </div>
      </div>
    </div>
  );
}
