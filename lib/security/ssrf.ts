import dns from 'node:dns/promises';
import { isIP } from 'node:net';

function ipv4ToInt(ip: string) {
  return ip
    .split('.')
    .map(Number)
    .reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

function inIpv4Cidr(ip: string, base: string, prefix: number) {
  const ipValue = ipv4ToInt(ip);
  const baseValue = ipv4ToInt(base);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipValue & mask) === (baseValue & mask);
}

function isBlockedIpv4(ip: string) {
  const blockedCidrs: Array<[string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ];

  return blockedCidrs.some(([base, prefix]) => inIpv4Cidr(ip, base, prefix));
}

function normalizeIpv6(ip: string) {
  return ip.toLowerCase().split('%')[0];
}

function isBlockedIpv6(ip: string) {
  const value = normalizeIpv6(ip);

  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith('ff')) return true;
  if (value.startsWith('2001:db8:') || value === '2001:db8::') return true;

  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1] && isIP(mapped[1]) === 4) {
    return isBlockedIpv4(mapped[1]);
  }

  return false;
}

export function isPublicIpAddress(ip: string) {
  const family = isIP(ip);

  if (family === 4) return !isBlockedIpv4(ip);
  if (family === 6) return !isBlockedIpv6(ip);

  return false;
}

/**
 * Resolve a hostname and require every returned address to be globally routable.
 *
 * Important: callers must NOT automatically follow HTTP redirects after this
 * validation. Redirect destinations need a fresh validation to avoid SSRF.
 */
export async function validateSafePublicDomain(
  hostname: string,
): Promise<{ safe: boolean; error?: string; ip?: string }> {
  const cleanHost = hostname.trim().toLowerCase().replace(/\.$/, '');

  if (
    !cleanHost ||
    cleanHost.length > 253 ||
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.internal')
  ) {
    return {
      safe: false,
      error: 'Target host is local, internal, or invalid.',
    };
  }

  if (/[^a-z0-9.:[\]-]/i.test(cleanHost)) {
    return {
      safe: false,
      error: 'Target host contains unsupported characters.',
    };
  }

  try {
    const addresses = await dns.lookup(cleanHost, {
      all: true,
      verbatim: true,
    });

    if (!addresses.length) {
      return {
        safe: false,
        error: 'Could not resolve domain via DNS.',
      };
    }

    for (const record of addresses) {
      if (!isPublicIpAddress(record.address)) {
        return {
          safe: false,
          error: `Target resolves to a private or reserved address: ${record.address}`,
        };
      }
    }

    return {
      safe: true,
      ip: addresses[0].address,
    };
  } catch (error) {
    return {
      safe: false,
      error: `DNS resolution failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}
