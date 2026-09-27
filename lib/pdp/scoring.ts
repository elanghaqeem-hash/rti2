import type {
  PdpFinding,
  PdpProfile,
  PdpQuestion,
  PdpResponseInput,
  PdpScoreResult,
} from '@/lib/pdp/types';

const ANSWER_SCORE: Record<string, number> = {
  yes: 1,
  partial: 0.6,
  planned: 0.35,
  unknown: 0.15,
  no: 0,
  na: 0,
};

const CONFIDENCE_FACTOR: Record<string, number> = {
  confirmed: 1,
  partial: 0.85,
  unverified: 0.7,
};

const EVIDENCE_FACTOR: Record<string, number> = {
  verified: 1,
  available: 0.95,
  not_available: 0.8,
  not_required: 1,
};

const CRITICALITY_FACTOR: Record<string, number> = {
  Low: 0.85,
  Medium: 1,
  High: 1.15,
  Critical: 1.3,
};

const OWNERS: Record<string, string> = {
  GOV: 'Legal / Compliance / Privacy',
  MAP: 'Data Governance / Privacy',
  ROPA: 'Privacy / Compliance',
  LAW: 'Legal / Privacy',
  CONSENT: 'Privacy / Digital',
  RIGHTS: 'Privacy / Customer Service',
  NOTICE: 'Legal / Privacy / Communications',
  RET: 'Records Management / IT',
  DPIA: 'Privacy / Risk / Security',
  DPO: 'Board / Legal / Compliance',
  TPRM: 'Procurement / Privacy / Security',
  SEC: 'CISO / IT Security',
  BREACH: 'Incident Response / Privacy / Legal',
  XFER: 'Legal / Privacy / Procurement',
  PBD: 'Product / Architecture / Privacy',
  HR: 'HR / Legal / Privacy',
  MKT: 'Marketing / Digital / Privacy',
  CHILD: 'Privacy / Legal / Product',
  AWARE: 'HR / Privacy / Security',
  AUDIT: 'Internal Audit / Compliance / Privacy',
};

const SERVICE_MAP: Record<string, { service: string; url: string }> = {
  GOV: { service: 'Privacy Policy & PDP Governance Framework', url: '/services' },
  MAP: { service: 'RoPA Development & Data Mapping', url: '/services' },
  ROPA: { service: 'RoPA Development & Data Mapping', url: '/services' },
  LAW: { service: 'PDP Legal Basis & Processing Governance Advisory', url: '/services' },
  CONSENT: { service: 'Consent & Preference Management Design', url: '/services' },
  RIGHTS: { service: 'Data Subject Rights & DSAR Operating Model', url: '/services' },
  NOTICE: { service: 'Privacy Notice & Transparency Review', url: '/services' },
  RET: { service: 'Data Retention & Secure Disposal Program', url: '/services' },
  DPIA: { service: 'DPIA Advisory', url: '/services' },
  DPO: { service: 'DPO Advisory / DPO Support', url: '/services' },
  TPRM: { service: 'Third Party Privacy Risk Management', url: '/services' },
  SEC: { service: 'Cybersecurity Assessment / VAPT / Security Governance', url: '/services' },
  BREACH: { service: 'Privacy Incident & Breach Response Program', url: '/services' },
  XFER: { service: 'Cross-Border Data Transfer Advisory', url: '/services' },
  PBD: { service: 'Privacy by Design Advisory', url: '/services' },
  HR: { service: 'Employee Privacy Program', url: '/services' },
  MKT: { service: 'Digital Privacy, Cookies & Marketing Governance', url: '/services' },
  CHILD: { service: 'Children & Vulnerable Data Privacy Assessment', url: '/services' },
  AWARE: { service: 'PDP Awareness & Privacy Training', url: '/training' },
  AUDIT: { service: 'Privacy Assurance & Continuous Monitoring', url: '/services' },
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

type ScoringConfig = {
  parameters?: Record<string, number>;
  maturityLevels?: Array<{
    level: number;
    label: string;
    minScore: number;
    maxScore: number;
  }>;
};

function parameter(
  scoring: ScoringConfig | undefined,
  key: string,
  fallback: number,
) {
  const value = scoring?.parameters?.[key];
  return Number.isFinite(value) ? Number(value) : fallback;
}

function maturity(score: number, scoring?: ScoringConfig) {
  const configured = scoring?.maturityLevels
    ?.filter(
      (item) =>
        Number.isFinite(item.level) &&
        Number.isFinite(item.minScore) &&
        Number.isFinite(item.maxScore),
    )
    .sort((a, b) => a.level - b.level);

  const match = configured?.find(
    (item) => score >= item.minScore && score <= item.maxScore,
  );
  if (match) return { level: match.level, label: match.label };

  if (score < 20) return { level: 0, label: 'Not Established' };
  if (score < 40) return { level: 1, label: 'Initial' };
  if (score < 60) return { level: 2, label: 'Developing' };
  if (score < 75) return { level: 3, label: 'Defined' };
  if (score < 90) return { level: 4, label: 'Managed' };
  return { level: 5, label: 'Optimized' };
}

function priorityFor(question: PdpQuestion, rawScore: number) {
  if (question.criticality === 'Critical' && rawScore < 0.6) return 'Critical' as const;
  if (
    (question.criticality === 'Critical' || question.criticality === 'High') &&
    rawScore < 0.6
  ) {
    return 'High' as const;
  }
  if (rawScore < 0.6) return 'Medium' as const;
  return 'Low' as const;
}

function targetTimeline(priority: string) {
  if (priority === 'Critical') return '0–30 hari';
  if (priority === 'High') return '31–90 hari';
  if (priority === 'Medium') return '3–6 bulan';
  return '6–12 bulan';
}

function currentCondition(answerValue: string, confidence: string, evidenceStatus: string) {
  const labels: Record<string, string> = {
    yes: 'Implemented',
    partial: 'Partially implemented',
    planned: 'Planned',
    unknown: 'Unknown / not evidenced',
    no: 'Not implemented',
    na: 'Claimed not applicable — requires validation',
  };
  return (
    (labels[answerValue] || 'Not answered') +
    '; confidence: ' +
    confidence +
    '; evidence: ' +
    evidenceStatus
  );
}

function gapText(answerValue: string) {
  if (answerValue === 'yes') return 'No material gap identified from the response.';
  if (answerValue === 'partial') return 'Control exists but is incomplete or inconsistently implemented.';
  if (answerValue === 'planned') return 'Control is planned but not yet operating.';
  if (answerValue === 'na') return 'N/A selection requires applicability validation before exclusion.';
  if (answerValue === 'unknown') return 'Control status is not known or cannot be evidenced.';
  return 'Required control or operating capability is not established.';
}

function recommend(question: PdpQuestion, answerValue: string) {
  if (answerValue === 'yes') {
    return 'Maintain the control, evidence its operating effectiveness, and review it periodically.';
  }
  const objective = question.controlObjective || 'Establish the required privacy control';
  return (
    objective +
    ' Tetapkan accountable owner, bukti implementasi, target waktu, dan verifikasi efektivitas setelah remediasi.'
  );
}

function dpiaScreen(profile: PdpProfile) {
  const reasons: string[] = [];
  if (profile.automatedDecisionMaking) reasons.push('AI/automated decision making is used.');
  if (profile.profiling || profile.behavioralAnalytics) reasons.push('Profiling or behavioral analytics is performed.');
  if (profile.biometricData || profile.geneticData) reasons.push('Biometric or genetic data is processed.');
  if (profile.healthData || profile.criminalData) reasons.push('Health or criminal-related data is processed.');
  if ((profile.dataSubjectCount || 0) >= 100000) reasons.push('Large-scale processing indicator based on declared data-subject volume.');
  if (profile.childrenData) reasons.push('Children data is processed.');
  if (profile.cctv && (profile.dataSubjectCount || 0) >= 10000) reasons.push('Systematic monitoring indicator is present.');

  const status =
    reasons.length >= 2
      ? 'DPIA Likely Required'
      : reasons.length === 1
        ? 'Further Assessment Required'
        : 'No High-Risk Trigger Identified Based on Current Information';

  return { status, reasons };
}

function dpoScreen(profile: PdpProfile) {
  const reasons: string[] = [];
  const largeScale =
    (profile.dataSubjectCount || 0) >= 100000 ||
    (profile.employeeCount || 0) >= 1000;

  if (/government|public/i.test(profile.industry || '')) {
    reasons.push('Public-service / government-sector processing indicator is present.');
  }
  if (largeScale && (profile.profiling || profile.behavioralAnalytics || profile.cctv)) {
    reasons.push('Regular/systematic large-scale monitoring indicator is present.');
  }
  if (
    largeScale &&
    (profile.healthData || profile.biometricData || profile.geneticData || profile.criminalData)
  ) {
    reasons.push('Large-scale processing of specific/high-impact personal data indicator is present.');
  }
  if (profile.thirdPartyProcessor && largeScale) {
    reasons.push('Large-scale processor role indicator is present.');
  }

  const status =
    reasons.length > 0
      ? 'Trigger Identified'
      : profile.thirdPartyProcessor ||
          profile.healthData ||
          profile.biometricData ||
          profile.profiling
        ? 'Further Legal Review Recommended'
        : 'Trigger Not Evident';

  return { status, reasons };
}

export function scorePdpAssessment(params: {
  questions: PdpQuestion[];
  responses: PdpResponseInput[];
  profile: PdpProfile;
  scoring?: ScoringConfig;
}): PdpScoreResult {
  const responseMap = new Map(
    params.responses.map((response) => [response.questionId, response]),
  );

  const domainBuckets = new Map<
    string,
    {
      code: string;
      name: string;
      numerator: number;
      denominator: number;
      answered: number;
      applicable: number;
      criticalGaps: number;
    }
  >();

  const findings: PdpFinding[] = [];
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  let evidenceNumerator = 0;
  let evidenceDenominator = 0;
  let answeredCount = 0;

  for (const question of params.questions) {
    const response = responseMap.get(question.id);
    const answerValue = response?.answerValue || '';
    const raw = parameter(
      params.scoring,
      'answer.' + answerValue,
      ANSWER_SCORE[answerValue] ?? 0,
    );
    const confidence = response?.confidence || 'unverified';
    const evidence = response?.evidenceStatus || 'not_available';
    const confidenceFactor = parameter(
      params.scoring,
      'confidence.' + confidence,
      CONFIDENCE_FACTOR[confidence] ?? 0.7,
    );
    const evidenceFactor = parameter(
      params.scoring,
      'evidence.' + evidence,
      EVIDENCE_FACTOR[evidence] ?? 0.8,
    );
    const riskFactor = parameter(
      params.scoring,
      'criticality.' + question.criticality,
      CRITICALITY_FACTOR[question.criticality] ?? 1,
    );
    const baseWeight = question.domainWeight * question.weight * riskFactor;

    const isAnswered = Boolean(answerValue);
    const invalidNa = answerValue === 'na';
    const effectiveRaw = invalidNa ? 0 : raw;
    const achieved = effectiveRaw * confidenceFactor * evidenceFactor;

    if (isAnswered) answeredCount += 1;
    weightedNumerator += achieved * baseWeight;
    weightedDenominator += baseWeight;

    if (isAnswered) {
      evidenceNumerator += confidenceFactor * evidenceFactor * baseWeight;
      evidenceDenominator += baseWeight;
    }

    const bucket = domainBuckets.get(question.domainId) || {
      code: question.domainCode,
      name: question.domainName,
      numerator: 0,
      denominator: 0,
      answered: 0,
      applicable: 0,
      criticalGaps: 0,
    };
    bucket.numerator += achieved * baseWeight;
    bucket.denominator += baseWeight;
    bucket.applicable += 1;
    if (isAnswered) bucket.answered += 1;

    const priority = priorityFor(question, effectiveRaw);
    if (priority === 'Critical') bucket.criticalGaps += 1;
    domainBuckets.set(question.domainId, bucket);

    if (!isAnswered || effectiveRaw < 0.999 || confidenceFactor < 1 || evidenceFactor < 1) {
      findings.push({
        questionId: question.id,
        code: question.code,
        domainId: question.domainId,
        domain: question.domainName,
        requirement: question.questionText,
        currentCondition: currentCondition(answerValue, confidence, evidence),
        gap: !isAnswered ? 'Question not answered.' : gapText(answerValue),
        risk:
          question.riskStatement ||
          'Insufficient privacy control may increase regulatory, operational, and data-subject risk.',
        evidence: question.recommendedEvidence || 'Documented control evidence',
        regulatoryReference: [question.regulationReference, question.articleReference]
          .filter(Boolean)
          .join(' — '),
        recommendedAction: recommend(question, answerValue),
        priority,
        suggestedOwner: OWNERS[question.domainCode] || 'Privacy / Business Owner',
        targetTimeline: targetTimeline(priority),
        service: SERVICE_MAP[question.domainCode]?.service,
      });
    }
  }

  const overallScore =
    weightedDenominator > 0
      ? clamp((weightedNumerator / weightedDenominator) * 100)
      : 0;
  const maturityResult = maturity(overallScore, params.scoring);
  const evidenceConfidence =
    evidenceDenominator > 0
      ? clamp((evidenceNumerator / evidenceDenominator) * 100)
      : 0;
  const completion =
    params.questions.length > 0
      ? clamp((answeredCount / params.questions.length) * 100)
      : 0;

  const domainScores = [...domainBuckets.entries()].map(([domainId, bucket]) => ({
    domainId,
    code: bucket.code,
    name: bucket.name,
    score:
      bucket.denominator > 0
        ? rounded((bucket.numerator / bucket.denominator) * 100)
        : 0,
    answered: bucket.answered,
    applicable: bucket.applicable,
    criticalGaps: bucket.criticalGaps,
  }));

  findings.sort((a, b) => {
    const order: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return (order[b.priority] || 0) - (order[a.priority] || 0);
  });

  const criticalFindings = findings
    .filter((finding) => finding.priority === 'Critical')
    .slice(0, 12);

  const topRisks = findings.slice(0, 10).map((finding, index) => {
    const question = params.questions.find((item) => item.id === finding.questionId);
    const response = responseMap.get(finding.questionId);
    const impact =
      question?.criticality === 'Critical'
        ? 5
        : question?.criticality === 'High'
          ? 4
          : question?.criticality === 'Medium'
            ? 3
            : 2;
    const likelihood =
      response?.answerValue === 'no' || !response?.answerValue
        ? 5
        : response?.answerValue === 'unknown'
          ? 5
          : response?.answerValue === 'planned'
            ? 4
            : response?.answerValue === 'partial'
              ? 3
              : 1;
    const inherentRisk = impact * likelihood;
    return {
      id: 'RISK-' + String(index + 1).padStart(3, '0'),
      domain: finding.domain,
      riskEvent: finding.risk,
      impact,
      likelihood,
      inherentRisk,
      priority:
        inherentRisk >= parameter(params.scoring, 'risk.critical_threshold', 20)
          ? 'Critical'
          : inherentRisk >= parameter(params.scoring, 'risk.high_threshold', 15)
            ? 'High'
            : inherentRisk >= parameter(params.scoring, 'risk.medium_threshold', 8)
              ? 'Medium'
              : 'Low',
      recommendedAction: finding.recommendedAction,
    };
  });

  const roadmap = findings
    .filter((finding) => finding.priority !== 'Low')
    .slice(0, 16)
    .map((finding) => ({
      phase:
        finding.priority === 'Critical'
          ? '0–30 hari'
          : finding.priority === 'High'
            ? '31–90 hari'
            : '3–6 bulan',
      domain: finding.domain,
      action: finding.recommendedAction,
      owner: finding.suggestedOwner,
      priority: finding.priority,
    }));

  const serviceRecommendations = domainScores
    .filter((domain) => domain.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((domain) => {
      const mapped = SERVICE_MAP[domain.code] || {
        service: 'PDP Readiness Advisory',
        url: '/services',
      };
      return {
        service: mapped.service,
        reason:
          domain.name +
          ' readiness score ' +
          domain.score +
          '% indicates a material improvement opportunity.',
        url: mapped.url,
      };
    });

  return {
    overallScore: rounded(overallScore),
    maturityLevel: maturityResult.level,
    maturityLabel: maturityResult.label,
    evidenceConfidence: rounded(evidenceConfidence),
    completion: rounded(completion),
    domainScores,
    criticalFindings,
    findings,
    topRisks,
    dpia: dpiaScreen(params.profile),
    dpo: dpoScreen(params.profile),
    roadmap,
    serviceRecommendations,
    disclaimer:
      'Hasil assessment merupakan diagnostic readiness indicator berdasarkan informasi yang diberikan pengguna dan bukan merupakan sertifikasi, audit opinion, atau legal opinion mengenai kepatuhan organisasi. Interpretasi akhir terhadap kewajiban hukum harus mempertimbangkan konteks pemrosesan, regulasi yang berlaku, peraturan sektoral, serta bukti pendukung.',
  };
}
