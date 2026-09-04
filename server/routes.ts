import type { Express } from "express";
import { type Server } from "http";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import passport from "passport";
import { createSessionSchema, updateQuickLinkSchema, signupSchema, loginSchema, createSiteSchema, siteConfigSchema, getBotConfig } from "@shared/schema";
import {
  createWhatsAppSession,
  getSessionStatus,
  terminateSession,
  addSessionListener,
  removeSessionListener,
  getAnalytics,
} from "./whatsapp";
import { storage } from "./storage";
import { hashPassword, requireAuth } from "./auth";
import { parseRepoUrl, fetchRepoInfo, canonicalIdentity, RepoNotFoundError, GitHubApiError } from "./github";
import { sendCloneAttemptEmails, sendWelcomeEmail, sendSiteCreatedEmail, sendEmail } from "./email";
import { SITE_TEMPLATES, isValidTemplateId } from "@shared/templates";
import { log } from "./index";
import { db } from "./db";
import { accounts, adminSettings, domains, payments, sites, sessionsLog, getSiteUiConfig, DEFAULT_BOT_CONFIG, updateAccountEmailSchema } from "@shared/schema";
import { eq, desc, count, inArray, and } from "drizzle-orm";
import crypto from "node:crypto";
import { resolveTxt } from "node:dns/promises";

function paystackSecret(): string | undefined {
  return process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_LIVE_KEY;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/ws")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    let currentSessionId: string | null = null;
    let currentListener: ((event: string, data: any) => void) | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && msg.sessionId) {
          if (currentSessionId && currentListener) {
            removeSessionListener(currentSessionId, currentListener);
          }

          currentSessionId = msg.sessionId;
          currentListener = (event: string, data: any) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event, data, sessionId: currentSessionId }));
            }
          };
          addSessionListener(msg.sessionId, currentListener);

          const status = getSessionStatus(msg.sessionId);
          if (status) {
            ws.send(JSON.stringify({ event: "status", data: status, sessionId: msg.sessionId }));
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    ws.on("close", () => {
      if (currentSessionId && currentListener) {
        removeSessionListener(currentSessionId, currentListener);
      }
    });
  });

  // ── Auth routes ──────────────────────────────────────────────
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;

      const existing = await storage.getAccountByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const account = await storage.createAccount({
        email,
        passwordHash,
        plan: "free",
      });
      sendWelcomeEmail(account.email).catch((err) => log(`Welcome email error: ${err.message}`, "email"));

      req.login(
        { id: account.id, email: account.email, plan: account.plan as any, githubUsername: account.githubUsername },
        (err) => {
          if (err) {
            log(`Signup login error: ${err.message}`, "auth");
            return res.status(500).json({ error: "Account created but failed to log in" });
          }
          return res.status(201).json({ id: account.id, email: account.email, plan: account.plan });
        }
      );
    } catch (err: any) {
      log(`Signup error: ${err.message}`, "auth");
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        log(`Login error: ${err.message}`, "auth");
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Failed to log in" });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Failed to log out" });
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.json(req.user);
    }
    return res.status(401).json({ error: "Not authenticated" });
  });

  app.patch("/api/account/email", requireAuth, async (req, res) => {
    const parsed = updateAccountEmailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Enter a valid email address" });
    const email = parsed.data.email.toLowerCase();
    const existing = await storage.getAccountByEmail(email);
    if (existing && existing.id !== req.user!.id) return res.status(409).json({ error: "That email is already in use" });
    const account = await storage.updateAccount(req.user!.id, { email });
    if (!account) return res.status(404).json({ error: "Account not found" });
    req.login({ id: account.id, email: account.email, plan: account.plan as any, githubUsername: account.githubUsername }, (err) => {
      if (err) return res.status(500).json({ error: "Email saved, but session refresh failed" });
      return res.json({ email: account.email });
    });
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login?error=google" }),
      (_req, res) => res.redirect("/dashboard")
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    app.get("/api/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
    app.get(
      "/api/auth/github/callback",
      passport.authenticate("github", { failureRedirect: "/login?error=github" }),
      (_req, res) => res.redirect("/dashboard")
    );
  }

  app.get("/api/templates", (_req, res) => {
    res.json(SITE_TEMPLATES);
  });

  app.get("/api/sites/check-subdomain", async (req, res) => {
    const subdomain = String(req.query.subdomain || "").toLowerCase();
    if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json({ error: "Invalid subdomain format" });
    }
    const existing = await storage.getSiteBySubdomain(subdomain);
    return res.json({ available: !existing });
  });

  app.get("/api/sites", requireAuth, async (req, res) => {
    const mySites = await storage.getSitesByAccount(req.user!.id);
    return res.json(mySites);
  });

  app.delete("/api/sites/:id", requireAuth, async (req, res) => {
    const site = await storage.getSiteById(Number(req.params.id));
    if (!site || site.accountId !== req.user!.id) return res.status(404).json({ error: "Site not found" });
    const deleted = await storage.deleteSite(site.id);
    return res.json({ success: deleted });
  });

  app.get("/api/domains", requireAuth, async (req, res) => {
    if (!db) return res.json([]);
    const mine = await db.select({ domain: domains }).from(domains).innerJoin(sites, eq(domains.siteId, sites.id)).where(eq(sites.accountId, req.user!.id));
    return res.json(mine.map((row) => row.domain));
  });

  app.post("/api/domains", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not configured" });
    const hostname = String(req.body?.hostname || "").toLowerCase().trim();
    const siteId = Number(req.body?.siteId);
    if (!hostname || !/^(?=.{4,255}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) return res.status(400).json({ error: "Enter a valid domain name" });
    const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
    if (!site || site.accountId !== req.user!.id) return res.status(404).json({ error: "Site not found" });
    const token = `pairsite-${crypto.randomBytes(12).toString("hex")}`;
    try {
      const [domain] = await db.insert(domains).values({ siteId, hostname, verificationToken: token, verified: false, sslStatus: "pending" }).returning();
      return res.status(201).json({ ...domain, dns: { type: "TXT", name: `_pairsite.${hostname}`, value: token } });
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ error: "That domain is already registered" });
      throw err;
    }
  });

  app.post("/api/domains/:id/verify", requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not configured" });
    const [row] = await db.select({ domain: domains }).from(domains).innerJoin(sites, eq(domains.siteId, sites.id)).where(eq(domains.id, Number(req.params.id))).limit(1);
    if (!row || row.domain.siteId === null) return res.status(404).json({ error: "Domain not found" });
    const [owner] = await db.select().from(sites).where(eq(sites.id, row.domain.siteId)).limit(1);
    if (!owner || owner.accountId !== req.user!.id) return res.status(404).json({ error: "Domain not found" });
    let records: string[][] = [];
    try { records = await resolveTxt(`_pairsite.${row.domain.hostname}`); } catch { return res.status(400).json({ error: "Verification TXT record was not found yet" }); }
    if (!records.flat().includes(row.domain.verificationToken)) return res.status(400).json({ error: "Verification TXT value does not match" });
    const [updated] = await db.update(domains).set({ verified: true, sslStatus: "active" }).where(eq(domains.id, row.domain.id)).returning();
    return res.json(updated);
  });

  app.get("/api/sites/:id/config", requireAuth, async (req, res) => {
    const site = await storage.getSiteById(Number(req.params.id));
    if (!site || site.accountId !== req.user!.id) return res.status(404).json({ error: "Site not found" });
    return res.json({
      whatsappGroupLink: site.whatsappGroupLink,
      channelLink: site.channelLink,
      groupInviteCode: site.groupInviteCode,
      channelJid: site.channelJid,
      botConfig: getBotConfig(site),
      uiConfig: getSiteUiConfig(site),
    });
  });

  app.patch("/api/sites/:id/config", requireAuth, async (req, res) => {
    try {
      const site = await storage.getSiteById(Number(req.params.id));
      if (!site || site.accountId !== req.user!.id) return res.status(404).json({ error: "Site not found" });
      const parsed = siteConfigSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid bot configuration", details: parsed.error.flatten() });
      const updated = await storage.updateSite(site.id, {
        whatsappGroupLink: parsed.data.whatsappGroupLink ?? null,
        channelLink: parsed.data.channelLink ?? null,
        groupInviteCode: parsed.data.groupInviteCode ?? null,
        channelJid: parsed.data.channelJid ?? null,
        messageTemplates: parsed.data.botConfig,
        ...(parsed.data.uiConfig ? { uiConfig: parsed.data.uiConfig } : {}),
      });
      return res.json({
        whatsappGroupLink: updated?.whatsappGroupLink ?? null,
        channelLink: updated?.channelLink ?? null,
        groupInviteCode: updated?.groupInviteCode ?? null,
        channelJid: updated?.channelJid ?? null,
        botConfig: getBotConfig(updated),
        uiConfig: getSiteUiConfig(updated),
      });
    } catch (err: any) {
      log(`Bot config update error: ${err.message}`, "sites");
      return res.status(500).json({ error: "Failed to update bot configuration" });
    }
  });

  app.post("/api/sites", requireAuth, async (req, res) => {
    try {
      const parsed = createSiteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { name, subdomain, templateId, repoUrl, whatsappGroupLink, channelLink, sessionPrefix } = parsed.data;
      const account = req.user!;
      let siteExpiresAt = new Date(Date.now() + 30 * 86400000);

      if (db) {
        const [accountRow] = await db.select().from(accounts).where(eq(accounts.id, account.id)).limit(1);
        const [{ value: siteCount }] = await db.select({ value: count() }).from(sites).where(eq(sites.accountId, account.id));
        const settings = (await storage.getAdminSettings());
        const trialEnd = accountRow?.trialEndsAt || new Date((accountRow?.trialStartedAt || new Date()).getTime() + settings.trialDays * 86400000);
        siteExpiresAt = trialEnd > new Date() ? trialEnd : new Date(Date.now() + settings.trialDays * 86400000);
        const trialActive = trialEnd > new Date();
        const allowed = accountRow?.siteLimitOverride ?? (trialActive ? settings.freeSiteLimit : 0);
        if (Number(siteCount) >= allowed && (accountRow?.siteCredits || 0) < 1) {
          return res.status(402).json({ error: trialActive ? "Your free site limit has been reached" : "Your free trial has expired. Please pay for another pair site.", code: "PAYMENT_REQUIRED" });
        }
      }

      if (!account.githubUsername) {
        return res.status(400).json({ error: "Connect your GitHub account before creating a site" });
      }

      const existingSubdomain = await storage.getSiteBySubdomain(subdomain.toLowerCase());
      if (existingSubdomain) {
        return res.status(409).json({ error: "That subdomain is already taken" });
      }

      if (templateId !== undefined && !isValidTemplateId(templateId)) {
        return res.status(400).json({ error: "Invalid template selected" });
      }

      const parsedRepo = parseRepoUrl(repoUrl);
      if (!parsedRepo) {
        return res.status(400).json({ error: "That doesn't look like a valid GitHub repository URL" });
      }

      let info;
      try {
        info = await fetchRepoInfo(parsedRepo.owner, parsedRepo.repo);
      } catch (err) {
        if (err instanceof RepoNotFoundError) {
          return res.status(404).json({ error: "GitHub repository not found" });
        }
        if (err instanceof GitHubApiError) {
          log(`GitHub API error during site creation: ${err.message}`, "sites");
          return res.status(502).json({ error: "Could not verify the repository right now. Please try again shortly." });
        }
        throw err;
      }

      if (info.owner.toLowerCase() !== account.githubUsername.toLowerCase()) {
        return res.status(403).json({ error: "You can only register a GitHub repository you own" });
      }

      const canonical = canonicalIdentity(info);
      const conflict = await storage.findConflictingSite(canonical.owner, canonical.name, account.id);

      if (conflict) {
        await storage.logCloneAttempt({
          attemptedRepoUrl: repoUrl,
          attemptedByAccountId: account.id,
          matchedSiteId: conflict.id,
          originalOwnerNotified: false,
          adminNotified: false,
        });

        const originalOwner = await storage.getAccountById(conflict.accountId);
        const adminSettings = await storage.getAdminSettings();

        sendCloneAttemptEmails({
          originalOwnerEmail: originalOwner?.email,
          notifyOriginalOwner: originalOwner?.notifyOnCloneDetected ?? true,
          adminEmail: process.env.ADMIN_EMAIL,
          notifyAdmin: adminSettings.notifyAdminOnCloneDetected,
          attemptedRepoUrl: repoUrl,
          attemptedByEmail: account.email,
          originalSiteName: conflict.name,
        }).catch((err) => log(`Clone-attempt email error: ${err.message}`, "email"));

        return res.status(403).json({
          error: "This repository (or its original) is already registered by another developer on this platform",
        });
      }

      const site = await storage.createSite({
        accountId: account.id,
        name,
        subdomain: subdomain.toLowerCase(),
        templateId: templateId ?? null,
        repoUrl: `https://github.com/${canonical.owner}/${canonical.name}`,
        repoOwner: canonical.owner,
        isFork: info.isFork,
        verificationStatus: "verified",
        whatsappGroupLink: whatsappGroupLink ?? null,
        channelLink: channelLink ?? null,
        status: "active",
        expiresAt: siteExpiresAt,
        messageTemplates: { ...DEFAULT_BOT_CONFIG, ...(sessionPrefix ? { sessionPrefix } : {}) },
      });
      sendSiteCreatedEmail(account.email, site).catch((err) => log(`Site-created email error: ${err.message}`, "email"));

      if (db) {
        const [accountRow] = await db.select().from(accounts).where(eq(accounts.id, account.id)).limit(1);
        if ((accountRow?.siteCredits || 0) > 0) await db.update(accounts).set({ siteCredits: (accountRow?.siteCredits || 0) - 1 }).where(eq(accounts.id, account.id));
      }

      const platformDomain = (process.env.PLATFORM_DOMAIN || "pairsite.space").replace(/^https?:\/\//, "").replace(/\/$/, "");
      return res.status(201).json({
        ...site,
        publicUrl: `https://${site.subdomain}.${platformDomain}`,
      });
    } catch (err: any) {
      log(`Site creation error: ${err.message}`, "sites");
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/tenant/current", (req, res) => {
    if (req.tenantSite === undefined) {
      return res.json({ context: "platform", site: null });
    }
    if (req.tenantSite === null) {
      return res.json({ context: "platform", site: null });
    }
    return res.json({ context: "tenant", site: req.tenantSite });
  });

  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/seed-site", (req, res) => {
      const anyStorage = storage as any;
      if (typeof anyStorage.__devSeedSite !== "function") {
        return res.status(400).json({ error: "Dev seed only available with in-memory storage (no DATABASE_URL set)" });
      }
      const { subdomain, name, customHostname } = req.body || {};
      if (!subdomain || !name) {
        return res.status(400).json({ error: "subdomain and name are required" });
      }
      const site = anyStorage.__devSeedSite({ subdomain, name, customHostname });
      return res.status(201).json(site);
    });
  }

  app.post("/api/generate-session", async (req, res) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { method, phoneNumber, pairServer } = parsed.data;

      if (method === "pairing" && (!phoneNumber || phoneNumber.replace(/[^0-9]/g, "").length < 10)) {
        return res.status(400).json({ error: "Valid phone number with country code is required for pairing method" });
      }

      log(`Creating ${method} session${phoneNumber ? ` for ${phoneNumber}` : ""} using Server ${pairServer || 1}`, "whatsapp");

      const session = await createWhatsAppSession(method, phoneNumber, pairServer, undefined, req.tenantSite?.id ?? null);

      return res.json({
        sessionId: session.sessionId,
        pairingCode: session.pairingCode,
        qrCode: session.qrCode,
        status: session.status,
        message: method === "pairing"
          ? "Connecting to WhatsApp servers... Pairing code will be sent via WebSocket."
          : "Connecting to WhatsApp servers... QR code will be sent via WebSocket.",
      });
    } catch (err: any) {
      log(`Error creating session: ${err.message}`, "whatsapp");
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/session/:sessionId/status", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const status = getSessionStatus(sessionId);

      if (!status) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.json({
        status: status.status,
        sessionId: status.sessionId,
        pairingCode: status.pairingCode,
        qrCode: status.qrCode,
        credentialsBase64: status.credentialsBase64,
        message: getStatusMessage(status.status),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const requestedSiteId = req.query.siteId ? Number(req.query.siteId) : null;
      const ownedSites = await storage.getSitesByAccount(req.user!.id);
      if (requestedSiteId !== null && !ownedSites.some((site) => site.id === requestedSiteId)) return res.status(404).json({ error: "Site not found" });
      const memory = getAnalytics(requestedSiteId);
      const dbData = db ? await db.select().from(sessionsLog).where(requestedSiteId ? eq(sessionsLog.siteId, requestedSiteId) : inArray(sessionsLog.siteId, ownedSites.map((site) => site.id))) : [];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      return res.json({
        connected: memory.connected,
        active: memory.active,
        inactive: db ? dbData.filter((row) => row.status === "terminated" || row.status === "failed").length : memory.inactive,
        totalThisMonth: db ? dbData.filter((row) => row.createdAt >= monthStart).length : memory.totalThisMonth,
        sessions: memory.sessions,
        persistedData: db !== null,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/billing/status", requireAuth, async (req, res) => {
    if (!db) return res.json({ trialActive: true, siteCount: 0, siteLimit: 1, priceMinor: 10000, currency: "KES" });
    const [account] = await db.select().from(accounts).where(eq(accounts.id, req.user!.id)).limit(1);
    const [{ value: siteCount }] = await db.select({ value: count() }).from(sites).where(eq(sites.accountId, req.user!.id));
    const settings = await storage.getAdminSettings();
    const trialEndsAt = account?.trialEndsAt || new Date((account?.trialStartedAt || new Date()).getTime() + settings.trialDays * 86400000);
    return res.json({ trialEndsAt, trialActive: trialEndsAt > new Date(), siteCount: Number(siteCount), siteLimit: account?.siteLimitOverride ?? settings.freeSiteLimit, siteCredits: account?.siteCredits ?? 0, priceMinor: settings.priceMinor, currency: settings.currency });
  });

  app.post("/api/billing/initialize", requireAuth, async (req, res) => {
    if (!db || !paystackSecret()) return res.status(503).json({ error: "Paystack is not configured" });
    const settings = await storage.getAdminSettings();
    const reference = `PS_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${paystackSecret()}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: req.user!.email, amount: settings.priceMinor, currency: settings.currency, reference, callback_url: `${process.env.PUBLIC_URL || "https://pairsite.space"}/dashboard`, metadata: { accountId: req.user!.id, purpose: "pair_site" } }) });
    const result: any = await response.json();
    if (!response.ok || !result.status) return res.status(502).json({ error: result.message || "Could not initialize payment" });
    await db.insert(payments).values({ accountId: req.user!.id, reference, amountMinor: settings.priceMinor, currency: settings.currency, status: "initialized", purpose: "pair_site" });
    return res.json({ authorizationUrl: result.data.authorization_url, reference });
  });

  app.get("/api/billing/verify/:reference", requireAuth, async (req, res) => {
    if (!db || !paystackSecret()) return res.status(503).json({ error: "Paystack is not configured" });
    const [payment] = await db.select().from(payments).where(eq(payments.reference, String(req.params.reference))).limit(1);
    if (!payment || payment.accountId !== req.user!.id) return res.status(404).json({ error: "Payment not found" });
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.reference)}`, { headers: { Authorization: `Bearer ${paystackSecret()}` } });
    const result: any = await response.json();
    if (result.status && result.data?.status === "success") {
      await db.update(payments).set({ status: "success", paidAt: new Date(), metadata: result.data }).where(eq(payments.id, payment.id));
      await db.update(accounts).set({ siteCredits: (await db.select({ credits: accounts.siteCredits }).from(accounts).where(eq(accounts.id, payment.accountId)).limit(1))[0].credits + 1 }).where(eq(accounts.id, payment.accountId));
    }
    return res.json({ status: result.data?.status || "pending", reference: payment.reference });
  });

  app.post("/api/billing/webhook", async (req, res) => {
    const signature = req.headers["x-paystack-signature"];
    const expected = paystackSecret() ? crypto.createHmac("sha512", paystackSecret()!).update(JSON.stringify(req.body)).digest("hex") : "";
    if (!signature || signature !== expected) return res.status(401).json({ error: "Invalid signature" });
    if (db && req.body?.event === "charge.success" && req.body.data?.reference) {
      const [payment] = await db.select().from(payments).where(eq(payments.reference, req.body.data.reference)).limit(1);
      if (payment && payment.status !== "success") {
        await db.update(payments).set({ status: "success", paidAt: new Date(), metadata: req.body.data }).where(eq(payments.id, payment.id));
        const [account] = await db.select().from(accounts).where(eq(accounts.id, payment.accountId)).limit(1);
        if (account) await db.update(accounts).set({ siteCredits: account.siteCredits + 1 }).where(eq(accounts.id, account.id));
      }
    }
    return res.sendStatus(200);
  });

  app.get("/api/quick-links", async (_req, res) => {
    try {
      const links = await storage.getQuickLinks();
      return res.json(links);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.patch("/api/admin/quick-links/:key", async (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD || "Silentwolf906.";
    const authHeader = req.headers["x-admin-password"];
    if (authHeader !== adminPassword) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { key } = req.params;
      const parsed = updateQuickLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const updated = await storage.updateQuickLink(key, parsed.data);
      if (!updated) return res.status(404).json({ error: "Link not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/admin/verify", (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD || "Silentwolf906.";
    const { password } = req.body;
    if (password === adminPassword) {
      return res.json({ success: true });
    }
    return res.status(401).json({ error: "Invalid password" });
  });

  app.get("/api/admin/settings", (req, res) => {
    if (req.headers["x-admin-password"] !== (process.env.ADMIN_PASSWORD || "Silentwolf906.")) return res.status(401).json({ error: "Unauthorized" });
    storage.getAdminSettings().then((settings) => res.json(settings)).catch((err) => res.status(500).json({ error: err.message }));
  });

  app.patch("/api/admin/settings", async (req, res) => {
    if (req.headers["x-admin-password"] !== (process.env.ADMIN_PASSWORD || "Silentwolf906.")) return res.status(401).json({ error: "Unauthorized" });
    if (!db) return res.status(503).json({ error: "Database not configured" });
    const body = req.body || {};
    const [updated] = await db.update(adminSettings).set({ trialDays: Math.max(0, Number(body.trialDays ?? 30)), freeSiteLimit: Math.max(0, Number(body.freeSiteLimit ?? 1)), priceMinor: Math.max(0, Number(body.priceMinor ?? 10000)), currency: String(body.currency || "KES").toUpperCase(), defaultGroupInviteCode: body.defaultGroupInviteCode || null, defaultChannelJid: body.defaultChannelJid || null }).where(eq(adminSettings.id, Number(body.id || 1))).returning();
    return res.json(updated);
  });

  app.get("/api/admin/accounts", async (req, res) => {
    if (req.headers["x-admin-password"] !== (process.env.ADMIN_PASSWORD || "Silentwolf906.")) return res.status(401).json({ error: "Unauthorized" });
    if (!db) return res.json([]);
    const rows = await db.select().from(accounts).orderBy(desc(accounts.createdAt));
    return res.json(rows.map(({ passwordHash, ...safe }) => safe));
  });

  app.get("/api/admin/payments", async (req, res) => {
    if (req.headers["x-admin-password"] !== (process.env.ADMIN_PASSWORD || "Silentwolf906.")) return res.status(401).json({ error: "Unauthorized" });
    if (!db) return res.json([]);
    return res.json(await db.select().from(payments).orderBy(desc(payments.createdAt)));
  });

  app.post("/api/admin/broadcast", async (req, res) => {
    if (req.headers["x-admin-password"] !== (process.env.ADMIN_PASSWORD || "Silentwolf906.")) return res.status(401).json({ error: "Unauthorized" });
    if (!db) return res.status(503).json({ error: "Database not configured" });
    const parsed = z.object({ subject: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(10000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Subject and message are required" });
    const rows = await db.select({ email: accounts.email }).from(accounts);
    const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" }[char] || char));
    const htmlContent = `<div style="font-family:Arial,sans-serif;white-space:pre-line">${escapeHtml(parsed.data.message)}</div><p style="color:#666;font-size:12px">You received this message because you have a PairSite account.</p>`;
    const results = await Promise.all(rows.map(async ({ email }) => ({ email, sent: await sendEmail({ to: email, subject: parsed.data.subject, htmlContent }) })));
    return res.json({ total: results.length, sent: results.filter((result) => result.sent).length, failed: results.filter((result) => !result.sent).length });
  });

  app.post("/api/terminate-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const deleted = await terminateSession(sessionId);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.json({ success: true, message: "Session terminated and cleanup complete" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  return httpServer;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "pending": return "Waiting for connection...";
    case "connecting": return "Establishing WhatsApp link...";
    case "connected": return "Successfully connected to WhatsApp";
    case "failed": return "Connection failed. Please try again.";
    case "terminated": return "Session has been terminated.";
    default: return "Unknown status";
  }
}
