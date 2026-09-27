import { NextResponse } from 'next/server';
import {
  FinderDatabaseUnavailableError,
  getFinderAssessmentResult,
} from '@/lib/enterprise-finder/repository';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const assessmentId = String(id || '').trim();
  const token = req.headers.get('x-assessment-token') || '';

  if (!assessmentId || !token) {
    return NextResponse.json(
      { success: false, error: 'Assessment ID dan secure token wajib tersedia.' },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = getFinderAssessmentResult(assessmentId, token);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Assessment belum selesai atau result belum tersedia.' },
        { status: 404, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { success: true, result },
      { headers: NO_STORE },
    );
  } catch (error) {
    const invalidToken =
      error instanceof Error && error.message === 'invalid-assessment-token';
    const unavailable = error instanceof FinderDatabaseUnavailableError;

    return NextResponse.json(
      {
        success: false,
        error: invalidToken
          ? 'Assessment token tidak valid.'
          : unavailable
            ? 'Database Enterprise Solution Finder belum siap.'
            : 'Result assessment tidak dapat dimuat.',
      },
      {
        status: invalidToken ? 401 : unavailable ? 503 : 500,
        headers: NO_STORE,
      },
    );
  }
}
