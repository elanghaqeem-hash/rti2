/**
 * PT Riset Teknologi Indonesia - Official Contact & Brand Configuration Singleton
 * All contact information and legal identities must be read from here.
 */

export const BRAND_CONFIG = {
  brandName: 'Risetin',
  acronym: 'RTI',
  legalName: 'PT Riset Teknologi Indonesia',
  tagline: 'Technology That Moves Business Forward',
  supportingTaglines: [
    'Technology. Security. Transformation.',
    'Transform. Secure. Grow.',
  ],
  positioning: {
    en: 'Risetin is an end-to-end technology partner helping organizations design, build, secure, operate, and continuously improve their technology capabilities.',
    id: 'Risetin membantu organisasi merancang, membangun, mengamankan, mengoperasikan, dan meningkatkan kapabilitas teknologi secara berkelanjutan.',
  },
  sixPillars: [
    {
      id: 'strategy',
      name: 'Technology Advisory & Strategy',
      outcome: 'Better investment decisions and digital alignment',
      icon: 'Compass',
      href: '/services/technology-advisory',
    },
    {
      id: 'software',
      name: 'Software Engineering',
      outcome: 'Faster, resilient, and more efficient operations',
      icon: 'Code2',
      href: '/services/software-development',
    },
    {
      id: 'operations',
      name: 'Technology Operations & Support',
      outcome: 'Higher system uptime and 24/7 reliability',
      icon: 'Server',
      href: '/services/technology-support',
    },
    {
      id: 'governance',
      name: 'GRC, Policy & ISO Standards',
      outcome: 'Institutional control, accountability, and regulatory peace of mind',
      icon: 'ShieldCheck',
      href: '/services/policy-sop-governance',
    },
    {
      id: 'cybersecurity',
      name: 'Cybersecurity (Offensive & Defensive)',
      outcome: 'Proactive defense and reduced technology & cyber risk',
      icon: 'Lock',
      href: '/services/cybersecurity',
    },
    {
      id: 'people',
      name: 'People & Capability Development',
      outcome: 'Stronger internal workforce readiness and security culture',
      icon: 'GraduationCap',
      href: '/services/training-awareness',
    },
  ],
  contact: {
    phone: '+62 856-6872-2734',
    whatsapp: '+62 856-6872-2734',
    whatsappUrl: 'https://wa.me/6285668722734',
    email: 'admin@risetin.co.id',
    website: 'https://risetin.co.id',
    bookingUrl: 'https://cal.com/risetin/30min',
    address: {
      building: 'Graha Mustika Ratu, 7th Floor',
      street: 'Jl. Jend. Gatot Subroto Kav. 74-75',
      district: 'Menteng Dalam, Tebet',
      city: 'South Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12870',
      country: 'Indonesia',
      fullAddress: 'Graha Mustika Ratu, 7th Floor, Jl. Jend. Gatot Subroto Kav. 74-75, Menteng Dalam, Tebet, South Jakarta, DKI Jakarta 12870',
    },
  },
} as const;

export type BrandConfig = typeof BRAND_CONFIG;
