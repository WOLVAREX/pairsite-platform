import { z } from "zod";
import { pgTable, text, timestamp, serial, integer, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const sessionStatusEnum = ["pending", "connecting", "connected", "failed", "terminated"] as const;
export type SessionStatus = typeof sessionStatusEnum[number];

export const connectionLogs = pgTable("connection_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  connectionMethod: text("connection_method").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  connectedAt: timestamp("connected_at"),
  terminatedAt: timestamp("terminated_at"),
}, (table) => [
  uniqueIndex("connection_logs_session_id_idx").on(table.sessionId),
  index("connection_logs_created_at_idx").on(table.createdAt),
  index("connection_logs_status_idx").on(table.status),
]);

export const dailyStats = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  totalConnections: integer("total_connections").default(0).notNull(),
  successfulConnections: integer("successful_connections").default(0).notNull(),
  failedConnections: integer("failed_connections").default(0).notNull(),
});

export const insertConnectionLogSchema = createInsertSchema(connectionLogs).omit({ id: true });
export type InsertConnectionLog = z.infer<typeof insertConnectionLogSchema>;
export type ConnectionLog = typeof connectionLogs.$inferSelect;

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({ id: true });
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;

export interface Session {
  id: string;
  sessionId: string;
  pairingCode: string | null;
  qrCode: string | null;
  status: SessionStatus;
  connectionMethod: "pairing" | "qr";
  createdAt: string;
  linkedAt: string | null;
  credentialsBase64: string | null;
}

export interface CreateSessionRequest {
  method: "pairing" | "qr";
  phoneNumber?: string;
}

export const createSessionSchema = z.object({
  method: z.enum(["pairing", "qr"]),
  phoneNumber: z.string().optional(),
});

export interface PairingVerifyRequest {
  sessionId: string;
  code: string;
}

export const pairingVerifySchema = z.object({
  sessionId: z.string(),
  code: z.string().length(8),
});

export interface SessionResponse {
  sessionId: string;
  pairingCode?: string;
  qrCode?: string;
  status: SessionStatus;
  message: string;
}

export interface VerifyResponse {
  status: SessionStatus;
  sessionId: string;
  credentialsBase64?: string;
  message: string;
}

export interface AnalyticsData {
  activeSessions: number;
  inactiveSessions: number;
  totalToday: number;
  totalThisMonth: number;
  recentConnections: ConnectionLog[];
}

export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
