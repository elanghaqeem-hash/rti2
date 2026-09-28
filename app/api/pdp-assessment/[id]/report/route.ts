import { randomUUID } from 'node:crypto';
import { hasPdpAssessmentAccess } from '@/lib/pdp/access';
import {
  getPdpAssessmentRuntime,
  getPdpResultRuntime,
  writePdpAuditRuntime,
} from '@/lib/pdp/runtime-repository';
import { buildPdpReadinessPdf } from '@/lib/pdp/pdf';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await hasPdpAssessmentAccess(req, id))) {
    return Response.json(
      { success: false, error: 'Assessment access denied.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const assessment = await getPdpAssessmentRuntime(id);
    if (!assessment) throw new Error('Assessment not found.');
    const result = await getPdpResultRuntime(id);
    const reportTitle =
      result.parameters.PDP_REPORT_TITLE ||
      'RTI UU PDP Data Protection Readiness Assessment';
    const disclaimer =
      result.parameters.PDP_DISCLAIMER ||
      'Hasil ini merupakan indikator kesiapan internal dan bukan opini hukum atau pernyataan kepatuhan resmi.';

    const pdf = buildPdpReadinessPdf({
      reportTitle,
      companyName: assessment.companyName,
      assessmentId: id,
      assessmentDate: assessment.completedAt || new Date().toISOString(),
      frameworkVersion: assessment.frameworkVersion,
      assessmentType: assessment.assessmentType,
      implementationScore: result.implementationScore,
      evidenceScore: result.evidenceScore,
      overallScore: result.overallScore,
      readinessLevel: result.readinessLevel,
      gatesCompleted: result.gates.completed,
      gatesTotal: result.gates.total,
      domainScores: result.domainScores,
      findings: result.findings,
      roadmap: result.roadmap,
      disclaimer,
    });

    const reportId = randomUUID();
    await writePdpAuditRuntime({
      actor: 'Public Assessment User',
      action: 'report.generated',
      resourceType: 'pdp_report',
      resourceId: id,
      after: { reportId },
    });

    const safeName = assessment.companyName
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 60);

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="RTI-UU-PDP-Readiness-' + safeName + '.pdf"',
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
