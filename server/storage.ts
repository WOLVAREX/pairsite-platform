import { db } from "./db";
import { sessionsLog } from "@shared/schema";
import { eq, gte, or } from "drizzle-orm";

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
}

class MemoryStorage implements IStorage {
  async logSession(): Promise<void> {}
  async getDbAnalytics(): Promise<null> {
    return null;
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
