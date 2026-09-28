import crypto from 'node:crypto';
import type {
  PdpAnswerRecord,
  PdpAssessmentResult,
  PdpConfig,
  PdpDomainScore,
  PdpGapFinding,
  PdpQuestion,
  PdpRoadmapItem,
} from '@/lib/pdp/types';

const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

function weightedAverage(items: Array<{ value: number; weight: number }>) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (totalWeight <= 0) return 0;
  return items.reduce(
    (sum, item) => sum + item.value * Math.max(0, item.weight),
    0,
  ) / totalWeight;
}

function evidenceRank(value: string | null | undefined) {
  switch (value) {
    case 'reviewed':
      return 5;
    case 'uploaded':
      return 4;
    case 'exists':
      return 3;
    case 'improve':
      return 2;
    case 'planned':
      return 1;
    default:
      return 0;
  }
}

function domainStatus(score: number) {
  if (score >= 90) return 'High Readiness';
  if (score >= 75) return 'Advanced Readiness';
  if (score >= 60) return 'Defined';
  if (score >= 40) return 'Developing';
  return 'Foundational';
}

function ownerFor(domainCode: string) {
  switch (domainCode) {
    case 'GOV':
      return 'Executive Sponsor / DPO Function / Legal & Compliance';
    case 'INV':
      return 'Data Governance / Business Owners / IT';
    case 'LGL':
      return 'Legal / Privacy / Product & Business Owners';
    case 'RGT':
      return 'Privacy Operations / Customer Service / HR / IT';
    case 'RSK':
      return 'DPO Function / Risk / Architecture / Product';
    case 'TPR':
      return 'Procurement / Legal / Vendor Risk / DPO Function';
    case 'SEC':
      return 'CISO / Security Operations / IT / Incident Response';
    default:
      return 'Privacy Control Owner';
  }
}

function severityFor(question: PdpQuestion, score: number, evidenceMultiplier: number) {
  const lowEvidence = evidenceMultiplier < 0.6;
  if (question.criticality === 'Critical') {
    if (score <= 25) return 'Critical' as const;
    if (score <= 50 || lowEvidence) return 'High' as const;
    return 'Medium' as const;
  }
  if (question.criticality === 'High') {
    if (score <= 25) return 'High' as const;
    if (score <= 50 || lowEvidence) return 'Medium' as const;
    return 'Low' as const;
  }
  if (question.criticality === 'Medium') {
    return score <= 50 ? 'Medium' as const : 'Low' as const;
  }
  return 'Low' as const;
}

function phaseFor(severity: PdpGapFinding['severity']) {
  if (severity === 'Critical') return '0–30 Hari · Immediate Remediation';
  if (severity === 'High') return '31–60 Hari · Priority Remediation';
  if (severity === 'Medium') return '61–90 Hari · Readiness Uplift';
  return '3–6 Bulan · Continuous Improvement';
}

function currentCondition(answer: PdpAnswerRecord | undefined) {
  if (!answer) return 'Belum ada jawaban assessment untuk area ini.';
  if (answer.isNa) {
    return 'Not Applicable: ' +
      (answer.applicabilityJustification || 'justifikasi belum memadai');
  }
  const note = answer.comment?.trim();
  if (note) return note;
  return 'Status implementasi ' +
    String(answer.answerScore ?? 0) +
    '/100 dengan evidence ' +
    answer.evidenceStatus +
    '.';
}

export function applicablePdpQuestions(
  config: PdpConfig,
  assessmentType: 'quick' | 'detailed',
) {
  return config.questions
    .filter((question) => assessmentType === 'detailed' || question.isCore)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function scorePdpAssessment(params: {
  assessmentId: string;
  assessmentType: 'quick' | 'detailed';
  config: PdpConfig;
  answers: PdpAnswerRecord[];
}): PdpAssessmentResult {
  const { assessmentId, assessmentType, config, answers } = params;
  const applicable = applicablePdpQuestions(config, assessmentType);
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const evidenceMap = new Map(
    config.evidenceOptions.map((option) => [option.value, option.multiplier]),
  );

  const validQuestions = applicable.filter((question) => {
    const answer = answerByQuestion.get(question.id);
    return !(
      answer?.isNa &&
      String(answer.applicabilityJustification || '').trim().length >= 8
    );
  });

  const implementationScore = weightedAverage(
    validQuestions.map((question) => ({
      value: clamp(answerByQuestion.get(question.id)?.answerScore ?? 0),
      weight: question.weight,
    })),
  );

  const evidenceScore = weightedAverage(
    validQuestions.map((question) => ({
      value:
        clamp(
          (evidenceMap.get(
            answerByQuestion.get(question.id)?.evidenceStatus || 'none',
          ) || 0) * 100,
        ),
      weight: question.weight,
    })),
  );

  const scoringWeights = new Map(
    config.scoringWeights.map((item) => [item.key, item.weight]),
  );
  const implementationWeight = scoringWeights.get('implementation') ?? 0.75;
  const evidenceWeight = scoringWeights.get('evidence') ?? 0.25;
  const totalWeight = implementationWeight + evidenceWeight || 1;
  const overallScore =
    (implementationScore * implementationWeight +
      evidenceScore * evidenceWeight) /
    totalWeight;

  const readinessLevel =
    config.scoringThresholds.find(
      (threshold) =>
        overallScore >= threshold.minScore &&
        overallScore <= threshold.maxScore,
    )?.label || 'Unclassified';

  const domainScores: PdpDomainScore[] = config.domains.map((domain) => {
    const questions = validQuestions.filter(
      (question) => question.domainCode === domain.code,
    );
    const implementation = weightedAverage(
      questions.map((question) => ({
        value: clamp(answerByQuestion.get(question.id)?.answerScore ?? 0),
        weight: question.weight,
      })),
    );
    const evidence = weightedAverage(
      questions.map((question) => ({
        value:
          clamp(
            (evidenceMap.get(
              answerByQuestion.get(question.id)?.evidenceStatus || 'none',
            ) || 0) * 100,
          ),
        weight: question.weight,
      })),
    );
    const overall =
      (implementation * implementationWeight + evidence * evidenceWeight) /
      totalWeight;

    return {
      domainCode: domain.code,
      domainName: domain.name,
      implementationScore: round(implementation),
      evidenceScore: round(evidence),
      overallScore: round(overall),
      gap: round(Math.max(0, 100 - overall)),
      status: domainStatus(overall),
    };
  });

  const findings: PdpGapFinding[] = [];
  for (const question of validQuestions) {
    const answer = answerByQuestion.get(question.id);
    const answerScore = clamp(answer?.answerScore ?? 0);
    const evidenceMultiplier =
      evidenceMap.get(answer?.evidenceStatus || 'none') || 0;

    if (answerScore >= 75 && evidenceMultiplier >= 0.6) continue;

    const severity = severityFor(question, answerScore, evidenceMultiplier);
    findings.push({
      id: crypto.randomUUID(),
      questionId: question.id,
      domainCode: question.domainCode,
      questionCode: question.questionCode,
      title: question.questionText,
      severity,
      currentCondition: currentCondition(answer),
      risk:
        question.riskIfMissing ||
        'Terdapat risiko ketidakcukupan pengendalian Pelindungan Data Pribadi.',
      recommendation:
        question.recommendation ||
        'Tetapkan tindakan perbaikan, owner, target waktu, dan evidence penyelesaian.',
      legalReference: question.legalReference,
    });
  }

  const severityOrder: Record<PdpGapFinding['severity'], number> = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4,
  };
  findings.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      a.questionCode.localeCompare(b.questionCode),
  );

  const roadmap: PdpRoadmapItem[] = findings.map((finding) => ({
    id: crypto.randomUUID(),
    phase: phaseFor(finding.severity),
    domainCode: finding.domainCode,
    action: finding.recommendation,
    reason: finding.risk,
    priority: finding.severity,
    ownerSuggestion: ownerFor(finding.domainCode),
    dependencies:
      finding.severity === 'Critical'
        ? 'Management sponsorship, accountable owner, and evidence plan'
        : null,
    expectedOutcome:
      'Gap ditutup dengan implementasi yang dapat dibuktikan dan dapat direview.',
  }));

  const gateItems = config.readinessGates.map((gate) => {
    const answer = answerByQuestion.get(gate.questionId);
    const complete =
      !answer?.isNa &&
      (answer?.answerScore ?? -1) >= gate.minimumScore &&
      evidenceRank(answer?.evidenceStatus) >= evidenceRank(gate.evidenceMinimum);

    return {
      key: gate.key,
      label: gate.label,
      complete,
      answerScore: answer?.answerScore ?? null,
      evidenceStatus: answer?.evidenceStatus ?? null,
    };
  });

  const services = config.serviceMappings
    .filter((mapping) => {
      const score = domainScores.find(
        (domain) => domain.domainCode === mapping.domainCode,
      );
      return Boolean(score && score.overallScore < 75);
    })
    .sort((a, b) => a.priorityOrder - b.priorityOrder)
    .slice(0, 5);

  const answeredCount = answers.filter((answer) =>
    applicable.some((question) => question.id === answer.questionId),
  ).length;

  return {
    assessmentId,
    implementationScore: round(implementationScore),
    evidenceScore: round(evidenceScore),
    overallScore: round(overallScore),
    readinessLevel,
    completion: {
      answered: answeredCount,
      total: applicable.length,
      percentage:
        applicable.length > 0
          ? Math.round((answeredCount / applicable.length) * 100)
          : 0,
    },
    gates: {
      completed: gateItems.filter((gate) => gate.complete).length,
      total: gateItems.length,
      items: gateItems,
    },
    domainScores,
    findings,
    roadmap,
    services,
    parameters: config.parameters,
  };
}
