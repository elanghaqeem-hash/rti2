import { buildNistExecutivePdf } from '@/lib/nist/pdf';
import { hasNistAssessmentAccess } from '@/lib/nist/access';
import {
  getNistAssessment,
  getStoredNistResult,
  writeNistAudit,
} from '@/lib/nist/repository';
import { enforceRateLimit, rateLimitHeaders } from '@/lib/security/request-protection';

export const runtime = 'nodejs';

function safeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'organization';
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const rateLimit = await enforceRateLimit(req, {
    bucket: 'nist-report',
    limit: 12,
    windowSeconds: 300,
  });
  const rlHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return new Response('Report request limit reached.', {
      status: rateLimit.reason === 'limit-exceeded' ? 429 : 503,
      headers: { 'Cache-Control': 'no-store', ...rlHeaders },
    });
  }

  try {
    if (!hasNistAssessmentAccess(req, id)) {
      return new Response('Assessment access denied.', {
        status: 403,
        headers: { 'Cache-Control': 'no-store', ...rlHeaders },
      });
    }

    const assessment = getNistAssessment(id);
    const result = getStoredNistResult(id);
    const pdf = buildNistExecutivePdf(assessment, result);
    const filename =
      `RTI-NIST-Cyber-Quick-Check-${safeFilename(assessment.organization.companyName)}-${id.slice(0, 8)}.pdf`;

    writeNistAudit({
      actor: assessment.respondent.email,
      action: 'report.downloaded',
      resourceType: 'nist_assessment',
      resourceId: id,
      userAgent: req.headers.get('user-agent') || undefined,
      after: {
        frameworkVersion: assessment.frameworkVersion,
        questionnaireVersion: assessment.questionnaireVersion,
      },
    });

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        ...rlHeaders,
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : 'Report generation failed.',
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', ...rlHeaders },
      },
    );
  }
}
