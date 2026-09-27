import {
  MATURITY_DOMAINS,
  type Domain,
  type Question,
  type MaturityLevel,
} from '@/lib/data/assessment-questions';

export type AssessmentMode = 'quick' | 'comprehensive';

export interface AssessmentProfile {
  companyName?: string;
  industry?: string;
  companySize?: string;
  regulated?: 'yes' | 'no' | 'unsure';
  cloudAdoption?: 'none' | 'limited' | 'hybrid' | 'cloud-first';
  aiAdoption?: 'none' | 'pilot' | 'production' | 'scaled';
}

export interface AssessmentScoreInput {
  mode: AssessmentMode;
  profile?: AssessmentProfile;
  answers: Record<string, number>;
  targets?: Record<string, number>;
  evidence?: Record<string, boolean>;
}

export interface DomainScore {
  id: string;
  name: string;
  shortName: string;
  current: number;
  target: number;
  gap: number;
  riskExposure: number;
  completion: number;
  evidenceCoverage: number;
  confidence: number;
  confidenceLabel: 'Low' | 'Medium' | 'High';
  recommendedService: string;
  recommendedServiceUrl: string;
  frameworks: string[];
}

export interface AssessmentFinding {
  domainId: string;
  domain: string;
  current: number;
  target: number;
  gap: number;
  riskExposure: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  finding: string;
  risk: string;
  businessImpact: string;
  recommendation: string;
  recommendedService: string;
  recommendedServiceUrl: string;
  frameworks: string[];
}

export interface RoadmapItem {
  phase: '0–90 Days' | '3–6 Months' | '6–12 Months' | '12–24 Months';
  domain: string;
  objective: string;
  action: string;
  priority: AssessmentFinding['priority'];
  ownerRecommendation: string;
  dependency: string;
  indicativeEffort: 'Low' | 'Medium' | 'High';
  expectedBenefit: string;
}

export interface AssessmentResult {
  overallMaturity: number;
  targetMaturity: number;
  overallGap: number;
  riskAdjustedScore: number;
  riskExposure: number;
  confidenceScore: number;
  confidenceLabel: 'Low' | 'Medium' | 'High';
  completion: number;
  domainScores: DomainScore[];
  findings: AssessmentFinding[];
  strengths: DomainScore[];
  roadmap: RoadmapItem[];
  benchmark: null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 2) =>
  Number(value.toFixed(digits));

function getApplicableQuestions(
  domain: Domain,
  mode: AssessmentMode,
  profile: AssessmentProfile = {},
): Question[] {
  const candidates = mode === 'quick' ? domain.questions.slice(0, 1) : domain.questions;

  return candidates.filter((question) => {
    if (question.applicability === 'cloud' && profile.cloudAdoption === 'none') {
      return false;
    }

    if (question.applicability === 'ai' && profile.aiAdoption === 'none') {
      return false;
    }

    return true;
  });
}

export function getApplicableDomains(
  mode: AssessmentMode,
  profile: AssessmentProfile = {},
) {
  return MATURITY_DOMAINS
    .map((domain) => ({
      ...domain,
      questions: getApplicableQuestions(domain, mode, profile),
    }))
    .filter((domain) => domain.questions.length > 0);
}

function confidenceLabel(score: number): DomainScore['confidenceLabel'] {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

function priorityFor(gap: number, riskExposure: number): AssessmentFinding['priority'] {
  if (gap >= 2.5 || riskExposure >= 70) return 'Critical';
  if (gap >= 1.5 || riskExposure >= 50) return 'High';
  if (gap >= 0.75 || riskExposure >= 30) return 'Medium';
  return 'Low';
}

function findingRisk(domain: Domain, gap: number) {
  if (gap <= 0.25) {
    return `Kapabilitas ${domain.name} relatif dekat dengan target yang dipilih.`;
  }

  return `Kesenjangan pada ${domain.name} dapat meningkatkan kemungkinan kelemahan kontrol, keterlambatan respons, atau keputusan teknologi yang tidak konsisten.`;
}

function businessImpact(domain: Domain, priority: AssessmentFinding['priority']) {
  if (priority === 'Critical') {
    return `Eksposur pada ${domain.name} berpotensi berdampak langsung pada kontinuitas layanan, keamanan informasi, atau kepercayaan pemangku kepentingan.`;
  }

  if (priority === 'High') {
    return `Perbaikan ${domain.name} perlu diprioritaskan agar risiko operasional dan teknologi tidak berkembang menjadi gangguan yang lebih material.`;
  }

  return `Peningkatan ${domain.name} akan memperkuat konsistensi kontrol dan kesiapan organisasi.`;
}

function roadmapPhase(priority: AssessmentFinding['priority']): RoadmapItem['phase'] {
  if (priority === 'Critical') return '0–90 Days';
  if (priority === 'High') return '3–6 Months';
  if (priority === 'Medium') return '6–12 Months';
  return '12–24 Months';
}

function ownerFor(domainId: string) {
  if (domainId.includes('privacy')) return 'DPO / Privacy / Compliance';
  if (domainId.includes('continuity')) return 'Risk / BCM / Technology';
  if (domainId.includes('technology_operations')) return 'CIO / Head of IT Operations';
  if (domainId.includes('architecture')) return 'CIO / Enterprise Architecture';
  if (domainId.includes('ai_')) return 'AI Governance / Risk / Technology';
  if (
    domainId.includes('cyber') ||
    domainId.includes('security') ||
    domainId.includes('incident') ||
    domainId.includes('vulnerability') ||
    domainId.includes('identity') ||
    domainId.includes('threat')
  ) {
    return 'CISO / Information Security';
  }
  return 'CIO / Technology Governance';
}

export function scoreAssessment(input: AssessmentScoreInput): AssessmentResult {
  const mode: AssessmentMode = input.mode === 'comprehensive' ? 'comprehensive' : 'quick';
  const profile = input.profile || {};
  const targets = input.targets || {};
  const evidence = input.evidence || {};
  const domains = getApplicableDomains(mode, profile);

  const domainScores: DomainScore[] = domains.map((domain) => {
    const questions = domain.questions;
    const answeredQuestions = questions.filter((question) =>
      Number.isFinite(input.answers[question.id]),
    );

    const weightedAnswered = answeredQuestions.reduce(
      (acc, question) => {
        const raw = clamp(Number(input.answers[question.id]), 0, 5);
        acc.score += raw * question.weight;
        acc.weight += question.weight;
        return acc;
      },
      { score: 0, weight: 0 },
    );

    const current =
      weightedAnswered.weight > 0 ? weightedAnswered.score / weightedAnswered.weight : 0;

    const target = clamp(
      Number.isFinite(targets[domain.id])
        ? Number(targets[domain.id])
        : Number(domain.defaultTarget),
      0,
      5,
    );

    const completion = questions.length
      ? (answeredQuestions.length / questions.length) * 100
      : 0;

    const evidenceCount = answeredQuestions.filter(
      (question) => evidence[question.id] === true,
    ).length;

    const evidenceCoverage = answeredQuestions.length
      ? (evidenceCount / answeredQuestions.length) * 100
      : 0;

    const confidence = clamp(completion * 0.4 + evidenceCoverage * 0.6, 0, 100);
    const gap = Math.max(0, target - current);

    const criticalityWeight =
      questions.reduce((sum, question) => {
        if (question.criticality === 'critical') return sum + 1.2;
        if (question.criticality === 'high') return sum + 1.1;
        return sum + 1;
      }, 0) / Math.max(questions.length, 1);

    const riskExposure = clamp(((5 - current) / 5) * criticalityWeight * 100, 0, 100);

    return {
      id: domain.id,
      name: domain.name,
      shortName: domain.shortName,
      current: round(current),
      target: round(target),
      gap: round(gap),
      riskExposure: round(riskExposure, 0),
      completion: round(completion, 0),
      evidenceCoverage: round(evidenceCoverage, 0),
      confidence: round(confidence, 0),
      confidenceLabel: confidenceLabel(confidence),
      recommendedService: domain.recommendedService,
      recommendedServiceUrl: domain.recommendedServiceUrl,
      frameworks: domain.frameworks,
    };
  });

  const totalDomainWeight = domains.reduce((sum, domain) => sum + domain.weight, 0) || 1;

  const overallMaturity =
    domains.reduce((sum, domain) => {
      const score = domainScores.find((item) => item.id === domain.id)?.current || 0;
      return sum + score * domain.weight;
    }, 0) / totalDomainWeight;

  const targetMaturity =
    domains.reduce((sum, domain) => {
      const score = domainScores.find((item) => item.id === domain.id)?.target || 0;
      return sum + score * domain.weight;
    }, 0) / totalDomainWeight;

  const riskExposure =
    domains.reduce((sum, domain) => {
      const score = domainScores.find((item) => item.id === domain.id)?.riskExposure || 0;
      return sum + score * domain.weight;
    }, 0) / totalDomainWeight;

  const confidenceScore =
    domainScores.reduce((sum, domain) => sum + domain.confidence, 0) /
    Math.max(domainScores.length, 1);

  const completion =
    domainScores.reduce((sum, domain) => sum + domain.completion, 0) /
    Math.max(domainScores.length, 1);

  const findings: AssessmentFinding[] = domainScores
    .map((score) => {
      const domain = domains.find((item) => item.id === score.id)!;
      const priority = priorityFor(score.gap, score.riskExposure);

      return {
        domainId: score.id,
        domain: score.name,
        current: score.current,
        target: score.target,
        gap: score.gap,
        riskExposure: score.riskExposure,
        priority,
        finding:
          score.gap > 0
            ? `${score.name} berada ${score.gap.toFixed(1)} level di bawah target maturity yang dipilih.`
            : `${score.name} telah mencapai atau melampaui target maturity yang dipilih.`,
        risk: findingRisk(domain, score.gap),
        businessImpact: businessImpact(domain, priority),
        recommendation:
          score.gap > 0
            ? `Bangun rencana peningkatan terukur untuk ${score.name}, dimulai dari governance, ownership, bukti implementasi, metrik, dan kontrol dengan prioritas pada gap terbesar.`
            : `Pertahankan efektivitas ${score.name} melalui monitoring berkala dan continuous improvement.`,
        recommendedService: score.recommendedService,
        recommendedServiceUrl: score.recommendedServiceUrl,
        frameworks: score.frameworks,
      };
    })
    .sort((a, b) => {
      if (b.gap !== a.gap) return b.gap - a.gap;
      return b.riskExposure - a.riskExposure;
    });

  const strengths = [...domainScores]
    .filter((domain) => domain.completion > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 3);

  const roadmap: RoadmapItem[] = findings
    .filter((finding) => finding.gap > 0.25)
    .slice(0, 12)
    .map((finding) => ({
      phase: roadmapPhase(finding.priority),
      domain: finding.domain,
      objective: `Meningkatkan maturity ${finding.domain} menuju target ${finding.target.toFixed(1)}.`,
      action: finding.recommendation,
      priority: finding.priority,
      ownerRecommendation: ownerFor(finding.domainId),
      dependency:
        finding.priority === 'Critical'
          ? 'Executive sponsorship, accountable owner, dan baseline evidence'
          : 'Owner, baseline metric, dan improvement backlog',
      indicativeEffort:
        finding.priority === 'Critical' || finding.gap >= 2.5
          ? 'High'
          : finding.priority === 'High'
            ? 'Medium'
            : 'Low',
      expectedBenefit: `Mengurangi gap ${finding.domain} dan meningkatkan konsistensi kontrol serta kesiapan operasional.`,
    }));

  const riskAdjustedScore = clamp(overallMaturity - (riskExposure / 100) * 0.75, 0, 5);

  return {
    overallMaturity: round(overallMaturity),
    targetMaturity: round(targetMaturity),
    overallGap: round(Math.max(0, targetMaturity - overallMaturity)),
    riskAdjustedScore: round(riskAdjustedScore),
    riskExposure: round(riskExposure, 0),
    confidenceScore: round(confidenceScore, 0),
    confidenceLabel: confidenceLabel(confidenceScore),
    completion: round(completion, 0),
    domainScores,
    findings,
    strengths,
    roadmap,
    benchmark: null,
  };
}
