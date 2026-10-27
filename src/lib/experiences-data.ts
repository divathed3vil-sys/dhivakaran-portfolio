/**
 * Experiences data layer v2 — Supabase-free, frontend-first.
 *
 * Schema v2 changes from v1:
 *  - Categories are dynamic (not enum). Each has id/title/subtitle/order/icon.
 *    Admin can rename, reorder, add, delete categories in the Studio.
 *  - Experiences belong to a category via `category_id` (string), not the
 *    old `category` enum. Use `order` for sort instead of `priority`.
 *  - Software is a NEW entity type — tools used (e.g. Photoshop, Python).
 *    Each has a simple-icons CDN slug + progress (0-100) for the mastery bar.
 *    Icons load from https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{slug}.svg
 *    (MIT-licensed, no API key, no Supabase involvement).
 *
 * Persistence (unchanged from v1):
 *  - src/data/experiences.json — committed to repo, statically imported at
 *    build time → zero runtime fetch for public visitors → perfect SEO + LCP.
 *  - POST /api/experiences — admin auth verify → commit JSON to GitHub via
 *    Contents API → trigger Vercel deploy via v13/deployments API.
 *  - GET /api/experiences/status?deployId=X — polls deploy state.
 *
 * Auth (unchanged): ONLY Supabase AUTH (no Storage, no Database) via
 * verifyAdminAuth() — verifies the admin's JWT server-side.
 */

import data from '@/data/experiences.json';

export type Category = {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  icon: string; // lucide icon name for the category header
};

export type Experience = {
  id: string;
  title: string;
  category_id: string;
  status: string;
  description: string;
  icon: string; // lucide icon name (different from software brand icon)
  tags: string[];
  featured: boolean;
  published: boolean;
  order: number;
};

export type Software = {
  id: string;
  name: string;
  slug: string; // simple-icons CDN slug (e.g. "adobephotoshop")
  progress: number; // 0-100 mastery level
  category_id: string;
  order: number;
};

export type ExperiencesData = {
  version: number;
  updatedAt: string;
  categories: Category[];
  experiences: Experience[];
  software: Software[];
};

// ---------- PUBLIC READ (static import) ----------

export function getExperiences(): ExperiencesData {
  return data as ExperiencesData;
}

/**
 * Returns the data structured by category for the public render:
 *   categories sorted by `order`
 *   experiences + software nested under each category, sorted by `order`
 */
export function getExperiencesByCategory(): Array<{
  category: Category;
  experiences: Experience[];
  software: Software[];
}> {
  const d = data as ExperiencesData;
  return [...d.categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      experiences: d.experiences
        .filter((e) => e.category_id === category.id && e.published)
        .sort((a, b) => a.order - b.order),
      software: d.software
        .filter((s) => s.category_id === category.id)
        .sort((a, b) => a.order - b.order),
    }));
}

/**
 * Returns the URL for a software brand icon on the simple-icons CDN
 * (jsdelivr mirror, MIT-licensed, no API key needed, no Supabase).
 *
 * Format: https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{slug}.svg
 *
 * Falls back to a generic placeholder if the slug is invalid (handled in
 * the React component via onError).
 */
export function getSoftwareIconUrl(slug: string): string {
  return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`;
}

/**
 * Returns a human-readable mastery level label derived from progress 0-100.
 * Used as an accessible text label next to the progress bar.
 */
export function getMasteryLabel(progress: number): string {
  if (progress >= 86) return 'Expert';
  if (progress >= 61) return 'Advanced';
  if (progress >= 31) return 'Intermediate';
  return 'Beginner';
}

// ---------- ADMIN AUTH VERIFICATION (unchanged from v1) ----------

export async function verifyAdminAuth(authHeader: string | null): Promise<{ ok: true; email: string } | { ok: false; reason: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, reason: 'Missing Authorization header' };
  }
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) return { ok: false, reason: 'Empty token' };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, reason: 'Supabase env not configured' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: `Auth verify failed: ${res.status}` };
    const user = await res.json();
    if (!user || !user.email) return { ok: false, reason: 'No user in JWT' };

    const adminEmail = process.env.STUDIO_ADMIN_EMAIL || 'diva@studio.local';
    if (user.email !== adminEmail) {
      return { ok: false, reason: `Not admin (email=${user.email})` };
    }
    return { ok: true, email: user.email };
  } catch (e) {
    return { ok: false, reason: `Auth fetch error: ${(e as Error).message}` };
  }
}

// ---------- GITHUB COMMIT (unchanged from v1) ----------

const GITHUB_REPO_OWNER = 'divathed3vil-sys';
const GITHUB_REPO_NAME = 'dhivakaran-portfolio';
const EXPERIENCES_FILE_PATH = 'src/data/experiences.json';
const GITHUB_BRANCH = 'main';

export async function commitExperiencesToGitHub(
  newData: ExperiencesData
): Promise<{ ok: true; commitSha: string } | { ok: false; reason: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'GITHUB_TOKEN not configured' };

  const getFileUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${EXPERIENCES_FILE_PATH}?ref=${GITHUB_BRANCH}`;
  const fileRes = await fetch(getFileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (!fileRes.ok) {
    const errText = await fileRes.text();
    return { ok: false, reason: `GitHub getFile failed (${fileRes.status}): ${errText.slice(0, 200)}` };
  }
  const fileData = await fileRes.json();
  const sha: string | undefined = fileData?.sha;
  if (!sha) return { ok: false, reason: 'GitHub getFile: no sha returned' };

  const content = Buffer.from(JSON.stringify(newData, null, 2) + '\n', 'utf8').toString('base64');
  const commitMessage = `experiences: publish ${newData.experiences.length} items + ${newData.software.length} software across ${newData.categories.length} categories — ${newData.updatedAt}`;

  const putRes = await fetch(getFileUrl.replace(/\?ref=[^&]+/, ''), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      content,
      sha,
      branch: GITHUB_BRANCH,
    }),
    cache: 'no-store',
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return { ok: false, reason: `GitHub putFile failed (${putRes.status}): ${errText.slice(0, 300)}` };
  }

  const putData = await putRes.json();
  const commitSha: string | undefined = putData?.commit?.sha;
  if (!commitSha) return { ok: false, reason: 'GitHub putFile: no commit sha returned' };

  return { ok: true, commitSha };
}

// ---------- VERCEL REDEPLOY (unchanged from v1) ----------

export async function triggerVercelDeploy(): Promise<
  { ok: true; deploymentId: string; deploymentUrl: string } | { ok: false; reason: string }
> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token) return { ok: false, reason: 'VERCEL_TOKEN not configured' };
  if (!projectId) return { ok: false, reason: 'VERCEL_PROJECT_ID not configured' };

  const res = await fetch(`https://api.vercel.com/v13/deployments?projectId=${projectId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'dhivakaran-portfolio',
      project: projectId,
      target: 'production',
      gitSource: {
        type: 'github',
        org: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
        ref: GITHUB_BRANCH,
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, reason: `Vercel deploy trigger failed (${res.status}): ${errText.slice(0, 300)}` };
  }

  const data = await res.json();
  const deploymentId: string | undefined = data?.id;
  const deploymentUrl: string | undefined = data?.url;
  if (!deploymentId) return { ok: false, reason: 'Vercel deploy: no deployment id returned' };

  return { ok: true, deploymentId, deploymentUrl: deploymentUrl || '' };
}

export async function pollVercelDeployStatus(
  deploymentId: string
): Promise<
  | { ok: true; readyState: string; url?: string; readyAt?: number; error?: string }
  | { ok: false; reason: string }
> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return { ok: false, reason: 'VERCEL_TOKEN not configured' };

  const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, reason: `Vercel status poll failed (${res.status}): ${errText.slice(0, 200)}` };
  }
  const data = await res.json();
  return {
    ok: true,
    readyState: data?.readyState || data?.state || 'UNKNOWN',
    url: data?.url,
    readyAt: data?.readyAt,
    error: data?.error,
  };
}
