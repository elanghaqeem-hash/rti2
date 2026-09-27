import dns from 'node:dns/promises';

/**
 * Validates domain and IP against Server-Side Request Forgery (SSRF)
 * Rejects RFC 1918 private IPs, loopback, link-local, and cloud metadata IPs.
 */
export async function validateSafePublicDomain(hostname: string): Promise<{ safe: boolean; error?: string; ip?: string }> {
  // Reject localhost or obvious internal names
  const cleanHost = hostname.trim().toLowerCase();
  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.internal') ||
    cleanHost.includes('169.254') ||
    cleanHost.includes('127.0.0.1')
  ) {
    return { safe: false, error: 'Target host is internal / loopback and prohibited.' };
  }

  try {
    const addresses = await dns.lookup(cleanHost, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: 'Could not resolve domain via DNS.' };
    }

    for (const record of addresses) {
      const ip = record.address;

      // IPv4 private ranges
      if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('169.254.')) {
        return { safe: false, error: `Prohibited private or loopback IP: ${ip}` };
      }

      if (ip.startsWith('192.168.')) {
        return { safe: false, error: `Prohibited RFC 1918 private IP: ${ip}` };
      }

      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
        return { safe: false, error: `Prohibited RFC 1918 private IP: ${ip}` };
      }

      // IPv6 loopback / private
      if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:')) {
        return { safe: false, error: `Prohibited IPv6 local range: ${ip}` };
      }
    }

    return { safe: true, ip: addresses[0].address };
  } catch (err: any) {
    return { safe: false, error: `DNS resolution failed: ${err.message}` };
  }
}
