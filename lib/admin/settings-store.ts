import { BRAND_CONFIG } from '@/lib/config/contact';

export const AI_PROVIDER_IDS = [
  'anthropic',
  'openai',
  'gemini',
  'groq',
  'openrouter',
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type CmsSettings = {
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  positioning: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  whatsappUrl: string;
  officeAddress: string;
  bookingUrl: string;
};

export type AiProviderSettings = {
  enabled: boolean;
  model: string;
  apiKey: string;
};

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export type AdminSettings = {
  version: 1;
  updatedAt: string | null;
  cms: CmsSettings;
  ai: {
    providerOrder: AiProviderId[];
    timeoutMs: number;
    providers: Record<AiProviderId, AiProviderSettings>;
  };
  smtp: SmtpSettings;
};

export type ClientAdminSettings = {
  version: 1;
  updatedAt: string | null;
  cms: CmsSettings;
  ai: {
    providerOrder: AiProviderId[];
    timeoutMs: number;
    providers: Record<
      AiProviderId,
      Omit<AiProviderSettings, 'apiKey'> & { apiKeyConfigured: boolean }
    >;
  };
  smtp: Omit<SmtpSettings, 'password'> & { passwordConfigured: boolean };
};

const SETTINGS_KEY = 'rti:admin:settings:v1';

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;
  return port;
}

function parseTimeout(value: string | undefined): number {
  const timeout = Number(value || 8000);
  if (!Number.isFinite(timeout)) return 8000;
  return Math.min(Math.max(Math.round(timeout), 3000), 20000);
}

function parseProviderOrder(value: string | undefined): AiProviderId[] {
  const ids = new Set<string>(AI_PROVIDER_IDS);
  const configured = (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AiProviderId => ids.has(item));

  const order = configured.length > 0 ? configured : [...AI_PROVIDER_IDS];
  return Array.from(new Set(order));
}

export function getDefaultAdminSettings(): AdminSettings {
  return {
    version: 1,
    updatedAt: null,
    cms: {
      heroEyebrow: BRAND_CONFIG.supportingTaglines[0],
      heroTitle: 'Technology That Moves',
      heroHighlight: 'Business Forward',
      positioning: BRAND_CONFIG.positioning.id,
      contactEmail: BRAND_CONFIG.contact.email,
      phone: BRAND_CONFIG.contact.phone,
      whatsapp: BRAND_CONFIG.contact.whatsapp,
      whatsappUrl: BRAND_CONFIG.contact.whatsappUrl,
      officeAddress: BRAND_CONFIG.contact.address.fullAddress,
      bookingUrl: BRAND_CONFIG.contact.bookingUrl,
    },
    ai: {
      providerOrder: parseProviderOrder(process.env.AI_PROVIDER_ORDER),
      timeoutMs: parseTimeout(process.env.AI_PROVIDER_TIMEOUT_MS),
      providers: {
        anthropic: {
          enabled: Boolean(process.env.ANTHROPIC_API_KEY),
          model:
            process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          apiKey: process.env.ANTHROPIC_API_KEY || '',
        },
        openai: {
          enabled: Boolean(process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
          apiKey: process.env.OPENAI_API_KEY || '',
        },
        gemini: {
          enabled: Boolean(process.env.GEMINI_API_KEY),
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          apiKey: process.env.GEMINI_API_KEY || '',
        },
        groq: {
          enabled: Boolean(process.env.GROQ_API_KEY),
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          apiKey: process.env.GROQ_API_KEY || '',
        },
        openrouter: {
          enabled: Boolean(process.env.OPENROUTER_API_KEY),
          model:
            process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
          apiKey: process.env.OPENROUTER_API_KEY || '',
        },
      },
    },
    smtp: {
      enabled: parseBoolean(process.env.SMTP_ENABLED),
      host: process.env.SMTP_HOST || '',
      port: parsePort(process.env.SMTP_PORT, 587),
      secure: parseBoolean(process.env.SMTP_SECURE),
      username: process.env.SMTP_USERNAME || '',
      password: process.env.SMTP_PASSWORD || '',
      fromName: process.env.SMTP_FROM_NAME || BRAND_CONFIG.brandName,
      fromEmail:
        process.env.SMTP_FROM_EMAIL || BRAND_CONFIG.contact.email,
      replyTo: process.env.SMTP_REPLY_TO || BRAND_CONFIG.contact.email,
    },
  };
}

export function getSettingsStorageStatus() {
  const required = [
    ['CLOUDFLARE_ACCOUNT_ID', process.env.CLOUDFLARE_ACCOUNT_ID],
    ['CLOUDFLARE_KV_NAMESPACE_ID', process.env.CLOUDFLARE_KV_NAMESPACE_ID],
    ['CLOUDFLARE_KV_API_TOKEN', process.env.CLOUDFLARE_KV_API_TOKEN],
    [
      'ADMIN_SETTINGS_ENCRYPTION_KEY',
      process.env.ADMIN_SETTINGS_ENCRYPTION_KEY,
    ],
  ] as const;

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    provider: 'cloudflare-kv' as const,
    configured: missing.length === 0,
    missing,
  };
}

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
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SETTINGS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ADMIN_SETTINGS_ENCRYPTION_KEY is not configured.');
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  );

  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptSettings(settings: AdminSettings): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(settings));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  return JSON.stringify({
    v: 1,
    iv: bytesToBase64Url(iv),
    data: bytesToBase64Url(new Uint8Array(encrypted)),
  });
}

async function decryptSettings(payload: string): Promise<AdminSettings> {
  const envelope = JSON.parse(payload) as {
    v: number;
    iv: string;
    data: string;
  };

  if (envelope.v !== 1 || !envelope.iv || !envelope.data) {
    throw new Error('Unsupported encrypted settings format.');
  }

  const key = await getEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(envelope.iv) },
    key,
    base64UrlToBytes(envelope.data),
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as AdminSettings;
}

function kvUrl(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

  if (!accountId || !namespaceId) {
    throw new Error('Cloudflare KV account or namespace is not configured.');
  }

  return (
    'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(accountId) +
    '/storage/kv/namespaces/' +
    encodeURIComponent(namespaceId) +
    '/values/' +
    encodeURIComponent(SETTINGS_KEY)
  );
}

function kvHeaders(): HeadersInit {
  const token = process.env.CLOUDFLARE_KV_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_KV_API_TOKEN is not configured.');

  return {
    Authorization: 'Bearer ' + token,
  };
}

async function readPersistedSettings(): Promise<AdminSettings | null> {
  const status = getSettingsStorageStatus();
  if (!status.configured) return null;

  const response = await fetch(kvUrl(), {
    method: 'GET',
    headers: kvHeaders(),
    cache: 'no-store',
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('Cloudflare KV read failed with HTTP ' + response.status);
  }

  const payload = await response.text();
  if (!payload) return null;
  return decryptSettings(payload);
}

function mergeWithDefaults(
  persisted: Partial<AdminSettings> | null,
): AdminSettings {
  const defaults = getDefaultAdminSettings();
  if (!persisted) return defaults;

  const storedProviders = persisted.ai?.providers || ({} as any);
  const providers = Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => {
      const stored = storedProviders[id] || {};
      const fallback = defaults.ai.providers[id];
      return [
        id,
        {
          enabled:
            typeof stored.enabled === 'boolean'
              ? stored.enabled
              : fallback.enabled,
          model:
            typeof stored.model === 'string' && stored.model.trim()
              ? stored.model.trim()
              : fallback.model,
          apiKey:
            typeof stored.apiKey === 'string'
              ? stored.apiKey
              : fallback.apiKey,
        },
      ];
    }),
  ) as Record<AiProviderId, AiProviderSettings>;

  const providerOrder = Array.isArray(persisted.ai?.providerOrder)
    ? persisted.ai!.providerOrder.filter((id): id is AiProviderId =>
        AI_PROVIDER_IDS.includes(id as AiProviderId),
      )
    : defaults.ai.providerOrder;

  return {
    version: 1,
    updatedAt:
      typeof persisted.updatedAt === 'string'
        ? persisted.updatedAt
        : defaults.updatedAt,
    cms: {
      ...defaults.cms,
      ...(persisted.cms || {}),
    },
    ai: {
      providerOrder:
        providerOrder.length > 0
          ? Array.from(new Set(providerOrder))
          : defaults.ai.providerOrder,
      timeoutMs:
        typeof persisted.ai?.timeoutMs === 'number'
          ? Math.min(
              Math.max(Math.round(persisted.ai.timeoutMs), 3000),
              20000,
            )
          : defaults.ai.timeoutMs,
      providers,
    },
    smtp: {
      ...defaults.smtp,
      ...(persisted.smtp || {}),
      port:
        typeof persisted.smtp?.port === 'number'
          ? parsePort(String(persisted.smtp.port), defaults.smtp.port)
          : defaults.smtp.port,
    },
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    return mergeWithDefaults(await readPersistedSettings());
  } catch (error) {
    console.warn(
      'Admin settings store unavailable; using environment defaults:',
      error instanceof Error ? error.message : String(error),
    );
    return getDefaultAdminSettings();
  }
}

export async function getPublicCmsSettings(): Promise<CmsSettings> {
  const settings = await getAdminSettings();
  return settings.cms;
}

export async function saveAdminSettings(
  settings: AdminSettings,
): Promise<AdminSettings> {
  const status = getSettingsStorageStatus();
  if (!status.configured) {
    throw new Error(
      'Persistent admin storage is not configured: ' +
        status.missing.join(', '),
    );
  }

  const nextSettings: AdminSettings = {
    ...settings,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  const encrypted = await encryptSettings(nextSettings);
  const response = await fetch(kvUrl(), {
    method: 'PUT',
    headers: {
      ...kvHeaders(),
      'Content-Type': 'application/octet-stream',
    },
    body: encrypted,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      'Cloudflare KV write failed with HTTP ' +
        response.status +
        (detail ? ': ' + detail.slice(0, 200) : ''),
    );
  }

  return nextSettings;
}

export function toClientAdminSettings(
  settings: AdminSettings,
): ClientAdminSettings {
  const providers = Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => [
      id,
      {
        enabled: settings.ai.providers[id].enabled,
        model: settings.ai.providers[id].model,
        apiKeyConfigured: Boolean(settings.ai.providers[id].apiKey),
      },
    ]),
  ) as ClientAdminSettings['ai']['providers'];

  return {
    version: 1,
    updatedAt: settings.updatedAt,
    cms: settings.cms,
    ai: {
      providerOrder: settings.ai.providerOrder,
      timeoutMs: settings.ai.timeoutMs,
      providers,
    },
    smtp: {
      enabled: settings.smtp.enabled,
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      username: settings.smtp.username,
      fromName: settings.smtp.fromName,
      fromEmail: settings.smtp.fromEmail,
      replyTo: settings.smtp.replyTo,
      passwordConfigured: Boolean(settings.smtp.password),
    },
  };
}
