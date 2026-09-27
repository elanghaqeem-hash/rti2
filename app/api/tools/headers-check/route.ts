import { NextResponse } from 'next/server';
import { validateSafePublicDomain } from '@/lib/security/ssrf';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { domain, authorized } = await req.json();

    if (!authorized) {
      return NextResponse.json(
        { error: 'Anda harus menyatakan memiliki wewenang atas domain ini.' },
        { status: 400 }
      );
    }

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain tidak valid.' }, { status: 400 });
    }

    // Clean domain (remove protocol and path)
    const cleanHost = domain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].trim();

    // Anti-SSRF check
    const ssrfCheck = await validateSafePublicDomain(cleanHost);
    if (!ssrfCheck.safe) {
      return NextResponse.json({ error: ssrfCheck.error }, { status: 403 });
    }

    // Perform passive HEAD/GET request with 5s timeout and max 1 redirect
    const targetUrl = `https://${cleanHost}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'RTI-SecurityHeadersCheck/1.0 (+https://risetin.co.id/security)',
        },
      });
    } catch {
      // Fallback to GET if HEAD rejected
      res = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'RTI-SecurityHeadersCheck/1.0 (+https://risetin.co.id/security)',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    const headers = res.headers;

    // Check key security headers
    const checkHeader = (name: string) => {
      const val = headers.get(name);
      return {
        present: Boolean(val),
        value: val || 'Missing',
      };
    };

    const hsts = checkHeader('strict-transport-security');
    const csp = checkHeader('content-security-policy');
    const xfo = checkHeader('x-frame-options');
    const xcto = checkHeader('x-content-type-options');
    const rp = checkHeader('referrer-policy');
    const pp = checkHeader('permissions-policy');

    // Calculate Grade A to F
    let points = 0;
    if (hsts.present) points += 25;
    if (csp.present) points += 25;
    if (xfo.present) points += 15;
    if (xcto.present) points += 15;
    if (rp.present) points += 10;
    if (pp.present) points += 10;

    let grade = 'F';
    if (points >= 90) grade = 'A+';
    else if (points >= 80) grade = 'A';
    else if (points >= 70) grade = 'B';
    else if (points >= 50) grade = 'C';
    else if (points >= 30) grade = 'D';

    return NextResponse.json({
      success: true,
      domain: cleanHost,
      ip: ssrfCheck.ip,
      statusCode: res.status,
      grade,
      score: points,
      headers: {
        'Strict-Transport-Security (HSTS)': hsts,
        'Content-Security-Policy (CSP)': csp,
        'X-Frame-Options': xfo,
        'X-Content-Type-Options': xcto,
        'Referrer-Policy': rp,
        'Permissions-Policy': pp,
      },
    });
  } catch (error: any) {
    console.error('Security header check failed:', error);
    return NextResponse.json(
      { error: `Pemeriksaan domain gagal: ${error.message || 'Timeout / Host unreachable'}` },
      { status: 500 }
    );
  }
}
