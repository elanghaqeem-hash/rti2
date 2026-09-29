import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'rti_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type AdminSessionPayload = {
  sub: string;
  role: 'admin';
  userId?: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
  authSource?: 'database' | 'legacy-env';
  iat: number;
  exp: number;
};

export type AdminSessionIdentity = {
  sub: string;
  userId?: string | null;
  roles?: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
  authSource?: 'database' | 'legacy-env';
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

export function adminSessionConfigured() {
  return Boolean(sessionSecret());
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

export function createAdminSession(identity: string | AdminSessionIdentity) {
  if (!sessionSecret()) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.');
  }

  const normalized: AdminSessionIdentity =
    typeof identity === 'string'
      ? { sub: identity, roles: ['super_admin'], permissions: ['*'], authSource: 'legacy-env' }
      : identity;

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: normalized.sub,
    role: 'admin',
    userId: normalized.userId ?? null,
    roles: Array.from(new Set(normalized.roles || [])).slice(0, 16),
    permissions: Array.from(new Set(normalized.permissions || [])).slice(0, 128),
    mustChangePassword: normalized.mustChangePassword === true,
    authSource: normalized.authSource,
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

    if (!Array.isArray(payload.roles)) payload.roles = ['super_admin'];
    if (!Array.isArray(payload.permissions)) payload.permissions = ['*'];
    return payload;
  } catch {
    return null;
  }
}

export function adminSessionHasPermission(
  session: AdminSessionPayload | null | undefined,
  permission: string,
) {
  if (!session) return false;
  if (session.roles.includes('super_admin')) return true;
  if (session.permissions.includes('*') || session.permissions.includes(permission)) return true;
  const namespace = permission.includes(':') ? permission.split(':')[0] : permission;
  return session.permissions.includes(namespace + ':*');
}

export function adminSessionHasAnyPermission(
  session: AdminSessionPayload | null | undefined,
  permissions: string[],
) {
  return permissions.some((permission) => adminSessionHasPermission(session, permission));
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
