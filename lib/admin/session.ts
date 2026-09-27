export const ADMIN_COOKIE_NAME = 'rti_admin_session';

export type AdminSession = {
  email: string;
  role: 'SUPER_ADMIN';
  iat: number;
  exp: number;
};

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToText(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(
  value: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await importHmacKey(secret);
    return crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(value),
    );
  } catch {
    return false;
  }
}

async function digest(value: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return new Uint8Array(hash);
}

async function safeTextEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function isAdminBootstrapConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET,
  );
}

export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) return false;

  const [emailMatches, passwordMatches] = await Promise.all([
    safeTextEqual(email.trim().toLowerCase(), configuredEmail),
    safeTextEqual(password, configuredPassword),
  ]);

  return emailMatches && passwordMatches;
}

export async function createAdminSessionToken(email: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    email: email.trim().toLowerCase(),
    role: 'SUPER_ADMIN',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const encodedPayload = textToBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return encodedPayload + '.' + signature;
}

export async function verifyAdminSession(
  token?: string | null,
): Promise<AdminSession | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return null;

  const [payloadPart, signaturePart, extra] = token.split('.');
  if (!payloadPart || !signaturePart || extra) return null;

  const signatureValid = await verifySignature(
    payloadPart,
    signaturePart,
    secret,
  );
  if (!signatureValid) return null;

  try {
    const payload = JSON.parse(base64UrlToText(payloadPart)) as AdminSession;
    const now = Math.floor(Date.now() / 1000);

    if (
      payload.role !== 'SUPER_ADMIN' ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
