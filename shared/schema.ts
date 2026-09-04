import { z } from "zod";
import { pgTable, serial, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const sessionsLog = pgTable("sessions_log", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  connectionMethod: varchar("connection_method", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").notNull(),
  linkedAt: timestamp("linked_at"),
  terminatedAt: timestamp("terminated_at"),
  siteId: integer("site_id"),
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

// ─────────────────────────────────────────────────────────────
// PairSite platform tables — multi-tenant developer accounts,
// pair sites, custom domains, templates, and clone protection.
// ─────────────────────────────────────────────────────────────

export const planEnum = ["free", "starter", "pro", "unlimited"] as const;
export type Plan = typeof planEnum[number];

export const siteVerificationStatusEnum = [
  "pending",
  "verified",
  "rejected",
  "blocked_fork",
] as const;
export type SiteVerificationStatus = typeof siteVerificationStatusEnum[number];

export const siteStatusEnum = ["active", "suspended", "disabled"] as const;
export type SiteStatus = typeof siteStatusEnum[number];

export const sslStatusEnum = ["pending", "active", "failed"] as const;
export type SslStatus = typeof sslStatusEnum[number];

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  googleId: varchar("google_id", { length: 100 }).unique(),
  githubId: varchar("github_id", { length: 100 }).unique(),
  githubUsername: varchar("github_username", { length: 100 }),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  notifyOnCloneDetected: boolean("notify_on_clone_detected").notNull().default(true),
  trialStartedAt: timestamp("trial_started_at").notNull().defaultNow(),
  trialEndsAt: timestamp("trial_ends_at"),
  siteLimitOverride: integer("site_limit_override"),
  paidUntil: timestamp("paid_until"),
  siteCredits: integer("site_credits").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export type InsertAccount = typeof insertAccountSchema._type;
export type Account = typeof accounts.$inferSelect;

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  colorTokens: jsonb("color_tokens").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });
export type InsertTemplate = typeof insertTemplateSchema._type;
export type Template = typeof templates.$inferSelect;

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  name: varchar("name", { length: 100 }).notNull(),
  subdomain: varchar("subdomain", { length: 63 }).notNull().unique(),
  templateId: integer("template_id").references(() => templates.id),
  repoUrl: varchar("repo_url", { length: 500 }),
  repoOwner: varchar("repo_owner", { length: 100 }),
  isFork: boolean("is_fork").notNull().default(false),
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending"),
  whatsappGroupLink: varchar("whatsapp_group_link", { length: 500 }),
  channelLink: varchar("channel_link", { length: 500 }),
  groupInviteCode: varchar("group_invite_code", { length: 200 }),
  channelJid: varchar("channel_jid", { length: 200 }),
  messageTemplates: jsonb("message_templates"),
  uiConfig: jsonb("ui_config"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSiteSchema = createInsertSchema(sites).omit({ id: true, createdAt: true });
export type InsertSite = typeof insertSiteSchema._type;
export type Site = typeof sites.$inferSelect;

export interface SiteUiConfig {
  accentColor: string;
  backgroundColor: string;
  panelColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: "mono" | "display" | "sans";
  glowIntensity: number;
  scanlines: boolean;
  animatedBackground: boolean;
  cardStyle: "soft" | "sharp" | "glass";
}

export const DEFAULT_SITE_UI_CONFIG: SiteUiConfig = { accentColor: "#22c55e", backgroundColor: "#050706", panelColor: "#0b120d", textColor: "#f3f4f6", borderRadius: 12, fontFamily: "mono", glowIntensity: 55, scanlines: true, animatedBackground: true, cardStyle: "soft" };
export function getSiteUiConfig(site: Pick<Site, "uiConfig"> | null | undefined): SiteUiConfig {
  const raw = site?.uiConfig && typeof site.uiConfig === "object" && !Array.isArray(site.uiConfig) ? site.uiConfig as Record<string, unknown> : {};
  const color = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return { accentColor: color(raw.accentColor, DEFAULT_SITE_UI_CONFIG.accentColor), backgroundColor: color(raw.backgroundColor, DEFAULT_SITE_UI_CONFIG.backgroundColor), panelColor: color(raw.panelColor, DEFAULT_SITE_UI_CONFIG.panelColor), textColor: color(raw.textColor, DEFAULT_SITE_UI_CONFIG.textColor), borderRadius: typeof raw.borderRadius === "number" ? Math.max(0, Math.min(32, raw.borderRadius)) : DEFAULT_SITE_UI_CONFIG.borderRadius, fontFamily: raw.fontFamily === "display" || raw.fontFamily === "sans" ? raw.fontFamily : DEFAULT_SITE_UI_CONFIG.fontFamily, glowIntensity: typeof raw.glowIntensity === "number" ? Math.max(0, Math.min(100, raw.glowIntensity)) : DEFAULT_SITE_UI_CONFIG.glowIntensity, scanlines: typeof raw.scanlines === "boolean" ? raw.scanlines : DEFAULT_SITE_UI_CONFIG.scanlines, animatedBackground: typeof raw.animatedBackground === "boolean" ? raw.animatedBackground : DEFAULT_SITE_UI_CONFIG.animatedBackground, cardStyle: raw.cardStyle === "sharp" || raw.cardStyle === "glass" ? raw.cardStyle : DEFAULT_SITE_UI_CONFIG.cardStyle };
}

export interface BotConfig {
  sessionPrefix: string;
  successMessage: string;
  autoJoinGroup: boolean;
  autoFollowChannel: boolean;
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  sessionPrefix: "WOLFBOT:~",
  successMessage: "╭─〔 {{botName}} SESSION CREATED 〕\n│\n├─ Name: {{botName}}\n├─ Status: Waiting Deployment\n├─ Pair site: {{siteUrl}}\n└─ Session prefix: {{sessionPrefix}}\n\n╰─ Your session credentials are above.",
  autoJoinGroup: true,
  autoFollowChannel: true,
};

export function getBotConfig(site: Pick<Site, "messageTemplates"> | null | undefined): BotConfig {
  const raw = site?.messageTemplates;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_BOT_CONFIG };
  const values = raw as Record<string, unknown>;
  return {
    sessionPrefix: typeof values.sessionPrefix === "string" && values.sessionPrefix.trim() ? values.sessionPrefix : DEFAULT_BOT_CONFIG.sessionPrefix,
    successMessage: typeof values.successMessage === "string" && values.successMessage.trim() ? values.successMessage : DEFAULT_BOT_CONFIG.successMessage,
    autoJoinGroup: typeof values.autoJoinGroup === "boolean" ? values.autoJoinGroup : DEFAULT_BOT_CONFIG.autoJoinGroup,
    autoFollowChannel: typeof values.autoFollowChannel === "boolean" ? values.autoFollowChannel : DEFAULT_BOT_CONFIG.autoFollowChannel,
  };
}

export const botConfigSchema = z.object({
  sessionPrefix: z.string().trim().min(1).max(80),
  successMessage: z.string().trim().min(1).max(2000),
  autoJoinGroup: z.boolean(),
  autoFollowChannel: z.boolean(),
});

export const siteConfigSchema = z.object({
  whatsappGroupLink: z.string().url().nullable().optional(),
  channelLink: z.string().url().nullable().optional(),
  groupInviteCode: z.string().trim().max(200).nullable().optional(),
  channelJid: z.string().trim().max(200).nullable().optional(),
  botConfig: botConfigSchema,
  uiConfig: z.object({ accentColor: z.string().regex(/^#[0-9a-f]{6}$/i), backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i), panelColor: z.string().regex(/^#[0-9a-f]{6}$/i), textColor: z.string().regex(/^#[0-9a-f]{6}$/i), borderRadius: z.number().min(0).max(32), fontFamily: z.enum(["mono", "display", "sans"]), glowIntensity: z.number().min(0).max(100), scanlines: z.boolean(), animatedBackground: z.boolean(), cardStyle: z.enum(["soft", "sharp", "glass"]) }).optional(),
});

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subdomain: z.string().min(1).max(63).optional(),
  templateId: z.number().int().optional(),
  whatsappGroupLink: z.string().url().optional(),
  channelLink: z.string().url().optional(),
  messageTemplates: z.record(z.string()).optional(),
  status: z.enum(siteStatusEnum).optional(),
});

export const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
  templateId: z.number().int().optional(),
  repoUrl: z.string().url(),
  whatsappGroupLink: z.string().url().optional(),
  channelLink: z.string().url().optional(),
});

export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id),
  hostname: varchar("hostname", { length: 255 }).notNull().unique(),
  verificationToken: varchar("verification_token", { length: 100 }).notNull(),
  verified: boolean("verified").notNull().default(false),
  sslStatus: varchar("ssl_status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDomainSchema = createInsertSchema(domains).omit({ id: true, createdAt: true });
export type InsertDomain = typeof insertDomainSchema._type;
export type Domain = typeof domains.$inferSelect;

export const cloneAttempts = pgTable("clone_attempts", {
  id: serial("id").primaryKey(),
  attemptedRepoUrl: varchar("attempted_repo_url", { length: 500 }).notNull(),
  attemptedByAccountId: integer("attempted_by_account_id").references(() => accounts.id),
  matchedSiteId: integer("matched_site_id").references(() => sites.id),
  originalOwnerNotified: boolean("original_owner_notified").notNull().default(false),
  adminNotified: boolean("admin_notified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCloneAttemptSchema = createInsertSchema(cloneAttempts).omit({ id: true, createdAt: true });
export type InsertCloneAttempt = typeof insertCloneAttemptSchema._type;
export type CloneAttempt = typeof cloneAttempts.$inferSelect;

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  notifyAdminOnCloneDetected: boolean("notify_admin_on_clone_detected").notNull().default(true),
  trialDays: integer("trial_days").notNull().default(30),
  freeSiteLimit: integer("free_site_limit").notNull().default(1),
  priceMinor: integer("price_minor").notNull().default(10000),
  currency: varchar("currency", { length: 10 }).notNull().default("KES"),
  defaultGroupInviteCode: varchar("default_group_invite_code", { length: 200 }),
  defaultChannelJid: varchar("default_channel_jid", { length: 200 }),
});

export type AdminSettings = typeof adminSettings.$inferSelect;

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  amountMinor: integer("amount_minor").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("KES"),
  status: varchar("status", { length: 30 }).notNull().default("initialized"),
  purpose: varchar("purpose", { length: 30 }).notNull().default("pair_site"),
  paidAt: timestamp("paid_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface AuthUser {
  id: number;
  email: string;
  plan: Plan;
  githubUsername: string | null;
  trialEndsAt?: string | null;
  paidUntil?: string | null;
  siteLimit?: number;
}
