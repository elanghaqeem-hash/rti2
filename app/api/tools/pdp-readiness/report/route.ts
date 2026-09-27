import { createHash } from 'node:crypto';
import { generatePdpPdf } from '@/lib/pdp/report';
import {
  loadPdpAssessment,
  nextPdpReportVersion,
  recordPdpReport,
  logPdpEvent,
} from '@/lib/pdp/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenFrom(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function fileName(companyName: string) {
  const safe = (companyName || 'organization')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return 'RTI-UU-PDP-Readiness-' + (safe || 'organization') + '.pdf';
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, {
    bucket: 'pdp-report',
    limit: 8,
    windowSeconds: 60,
  });
  if (!limited.allowed) {
    return new Response('Report generation temporarily unavailable.', {
      status: limited.reason === 'limit-exceeded' ? 429 : 503,
      headers: rateLimitHeaders(limited),
    });
  }

  const url = new URL(req.url);
  const assessmentId = String(url.searchParams.get('id') || '').slice(0, 80);
  const token = tokenFrom(req);

  if (!assessmentId || !token) {
    return new Response('Assessment id and resume token are required.', {
      status: 400,
      headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) },
    });
  }

  try {
    const assessment = loadPdpAssessment(assessmentId, token);
    if (!assessment || !assessment.result) {
      return new Response('Complete scoring before generating the report.', {
        status: 409,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) },
      });
    }

    const pdf = generatePdpPdf(assessment.profile, assessment.result);
    const checksum = createHash('sha256').update(pdf).digest('hex');
    const version = nextPdpReportVersion(assessmentId);
    recordPdpReport(assessmentId, version, checksum);
    logPdpEvent(assessmentId, 'report_generated', { version, checksum });

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + fileName(assessment.profile.companyName) + '"',
        'Content-Length': String(pdf.byteLength),
        'Cache-Control': 'private, no-store',
        'X-RTI-Report-Version': String(version),
        'X-RTI-Report-SHA256': checksum,
        ...rateLimitHeaders(limited),
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : 'Unable to generate report.',
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limited) },
      },
    );
  }
}
