import { db } from "./db";
import {
  sessionsLog,
  quickLinks,
  accounts,
  sites,
  domains,
  cloneAttempts,
  adminSettings,
  type QuickLink,
  type InsertQuickLink,
  type Account,
  type InsertAccount,
  type Site,
  type Domain,
  type InsertCloneAttempt,
  type AdminSettings,
} from "@shared/schema";
import { eq, gte, and, ne } from "drizzle-orm";

const DEFAULT_LINKS: InsertQuickLink[] = [
  { key: "analytics", label: "Live Analytics", subtitle: "Real-time session dashboard", url: "/analytics", icon: "BarChart3", visible: true, order: 0 },
  { key: "github", label: "Github Repo", subtitle: "WOLVAREX/silentwolf", url: "https://github.com/WOLVAREX/silentwolf", icon: "Github", visible: true, order: 1 },
  { key: "deploy", label: "Deploy WolfBot", subtitle: "inspiring-genie-ebae09.netlify.app", url: "https://inspiring-genie-ebae09.netlify.app/", icon: "Rocket", visible: true, order: 2 },
];

export interface IStorage {
  logSession(data: {
    sessionId: string;
    status: string;
    connectionMethod: string;
    createdAt: Date;
    linkedAt?: Date | null;
    terminatedAt?: Date | null;
    siteId?: number | null;
  }): Promise<void>;
  getDbAnalytics(): Promise<{
    connected: number;
    inactive: number;
    totalThisMonth: number;
  } | null>;
  getQuickLinks(): Promise<QuickLink[]>;
  updateQuickLink(key: string, data: Partial<Pick<QuickLink, "label" | "subtitle" | "url" | "visible" | "order">>): Promise<QuickLink | null>;
  createAccount(data: InsertAccount): Promise<Account>;
  getAccountByEmail(email: string): Promise<Account | null>;
  getAccountById(id: number): Promise<Account | null>;
  getAccountByGoogleId(googleId: string): Promise<Account | null>;
  getAccountByGithubId(githubId: string): Promise<Account | null>;
  updateAccount(id: number, data: Partial<Account>): Promise<Account | null>;
  getSiteById(id: number): Promise<Site | null>;
  updateSite(id: number, data: Partial<Site>): Promise<Site | null>;
  getSiteBySubdomain(subdomain: string): Promise<Site | null>;
  getVerifiedSiteByHostname(hostname: string): Promise<Site | null>;
  createSite(data: Record<string, any>): Promise<Site>;
  getSitesByAccount(accountId: number): Promise<Site[]>;
  findConflictingSite(canonicalOwner: string, canonicalName: string, excludeAccountId: number): Promise<Site | null>;
  logCloneAttempt(data: InsertCloneAttempt): Promise<void>;
  getAdminSettings(): Promise<AdminSettings>;
}

class DatabaseStorage implements IStorage {
  async logSession(data: {
    sessionId: string;
    status: string;
    connectionMethod: string;
    createdAt: Date;
    linkedAt?: Date | null;
    terminatedAt?: Date | null;
    siteId?: number | null;
  }): Promise<void> {
    if (!db) return;
    try {
      const existing = await db
        .select({ id: sessionsLog.id })
        .from(sessionsLog)
        .where(eq(sessionsLog.sessionId, data.sessionId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(sessionsLog)
          .set({
            status: data.status,
            linkedAt: data.linkedAt ?? null,
            terminatedAt: data.terminatedAt ?? null,
          })
          .where(eq(sessionsLog.sessionId, data.sessionId));
      } else {
        await db.insert(sessionsLog).values({
          sessionId: data.sessionId,
          status: data.status,
          connectionMethod: data.connectionMethod,
          createdAt: data.createdAt,
          linkedAt: data.linkedAt ?? null,
          terminatedAt: data.terminatedAt ?? null,
          siteId: data.siteId ?? null,
        });
      }
    } catch (err) {
      console.error("[storage] Failed to log session:", err);
    }
  }

  async getDbAnalytics(): Promise<{
    connected: number;
    inactive: number;
    totalThisMonth: number;
  } | null> {
    if (!db) return null;
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const allRows = await db.select().from(sessionsLog);
      const thisMonth = allRows.filter((r) => r.createdAt >= startOfMonth);
      const inactive = allRows.filter(
        (r) => r.status === "terminated" || r.status === "failed"
      ).length;

      return {
        connected: 0,
        inactive,
        totalThisMonth: thisMonth.length,
      };
    } catch (err) {
      console.error("[storage] Failed to get analytics:", err);
      return null;
    }
  }

  async getQuickLinks(): Promise<QuickLink[]> {
    if (!db) return [];
    try {
      const rows = await db.select().from(quickLinks).orderBy(quickLinks.order);
      if (rows.length === 0) {
        await db.insert(quickLinks).values(DEFAULT_LINKS);
        return await db.select().from(quickLinks).orderBy(quickLinks.order);
      }
      return rows;
    } catch (err) {
      console.error("[storage] Failed to get quick links:", err);
      return [];
    }
  }

  async updateQuickLink(key: string, data: Partial<Pick<QuickLink, "label" | "subtitle" | "url" | "visible" | "order">>): Promise<QuickLink | null> {
    if (!db) return null;
    try {
      const [updated] = await db
        .update(quickLinks)
        .set(data)
        .where(eq(quickLinks.key, key))
        .returning();
      return updated ?? null;
    } catch (err) {
      console.error("[storage] Failed to update quick link:", err);
      return null;
    }
  }

  async createAccount(data: InsertAccount): Promise<Account> {
    if (!db) throw new Error("Database not configured");
    const [account] = await db.insert(accounts).values(data).returning();
    return account;
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    if (!db) return null;
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
    return account ?? null;
  }

  async getAccountById(id: number): Promise<Account | null> {
    if (!db) return null;
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return account ?? null;
  }

  async getAccountByGoogleId(googleId: string): Promise<Account | null> {
    if (!db) return null;
    const [account] = await db.select().from(accounts).where(eq(accounts.googleId, googleId)).limit(1);
    return account ?? null;
  }

  async getAccountByGithubId(githubId: string): Promise<Account | null> {
    if (!db) return null;
    const [account] = await db.select().from(accounts).where(eq(accounts.githubId, githubId)).limit(1);
    return account ?? null;
  }

  async updateAccount(id: number, data: Partial<Account>): Promise<Account | null> {
    if (!db) return null;
    const [updated] = await db.update(accounts).set(data).where(eq(accounts.id, id)).returning();
    return updated ?? null;
  }

  async getSiteById(id: number): Promise<Site | null> {
    if (!db) return null;
    const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
    return site ?? null;
  }

  async updateSite(id: number, data: Partial<Site>): Promise<Site | null> {
    if (!db) return null;
    const [updated] = await db.update(sites).set(data as any).where(eq(sites.id, id)).returning();
    return updated ?? null;
  }

  async getSiteBySubdomain(subdomain: string): Promise<Site | null> {
    if (!db) return null;
    const [site] = await db.select().from(sites).where(eq(sites.subdomain, subdomain)).limit(1);
    return site ?? null;
  }

  async getVerifiedSiteByHostname(hostname: string): Promise<Site | null> {
    if (!db) return null;
    const [row] = await db
      .select({ site: sites, verified: domains.verified })
      .from(domains)
      .innerJoin(sites, eq(domains.siteId, sites.id))
      .where(eq(domains.hostname, hostname))
      .limit(1);
    if (!row || !row.verified) return null;
    return row.site;
  }

  async createSite(data: Record<string, any>): Promise<Site> {
    if (!db) throw new Error("Database not configured");
    const [site] = await db.insert(sites).values(data as any).returning();
    return site;
  }

  async getSitesByAccount(accountId: number): Promise<Site[]> {
    if (!db) return [];
    return db.select().from(sites).where(eq(sites.accountId, accountId));
  }

  async findConflictingSite(canonicalOwner: string, canonicalName: string, excludeAccountId: number): Promise<Site | null> {
    if (!db) return null;
    const candidates = await db
      .select()
      .from(sites)
      .where(and(eq(sites.repoOwner, canonicalOwner), ne(sites.accountId, excludeAccountId)));
    const nameLower = canonicalName.toLowerCase();
    return (
      candidates.find((s) => {
        if (!s.repoUrl) return false;
        const last = s.repoUrl.replace(/\.git$/, "").replace(/\/+$/, "").split("/").pop() || "";
        return last.toLowerCase() === nameLower;
      }) ?? null
    );
  }

  async logCloneAttempt(data: InsertCloneAttempt): Promise<void> {
    if (!db) return;
    await db.insert(cloneAttempts).values(data);
  }

  async getAdminSettings(): Promise<AdminSettings> {
    if (!db) return { id: 0, notifyAdminOnCloneDetected: true };
    const [row] = await db.select().from(adminSettings).limit(1);
    return row ?? { id: 0, notifyAdminOnCloneDetected: true };
  }
}

class MemoryStorage implements IStorage {
  private links: QuickLink[] = DEFAULT_LINKS.map((l, i) => ({ ...l, id: i + 1 })) as QuickLink[];
  private accounts: Account[] = [];
  private nextAccountId = 1;
  private sites: Site[] = [];
  private nextSiteId = 1;
  private domains: Domain[] = [];

  async logSession(): Promise<void> {}
  async getDbAnalytics(): Promise<null> { return null; }
  async getQuickLinks(): Promise<QuickLink[]> { return this.links; }
  async updateQuickLink(key: string, data: Partial<Pick<QuickLink, "label" | "subtitle" | "url" | "visible" | "order">>): Promise<QuickLink | null> {
    const idx = this.links.findIndex((l) => l.key === key);
    if (idx === -1) return null;
    this.links[idx] = { ...this.links[idx], ...data };
    return this.links[idx];
  }

  async createAccount(data: InsertAccount): Promise<Account> {
    if (this.accounts.some((a) => a.email === data.email)) {
      throw new Error("An account with this email already exists");
    }
    const account: Account = {
      id: this.nextAccountId++,
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      googleId: data.googleId ?? null,
      githubId: data.githubId ?? null,
      githubUsername: data.githubUsername ?? null,
      plan: data.plan ?? "free",
      notifyOnCloneDetected: data.notifyOnCloneDetected ?? true,
      createdAt: new Date(),
    };
    this.accounts.push(account);
    return account;
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    return this.accounts.find((a) => a.email === email) ?? null;
  }

  async getAccountById(id: number): Promise<Account | null> {
    return this.accounts.find((a) => a.id === id) ?? null;
  }

  async getAccountByGoogleId(googleId: string): Promise<Account | null> {
    return this.accounts.find((a) => a.googleId === googleId) ?? null;
  }

  async getAccountByGithubId(githubId: string): Promise<Account | null> {
    return this.accounts.find((a) => a.githubId === githubId) ?? null;
  }

  async updateAccount(id: number, data: Partial<Account>): Promise<Account | null> {
    const idx = this.accounts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.accounts[idx] = { ...this.accounts[idx], ...data };
    return this.accounts[idx];
  }

  async getSiteById(id: number): Promise<Site | null> {
    return this.sites.find((site) => site.id === id) ?? null;
  }

  async updateSite(id: number, data: Partial<Site>): Promise<Site | null> {
    const idx = this.sites.findIndex((site) => site.id === id);
    if (idx === -1) return null;
    this.sites[idx] = { ...this.sites[idx], ...data };
    return this.sites[idx];
  }

  async getSiteBySubdomain(subdomain: string): Promise<Site | null> {
    return this.sites.find((s) => s.subdomain === subdomain) ?? null;
  }

  async getVerifiedSiteByHostname(hostname: string): Promise<Site | null> {
    const domain = this.domains.find((d) => d.hostname === hostname && d.verified);
    if (!domain) return null;
    return this.sites.find((s) => s.id === domain.siteId) ?? null;
  }

  async createSite(data: Record<string, any>): Promise<Site> {
    const site: Site = {
      id: this.nextSiteId++,
      accountId: data.accountId,
      name: data.name,
      subdomain: data.subdomain,
      templateId: data.templateId ?? null,
      repoUrl: data.repoUrl ?? null,
      repoOwner: data.repoOwner ?? null,
      isFork: data.isFork ?? false,
      verificationStatus: data.verificationStatus ?? "pending",
      whatsappGroupLink: data.whatsappGroupLink ?? null,
      channelLink: data.channelLink ?? null,
      messageTemplates: data.messageTemplates ?? null,
      status: data.status ?? "active",
      createdAt: new Date(),
    };
    this.sites.push(site);
    return site;
  }

  async getSitesByAccount(accountId: number): Promise<Site[]> {
    return this.sites.filter((s) => s.accountId === accountId);
  }

  async findConflictingSite(canonicalOwner: string, canonicalName: string, excludeAccountId: number): Promise<Site | null> {
    const nameLower = canonicalName.toLowerCase();
    return (
      this.sites.find((s) => {
        if (s.accountId === excludeAccountId) return false;
        if (s.repoOwner !== canonicalOwner) return false;
        if (!s.repoUrl) return false;
        const last = s.repoUrl.replace(/\.git$/, "").replace(/\/+$/, "").split("/").pop() || "";
        return last.toLowerCase() === nameLower;
      }) ?? null
    );
  }

  private cloneAttempts: any[] = [];
  async logCloneAttempt(data: InsertCloneAttempt): Promise<void> {
    this.cloneAttempts.push({ ...data, id: this.cloneAttempts.length + 1, createdAt: new Date() });
  }

  async getAdminSettings(): Promise<AdminSettings> {
    return { id: 0, notifyAdminOnCloneDetected: true };
  }

  /** Dev-only helper: seed a fake site (and optionally a verified custom
   * domain) directly in memory, for testing tenant routing locally
   * without a real database. Not used in the DatabaseStorage path. */
  __devSeedSite(data: { subdomain: string; name: string; customHostname?: string }): Site {
    const site: Site = {
      id: this.nextSiteId++,
      accountId: 0,
      name: data.name,
      subdomain: data.subdomain,
      templateId: null,
      repoUrl: null,
      repoOwner: null,
      isFork: false,
      verificationStatus: "verified",
      whatsappGroupLink: null,
      channelLink: null,
      messageTemplates: null,
      status: "active",
      createdAt: new Date(),
    };
    this.sites.push(site);
    if (data.customHostname) {
      this.domains.push({
        id: this.domains.length + 1,
        siteId: site.id,
        hostname: data.customHostname,
        verificationToken: "dev",
        verified: true,
        sslStatus: "active",
        createdAt: new Date(),
      });
    }
    return site;
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
