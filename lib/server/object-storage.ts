import { getOpenNextCloudflareEnv } from '@/lib/server/runtime-database';

type R2ObjectLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type R2BucketLike = {
  put: (key: string, value: ArrayBuffer | ArrayBufferView | string, options?: unknown) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectLike | null>;
  delete: (key: string) => Promise<void>;
};

function asR2(value: unknown): R2BucketLike | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<R2BucketLike>;
  if (typeof candidate.put !== 'function' || typeof candidate.get !== 'function' || typeof candidate.delete !== 'function') return null;
  return candidate as R2BucketLike;
}

async function nodeRoot() {
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

export async function putPrivateObject(params: {
  key: string;
  buffer: Uint8Array;
  contentType?: string;
}) {
  const env = getOpenNextCloudflareEnv();
  const bucket = asR2(env?.RTI_FILES);
  if (bucket) {
    await bucket.put(params.key, params.buffer, {
      httpMetadata: params.contentType ? { contentType: params.contentType } : undefined,
    });
    return { backend: 'r2' as const, descriptor: 'Cloudflare R2 binding RTI_FILES' };
  }
  if (env) throw new Error('Cloudflare R2 binding RTI_FILES is not configured.');

  const { root, path } = await nodeRoot();
  const { mkdir, writeFile } = await import('node:fs/promises');
  const target = path.join(root, params.key);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid storage key.');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, params.buffer, { flag: 'wx', mode: 0o600 });
  return { backend: 'filesystem' as const, descriptor: root };
}

export async function getPrivateObject(key: string) {
  const env = getOpenNextCloudflareEnv();
  const bucket = asR2(env?.RTI_FILES);
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return null;
    return new Uint8Array(await object.arrayBuffer());
  }
  if (env) throw new Error('Cloudflare R2 binding RTI_FILES is not configured.');

  const { root, path } = await nodeRoot();
  const target = path.join(root, key);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid storage key.');
  const { readFile } = await import('node:fs/promises');
  try {
    return new Uint8Array(await readFile(target));
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function deletePrivateObject(key: string) {
  const env = getOpenNextCloudflareEnv();
  const bucket = asR2(env?.RTI_FILES);
  if (bucket) {
    await bucket.delete(key);
    return;
  }
  if (env) throw new Error('Cloudflare R2 binding RTI_FILES is not configured.');

  const { root, path } = await nodeRoot();
  const target = path.join(root, key);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid storage key.');
  const { unlink } = await import('node:fs/promises');
  await unlink(target).catch((error: any) => {
    if (error?.code !== 'ENOENT') throw error;
  });
}

export function hasCloudflareObjectStorage() {
  return Boolean(asR2(getOpenNextCloudflareEnv()?.RTI_FILES));
}
