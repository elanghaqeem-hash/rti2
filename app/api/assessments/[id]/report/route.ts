import { getIsoAssessment, getIsoResults } from '@/lib/iso27001/repository';
import { buildIsoReadinessPdf } from '@/lib/iso27001/pdf';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const headerToken = req.headers.get('x-assessment-token')?.trim() || '';
    const queryToken = url.searchParams.get('token')?.trim() || '';
    const token = headerToken || queryToken;

    const detail = getIsoAssessment(id, token);
    const result = getIsoResults(id, token);
    const assessment = result.assessment;

    const pdf = buildIsoReadinessPdf({
      organizationName: String(assessment.organizationName || ''),
      assessmentId: id,
      assessmentDate: String(assessment.updatedAt || new Date().toISOString()),
      frameworkVersion: String(assessment.frameworkVersion || ''),
      mode: String(assessment.mode || ''),
      overallScore:
        assessment.overallScore == null ? null : Number(assessment.overallScore),
      readinessLevel:
        assessment.readinessLevel == null ? null : String(assessment.readinessLevel),
      evidenceScore:
        assessment.evidenceScore == null ? null : Number(assessment.evidenceScore),
      governanceScore:
        assessment.governanceScore == null ? null : Number(assessment.governanceScore),
      auditScore:
        assessment.auditScore == null ? null : Number(assessment.auditScore),
      gatesCompleted:
        assessment.gatesCompleted == null ? null : Number(assessment.gatesCompleted),
      gatesTotal: Array.isArray(result.gates) ? result.gates.length : 0,
      gaps: result.gaps,
      roadmap: result.roadmap,
      disclaimer:
        String(result.settings?.DISCLAIMER || '') ||
        'This is an RTI readiness indicator and not an official ISO certification score.',
    });

    const safeName = String((detail.assessment as Record<string, unknown>).organization_name || 'organization')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 60);

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="RTI-ISO27001-Readiness-${safeName}.pdf"`,
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Report unavailable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
