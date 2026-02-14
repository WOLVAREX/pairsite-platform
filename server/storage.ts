import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, sql, gte, and } from "drizzle-orm";
import {
  connectionLogs,
  dailyStats,
  type InsertConnectionLog,
  type ConnectionLog,
  type AnalyticsData,
} from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  logConnection(data: InsertConnectionLog): Promise<ConnectionLog>;
  updateConnectionStatus(sessionId: string, status: string): Promise<void>;
  markConnected(sessionId: string): Promise<void>;
  markTerminated(sessionId: string): Promise<void>;
  markFailed(sessionId: string): Promise<void>;
  getAnalytics(): Promise<AnalyticsData>;
  getRecentConnections(limit?: number): Promise<ConnectionLog[]>;
}

export class DatabaseStorage implements IStorage {
  async logConnection(data: InsertConnectionLog): Promise<ConnectionLog> {
    const [log] = await db.insert(connectionLogs).values(data).returning();
    const todayStr = new Date().toISOString().split("T")[0];
    await db
      .insert(dailyStats)
      .values({
        date: todayStr,
        totalConnections: 1,
        successfulConnections: 0,
        failedConnections: 0,
      })
      .onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          totalConnections: sql`${dailyStats.totalConnections} + 1`,
        },
      });
    return log;
  }

  async updateConnectionStatus(sessionId: string, status: string): Promise<void> {
    await db
      .update(connectionLogs)
      .set({ status })
      .where(eq(connectionLogs.sessionId, sessionId));
  }

  async markConnected(sessionId: string): Promise<void> {
    await db
      .update(connectionLogs)
      .set({ status: "connected", connectedAt: new Date() })
      .where(eq(connectionLogs.sessionId, sessionId));

    const todayStr = new Date().toISOString().split("T")[0];
    await db
      .insert(dailyStats)
      .values({
        date: todayStr,
        totalConnections: 0,
        successfulConnections: 1,
        failedConnections: 0,
      })
      .onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          successfulConnections: sql`${dailyStats.successfulConnections} + 1`,
        },
      });
  }

  async markTerminated(sessionId: string): Promise<void> {
    await db
      .update(connectionLogs)
      .set({ status: "terminated", terminatedAt: new Date() })
      .where(eq(connectionLogs.sessionId, sessionId));
  }

  async markFailed(sessionId: string): Promise<void> {
    await db
      .update(connectionLogs)
      .set({ status: "failed", terminatedAt: new Date() })
      .where(eq(connectionLogs.sessionId, sessionId));

    const todayStr = new Date().toISOString().split("T")[0];
    await db
      .insert(dailyStats)
      .values({
        date: todayStr,
        totalConnections: 0,
        successfulConnections: 0,
        failedConnections: 1,
      })
      .onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          failedConnections: sql`${dailyStats.failedConnections} + 1`,
        },
      });
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectionLogs)
      .where(
        and(
          sql`${connectionLogs.status} IN ('pending', 'connecting', 'connected')`,
          sql`${connectionLogs.terminatedAt} IS NULL`
        )
      );

    const inactiveResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectionLogs)
      .where(
        sql`${connectionLogs.status} IN ('failed', 'terminated') OR ${connectionLogs.terminatedAt} IS NOT NULL`
      );

    const todayResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectionLogs)
      .where(sql`DATE(${connectionLogs.createdAt}) = ${todayStr}`);

    const monthResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectionLogs)
      .where(gte(connectionLogs.createdAt, monthStart));

    const recentConnections = await db
      .select()
      .from(connectionLogs)
      .orderBy(sql`${connectionLogs.createdAt} DESC`)
      .limit(20);

    return {
      activeSessions: activeResult[0]?.count ?? 0,
      inactiveSessions: inactiveResult[0]?.count ?? 0,
      totalToday: todayResult[0]?.count ?? 0,
      totalThisMonth: monthResult[0]?.count ?? 0,
      recentConnections,
    };
  }

  async getRecentConnections(limit = 20): Promise<ConnectionLog[]> {
    return db
      .select()
      .from(connectionLogs)
      .orderBy(sql`${connectionLogs.createdAt} DESC`)
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
