import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { AuthUser, Site } from "@shared/schema";
import { DashboardLayout, type DashboardTab } from "@/components/dashboard-layout";
import {
  Bot,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Github,
  Globe,
  Rocket,
  Layers,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

function useAuthUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
}

const STATUS_MAP: Record<string, { icon: any; color: string; label: string }> = {
  verified: { icon: CheckCircle2, color: "text-green-400 border-green-500/30 bg-green-500/10", label: "Verified" },
  pending: { icon: Clock, color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", label: "Pending" },
  rejected: { icon: XCircle, color: "text-red-400 border-red-500/30 bg-red-500/10", label: "Rejected" },
  blocked_fork: { icon: XCircle, color: "text-red-400 border-red-500/30 bg-red-500/10", label: "Blocked" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-wider ${s.color}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-white font-display font-bold text-2xl">{title}</h1>
      {subtitle && <p className="text-gray-500 font-mono text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function OverviewTab({ user, sites, onNavigate }: { user: AuthUser; sites: Site[]; onNavigate: (t: DashboardTab) => void }) {
  const verified = sites.filter((s) => s.verificationStatus === "verified").length;

  const stats = [
    { label: "Total Sites", value: sites.length, icon: Layers },
    { label: "Verified", value: verified, icon: ShieldCheck },
    { label: "Plan", value: user.plan, icon: Rocket },
  ];

  return (
    <div>
      <SectionHeading title="Welcome back" subtitle={user.email} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl bg-black/30 border border-gray-800/30">
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-white font-display font-bold text-2xl capitalize">{s.value}</p>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {!user.githubUsername && (
        <div className="mb-8 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-mono text-sm font-medium">Connect GitHub to get started</p>
            <p className="text-yellow-400/70 font-mono text-xs mt-1">
              We verify you own your bot's repository via GitHub before your pair site goes live.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-mono text-sm uppercase tracking-wider">Your Sites</h2>
        <button
          onClick={() => onNavigate("create")}
          data-testid="button-overview-create-site"
          className="flex items-center gap-1.5 text-green-400 font-mono text-xs hover:text-green-300"
        >
          <Plus className="w-3.5 h-3.5" /> New Site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-800/50">
          <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-sm mb-4">You haven't created a pair site yet.</p>
          <button
            onClick={() => onNavigate("create")}
            data-testid="button-overview-empty-create"
            className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs px-4 py-2.5 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" /> Create your first pair site
          </button>
        </div>
      ) : (
        <SitesGrid sites={sites} />
      )}
    </div>
  );
}

function SitesGrid({ sites }: { sites: Site[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sites.map((site) => (
        <div
          key={site.id}
          data-testid={`card-site-${site.subdomain}`}
          className="p-5 rounded-xl bg-black/30 border border-gray-800/30 hover:border-green-500/30 transition-colors flex flex-col"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-white font-mono font-medium text-sm truncate">{site.name}</p>
            </div>
            <StatusBadge status={site.verificationStatus} />
          </div>
          <p className="text-gray-500 font-mono text-xs flex items-center gap-1.5 mb-1.5">
            <Globe className="w-3 h-3 shrink-0" /> {site.subdomain}.pairsite.space
          </p>
          {site.repoUrl && (
            <p className="text-gray-600 font-mono text-xs flex items-center gap-1.5 truncate">
              <Github className="w-3 h-3 shrink-0" />
              <span className="truncate">{site.repoUrl.replace("https://github.com/", "")}</span>
              {site.isFork && <span className="text-gray-700 shrink-0">(fork)</span>}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MySitesTab({ sites, isLoading, onNavigate }: { sites: Site[]; isLoading: boolean; onNavigate: (t: DashboardTab) => void }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 font-mono text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your sites...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <SectionHeading title="My Sites" subtitle={`${sites.length} pair site${sites.length === 1 ? "" : "s"}`} />
        <button
          onClick={() => onNavigate("create")}
          data-testid="button-mysites-create"
          className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs px-4 py-2.5 rounded-lg hover:bg-green-500/20 transition-colors h-fit"
        >
          <Plus className="w-3.5 h-3.5" /> Create Site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-800/50">
          <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-sm">You haven't created a pair site yet.</p>
        </div>
      ) : (
        <SitesGrid sites={sites} />
      )}
    </div>
  );
}

function useSubdomainCheck(subdomain: string) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (!subdomain) {
      setStatus("idle");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`);
        const body = await res.json();
        setStatus(body.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [subdomain]);

  return status;
}

function CreateSiteTab({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const subdomainStatus = useSubdomainCheck(subdomain);

  const createSite = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sites", {
        name,
        subdomain,
        repoUrl,
        whatsappGroupLink: whatsappGroupLink || undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create site");
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      setName("");
      setSubdomain("");
      setRepoUrl("");
      setWhatsappGroupLink("");
      onCreated();
    },
    onError: (err: any) => {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to create site");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    createSite.mutate();
  }

  const subdomainHint: Record<string, { text: string; color: string }> = {
    idle: { text: "", color: "" },
    checking: { text: "Checking availability...", color: "text-gray-500" },
    available: { text: "Available", color: "text-green-400" },
    taken: { text: "Already taken", color: "text-red-400" },
    invalid: { text: "Lowercase letters, numbers, and hyphens only", color: "text-red-400" },
  };

  return (
    <div>
      <SectionHeading title="Create a Pair Site" subtitle="Your bot's own branded WhatsApp pairing page" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Bot Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Foxy Bot"
                required
                data-testid="input-site-name"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Subdomain</label>
              <div className="flex items-center gap-2">
                <input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  placeholder="foxy"
                  required
                  data-testid="input-site-subdomain"
                  className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
                />
                <span className="text-gray-600 font-mono text-xs whitespace-nowrap">.pairsite.space</span>
              </div>
              {subdomainHint[subdomainStatus].text && (
                <p className={`font-mono text-xs mt-1.5 ${subdomainHint[subdomainStatus].color}`}>
                  {subdomainHint[subdomainStatus].text}
                </p>
              )}
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">
                GitHub Repository (must be one you own)
              </label>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/yourname/yourbot"
                required
                data-testid="input-site-repo"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">
                WhatsApp Group Link (optional)
              </label>
              <input
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                data-testid="input-site-group"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 font-mono text-xs flex items-start gap-2" data-testid="text-create-site-error">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}
            {success && (
              <p className="text-green-400 font-mono text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Site created successfully.
              </p>
            )}
            <button
              type="submit"
              disabled={createSite.isPending || !name || !repoUrl || subdomainStatus !== "available"}
              data-testid="button-create-site-submit"
              className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-sm font-medium py-3 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createSite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {createSite.isPending ? "Creating..." : "Create Pair Site"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-black/30 border border-gray-800/30">
            <p className="text-white font-mono text-sm font-medium mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" /> How verification works
            </p>
            <ul className="space-y-2.5 text-gray-500 font-mono text-xs">
              <li className="flex gap-2"><ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-700" /> We check the repo's GitHub owner matches your linked account.</li>
              <li className="flex gap-2"><ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-700" /> Forks resolve to their original repo automatically.</li>
              <li className="flex gap-2"><ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-700" /> Registering a fork of someone else's registered bot is blocked.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useAuthUser();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const { data: sites = [], isLoading: sitesLoading } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  useEffect(() => {
    if (!userLoading && user === null) {
      setLocation("/login");
    }
  }, [userLoading, user, setLocation]);

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} active={tab} onNavigate={setTab}>
      {tab === "overview" && <OverviewTab user={user} sites={sites} onNavigate={setTab} />}
      {tab === "sites" && <MySitesTab sites={sites} isLoading={sitesLoading} onNavigate={setTab} />}
      {tab === "create" && <CreateSiteTab onCreated={() => setTab("sites")} />}
    </DashboardLayout>
  );
}
