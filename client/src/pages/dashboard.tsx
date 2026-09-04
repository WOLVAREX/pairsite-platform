import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { AuthUser, Site, BotConfig, SiteUiConfig } from "@shared/schema";
import { DEFAULT_BOT_CONFIG, DEFAULT_SITE_UI_CONFIG } from "@shared/schema";
import type { SiteTemplate } from "@shared/templates";
import { DashboardLayout, type DashboardTab } from "@/components/dashboard-layout";
import { getTemplateById } from "@shared/templates";
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
  CreditCard,
  Trash2,
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
  const { data: billing } = useQuery<any>({ queryKey: ["/api/billing/status"] });
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
      {billing && <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-500/15 bg-green-500/[0.04] px-4 py-3 text-sm"><span className="text-gray-400">Pair-site access: <strong className="text-white">{billing.siteCount} / {billing.siteLimit}</strong> used · trial {billing.trialActive ? "ends" : "expired"} {billing.trialEndsAt ? new Date(billing.trialEndsAt).toLocaleDateString() : ""}</span><button onClick={() => onNavigate("billing")} className="text-green-400 hover:text-green-300">{billing.trialActive && billing.siteCount < billing.siteLimit ? "View billing" : "Pay now"}</button></div>}

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
  const queryClient = useQueryClient();
  const deleteSite = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sites/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sites"] }),
  });
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
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getTemplateById(site.templateId).swatchHex }}
                title={getTemplateById(site.templateId).name}
              />
            </div>
            <div className="flex items-center gap-2"><StatusBadge status={site.verificationStatus} /><button type="button" data-testid={`button-delete-site-${site.subdomain}`} onClick={() => { if (window.confirm(`Delete ${site.name}? This cannot be undone.`)) deleteSite.mutate(site.id); }} disabled={deleteSite.isPending} className="rounded-lg p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40" title="Delete pair site"><Trash2 className="h-3.5 w-3.5" /></button></div>
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

function CreateSiteTab({ user, onCreated }: { user: AuthUser; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [sessionPrefix, setSessionPrefix] = useState("WOLFBOT:~");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdSite, setCreatedSite] = useState<{ name: string; subdomain: string; publicUrl: string } | null>(null);
  const [needsPayment, setNeedsPayment] = useState(false);
  const subdomainStatus = useSubdomainCheck(subdomain);
  const { data: templates = [] } = useQuery<SiteTemplate[]>({ queryKey: ["/api/templates"] });

  useEffect(() => {
    if (templateId === null && templates.length > 0) {
      const def = templates.find((t) => t.isDefault) ?? templates[0];
      setTemplateId(def.id);
    }
  }, [templates, templateId]);

  const createSite = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sites", {
        name,
        subdomain,
        repoUrl,
        whatsappGroupLink: whatsappGroupLink || undefined,
        channelLink: channelLink || undefined,
        sessionPrefix: sessionPrefix || undefined,
        templateId: templateId ?? undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create site");
      }
      return res.json();
    },
    onSuccess: (site) => {
      setSuccess(true);
      setCreatedSite(site);
      setName("");
      setSubdomain("");
      setRepoUrl("");
      setWhatsappGroupLink("");
      setChannelLink("");
      setSessionPrefix("WOLFBOT:~");
    },
    onError: (err: any) => {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to create site");
      setNeedsPayment(err.message?.startsWith("402:") || false);
    },
  });
  const payNow = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/billing/initialize")).json(), onSuccess: (result: any) => { window.location.href = result.authorizationUrl; } });

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
      <SectionHeading title="Create a Pair Site" subtitle="Launch a branded pairing page on your own subdomain" />
      {!createdSite && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-gray-800/60 bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${user.githubUsername ? "bg-green-400" : "bg-yellow-400"}`} />
            <div>
              <p className="text-sm text-gray-200">{user.githubUsername ? "GitHub ownership connected" : "Connect GitHub before creating"}</p>
              <p className="text-xs text-gray-500">Your repository owner is checked automatically before publishing.</p>
            </div>
          </div>
          {!user.githubUsername && <a href="/api/auth/github" className="shrink-0 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:border-green-500/50 hover:text-green-300">Connect GitHub</a>}
        </div>
      )}
      {createdSite && (
        <div className="mb-6 rounded-xl border border-green-500/25 bg-green-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{createdSite.name} is live</p>
              <p className="mt-1 text-sm text-gray-400">Your pair site has been created with the selected template.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={createdSite.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-green-500/15 px-3 py-2 text-sm text-green-300 hover:bg-green-500/25">
                  <Globe className="h-4 w-4" /> {createdSite.publicUrl} <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <button type="button" onClick={() => { setCreatedSite(null); setSuccess(false); }} className="text-xs text-gray-500 hover:text-gray-300">Create another</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Session Prefix</label>
              <input value={sessionPrefix} onChange={(e) => setSessionPrefix(e.target.value)} placeholder="WOLFBOT:~" data-testid="input-session-prefix" className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors" />
              <p className="mt-1.5 text-[10px] text-gray-600">Used before generated credentials. You can edit it later in Bot config.</p>
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
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Theme</label>
              <div className="flex items-center gap-3 flex-wrap">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    data-testid={`button-template-${t.key}`}
                    title={t.name}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      templateId === t.id ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: t.swatchHex }}
                  />
                ))}
              </div>
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
            <div>
              <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">
                WhatsApp Channel Link (optional)
              </label>
              <input
                value={channelLink}
                onChange={(e) => setChannelLink(e.target.value)}
                placeholder="https://whatsapp.com/channel/..."
                data-testid="input-site-channel"
                className="w-full bg-black/50 border border-gray-800/50 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 font-mono text-xs flex items-start gap-2" data-testid="text-create-site-error">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}
            {needsPayment && <button type="button" onClick={() => payNow.mutate()} disabled={payNow.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 py-3 text-sm text-yellow-300">{payNow.isPending ? "Opening Paystack..." : "Pay now for another pair site"}</button>}
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

interface SiteConfigResponse {
  whatsappGroupLink: string | null;
  channelLink: string | null;
  groupInviteCode: string | null;
  channelJid: string | null;
  botConfig: BotConfig;
  uiConfig: SiteUiConfig;
}

function BotConfigTab({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState<number | null>(sites[0]?.id ?? null);
  const [groupLink, setGroupLink] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [groupInviteCode, setGroupInviteCode] = useState("");
  const [channelJid, setChannelJid] = useState("");
  const [config, setConfig] = useState<BotConfig>({ ...DEFAULT_BOT_CONFIG });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].id);
    if (siteId && !sites.some((site) => site.id === siteId)) setSiteId(sites[0]?.id ?? null);
  }, [sites, siteId]);

  const { data, isLoading } = useQuery<SiteConfigResponse>({
    queryKey: ["/api/sites/" + siteId + "/config"],
    enabled: siteId !== null,
  });

  useEffect(() => {
    if (data) {
      setGroupLink(data.whatsappGroupLink || "");
      setChannelLink(data.channelLink || "");
      setGroupInviteCode(data.groupInviteCode || "");
      setChannelJid(data.channelJid || "");
      setConfig(data.botConfig);
    }
  }, [data]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!siteId) throw new Error("Select a site first");
      const res = await apiRequest("PATCH", "/api/sites/" + siteId + "/config", {
        whatsappGroupLink: groupLink || null,
        channelLink: channelLink || null,
        groupInviteCode: groupInviteCode || null,
        channelJid: channelJid || null,
        botConfig: config,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save bot configuration");
      }
      return res.json() as Promise<SiteConfigResponse>;
    },
    onSuccess: (next) => {
      setConfig(next.botConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (sites.length === 0) {
    return <div><SectionHeading title="Bot Config" subtitle="Create a pair site first to customize its behavior" /></div>;
  }

  return (
    <div>
      <SectionHeading title="Bot Config" subtitle="Control what your pair site displays and does after linking" />
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-800/60 bg-white/[0.02] p-3">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-gray-600">Editing</span>
        <select value={siteId ?? ""} onChange={(e) => setSiteId(Number(e.target.value))} className="min-w-[220px] rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm text-gray-200 outline-none focus:border-green-500/50">
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.subdomain}.pairsite.space</option>)}
        </select>
      </div>
      {isLoading ? <div className="py-12 text-center text-sm text-gray-500">Loading configuration...</div> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-5 rounded-xl border border-gray-800/60 bg-black/20 p-6 lg:col-span-3">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Session prefix</label>
              <input value={config.sessionPrefix} onChange={(e) => setConfig({ ...config, sessionPrefix: e.target.value })} placeholder="WOLFBOT:~" className="w-full rounded-lg border border-gray-800 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none focus:border-green-500/50" />
              <p className="mt-1.5 text-[10px] text-gray-600">Placed directly before the generated session credentials.</p>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Success message</label>
              <textarea value={config.successMessage} onChange={(e) => setConfig({ ...config, successMessage: e.target.value })} rows={8} className="w-full resize-y rounded-lg border border-gray-800 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none focus:border-green-500/50" />
              <p className="mt-1.5 text-[10px] text-gray-600">Variables: {"{{botName}}"} {"{{sessionId}}"} {"{{sessionPrefix}}"} {"{{siteUrl}}"} {"{{status}}"}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Public group link</label><input value={groupLink} onChange={(e) => setGroupLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." className="w-full rounded-lg border border-gray-800 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/50" /><p className="mt-1 text-[10px] text-gray-600">Shown on your template as Join our group.</p></div>
              <div><label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Public channel link</label><input value={channelLink} onChange={(e) => setChannelLink(e.target.value)} placeholder="https://whatsapp.com/channel/..." className="w-full rounded-lg border border-gray-800 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/50" /><p className="mt-1 text-[10px] text-gray-600">Shown on your template as Join our channel.</p></div>
              <div><label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Group invite code</label><input value={groupInviteCode} onChange={(e) => setGroupInviteCode(e.target.value)} placeholder="AbCdEfGhIjKlMnOp" className="w-full rounded-lg border border-gray-800 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/50" /><p className="mt-1 text-[10px] text-gray-600">Used by auto-join; do not paste the full link.</p></div>
              <div><label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">Channel JID</label><input value={channelJid} onChange={(e) => setChannelJid(e.target.value)} placeholder="1234567890@newsletter" className="w-full rounded-lg border border-gray-800 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/50" /><p className="mt-1 text-[10px] text-gray-600">Used by auto-follow, usually ending in @newsletter.</p></div>
            </div>
            <button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="inline-flex items-center gap-2 rounded-lg bg-green-500/15 px-4 py-2.5 text-sm text-green-300 hover:bg-green-500/25 disabled:opacity-50">{saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saveConfig.isPending ? "Saving..." : saved ? "Saved" : "Save configuration"}</button>
            {saveConfig.isError && <p className="text-xs text-red-400">{saveConfig.error.message}</p>}
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-gray-800/60 bg-black/20 p-5">
              <p className="mb-4 text-sm font-medium text-white">After a successful link</p>
              <label className="flex items-start gap-3 text-sm text-gray-300"><input type="checkbox" checked={config.autoJoinGroup} onChange={(e) => setConfig({ ...config, autoJoinGroup: e.target.checked })} className="mt-0.5 accent-green-500" /><span><span className="block">Auto-join group</span><span className="mt-1 block text-xs text-gray-600">Uses the group invite link above.</span></span></label>
              <label className="mt-5 flex items-start gap-3 text-sm text-gray-300"><input type="checkbox" checked={config.autoFollowChannel} onChange={(e) => setConfig({ ...config, autoFollowChannel: e.target.checked })} className="mt-0.5 accent-green-500" /><span><span className="block">Auto-follow channel</span><span className="mt-1 block text-xs text-gray-600">Resolves the channel invite and follows it through WhatsApp.</span></span></label>
            </div>
            <div className="rounded-xl border border-gray-800/60 bg-white/[0.02] p-5 text-xs leading-relaxed text-gray-500">Group and channel actions are best-effort. If WhatsApp rejects an invite, the session credentials are still delivered and the failure is recorded.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/billing/status"] });
  const pay = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/billing/initialize")).json(), onSuccess: (result: any) => { window.location.href = result.authorizationUrl; } });
  if (isLoading) return <SectionHeading title="Billing" subtitle="Loading your plan..." />;
  return <div><SectionHeading title="Billing" subtitle="One month free, then KSh 100 per additional pair site" /><div className="max-w-xl rounded-xl border border-gray-800/60 bg-black/20 p-6 space-y-4"><div className="flex items-center justify-between"><span className="text-gray-400">Trial</span><span className={data?.trialActive ? "text-green-400" : "text-red-400"}>{data?.trialActive ? "Active" : "Expired"}</span></div><div className="flex items-center justify-between"><span className="text-gray-400">Sites</span><span className="text-white">{data?.siteCount} / {data?.siteLimit}</span></div><div className="flex items-center justify-between"><span className="text-gray-400">Available site credits</span><span className="text-white">{data?.siteCredits || 0}</span></div><button onClick={() => pay.mutate()} disabled={pay.isPending} className="inline-flex items-center gap-2 rounded-lg bg-green-500/15 px-4 py-3 text-green-300 hover:bg-green-500/25 disabled:opacity-50"><CreditCard className="h-4 w-4" />{pay.isPending ? "Opening Paystack..." : `Pay ${data?.currency || "KES"} ${((data?.priceMinor || 10000) / 100).toFixed(2)} for another site`}</button>{pay.isError && <p className="text-xs text-red-400">Payment could not be started. Check Paystack configuration.</p>}</div></div>;
}

function AnalyticsTab({ sites }: { sites: Site[] }) {
  return <div><SectionHeading title="Pair-site analytics" subtitle="Choose a site to view its sessions and activity" /><div className="grid gap-3 sm:grid-cols-2">{sites.map((site) => <a key={site.id} href={`/analytics/${site.id}`} className="rounded-xl border border-gray-800/60 bg-black/20 p-5 hover:border-green-500/30"><p className="text-white font-medium">{site.name}</p><p className="mt-1 text-xs text-gray-500">{site.subdomain}.pairsite.space</p><p className="mt-4 text-xs text-green-400">Open analytics →</p></a>)}</div></div>;
}

function CustomizeTab({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState<number | null>(sites[0]?.id ?? null); const [ui, setUi] = useState<SiteUiConfig>({ ...DEFAULT_SITE_UI_CONFIG }); const [bot, setBot] = useState<BotConfig>({ ...DEFAULT_BOT_CONFIG });
  const { data } = useQuery<SiteConfigResponse>({ queryKey: ["/api/sites/" + siteId + "/config"], enabled: siteId !== null });
  useEffect(() => { if (data) { setUi(data.uiConfig); setBot(data.botConfig); } }, [data]);
  const save = useMutation({ mutationFn: () => apiRequest("PATCH", "/api/sites/" + siteId + "/config", { whatsappGroupLink: data?.whatsappGroupLink ?? null, channelLink: data?.channelLink ?? null, groupInviteCode: data?.groupInviteCode ?? null, channelJid: data?.channelJid ?? null, botConfig: bot, uiConfig: ui }), onSuccess: () => alert("Customization saved") });
  if (!sites.length) return <SectionHeading title="Customize" subtitle="Create a pair site first" />;
  return <div><SectionHeading title="Customize your pair site" subtitle="Edit colors, components, effects, and preview the result live" /><div className="grid gap-6 lg:grid-cols-5"><div className="lg:col-span-3 rounded-xl border border-gray-800/60 bg-black/20 p-6 space-y-6"><select value={siteId ?? ""} onChange={(e) => setSiteId(Number(e.target.value))} className="rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm text-white">{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="grid grid-cols-2 gap-4">{([["accentColor","Accent"],["backgroundColor","Background"],["panelColor","Panels"],["textColor","Text"]] as const).map(([key,label]) => <label key={key} className="text-xs text-gray-400">{label}<span className="mt-1 flex items-center gap-2 rounded-lg border border-gray-800 bg-black/40 p-2"><input type="color" value={ui[key]} onChange={(e) => setUi({ ...ui, [key]: e.target.value })} className="h-8 w-10 cursor-pointer rounded" /><code className="text-gray-300">{ui[key]}</code></span></label>)}</div><label className="block text-sm text-gray-300">Glow intensity <input type="range" min="0" max="100" value={ui.glowIntensity} onChange={(e) => setUi({ ...ui, glowIntensity: Number(e.target.value) })} className="mt-3 w-full accent-green-500" /><span className="text-xs text-gray-500">{ui.glowIntensity}%</span></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="flex gap-2 text-sm text-gray-300"><input type="checkbox" checked={ui.scanlines} onChange={(e) => setUi({ ...ui, scanlines: e.target.checked })} className="accent-green-500" /> Scanline overlay</label><label className="flex gap-2 text-sm text-gray-300"><input type="checkbox" checked={ui.animatedBackground} onChange={(e) => setUi({ ...ui, animatedBackground: e.target.checked })} className="accent-green-500" /> Animated background</label></div><div className="grid grid-cols-2 gap-4"><label className="text-sm text-gray-300">Corner radius<input type="range" min="0" max="32" value={ui.borderRadius} onChange={(e) => setUi({ ...ui, borderRadius: Number(e.target.value) })} className="mt-3 w-full accent-green-500" /></label><label className="text-sm text-gray-300">Font<select value={ui.fontFamily} onChange={(e) => setUi({ ...ui, fontFamily: e.target.value as SiteUiConfig["fontFamily"] })} className="mt-2 block w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-white"><option value="mono">Mono</option><option value="sans">Sans</option><option value="display">Display</option></select></label></div><label className="block text-sm text-gray-300">Card style<select value={ui.cardStyle} onChange={(e) => setUi({ ...ui, cardStyle: e.target.value as SiteUiConfig["cardStyle"] })} className="mt-2 block w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-white"><option value="soft">Soft rounded</option><option value="sharp">Sharp technical</option><option value="glass">Glass</option></select></label><button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-lg bg-green-500/15 px-4 py-2.5 text-sm text-green-300">{save.isPending ? "Saving..." : "Save customization"}</button></div><div className="lg:col-span-2"><p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Live preview</p><div className="min-h-[360px] overflow-hidden border p-4" style={{ background: ui.backgroundColor, color: ui.textColor, borderColor: ui.accentColor, borderRadius: `${ui.borderRadius}px`, fontFamily: ui.fontFamily === "display" ? "Orbitron" : ui.fontFamily === "sans" ? "Arial" : "monospace", boxShadow: `0 0 ${ui.glowIntensity / 2}px ${ui.accentColor}55` }}><div className="mb-8 flex items-center justify-between"><span className="font-bold">{sites.find((s) => s.id === siteId)?.name || "Your Bot"}</span><span style={{ color: ui.accentColor }} className="text-xs">PAIR</span></div><div className="border p-5" style={{ background: ui.panelColor, borderColor: `${ui.accentColor}66`, borderRadius: `${ui.borderRadius}px` }}><p className="text-lg font-bold">Connect your device</p><p className="mt-1 text-xs opacity-60">Pairing code or QR code</p><div className="mt-6 grid grid-cols-2 gap-2"><span className="border p-2 text-center text-xs" style={{ borderColor: ui.accentColor, color: ui.accentColor }}>Pairing Code</span><span className="border p-2 text-center text-xs opacity-60">QR Code</span></div><button className="mt-5 w-full p-3 text-sm font-bold" style={{ background: ui.accentColor, color: ui.backgroundColor, borderRadius: `${ui.borderRadius}px` }}>Generate Session</button></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="p-3 text-xs" style={{ background: ui.panelColor, borderRadius: `${ui.borderRadius}px` }}>Join our group</div><div className="p-3 text-xs" style={{ background: ui.panelColor, borderRadius: `${ui.borderRadius}px` }}>Join channel</div></div></div></div></div></div>;
}

function DomainTab({ sites }: { sites: Site[] }) {
  const [hostname, setHostname] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id || 0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { data = [], refetch } = useQuery<any[]>({ queryKey: ["/api/domains"] });
  const add = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/domains", { hostname, siteId })).json(), onSuccess: (d) => { setResult(d); setHostname(""); refetch(); }, onError: (e: any) => setError(e.message) });
  const verify = useMutation({ mutationFn: async (id: number) => (await apiRequest("POST", `/api/domains/${id}/verify`)).json(), onSuccess: () => refetch(), onError: (e: any) => setError(e.message) });
  return <div>
    <SectionHeading title="Custom domains" subtitle="Connect a domain with a DNS TXT verification record" />
    <div className="mb-5 max-w-2xl rounded-xl border border-green-500/15 bg-green-500/[0.04] p-5 text-sm text-gray-400">
      <p className="font-medium text-white">Custom domain guide</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed">
        <li>Enter a hostname such as <code>bot.example.com</code> and select your pair site.</li>
        <li>Click Add and copy the TXT record beginning with <code>_pairsite.</code>.</li>
        <li>Create that TXT record at your DNS provider exactly as shown.</li>
        <li>Wait for DNS propagation, then click Verify DNS here.</li>
        <li>After verification, point the hostname to PairSite using an A record or Cloudflare proxy.</li>
      </ol>
    </div>
    <div className="max-w-2xl rounded-xl border border-gray-800/60 bg-black/20 p-6 space-y-4">
      <div className="flex gap-3"><select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))} className="rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm text-white">{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="bot.example.com" className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-black/50 px-3 py-2 text-sm text-white" /><button onClick={() => add.mutate()} disabled={!hostname || add.isPending} className="rounded-lg bg-green-500/15 px-4 py-2 text-sm text-green-300">Add</button></div>
      {result?.dns && <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-200">Create TXT record <code>{result.dns.name}</code> = <code>{result.dns.value}</code>, then click Verify.</div>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="space-y-2">{data.map((d: any) => <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-800/50 p-3 text-sm"><span className="text-white">{d.hostname}</span><span className="text-gray-500">{d.verified ? "Verified" : <button onClick={() => verify.mutate(d.id)} className="text-green-400">Verify DNS</button>}</span></div>)}</div>
    </div>
  </div>;
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
      {tab === "create" && <CreateSiteTab user={user} onCreated={() => setTab("sites")} />}
      {tab === "bot-config" && <BotConfigTab sites={sites} />}
      {tab === "customize" && <CustomizeTab sites={sites} />}
      {tab === "billing" && <BillingTab />}
      {tab === "domain" && <DomainTab sites={sites} />}
      {tab === "analytics" && <AnalyticsTab sites={sites} />}
    </DashboardLayout>
  );
}
