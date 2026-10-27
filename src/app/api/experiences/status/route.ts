import { NextResponse } from 'next/server';
import { verifyAdminAuth, pollVercelDeployStatus } from '@/lib/experiences-data';

/**
 * GET /api/experiences/status?deployId=X
 *
 * Polls the Vercel deployment status. Used by the Studio to show live
 * "Publishing… building… ready" feedback after the POST /api/experiences
 * route returns a deploymentId.
 *
 * Possible readyStates:
 *   INITIALIZING → QUEUED → BUILDING → NORMALIZING → READY
 *   (or ERROR / CANCELED on failure)
 *
 * The Studio polls every 3s, gives up after ~3 minutes (60 polls).
 */
export async function GET(request: Request) {
  // Verify admin (so anonymous users can't poll deployment IDs)
  const authHeader = request.headers.get('Authorization');
  const auth = await verifyAdminAuth(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: 401 });
  }

  const url = new URL(request.url);
  const deployId = url.searchParams.get('deployId');
  if (!deployId) {
    return NextResponse.json({ ok: false, reason: 'Missing deployId param' }, { status: 400 });
  }

  const status = await pollVercelDeployStatus(deployId);
  if (!status.ok) {
    return NextResponse.json({ ok: false, reason: status.reason }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    readyState: status.readyState,
    url: status.url,
    readyAt: status.readyAt,
    error: status.error,
  });
}
