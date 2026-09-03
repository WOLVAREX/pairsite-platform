import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { Site } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      tenantSite?: Site | null;
    }
  }
}

// The apex platform domain (marketing site, dashboard, auth). Configurable
// so local dev can use a different value (e.g. "localhost:5000").
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || "pairsite.space";

function stripPort(host: string): string {
  return host.split(":")[0];
}

/**
 * Resolves which tenant (if any) a request belongs to, based on the Host
 * header, and attaches it as req.tenantSite:
 *   - undefined -> not yet resolved (shouldn't happen after this runs)
 *   - null      -> platform/marketing context (apex domain, or unknown host)
 *   - Site      -> a specific developer's pair site
 *
 * Subdomains of PLATFORM_DOMAIN are looked up by their subdomain label.
 * Any other hostname is checked against verified custom domains.
 */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawHost = req.headers.host || "";
    const host = stripPort(rawHost);
    const platformHost = stripPort(PLATFORM_DOMAIN);

    if (!host || host === platformHost || host === `www.${platformHost}`) {
      req.tenantSite = null;
      return next();
    }

    if (host.endsWith(`.${platformHost}`)) {
      const subdomain = host.slice(0, -(`.${platformHost}`.length));
      const site = await storage.getSiteBySubdomain(subdomain);
      req.tenantSite = site;
      return next();
    }

    // Not a subdomain of our platform - check verified custom domains
    const site = await storage.getVerifiedSiteByHostname(host);
    req.tenantSite = site;
    return next();
  } catch (err) {
    // Resolution failure shouldn't take down the request - fall back to
    // platform context rather than 500ing every page load.
    req.tenantSite = null;
    return next();
  }
}
