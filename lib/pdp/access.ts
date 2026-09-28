import { isAdminRequest } from '@/lib/admin/auth';
import {
  getPdpAssessmentRuntime,
  verifyPdpAssessmentTokenRuntime,
} from '@/lib/pdp/runtime-repository';

export const PDP_ASSESSMENT_COOKIE = 'rti_pdp_assessment';

export function parsePdpAssessmentSession(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const raw = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(PDP_ASSESSMENT_COOKIE + '='))
    ?.slice(PDP_ASSESSMENT_COOKIE.length + 1);

  if (!raw) return null;

  const decoded = decodeURIComponent(raw);
  const separator = decoded.indexOf('.');
  if (separator <= 0) return null;

  const assessmentId = decoded.slice(0, separator);
  const token = decoded.slice(separator + 1);
  if (!assessmentId || !token) return null;

  return { assessmentId, token };
}

export async function hasPdpAssessmentAccess(
  req: Request,
  assessmentId: string,
) {
  if (isAdminRequest(req)) return true;
  const session = parsePdpAssessmentSession(req);
  if (!session || session.assessmentId !== assessmentId) return false;
  return verifyPdpAssessmentTokenRuntime(assessmentId, session.token);
}

export async function getCurrentPdpAssessment(req: Request) {
  const session = parsePdpAssessmentSession(req);
  if (!session) return null;
  if (!(await verifyPdpAssessmentTokenRuntime(session.assessmentId, session.token))) {
    return null;
  }
  return getPdpAssessmentRuntime(session.assessmentId);
}

export function serializePdpAssessmentCookie(
  assessmentId: string,
  token: string,
  options?: { maxAgeSeconds?: number },
) {
  const maxAge = options?.maxAgeSeconds ?? 14 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return (
    PDP_ASSESSMENT_COOKIE +
    '=' +
    encodeURIComponent(assessmentId + '.' + token) +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' +
    maxAge +
    secure
  );
}

export function clearPdpAssessmentCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return (
    PDP_ASSESSMENT_COOKIE +
    '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' +
    secure
  );
}
