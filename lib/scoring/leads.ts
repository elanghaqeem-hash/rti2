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

// Global in-memory persistence for runtime execution
const leadsStore: Lead[] = [];

export function calculateLeadScore(params: {
  role?: string;
  sector?: string;
  toolSlug?: string;
  needSummary?: string;
}): number {
  let score = 20; // baseline

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
    score += 20; // completed diagnostic tool
  }

  return Math.min(score, 100);
}

export function saveLead(data: Omit<Lead, 'id' | 'createdAt' | 'score' | 'status' | 'consentAt' | 'consentVersion'>): Lead {
  const score = calculateLeadScore({
    role: data.role,
    sector: data.sector,
    toolSlug: data.toolSlug,
    needSummary: data.needSummary,
  });

  const newLead: Lead = {
    ...data,
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    score,
    status: score >= 70 ? 'Qualified' : 'New',
    consentAt: new Date().toISOString(),
    consentVersion: '1.0-UU-PDP',
  };

  leadsStore.unshift(newLead);
  return newLead;
}

export function getLeads(): Lead[] {
  // If store is empty, provide realistic sample leads for immediate review
  if (leadsStore.length === 0) {
    return [
      {
        id: 'lead_sample_1',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        source: 'maturity_assessment',
        toolSlug: 'maturity-assessment',
        name: 'Darmawan Wijaya',
        role: 'Chief Information Security Officer (CISO)',
        company: 'Bank Mitraniaga Tbk',
        sector: 'banking_insurance',
        email: 'darmawan@mitraniaga.co.id',
        whatsapp: '+62 811-2345-678',
        needSummary: 'Looking for NIST CSF 2.0 readiness assessment and annual regulatory VAPT for open banking APIs.',
        score: 95,
        status: 'Qualified',
        consentAt: new Date().toISOString(),
        consentVersion: '1.0-UU-PDP',
      },
      {
        id: 'lead_sample_2',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        source: 'solution_finder',
        toolSlug: 'solution-finder',
        name: 'Anita Rahmawati',
        role: 'Head of Enterprise Applications',
        company: 'PT Finansial Solusi Nusantara',
        sector: 'fintech_payments',
        email: 'anita.r@finsol.id',
        whatsapp: '+62 812-9876-543',
        needSummary: 'Legacy monolithic payment switch modernization into Kubernetes microservices with 99.99% uptime SLA.',
        score: 85,
        status: 'Meeting',
        consentAt: new Date().toISOString(),
        consentVersion: '1.0-UU-PDP',
      },
    ];
  }
  return leadsStore;
}
