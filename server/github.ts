export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  isFork: boolean;
  parentOwner?: string;
  parentName?: string;
  parentFullName?: string;
  appImageUrl?: string;
}

export class RepoNotFoundError extends Error {
  constructor(url: string) {
    super(`GitHub repository not found: ${url}`);
    this.name = "RepoNotFoundError";
  }
}

export class GitHubApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/**
 * Parses a GitHub repo URL (with or without .git suffix, trailing slash,
 * or protocol) into { owner, repo }. Returns null if it doesn't look like
 * a valid github.com repo URL.
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const normalized = url.trim().replace(/\.git$/, "").replace(/\/+$/, "");
    const u = new URL(normalized);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      return null;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/**
 * Fetches repo metadata from the GitHub API, including fork/parent info
 * needed for ownership verification.
 */
export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "pairsite-platform",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

  if (res.status === 404) {
    throw new RepoNotFoundError(`${owner}/${repo}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GitHubApiError(`GitHub API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  const info: RepoInfo = {
    owner: data.owner?.login,
    name: data.name,
    fullName: data.full_name,
    isFork: !!data.fork,
  };

  try {
    const appRes = await fetch(`https://raw.githubusercontent.com/${data.full_name}/${data.default_branch || "main"}/app.json`, { headers: { "User-Agent": "pairsite-platform" } });
    if (appRes.ok) {
      const app = await appRes.json() as any;
      const candidate = [app.imageUrl, app.image, app.logo, app.thumbnail, app.icon, app.metadata?.image, app.metadata?.logo].find((value) => typeof value === "string" && /^https?:\/\//i.test(value));
      if (candidate) info.appImageUrl = candidate;
    }
  } catch {
    // app.json is optional; repository verification should still succeed.
  }

  if (data.fork && data.parent) {
    info.parentOwner = data.parent.owner?.login;
    info.parentName = data.parent.name;
    info.parentFullName = data.parent.full_name;
  }

  return info;
}

/** The canonical (original, non-fork) identity of a repo: itself if it's
 * not a fork, or its parent if it is. This is what we check for
 * collisions against already-registered sites. */
export function canonicalIdentity(info: RepoInfo): { owner: string; name: string } {
  if (info.isFork && info.parentOwner && info.parentName) {
    return { owner: info.parentOwner, name: info.parentName };
  }
  return { owner: info.owner, name: info.name };
}
