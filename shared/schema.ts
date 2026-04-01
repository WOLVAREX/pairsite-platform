import { z } from "zod";
import { pgTable, serial, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const sessionsLog = pgTable("sessions_log", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  connectionMethod: varchar("connection_method", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").notNull(),
  linkedAt: timestamp("linked_at"),
  terminatedAt: timestamp("terminated_at"),
});

export const insertSessionLogSchema = createInsertSchema(sessionsLog).omit({ id: true });
export type InsertSessionLog = typeof insertSessionLogSchema._type;
export type SessionLog = typeof sessionsLog.$inferSelect;

export const sessionStatusEnum = ["pending", "connecting", "connected", "failed", "terminated"] as const;
export type SessionStatus = typeof sessionStatusEnum[number];

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

export const quickLinks = pgTable("quick_links", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  subtitle: varchar("subtitle", { length: 150 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  visible: boolean("visible").notNull().default(true),
  order: integer("order").notNull().default(0),
});

export const insertQuickLinkSchema = createInsertSchema(quickLinks).omit({ id: true });
export type InsertQuickLink = typeof insertQuickLinkSchema._type;
export type QuickLink = typeof quickLinks.$inferSelect;

export const updateQuickLinkSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  subtitle: z.string().max(150).optional(),
  url: z.string().url().optional(),
  visible: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const createSessionSchema = z.object({
  method: z.enum(["pairing", "qr"]),
  phoneNumber: z.string().optional(),
  pairServer: z.number().min(1).max(5).default(1),
});

export interface SessionResponse {
  sessionId: string;
  pairingCode?: string;
  qrCode?: string;
  status: SessionStatus;
  message: string;
}
