import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'rti_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type AdminSessionPayload = {
  sub: string;
  role: 'admin';
  iat: number;
  exp: number;
};

function sessionSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || '').trim();
}

function encode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(encodedPayload: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminAuthConfigured() {
  return Boolean(
    String(process.env.ADMIN_USERNAME || '').trim() &&
      String(process.env.ADMIN_PASSWORD || '') &&
      sessionSecret(),
  );
}

export function validateAdminCredentials(username: string, password: string) {
  const configuredUser = String(process.env.ADMIN_USERNAME || '').trim();
  const configuredPassword = String(process.env.ADMIN_PASSWORD || '');

  if (!configuredUser || !configuredPassword || !sessionSecret()) return false;

  return safeEqual(username, configuredUser) && safeEqual(password, configuredPassword);
}

export function createAdminSession(username: string) {
  if (!sessionSecret()) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: username,
    role: 'admin',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const encoded = encode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAdminSession(token: string | undefined | null) {
  if (!token || !sessionSecret()) return null;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  if (!expected || !safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(decode(encoded)) as AdminSessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (
      payload.role !== 'admin' ||
      !payload.sub ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function adminSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  return verifyAdminSession(token ? decodeURIComponent(token) : undefined);
}

export function isAdminRequest(req: Request) {
  return adminSessionFromRequest(req)?.role === 'admin';
}

export const ADMIN_SESSION_TTL_SECONDS = SESSION_TTL_SECONDS;
