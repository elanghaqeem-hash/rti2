import { NextResponse } from 'next/server';
import { BRAND_CONFIG } from '@/lib/config/contact';

export async function GET() {
  const securityTxt = `Contact: mailto:${BRAND_CONFIG.contact.email}
Contact: ${BRAND_CONFIG.contact.whatsappUrl}
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: id, en
Canonical: https://risetin.co.id/.well-known/security.txt
Policy: https://risetin.co.id/security
Acknowledgments: https://risetin.co.id/security
`;

  return new NextResponse(securityTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
