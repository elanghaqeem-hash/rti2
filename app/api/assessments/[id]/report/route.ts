import { getIsoAssessment, getIsoResults } from '@/lib/iso27001/repository';
import { buildIsoReadinessPdf } from '@/lib/iso27001/pdf';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const token = req.headers.get('x-assessment-token')?.trim() || '';

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
      requirementScore:
        assessment.requirementScore == null ? null : Number(assessment.requirementScore),
      controlScore:
        assessment.controlScore == null ? null : Number(assessment.controlScore),
      evidenceScore:
        assessment.evidenceScore == null ? null : Number(assessment.evidenceScore),
      governanceScore:
        assessment.governanceScore == null ? null : Number(assessment.governanceScore),
      auditScore:
        assessment.auditScore == null ? null : Number(assessment.auditScore),
      stage1Score:
        assessment.stage1Score == null ? null : Number(assessment.stage1Score),
      stage2Score:
        assessment.stage2Score == null ? null : Number(assessment.stage2Score),
      gatesCompleted:
        assessment.gatesCompleted == null ? null : Number(assessment.gatesCompleted),
      gatesTotal: Array.isArray(result.gates) ? result.gates.length : 0,
      gaps: result.gaps,
      roadmap: result.roadmap,
      reportTitle:
        String(result.reportTemplate?.name || '') || 'RTI ISO/IEC 27001 Readiness Assessment',
      headerText:
        String(result.reportTemplate?.headerText || '') ||
        'PT Riset Teknologi Indonesia | ISO/IEC 27001 Readiness Assessment',
      footerText:
        String(result.reportTemplate?.footerText || '') ||
        'Confidential | Generated through RTI ISO/IEC 27001 Readiness Diagnostic Tool',
      disclaimer:
        String(result.reportTemplate?.disclaimerText || result.settings?.DISCLAIMER || '') ||
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
