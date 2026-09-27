export interface Lead {
  id: string;
  createdAt: string;
  source: string;
  toolSlug?: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  email: string;
  whatsapp?: string;
  needSummary?: string;
  score: number;
  status: 'New' | 'Qualified' | 'Meeting' | 'Proposal' | 'Won' | 'Lost';
  consentAt: string;
  consentVersion: string;
}

/**
 * Lead scoring is pure business logic only.
 *
 * IMPORTANT:
 * This module intentionally contains no in-memory persistence and no sample
 * records. Operational lead data must come from an authenticated persistent
 * database adapter. Until that adapter exists, the API fails closed.
 */
export function calculateLeadScore(params: {
  role?: string;
  sector?: string;
  toolSlug?: string;
  needSummary?: string;
}): number {
  let score = 20;

  const role = (params.role || '').toLowerCase();
  if (
    role.includes('ciso') ||
    role.includes('cio') ||
    role.includes('cto') ||
    role.includes('chief') ||
    role.includes('director') ||
    role.includes('head') ||
    role.includes('vp')
  ) {
    score += 35;
  } else if (role.includes('manager') || role.includes('lead') || role.includes('principal')) {
    score += 20;
  } else {
    score += 10;
  }

  const sector = (params.sector || '').toLowerCase();
  if (
    sector.includes('bank') ||
    sector.includes('insurance') ||
    sector.includes('fintech') ||
    sector.includes('government') ||
    sector.includes('bumn')
  ) {
    score += 25;
  } else {
    score += 15;
  }

  if (params.toolSlug) {
    score += 20;
  }

  return Math.min(score, 100);
}
