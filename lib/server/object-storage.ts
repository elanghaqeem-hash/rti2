import { getOpenNextCloudflareEnv } from '@/lib/server/runtime-database';

type R2ObjectLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type R2BucketLike = {
  put: (key: string, value: ArrayBuffer | ArrayBufferView | string, options?: unknown) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectLike | null>;
  delete: (key: string) => Promise<void>;
};

export type PrivateObjectStorageBackend =
  | 'cloudflare-r2'
  | 'filesystem'
  | 'disabled'
  | 'unconfigured';

export interface PrivateObjectStorageHealth {
  enabled: boolean;
  available: boolean;
  backend: PrivateObjectStorageBackend;
}

function asR2(value: unknown): R2BucketLike | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<R2BucketLike>;
  if (
    typeof candidate.put !== 'function' ||
    typeof candidate.get !== 'function' ||
    typeof candidate.delete !== 'function'
  ) {
    return null;
  }
  return candidate as R2BucketLike;
}

function configuredDriver() {
  const driver = String(process.env.RTI_STORAGE_DRIVER || 'auto').trim().toLowerCase();
  if (!['auto', 'filesystem', 'r2'].includes(driver)) {
    throw new Error(
      'RTI_STORAGE_DRIVER must be one of: auto, filesystem, r2.',
    );
  }
  return driver as 'auto' | 'filesystem' | 'r2';
}

function uploadsEnabled() {
  return String(process.env.RTI_FILE_UPLOADS_ENABLED || 'false').toLowerCase() === 'true';
}

async function nodeRoot() {
  const driver = configuredDriver();
  if (driver === 'r2') {
    throw new Error(
      'RTI_STORAGE_DRIVER=r2 requires the Cloudflare RTI_FILES binding. Standard Node uses filesystem storage.',
    );
  }

  const configured = String(process.env.RTI_UPLOAD_DIR || '').trim();
  if (!configured) throw new Error('RTI object storage is not configured.');

  const path = await import('node:path');
  const root = path.resolve(configured);
  const publicRoot = path.resolve(process.cwd(), 'public');

  if (root === publicRoot || root.startsWith(publicRoot + path.sep)) {
    throw new Error('RTI upload directory must be outside the public web root.');
  }

  return { root, path };
}

function cloudflareBucket() {
  const env = getOpenNextCloudflareEnv();
  const driver = configuredDriver();
  const bucket = asR2(env?.RTI_FILES);

  if (env && driver === 'filesystem') {
    throw new Error(
      'RTI_STORAGE_DRIVER=filesystem is unavailable in the Cloudflare Worker runtime.',
    );
  }

  return { env, bucket };
}

export async function putPrivateObject(params: {
  key: string;
  buffer: Uint8Array;
  contentType?: string;
}) {
  const { env, bucket } = cloudflareBucket();

  if (bucket) {
    await bucket.put(params.key, params.buffer, {
      httpMetadata: params.contentType
        ? { contentType: params.contentType }
        : undefined,
    });
    return {
      backend: 'cloudflare-r2' as const,
      descriptor: 'Cloudflare R2 binding RTI_FILES',
    };
  }

  if (env) throw new Error('Cloudflare R2 binding RTI_FILES is not configured.');

  const { root, path } = await nodeRoot();
  const { mkdir, writeFile } = await import('node:fs/promises');
  const target = path.join(root, params.key);

  if (!target.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key.');
  }

  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, params.buffer, { flag: 'wx', mode: 0o600 });

  return { backend: 'filesystem' as const, descriptor: root };
}

export async function getPrivateObject(key: string) {
  const { env, bucket } = cloudflareBucket();

  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return null;
    return new Uint8Array(await object.arrayBuffer());
  }

  if (env) throw new Error('Cloudflare R2 binding RTI_FILES is not configured.');

  const { root, path } = await nodeRoot();
  const target = path.join(root, key);

  if (!target.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key.');
  }

  const { readFile } = await import('node:fs/promises');
  try {
    return new Uint8Array(await readFile(target));
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

export async function deletePrivateObject(key: string) {
  const { env, bucket } = cloudflareBucket();

  if (bucket) {
    await bucket.delete(key);
    return;
  }

  if (env) throw new Error('Cloudflare R2 binding RTI_FILES is not configured.');

  const { root, path } = await nodeRoot();
  const target = path.join(root, key);

  if (!target.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key.');
  }

  const { unlink } = await import('node:fs/promises');
  await unlink(target).catch((error: unknown) => {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  });
}

export function hasCloudflareObjectStorage() {
  return Boolean(asR2(getOpenNextCloudflareEnv()?.RTI_FILES));
}

export async function getPrivateObjectStorageHealth(): Promise<PrivateObjectStorageHealth> {
  if (!uploadsEnabled()) {
    return {
      enabled: false,
      available: true,
      backend: 'disabled',
    };
  }

  try {
    const { env, bucket } = cloudflareBucket();

    if (env) {
      return {
        enabled: true,
        available: Boolean(bucket),
        backend: bucket ? 'cloudflare-r2' : 'unconfigured',
      };
    }

    const { root } = await nodeRoot();
    const { access, mkdir } = await import('node:fs/promises');
    const fsConstants = await import('node:fs');

    await mkdir(root, { recursive: true, mode: 0o700 });
    await access(root, fsConstants.constants.R_OK | fsConstants.constants.W_OK);

    return {
      enabled: true,
      available: true,
      backend: 'filesystem',
    };
  } catch {
    return {
      enabled: true,
      available: false,
      backend: 'unconfigured',
    };
  }
}
