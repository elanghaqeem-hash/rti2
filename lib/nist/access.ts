import { isAdminRequest } from '@/lib/admin/auth';
import { getNistAssessment, verifyNistAssessmentToken } from '@/lib/nist/repository';

export const NIST_ASSESSMENT_COOKIE = 'rti_nist_assessment';

export function parseNistAssessmentSession(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const raw = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${NIST_ASSESSMENT_COOKIE}=`))
    ?.slice(NIST_ASSESSMENT_COOKIE.length + 1);

  if (!raw) return null;

  const decoded = decodeURIComponent(raw);
  const separator = decoded.indexOf('.');
  if (separator <= 0) return null;

  const assessmentId = decoded.slice(0, separator);
  const token = decoded.slice(separator + 1);
  if (!assessmentId || !token) return null;

  return { assessmentId, token };
}

export function hasNistAssessmentAccess(req: Request, assessmentId: string) {
  if (isAdminRequest(req)) return true;
  const session = parseNistAssessmentSession(req);
  if (!session || session.assessmentId !== assessmentId) return false;
  return verifyNistAssessmentToken(assessmentId, session.token);
}

export function getCurrentNistAssessment(req: Request) {
  const session = parseNistAssessmentSession(req);
  if (!session) return null;
  if (!verifyNistAssessmentToken(session.assessmentId, session.token)) return null;
  return getNistAssessment(session.assessmentId);
}

export function serializeNistAssessmentCookie(
  assessmentId: string,
  token: string,
  options?: { maxAgeSeconds?: number },
) {
  const maxAge = options?.maxAgeSeconds ?? 14 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${NIST_ASSESSMENT_COOKIE}=${encodeURIComponent(
    `${assessmentId}.${token}`,
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
