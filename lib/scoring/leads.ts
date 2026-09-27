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

export interface LeadQualificationSignals {
  urgency?: number;
  severity?: number;
  identifiedGaps?: number;
  timeline?: string;
  regulated?: boolean;
  requestProposal?: boolean;
  requestConsultation?: boolean;
}

/**
 * Pure lead-qualification business logic.
 *
 * Operational lead data remains database-backed. Optional diagnostic signals can
 * strengthen qualification but are never shown back to the public user.
 */
export function calculateLeadScore(params: {
  role?: string;
  sector?: string;
  toolSlug?: string;
  needSummary?: string;
  signals?: LeadQualificationSignals;
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
  } else if (
    role.includes('manager') ||
    role.includes('lead') ||
    role.includes('principal')
  ) {
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
    score += 10;
  }

  const signals = params.signals;
  if (signals) {
    const urgency = Math.max(0, Math.min(100, Number(signals.urgency) || 0));
    const severity = Math.max(0, Math.min(100, Number(signals.severity) || 0));
    const gaps = Math.max(0, Math.min(50, Number(signals.identifiedGaps) || 0));

    score += Math.round((urgency / 100) * 5);
    score += Math.round((severity / 100) * 5);
    score += Math.min(5, Math.ceil(gaps / 3));

    if (signals.regulated) score += 3;
    if (signals.requestConsultation) score += 3;
    if (signals.requestProposal) score += 5;

    if (signals.timeline === 'emergency' || signals.timeline === 'lt30') {
      score += 4;
    } else if (signals.timeline === '1_3_months') {
      score += 2;
    }
  }

  return Math.min(score, 100);
}

export function leadQualificationLabel(
  score: number,
): 'Hot' | 'Warm' | 'Nurture' {
  if (score >= 85) return 'Hot';
  if (score >= 60) return 'Warm';
  return 'Nurture';
}
