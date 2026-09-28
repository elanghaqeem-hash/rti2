import { NextResponse } from 'next/server';
import {
  listScopingDocuments,
  storeAndParseScopingDocument,
} from '@/lib/project-estimator/documents';
import { verifyEstimatorSessionAccess } from '@/lib/project-estimator/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get('sessionId') || '').trim();
  const resumeToken = String(req.headers.get('x-rti-resume-token') || '').trim();
  if (!sessionId || !resumeToken) {
    return NextResponse.json({ success: false, error: 'Session access token is required.' }, { status: 400 });
  }
  if (!(await verifyEstimatorSessionAccess(sessionId, resumeToken))) {
    return NextResponse.json({ success: false, error: 'Estimator draft access denied.' }, { status: 403 });
  }
  return NextResponse.json(
    { success: true, documents: await listScopingDocuments(sessionId) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  const limit = await enforceRateLimit(req, {
    bucket: 'project-estimator-documents',
    limit: 10,
    windowSeconds: 300,
  });
  const headers = { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: limit.reason === 'limit-exceeded' ? 'Upload limit reached. Try again shortly.' : 'API protection is unavailable.' },
      { status: limit.reason === 'limit-exceeded' ? 429 : 503, headers },
    );
  }

  const form = await req.formData().catch(() => null);
  const sessionId = String(form?.get('sessionId') || '').trim();
  const resumeToken = String(form?.get('resumeToken') || '').trim();
  const file = form?.get('file');

  if (!sessionId || !resumeToken || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'Session, access token and file are required.' },
      { status: 400, headers },
    );
  }

  try {
    const result = await storeAndParseScopingDocument({ sessionId, resumeToken, file });
    return NextResponse.json({ success: true, document: result }, { headers });
  } catch (error) {
    console.error('Estimator document intake failed:', error instanceof Error ? error.message : String(error));
    const message = error instanceof Error ? error.message : 'Document intake failed.';
    const status = /access denied/i.test(message) ? 403 : 422;
    return NextResponse.json(
      {
        success: false,
        error: status === 403 ? 'Estimator draft access denied.' : message,
      },
      { status, headers },
    );
  }
}
