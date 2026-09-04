import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { Account, AuthUser } from "@shared/schema";
import { log } from "./index";
import { sendWelcomeEmail } from "./email";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthUser {}
  }
}

function toAuthUser(account: Account): AuthUser {
  return {
    id: account.id,
    email: account.email,
    plan: account.plan as AuthUser["plan"],
    githubUsername: account.githubUsername,
  };
}

export function configurePassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const account = await storage.getAccountById(id);
      if (!account) return done(null, false);
      done(null, toAuthUser(account));
    } catch (err) {
      done(err);
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const account = await storage.getAccountByEmail(email);
          if (!account || !account.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const match = await bcrypt.compare(password, account.passwordHash);
          if (!match) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, toAuthUser(account));
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let account = await storage.getAccountByGoogleId(profile.id);
            if (!account) {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(null, false, { message: "Google account has no email" });
              }
              const existingByEmail = await storage.getAccountByEmail(email);
              if (existingByEmail) {
                account = await storage.updateAccount(existingByEmail.id, { googleId: profile.id });
              } else {
                account = await storage.createAccount({
                  email,
                  googleId: profile.id,
                  plan: "free",
                });
                sendWelcomeEmail(account.email).catch((err) => log(`Welcome email error: ${err.message}`, "email"));
              }
            }
            if (!account) return done(null, false);
            return done(null, toAuthUser(account));
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
    log("Google OAuth strategy registered", "auth");
  } else {
    log("Google OAuth skipped (GOOGLE_CLIENT_ID/SECRET not set)", "auth");
  }

  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubId,
          clientSecret: githubSecret,
          callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback",
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            let account = await storage.getAccountByGithubId(profile.id);
            if (!account) {
              const email = profile.emails?.[0]?.value;
              const existingByEmail = email ? await storage.getAccountByEmail(email) : null;
              if (existingByEmail) {
                account = await storage.updateAccount(existingByEmail.id, {
                  githubId: profile.id,
                  githubUsername: profile.username,
                });
              } else {
                account = await storage.createAccount({
                  email: email || `${profile.username}@users.noreply.github.com`,
                  githubId: profile.id,
                  githubUsername: profile.username,
                  plan: "free",
                });
                sendWelcomeEmail(account.email).catch((err) => log(`Welcome email error: ${err.message}`, "email"));
              }
            } else if (!account.githubUsername) {
              account = await storage.updateAccount(account.id, { githubUsername: profile.username });
            }
            if (!account) return done(null, false);
            return done(null, toAuthUser(account));
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
    log("GitHub OAuth strategy registered", "auth");
  } else {
    log("GitHub OAuth skipped (GITHUB_CLIENT_ID/SECRET not set)", "auth");
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required" });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
