import { db } from "./db";
import { sessionsLog, quickLinks, type QuickLink, type InsertQuickLink } from "@shared/schema";
import { eq, gte } from "drizzle-orm";

const DEFAULT_LINKS: InsertQuickLink[] = [
  { key: "analytics", label: "Live Analytics", subtitle: "Real-time session dashboard", url: "/analytics", icon: "BarChart3", visible: true, order: 0 },
  { key: "github", label: "Github Repo", subtitle: "sil3nt-wolf/silentwolf", url: "https://github.com/sil3nt-wolf/silentwolf.git", icon: "Github", visible: true, order: 1 },
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
  }): Promise<void>;
  getDbAnalytics(): Promise<{
    connected: number;
    inactive: number;
    totalThisMonth: number;
  } | null>;
  getQuickLinks(): Promise<QuickLink[]>;
  updateQuickLink(key: string, data: Partial<Pick<QuickLink, "label" | "subtitle" | "url" | "visible" | "order">>): Promise<QuickLink | null>;
}

class DatabaseStorage implements IStorage {
  async logSession(data: {
    sessionId: string;
    status: string;
    connectionMethod: string;
    createdAt: Date;
    linkedAt?: Date | null;
    terminatedAt?: Date | null;
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
}

class MemoryStorage implements IStorage {
  private links: QuickLink[] = DEFAULT_LINKS.map((l, i) => ({ ...l, id: i + 1 })) as QuickLink[];

  async logSession(): Promise<void> {}
  async getDbAnalytics(): Promise<null> { return null; }
  async getQuickLinks(): Promise<QuickLink[]> { return this.links; }
  async updateQuickLink(key: string, data: Partial<Pick<QuickLink, "label" | "subtitle" | "url" | "visible" | "order">>): Promise<QuickLink | null> {
    const idx = this.links.findIndex((l) => l.key === key);
    if (idx === -1) return null;
    this.links[idx] = { ...this.links[idx], ...data };
    return this.links[idx];
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
