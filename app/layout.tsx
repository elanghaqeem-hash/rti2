import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { BRAND_CONFIG } from '@/lib/config/contact';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Risetin - PT Riset Teknologi Indonesia',
    default: 'Risetin | Technology That Moves Business Forward - PT Riset Teknologi Indonesia',
  },
  description:
    'Risetin (PT Riset Teknologi Indonesia) adalah mitra teknologi end-to-end: Technology Advisory, Software Engineering, Technology Operations, GRC & ISO 27001, Cybersecurity, dan Workforce Development.',
  keywords: [
    'konsultan IT Jakarta',
    'jasa pembuatan aplikasi',
    'penetration testing Indonesia',
    'VAPT',
    'SOC managed service',
    'ISO 27001 consultant',
    'IT blueprint',
    'IT master plan',
    'UU PDP compliance',
    'IT governance perbankan',
    'pelatihan cybersecurity',
    'PT Riset Teknologi Indonesia',
    'RTI',
    'Risetin',
  ],
  authors: [{ name: 'PT Riset Teknologi Indonesia' }],
  creator: 'PT Riset Teknologi Indonesia',
  publisher: 'PT Riset Teknologi Indonesia',
  metadataBase: new URL('https://risetin.co.id'),
  openGraph: {
    title: 'Risetin | Technology That Moves Business Forward',
    description:
      'End-to-end enterprise technology partner: Strategy, Software, Support, Governance, Cybersecurity, and People.',
    url: 'https://risetin.co.id',
    siteName: 'Risetin (PT Riset Teknologi Indonesia)',
    locale: 'id_ID',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    legalName: BRAND_CONFIG.legalName,
    alternateName: [BRAND_CONFIG.brandName, BRAND_CONFIG.acronym],
    name: BRAND_CONFIG.brandName,
    url: BRAND_CONFIG.contact.website,
    logo: 'https://risetin.co.id/logo-mark.svg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${BRAND_CONFIG.contact.address.building}, ${BRAND_CONFIG.contact.address.street}`,
      addressLocality: BRAND_CONFIG.contact.address.district,
      addressRegion: BRAND_CONFIG.contact.address.province,
      postalCode: BRAND_CONFIG.contact.address.postalCode,
      addressCountry: 'ID',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: BRAND_CONFIG.contact.phone,
      contactType: 'customer service',
      email: BRAND_CONFIG.contact.email,
      availableLanguage: ['Indonesian', 'English'],
    },
  };

  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased selection:bg-gold-500 selection:text-navy-900">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
