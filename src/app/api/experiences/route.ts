import { NextResponse } from 'next/server';
import {
  getExperiences,
  verifyAdminAuth,
  commitExperiencesToGitHub,
  triggerVercelDeploy,
  type ExperiencesData,
  type Experience,
  type Category,
  type Software,
} from '@/lib/experiences-data';

/**
 * GET /api/experiences
 *
 * Public read. Returns the experiences JSON (statically imported from
 * src/data/experiences.json at build time).
 *
 * Cache-Control: edge-cached for 1 hour, stale-while-revalidate for 24h.
 * After a publish (POST), the Studio invalidates its React Query cache
 * immediately + polls the new deploy status; the public edge cache refreshes
 * naturally within 1h or on the next request after the new deploy goes live.
 *
 * Note: even though the data is baked into the static HTML at build time,
 * this route exists so the Studio can fetch the CURRENT data for editing
 * without having to wait for the next deploy to load it.
 */
export async function GET() {
  const data = getExperiences();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

/**
 * POST /api/experiences
 *
 * Admin-only publish flow:
 *   1. Verify the admin session (Supabase AUTH via verifyAdminAuth — the
 *      ONLY Supabase call in this flow; no Storage, no Database).
 *   2. Validate the payload (must include `experiences` array).
 *   3. Commit the new JSON to GitHub via the Contents API (atomic with SHA).
 *   4. Trigger a Vercel production deploy from the new commit.
 *   5. Return the deployment ID so the Studio can poll the status.
 *
 * Body shape:
 *   { experiences: Experience[], version: number, updatedAt: string }
 *
 * Response shape:
 *   { ok: true, commitSha: string, deploymentId: string }
 *   { ok: false, reason: string }
 *
 * The Studio then polls GET /api/experiences/status?deployId=X every 3s
 * until readyState === 'READY'.
 */
export async function POST(request: Request) {
  // 1. Admin auth verify (Supabase AUTH only, no Storage/Database)
  const authHeader = request.headers.get('Authorization');
  const auth = await verifyAdminAuth(authHeader);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: auth.reason },
      { status: 401 }
    );
  }

  // 2. Parse + validate payload (v2 schema)
  let body: Partial<ExperiencesData>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || !Array.isArray(body.categories) || body.categories.length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'Payload must include non-empty categories array' },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.experiences)) {
    return NextResponse.json(
      { ok: false, reason: 'Payload must include experiences array (may be empty)' },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.software)) {
    return NextResponse.json(
      { ok: false, reason: 'Payload must include software array (may be empty)' },
      { status: 400 }
    );
  }

  // Validate each category
  for (const c of body.categories as Category[]) {
    if (!c.id || !c.title || !c.icon || typeof c.order !== 'number') {
      return NextResponse.json(
        { ok: false, reason: `Category missing required field: ${c.id || c.title || 'unknown'}` },
        { status: 400 }
      );
    }
  }

  // Validate each experience
  const validCatIds = new Set((body.categories as Category[]).map((c) => c.id));
  for (const e of body.experiences as Experience[]) {
    if (!e.id || !e.title || !e.category_id || !e.status || !e.description || !e.icon) {
      return NextResponse.json(
        { ok: false, reason: `Experience missing required field: ${e.id || e.title || 'unknown'}` },
        { status: 400 }
      );
    }
    if (!validCatIds.has(e.category_id)) {
      return NextResponse.json(
        { ok: false, reason: `Experience references unknown category_id: ${e.category_id} (id=${e.id})` },
        { status: 400 }
      );
    }
  }

  // Validate each software entry
  for (const s of body.software as Software[]) {
    if (!s.id || !s.name || !s.slug || typeof s.progress !== 'number' || !s.category_id) {
      return NextResponse.json(
        { ok: false, reason: `Software missing required field: ${s.id || s.name || 'unknown'}` },
        { status: 400 }
      );
    }
    if (!validCatIds.has(s.category_id)) {
      return NextResponse.json(
        { ok: false, reason: `Software references unknown category_id: ${s.category_id} (id=${s.id})` },
        { status: 400 }
      );
    }
    if (s.progress < 0 || s.progress > 100) {
      return NextResponse.json(
        { ok: false, reason: `Software progress must be 0-100: ${s.id} (got ${s.progress})` },
        { status: 400 }
      );
    }
  }

  // 3. Build the new data envelope (v2)
  const newData: ExperiencesData = {
    version: 2,
    updatedAt: body.updatedAt || new Date().toISOString(),
    categories: body.categories as Category[],
    experiences: body.experiences as Experience[],
    software: body.software as Software[],
  };

  // 4. Commit to GitHub
  const commit = await commitExperiencesToGitHub(newData);
  if (!commit.ok) {
    return NextResponse.json(
      { ok: false, reason: commit.reason },
      { status: 502 }
    );
  }

  // 5. Trigger Vercel deploy from the new commit
  const deploy = await triggerVercelDeploy();
  if (!deploy.ok) {
    // GitHub commit succeeded but deploy trigger failed.
    // The commit is still on GitHub — admin can manually trigger a deploy
    // later via the Vercel dashboard or by re-running the publish.
    return NextResponse.json(
      {
        ok: false,
        reason: `GitHub commit succeeded (sha=${commit.commitSha.slice(0, 7)}) but Vercel deploy trigger failed: ${deploy.reason}`,
        commitSha: commit.commitSha,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    commitSha: commit.commitSha,
    deploymentId: deploy.deploymentId,
    deploymentUrl: deploy.deploymentUrl,
  });
}
