/**
 * Experiences data layer — Supabase-free, frontend-first.
 *
 * The experiences data is a static JSON file in the repo at
 * `src/data/experiences.json`. Public reads import it statically at build time
 * (zero runtime fetch, perfect SEO/LCP). Studio edits go through the API
 * route which commits the new JSON to GitHub via the GitHub Contents API +
 * triggers a Vercel production deploy via the Vercel API. No Supabase
 * Storage, no Supabase Database — only Supabase AUTH (separate concern, used
 * only to verify the admin session server-side).
 *
 * Tokens (all server-side only, never client-exposed):
 *  - GITHUB_TOKEN        — commits experiences.json to the GitHub repo
 *  - VERCEL_TOKEN        — triggers a production redeploy via Vercel API
 *  - VERCEL_PROJECT_ID   — target project for the redeploy
 *  - NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY — used by the
 *    server-side supabase client only to verify the admin's session JWT.
 */

import data from '@/data/experiences.json';

export type ExperienceCategory = 'exposed' | 'development' | 'fixed';

export type Experience = {
  id: string;
  title: string;
  category: ExperienceCategory;
  status: string;
  description: string;
  icon: string;
  tags: string[];
  priority: number;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExperiencesData = {
  version: number;
  updatedAt: string;
  experiences: Experience[];
};

// ---------- PUBLIC READ (static import) ----------

/**
 * Returns the experiences data statically imported from the JSON file.
 * This is called by the public Experiences component at build time →
 * the data is baked into the HTML, zero runtime fetch.
 */
export function getExperiences(): ExperiencesData {
  return data as ExperiencesData;
}

/**
 * Returns only experiences that should be visible on the public site
 * (published === true), sorted by priority DESC within each category.
 */
export function getPublishedExperiencesByCategory(): Record<ExperienceCategory, Experience[]> {
  const all = (data as ExperiencesData).experiences.filter((e) => e.published);
  return {
    exposed: all.filter((e) => e.category === 'exposed').sort((a, b) => b.priority - a.priority),
    development: all.filter((e) => e.category === 'development').sort((a, b) => b.priority - a.priority),
    fixed: all.filter((e) => e.category === 'fixed').sort((a, b) => b.priority - a.priority),
  };
}

// ---------- ADMIN AUTH VERIFICATION ----------

/**
 * Verifies that the incoming request is from the authenticated Studio admin.
 *
 * The Studio client (after Supabase `signInWithPassword` succeeds) has the
 * user's access_token (JWT) in its session. The client sends it as
 * `Authorization: Bearer <jwt>` to the API route. This function uses the
 * Supabase server client (anon key only — no service role needed) to verify
 * the JWT and check that the email matches the admin's email.
 *
 * This is the ONLY Supabase call in the experiences flow — and it's an AUTH
 * call, not a Storage/Database call. Honors the "no Supabase for experiences
 * data" constraint strictly.
 */
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

  // Verify the JWT via Supabase Auth API. The anon key is safe to use
  // server-side — it only lets us READ user identity, not modify data.
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

    // The Studio's username "diva" maps to email "diva@studio.local" (see
    // src/lib/supabase.ts → STUDIO_AUTH_EMAIL_SUFFIX). This is the only
    // allowed admin email for the experiences publish flow.
    const adminEmail = process.env.STUDIO_ADMIN_EMAIL || 'diva@studio.local';
    if (user.email !== adminEmail) {
      return { ok: false, reason: `Not admin (email=${user.email})` };
    }
    return { ok: true, email: user.email };
  } catch (e) {
    return { ok: false, reason: `Auth fetch error: ${(e as Error).message}` };
  }
}

// ---------- GITHUB COMMIT ----------

const GITHUB_REPO_OWNER = 'divathed3vil-sys';
const GITHUB_REPO_NAME = 'dhivakaran-portfolio';
const EXPERIENCES_FILE_PATH = 'src/data/experiences.json';
const GITHUB_BRANCH = 'main';

/**
 * Commits the new experiences JSON to GitHub via the Contents API.
 * Uses the file's current SHA for atomic update (no race conditions
 * if two admin sessions edit simultaneously — second one gets a 409).
 *
 * Returns the new commit SHA on success.
 */
export async function commitExperiencesToGitHub(
  newData: ExperiencesData
): Promise<{ ok: true; commitSha: string } | { ok: false; reason: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'GITHUB_TOKEN not configured' };

  // 1. Fetch the current file to get its SHA (required for update).
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

  // 2. PUT the new content with the SHA for atomic update.
  const content = Buffer.from(JSON.stringify(newData, null, 2) + '\n', 'utf8').toString('base64');
  const commitMessage = `experiences: publish ${newData.experiences.length} items — ${newData.updatedAt}`;

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

// ---------- VERCEL REDEPLOY ----------

/**
 * Triggers a production deployment from the latest GitHub commit on main.
 *
 * The Vercel project is NOT GitHub-linked (gitRepository: null in project
 * settings), but the Vercel API still accepts `gitSource: { type: 'github',
 * org, repo, ref: 'main' }` and triggers a deploy from the latest commit.
 * Verified working via API test on 2026-10-27.
 *
 * Returns the deployment ID for status polling.
 */
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

/**
 * Polls the deployment status. Used by the /api/experiences/status route
 * to give the Studio UI live "Publishing… building… ready" feedback.
 *
 * Possible readyStates: INITIALIZING → QUEUED → BUILDING → NORMALIZING → READY
 * (or ERROR / CANCELED on failure)
 */
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
