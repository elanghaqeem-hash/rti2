export type ConsentStatus = 'pending' | 'approved' | 'text_only' | 'hidden';

export interface ClientRecord {
  id: string;
  name: string;
  sector: 'government_bumn' | 'banking_insurance' | 'fintech_payments' | 'energy_foundation';
  sectorLabel: string;
  consentStatus: ConsentStatus;
  consentEvidenceUrl?: string;
  featured?: boolean;
}

export const CLIENT_DATA: ClientRecord[] = [
  // Government & BUMN
  {
    id: 'ditjen-ahu',
    name: 'Ditjen AHU (Kemenkumham)',
    sector: 'government_bumn',
    sectorLabel: 'Government & BUMN',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'bnn',
    name: 'BNN (Badan Narkotika Nasional)',
    sector: 'government_bumn',
    sectorLabel: 'Government & BUMN',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'bulog',
    name: 'Perum BULOG',
    sector: 'government_bumn',
    sectorLabel: 'Government & BUMN',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'lpdp',
    name: 'LPDP (Kementerian Keuangan)',
    sector: 'government_bumn',
    sectorLabel: 'Government & BUMN',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'berdikari',
    name: 'PT Berdikari (Persero)',
    sector: 'government_bumn',
    sectorLabel: 'Government & BUMN',
    consentStatus: 'text_only',
  },

  // Banking & Insurance
  {
    id: 'uob',
    name: 'Bank UOB Indonesia',
    sector: 'banking_insurance',
    sectorLabel: 'Banking & Financial Services',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'allianz',
    name: 'Allianz Indonesia',
    sector: 'banking_insurance',
    sectorLabel: 'Banking & Financial Services',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'bukopin',
    name: 'KB Bank (Bank Bukopin)',
    sector: 'banking_insurance',
    sectorLabel: 'Banking & Financial Services',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'jamkrindo',
    name: 'PT Jamkrindo',
    sector: 'banking_insurance',
    sectorLabel: 'Banking & Financial Services',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'jma-syariah',
    name: 'Asuransi Jiwa Syariah JMA',
    sector: 'banking_insurance',
    sectorLabel: 'Banking & Financial Services',
    consentStatus: 'text_only',
  },
  {
    id: 'salingjaga',
    name: 'Asuransi Salingjaga',
    sector: 'banking_insurance',
    sectorLabel: 'Banking & Financial Services',
    consentStatus: 'text_only',
  },

  // Payments & Fintech
  {
    id: 'mc-payment',
    name: 'MC Payment',
    sector: 'fintech_payments',
    sectorLabel: 'Payments & Fintech',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'alto',
    name: 'PT ALTO Network',
    sector: 'fintech_payments',
    sectorLabel: 'Payments & Fintech',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'kaspro',
    name: 'KASPRO (PT Solusi Pasti Indonesia)',
    sector: 'fintech_payments',
    sectorLabel: 'Payments & Fintech',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'asiapay',
    name: 'AsiaPay Indonesia',
    sector: 'fintech_payments',
    sectorLabel: 'Payments & Fintech',
    consentStatus: 'text_only',
  },

  // Energy & Foundation
  {
    id: 'mubadala',
    name: 'Mubadala Petroleum',
    sector: 'energy_foundation',
    sectorLabel: 'Energy & Corporate Foundations',
    consentStatus: 'text_only',
    featured: true,
  },
  {
    id: 'tanoto',
    name: 'Tanoto Foundation',
    sector: 'energy_foundation',
    sectorLabel: 'Energy & Corporate Foundations',
    consentStatus: 'text_only',
    featured: true,
  },
];

/**
 * Filter clients to only those with valid consent permissions:
 * - 'approved': Can show logo & wordmark
 * - 'text_only': Can show as text wordmark badge
 * - 'pending' or 'hidden': Suppressed from public display
 */
export function getPermittedClients(): ClientRecord[] {
  return CLIENT_DATA.filter(
    (c) => c.consentStatus === 'approved' || c.consentStatus === 'text_only'
  );
}

export function getFeaturedClients(): ClientRecord[] {
  return getPermittedClients().filter((c) => c.featured);
}
