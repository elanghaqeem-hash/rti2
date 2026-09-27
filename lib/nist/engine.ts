import type {
  NistAnswerRecord,
  NistAssessmentConfig,
  NistAssessmentResult,
  NistCategoryConfig,
  NistCategoryScore,
  NistFunctionScore,
  NistRecommendation,
  NistRiskFinding,
  NistRoadmapItem,
} from '@/lib/nist/types';

const round = (value: number, digits = 0) => Number(value.toFixed(digits));
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function weightedAverage(items: Array<{ value: number; weight: number }>) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (totalWeight <= 0) return 0;
  return items.reduce(
    (sum, item) => sum + item.value * Math.max(0, item.weight),
    0,
  ) / totalWeight;
}

function categoryStatus(score: number) {
  if (score >= 80) return 'Strong';
  if (score >= 65) return 'Adequate';
  if (score >= 50) return 'Needs Improvement';
  if (score >= 30) return 'High Risk';
  return 'Critical';
}

function riskCoordinates(gap: number, score: number) {
  const likelihood =
    gap >= 60 ? 5 :
    gap >= 40 ? 4 :
    gap >= 25 ? 3 :
    gap >= 10 ? 2 : 1;

  const impact =
    score < 25 ? 5 :
    gap >= 35 ? 4 :
    gap >= 15 ? 3 : 2;

  const product = likelihood * impact;
  const rating: NistRiskFinding['rating'] =
    product >= 16 ? 'Critical' :
    product >= 10 ? 'High' :
    product >= 5 ? 'Medium' : 'Low';

  return { likelihood, impact, rating };
}

function recommendationPriority(rating: NistRiskFinding['rating']): NistRecommendation['priority'] {
  return rating;
}

function effortFromGap(gap: number): NistRecommendation['effort'] {
  if (gap >= 50) return 'High';
  if (gap >= 25) return 'Medium';
  return 'Low';
}

function recommendationTimeline(
  priority: NistRecommendation['priority'],
): NistRecommendation['suggestedTimeline'] {
  if (priority === 'Critical') return '0–30 Days';
  if (priority === 'High') return '31–60 Days';
  if (priority === 'Medium') return '61–90 Days';
  return '3–6 Months';
}

function ownerFor(functionCode: string) {
  switch (functionCode) {
    case 'GV':
      return 'CISO / Risk / Executive Management';
    case 'ID':
      return 'CISO / GRC / IT & Asset Owners';
    case 'PR':
      return 'CIO / CISO / IT Operations';
    case 'DE':
      return 'SOC / Security Operations';
    case 'RS':
      return 'Incident Response / CISO / Legal & Communications';
    case 'RC':
      return 'BCM / IT Disaster Recovery / Business Owners';
    default:
      return 'Cybersecurity Control Owner';
  }
}

function riskRatingFromScore(score: number, config: NistAssessmentConfig) {
  const threshold = config.scoringThresholds.find(
    (item) => score >= item.minScore && score <= item.maxScore,
  );
  return threshold?.label || 'Unclassified';
}

function indicativeTier(
  overall: number,
  govern: number,
  confidence: number,
  config: NistAssessmentConfig,
) {
  const rules = [...config.tierRules].sort((a, b) => b.tier - a.tier);
  const matched = rules.find(
    (rule) =>
      overall >= rule.minOverall &&
      govern >= rule.minGovern &&
      confidence >= rule.minConfidence,
  ) || rules[rules.length - 1];

  return {
    tier: matched?.tier || 1,
    label: matched?.label || 'Partial',
  } as const;
}

function categoryReason(category: NistCategoryConfig, score: number, gap: number) {
  if (gap <= 0) {
    return `${category.code} is at or above the configured target profile.`;
  }
  return `${category.code} (${category.name}) scored ${round(score)} against a configured target of ${round(category.targetScore)}, leaving a ${round(gap)}-point gap.`;
}

export function scoreNistAssessment(params: {
  assessmentId: string;
  config: NistAssessmentConfig;
  answers: NistAnswerRecord[];
}): NistAssessmentResult {
  const { assessmentId, config, answers } = params;
  const answerByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  const evidenceMap = new Map(
    config.evidenceOptions.map((item) => [item.value, item.multiplier]),
  );

  const categoryScores: NistCategoryScore[] = config.categories.map((category) => {
    const questions = config.questions.filter(
      (question) => question.categoryCode === category.code,
    );
    const answered = questions
      .map((question) => ({
        question,
        answer: answerByQuestion.get(question.id),
      }))
      .filter((item) => Boolean(item.answer));

    const score = answered.length
      ? weightedAverage(
          answered.map(({ question, answer }) => ({
            value: clamp(answer!.answerScore),
            weight: question.weight,
          })),
        )
      : 0;

    const gap = Math.max(0, category.targetScore - score);

    return {
      categoryCode: category.code,
      categoryName: category.name,
      functionCode: category.functionCode,
      score: round(score),
      targetScore: round(category.targetScore),
      gap: round(gap),
      status: categoryStatus(score),
    };
  });

  const functionScores: NistFunctionScore[] = config.functions.map((fn) => {
    const categories = config.categories.filter(
      (category) => category.functionCode === fn.code,
    );
    const scored = categories.map((category) => {
      const item = categoryScores.find(
        (entry) => entry.categoryCode === category.code,
      )!;
      return { value: item.score, weight: category.weight };
    });
    const targets = categories.map((category) => ({
      value: category.targetScore,
      weight: category.weight,
    }));

    const score = weightedAverage(scored);
    const targetScore = weightedAverage(targets);

    return {
      functionCode: fn.code,
      functionName: fn.name,
      score: round(score),
      targetScore: round(targetScore),
      gap: round(Math.max(0, targetScore - score)),
    };
  });

  const overallScore = round(
    weightedAverage(
      config.functions.map((fn) => ({
        value:
          functionScores.find((item) => item.functionCode === fn.code)?.score || 0,
        weight: fn.weight,
      })),
    ),
  );

  const confidenceScore = round(
    answers.length
      ? answers.reduce((sum, answer) => {
          const evidenceMultiplier =
            evidenceMap.get(answer.evidenceStatus || 'unspecified') ?? 0.4;
          const answerConfidence = answer.notSure
            ? Math.min(0.25, evidenceMultiplier)
            : evidenceMultiplier;
          return sum + answerConfidence * 100;
        }, 0) / answers.length
      : 0,
  );

  const governScore =
    functionScores.find((item) => item.functionCode === 'GV')?.score || 0;
  const tier = indicativeTier(
    overallScore,
    governScore,
    confidenceScore,
    config,
  );
  const completion = round(
    (answers.length / Math.max(config.questions.length, 1)) * 100,
  );

  const findings: NistRiskFinding[] = categoryScores
    .filter((category) => category.gap > 0)
    .map((category) => {
      const configCategory = config.categories.find(
        (item) => item.code === category.categoryCode,
      )!;
      const risk = riskCoordinates(category.gap, category.score);

      return {
        id: `risk-${assessmentId}-${category.categoryCode.replace('.', '-').toLowerCase()}`,
        categoryCode: category.categoryCode,
        title: `${category.categoryName} Exposure`,
        rating: risk.rating,
        likelihood: risk.likelihood,
        impact: risk.impact,
        reason: categoryReason(configCategory, category.score, category.gap),
      };
    })
    .sort((a, b) => {
      const productDiff = b.likelihood * b.impact - a.likelihood * a.impact;
      if (productDiff !== 0) return productDiff;
      return a.categoryCode.localeCompare(b.categoryCode);
    });

  const recommendations: NistRecommendation[] = categoryScores
    .filter((category) => category.gap >= 10)
    .map((category) => {
      const finding = findings.find(
        (item) => item.categoryCode === category.categoryCode,
      );
      const mapping = config.serviceMappings.find(
        (item) => item.categoryCode === category.categoryCode,
      );
      const priority = recommendationPriority(finding?.rating || 'Low');
      const effort = effortFromGap(category.gap);

      return {
        id: `rec-${assessmentId}-${category.categoryCode.replace('.', '-').toLowerCase()}`,
        categoryCode: category.categoryCode,
        title: `Strengthen ${category.categoryName}`,
        priority,
        effort,
        impact: priority === 'Critical' || priority === 'High' ? 'High' : 'Medium',
        suggestedTimeline: recommendationTimeline(priority),
        reason:
          mapping?.reasonTemplate ||
          `The current ${category.categoryCode} posture is below the configured target profile.`,
        serviceCode: mapping?.serviceCode,
        serviceName: mapping?.serviceName,
        serviceUrl: mapping?.serviceUrl,
      };
    })
    .sort((a, b) => {
      const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return order[b.priority] - order[a.priority];
    });

  const roadmap: NistRoadmapItem[] = recommendations.map((recommendation) => {
    const category = config.categories.find(
      (item) => item.code === recommendation.categoryCode,
    )!;
    const resultCategory = categoryScores.find(
      (item) => item.categoryCode === recommendation.categoryCode,
    )!;

    return {
      id: `roadmap-${assessmentId}-${recommendation.categoryCode.replace('.', '-').toLowerCase()}`,
      phase: recommendation.suggestedTimeline,
      categoryCode: recommendation.categoryCode,
      action: recommendation.serviceName
        ? `${recommendation.title}; evaluate and implement the relevant control improvements, supported where appropriate by ${recommendation.serviceName}.`
        : recommendation.title,
      reason: recommendation.reason,
      priority: recommendation.priority,
      ownerSuggestion: ownerFor(category.functionCode),
      dependencies:
        recommendation.priority === 'Critical'
          ? 'Executive sponsorship, accountable control owner, current-state evidence, and an approved remediation plan.'
          : 'Named control owner, baseline evidence, target state, and tracked remediation backlog.',
      estimatedEffort: recommendation.effort,
      expectedOutcome: `Reduce the ${resultCategory.gap}-point gap for ${recommendation.categoryCode} toward the configured target of ${resultCategory.targetScore}.`,
    };
  });

  const strengths = [...categoryScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const gaps = [...categoryScores]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);
  const strongestFunction = [...functionScores]
    .sort((a, b) => b.score - a.score)[0];
  const weakestFunction = [...functionScores]
    .sort((a, b) => a.score - b.score)[0];

  return {
    assessmentId,
    overallScore,
    riskRating: riskRatingFromScore(overallScore, config),
    confidenceScore,
    indicativeTier: tier,
    completion,
    strongestFunction,
    weakestFunction,
    criticalGapCount: categoryScores.filter((item) => item.status === 'Critical').length,
    functionScores,
    categoryScores,
    findings,
    recommendations,
    roadmap,
    strengths,
    gaps,
    benchmark: null,
    methodologyDisclaimer:
      'RTI NIST Cyber Quick Check is an independent diagnostic tool developed by PT Riset Teknologi Indonesia and aligned with NIST Cybersecurity Framework 2.0. It is not an official NIST certification, audit, accreditation, endorsement, or guarantee of compliance.',
  };
}
