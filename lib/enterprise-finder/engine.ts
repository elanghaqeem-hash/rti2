import type {
  CapabilityStatus,
  FinderAssessmentInput,
  FinderConfig,
  FinderDiagnosticResult,
  FinderLocale,
  FinderPriority,
  FinderPressureScore,
  FinderRecommendation,
  FinderRoadmapItem,
  FinderService,
  FinderServiceMapping,
} from '@/lib/enterprise-finder/types';

type FinderEngineData = {
  services: FinderService[];
  mappings: FinderServiceMapping[];
  weights: Record<string, number>;
  aiPrompt: string;
  aiPromptVersion: number;
};

const PRESSURE_CATEGORIES = [
  'Cybersecurity',
  'Technology',
  'Governance',
  'Regulation',
  'Resilience',
  'People',
  'Digital Transformation',
] as const;

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value);

function text(locale: FinderLocale, id: string, en: string) {
  return locale === 'en' ? en : id;
}

function optionFor(config: FinderConfig, questionKey: string, value: string) {
  return config.questions
    .find((question) => question.key === questionKey)
    ?.options.find((option) => option.value === value);
}

function optionLabel(config: FinderConfig, questionKey: string, value: string) {
  return optionFor(config, questionKey, value)?.label || value.replaceAll('_', ' ');
}

function pressureCategory(config: FinderConfig, pressureKey: string) {
  const option = optionFor(config, 'pressures', pressureKey);
  const category = String(option?.metadata?.category || 'Technology');
  return PRESSURE_CATEGORIES.includes(category as (typeof PRESSURE_CATEGORIES)[number])
    ? (category as (typeof PRESSURE_CATEGORIES)[number])
    : 'Technology';
}

function pressureScore(
  rating: FinderAssessmentInput['pressures'][number],
  weights: Record<string, number>,
) {
  const components = [
    [rating.severity, weights['pressure.severity'] ?? 0.2],
    [rating.urgency, weights['pressure.urgency'] ?? 0.2],
    [rating.businessImpact, weights['pressure.business'] ?? 0.2],
    [rating.regulatoryImpact, weights['pressure.regulatory'] ?? 0.15],
    [rating.cyberRisk, weights['pressure.cyber'] ?? 0.15],
    [rating.operationalImpact, weights['pressure.operational'] ?? 0.1],
  ] as const;

  const totalWeight = components.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const weighted =
    components.reduce((sum, [value, weight]) => {
      const normalized = clamp(Number(value) || 1, 1, 5);
      return sum + normalized * weight;
    }, 0) / totalWeight;

  return clamp((weighted / 5) * 100);
}

function capabilityGap(status: CapabilityStatus) {
  switch (status) {
    case 'fully_implemented':
      return 0;
    case 'partially_implemented':
      return 35;
    case 'planned':
      return 55;
    case 'unknown':
      return 65;
    case 'not_implemented':
      return 85;
  }
}

function priorityFrom(
  timeline: string,
  matchScore: number,
  pressureUrgency = 3,
): FinderPriority {
  if (
    timeline === 'emergency' ||
    (timeline === 'lt30' && (matchScore >= 70 || pressureUrgency >= 4))
  ) {
    return 'IMMEDIATE';
  }
  if (
    timeline === 'lt30' ||
    timeline === '1_3_months' ||
    (matchScore >= 80 && pressureUrgency >= 4)
  ) {
    return 'NEAR_TERM';
  }
  if (timeline === '3_6_months' || matchScore >= 65) {
    return 'MID_TERM';
  }
  return 'STRATEGIC';
}

function matchLabel(score: number): FinderRecommendation['matchLabel'] {
  if (score >= 90) return 'Very Strong Match';
  if (score >= 75) return 'Strong Match';
  if (score >= 60) return 'Relevant';
  return 'Supporting';
}

function mapPriorityToPhase(priority: FinderPriority): FinderRoadmapItem['phase'] {
  if (priority === 'IMMEDIATE') return '0–30 Days';
  if (priority === 'NEAR_TERM') return '1–3 Months';
  if (priority === 'MID_TERM') return '3–6 Months';
  return '6–18 Months';
}

function calculateComplexity(input: FinderAssessmentInput) {
  let score = 0;
  const scaleScore: Record<string, number> = {
    micro: 0,
    small: 1,
    medium: 2,
    large: 3,
    enterprise: 4,
    conglomerate: 5,
  };
  const dependencyScore: Record<string, number> = {
    low: 0,
    moderate: 1,
    high: 2,
    very_high: 3,
    mission_critical: 4,
  };

  score += scaleScore[input.organization.organizationScale] ?? 2;
  score += dependencyScore[input.technology.digitalDependency] ?? 2;
  score += Math.min(input.technology.infrastructure.length, 4) * 0.5;
  score += Math.min(input.pressures.length, 8) * 0.35;
  score += input.organization.regulatedStatus === 'yes' ? 1 : 0;

  if (score >= 10) return 'Enterprise' as const;
  if (score >= 7) return 'High' as const;
  if (score >= 4) return 'Moderate' as const;
  return 'Low' as const;
}

function expectedDuration(complexity: FinderDiagnosticResult['engagementComplexity']) {
  if (complexity === 'Enterprise') return '6–18 Months (phased)';
  if (complexity === 'High') return '3–9 Months';
  if (complexity === 'Moderate') return '1–6 Months';
  return '2–8 Weeks';
}

function buildQuickWins(
  input: FinderAssessmentInput,
  pressureScores: FinderPressureScore[],
  locale: FinderLocale,
) {
  const keys = new Set(pressureScores.slice(0, 6).map((item) => item.key));
  const gaps = input.technology.capabilities;
  const wins: string[] = [];

  const add = (id: string, en: string) => {
    const value = text(locale, id, en);
    if (!wins.includes(value)) wins.push(value);
  };

  if (
    keys.has('vulnerability') ||
    keys.has('penetration_testing') ||
    gaps.vulnerability_management === 'not_implemented'
  ) {
    add(
      'Lakukan critical vulnerability assessment pada asset dan aplikasi berisiko tertinggi.',
      'Run a critical vulnerability assessment on the highest-risk assets and applications.',
    );
  }

  if (
    keys.has('security_incident') ||
    keys.has('data_breach') ||
    gaps.incident_response === 'not_implemented'
  ) {
    add(
      'Validasi incident-response contacts, escalation path, evidence handling dan containment checklist.',
      'Validate incident-response contacts, escalation paths, evidence handling and containment checklists.',
    );
  }

  if (
    keys.has('business_interruption') ||
    keys.has('disaster_recovery') ||
    gaps.bcm_bcp === 'not_implemented'
  ) {
    add(
      'Validasi backup/restore, critical dependency dan recovery contact list.',
      'Validate backup/restore, critical dependencies and the recovery contact list.',
    );
  }

  if (
    keys.has('outdated_policies') ||
    keys.has('weak_governance') ||
    gaps.policy_sop === 'not_implemented'
  ) {
    add(
      'Prioritaskan refresh policy/SOP yang terkait dengan risiko dan audit finding paling material.',
      'Prioritize policy/SOP refreshes tied to the most material risks and audit findings.',
    );
  }

  if (
    keys.has('cyber_awareness') ||
    keys.has('employee_security') ||
    gaps.security_awareness === 'not_implemented'
  ) {
    add(
      'Jalankan targeted awareness untuk phishing, credential handling dan incident reporting.',
      'Run targeted awareness for phishing, credential handling and incident reporting.',
    );
  }

  if (
    keys.has('data_privacy') ||
    keys.has('pdp_compliance') ||
    gaps.data_protection === 'not_implemented'
  ) {
    add(
      'Inventarisasi processing activity kritikal dan owner data untuk baseline RoPA/privacy gap.',
      'Inventory critical processing activities and data owners for a RoPA/privacy-gap baseline.',
    );
  }

  while (wins.length < 3) {
    [
      [
        'Tetapkan accountable owner dan due date untuk tiga gap prioritas tertinggi.',
        'Assign accountable owners and due dates to the top three priority gaps.',
      ],
      [
        'Buat baseline evidence register agar remediation dapat diukur dan diaudit.',
        'Create a baseline evidence register so remediation can be measured and reviewed.',
      ],
      [
        'Tentukan 30-day improvement backlog dengan executive checkpoint.',
        'Define a 30-day improvement backlog with an executive checkpoint.',
      ],
    ].forEach(([id, en]) => {
      if (wins.length < 3) add(id, en);
    });
  }

  return wins.slice(0, 6);
}

function recommendedTools(
  input: FinderAssessmentInput,
  recommendations: FinderRecommendation[],
  locale: FinderLocale,
) {
  const tools: FinderDiagnosticResult['recommendedTools'] = [];
  const add = (slug: string, name: string, reasonId: string, reasonEn: string) => {
    if (tools.some((item) => item.slug === slug)) return;
    tools.push({
      slug,
      name,
      reason: text(locale, reasonId, reasonEn),
      url: `/tools/${slug}`,
    });
  };

  const serviceKeys = new Set(recommendations.map((item) => item.serviceKey));
  const pressureKeys = new Set(input.pressures.map((item) => item.key));

  if (
    serviceKeys.has('iso27001') ||
    pressureKeys.has('iso_27001') ||
    pressureKeys.has('certification')
  ) {
    add(
      'iso27001-readiness',
      'ISO/IEC 27001 Readiness Checklist',
      'Lanjutkan ke diagnostic ISMS yang lebih detail untuk memvalidasi readiness clauses dan control themes.',
      'Continue with the detailed ISMS diagnostic to validate clause and control-theme readiness.',
    );
  }

  if (
    serviceKeys.has('pdp_readiness') ||
    serviceKeys.has('privacy_governance') ||
    pressureKeys.has('data_privacy') ||
    pressureKeys.has('pdp_compliance')
  ) {
    add(
      'pdp-readiness',
      'UU PDP Data Protection Readiness',
      'Lanjutkan ke privacy diagnostic untuk RoPA, DPIA, DPO, rights handling dan privacy governance.',
      'Continue with the privacy diagnostic for RoPA, DPIA, DPO, rights handling and privacy governance.',
    );
  }

  if (
    recommendations.some((item) => item.category === 'Cybersecurity') ||
    pressureKeys.has('cyberattack_concern')
  ) {
    add(
      'maturity-assessment',
      'Technology & Cyber Maturity Self-Assessment',
      'Gunakan maturity assessment untuk memperoleh baseline lintas domain dan gap roadmap yang lebih komprehensif.',
      'Use the maturity assessment for a broader cross-domain baseline and gap roadmap.',
    );
  }

  if (
    input.objectives.includes('digital_platform') ||
    recommendations.some((item) => item.serviceKey === 'software_development')
  ) {
    add(
      'project-estimator',
      'Project Estimator & RFQ Builder',
      'Kebutuhan sudah dapat diterjemahkan menjadi scope, effort, timeline dan RFQ indikatif.',
      'The need can now be translated into scope, effort, timeline and an indicative RFQ.',
    );
  }

  return tools.slice(0, 4);
}

function pressureCategoryScore(
  category: (typeof PRESSURE_CATEGORIES)[number],
  pressureScores: FinderPressureScore[],
) {
  const scores = pressureScores
    .filter((item) => item.category === category)
    .map((item) => item.score)
    .sort((a, b) => b - a)
    .slice(0, 3);

  if (scores.length === 0) return 0;
  return round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export function diagnoseEnterpriseFinder(params: {
  input: FinderAssessmentInput;
  config: FinderConfig;
  engineData: FinderEngineData;
}): FinderDiagnosticResult {
  const { input, config, engineData } = params;
  const locale = input.locale;

  const pressureScores: FinderPressureScore[] = input.pressures
    .map((rating) => ({
      key: rating.key,
      label: optionLabel(config, 'pressures', rating.key),
      category: pressureCategory(config, rating.key),
      score: round(pressureScore(rating, engineData.weights)),
      severity: clamp(Number(rating.severity) || 1, 1, 5),
      urgency: clamp(Number(rating.urgency) || 1, 1, 5),
    }))
    .sort((a, b) => b.score - a.score);

  const pressureMap = Object.fromEntries(
    PRESSURE_CATEGORIES.map((category) => [
      category,
      pressureCategoryScore(category, pressureScores),
    ]),
  ) as FinderDiagnosticResult['pressureMap'];

  const enterprisePressureScore = pressureScores.length
    ? round(
        pressureScores
          .slice(0, 8)
          .reduce((sum, item, index) => sum + item.score * (1 - index * 0.05), 0) /
          pressureScores
            .slice(0, 8)
            .reduce((sum, _item, index) => sum + (1 - index * 0.05), 0),
      )
    : 0;

  const capabilityQuestion = config.questions.find(
    (question) => question.key === 'capabilities',
  );
  const capabilityGaps = Object.entries(input.technology.capabilities)
    .map(([key, status]) => ({
      key,
      label:
        capabilityQuestion?.options.find((option) => option.value === key)?.label ||
        key.replaceAll('_', ' '),
      status,
      gapScore: capabilityGap(status),
    }))
    .filter((item) => item.gapScore > 0)
    .sort((a, b) => b.gapScore - a.gapScore);

  const pressureByKey = new Map(pressureScores.map((item) => [item.key, item]));
  const capabilityByKey = new Map(capabilityGaps.map((item) => [item.key, item]));
  const objectives = new Set(input.objectives);

  const scored = engineData.services
    .map((service) => {
      const mappings = engineData.mappings.filter(
        (mapping) => mapping.serviceKey === service.key,
      );

      let rawScore = service.priorityWeight;
      const rationales: Array<{ weight: number; text: string }> = [];
      let maxUrgency = 1;

      for (const mapping of mappings) {
        let factor = 0;

        if (
          mapping.dimensionType === 'industry' &&
          mapping.dimensionValue === input.organization.industry
        ) {
          factor = 1;
        } else if (
          mapping.dimensionType === 'scale' &&
          mapping.dimensionValue === input.organization.organizationScale
        ) {
          factor = 1;
        } else if (
          mapping.dimensionType === 'regulated' &&
          mapping.dimensionValue === input.organization.regulatedStatus
        ) {
          factor = 1;
        } else if (
          mapping.dimensionType === 'objective' &&
          objectives.has(mapping.dimensionValue)
        ) {
          factor = 1;
        } else if (
          mapping.dimensionType === 'timeline' &&
          mapping.dimensionValue === input.targetTimeline
        ) {
          factor = 1;
        } else if (
          mapping.dimensionType === 'delivery' &&
          (mapping.dimensionValue === input.deliveryPreference ||
            input.deliveryPreference === 'hybrid')
        ) {
          factor = input.deliveryPreference === 'hybrid' ? 0.75 : 1;
        } else if (mapping.dimensionType === 'pressure') {
          const pressure = pressureByKey.get(mapping.dimensionValue);
          if (pressure) {
            factor = pressure.score / 100;
            maxUrgency = Math.max(maxUrgency, pressure.urgency);
          }
        } else if (mapping.dimensionType === 'capability') {
          const gap = capabilityByKey.get(mapping.dimensionValue);
          if (gap) factor = gap.gapScore / 100;
        }

        if (factor > 0) {
          const contribution = mapping.weight * factor;
          rawScore += contribution;
          if (mapping.rationale) {
            rationales.push({
              weight: contribution,
              text: mapping.rationale,
            });
          }
        }
      }

      if (input.organization.regulatedStatus === 'yes') {
        if (['GRC', 'Privacy', 'ISO', 'Cybersecurity', 'Governance'].includes(service.category)) {
          rawScore += 3;
        }
      }

      if (
        input.technology.digitalDependency === 'mission_critical' &&
        ['Cybersecurity', 'Resilience', 'Technology'].includes(service.category)
      ) {
        rawScore += 4;
      }

      const matchScore = clamp(round(rawScore * 1.35));
      const priority = priorityFrom(input.targetTimeline, matchScore, maxUrgency);
      const reason =
        rationales
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map((item) => item.text)
          .join(' ') ||
        text(
          locale,
          'Layanan ini relevan sebagai supporting capability berdasarkan profil organisasi dan kebutuhan engagement.',
          'This service is relevant as a supporting capability based on the organization profile and engagement needs.',
        );

      return {
        serviceKey: service.key,
        category: service.category,
        name: service.name,
        description: service.description,
        url: service.url,
        matchScore,
        matchLabel: matchLabel(matchScore),
        priority,
        reason,
        expectedOutcomes: service.outcomes,
        deliveryModel: service.deliveryModel,
        typicalDuration: service.typicalDuration,
        complexity: service.complexity,
        diagnosticToolSlug: service.diagnosticToolSlug,
      } satisfies FinderRecommendation;
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const relevant = scored.filter((item) => item.matchScore >= 40);
  const primarySolutions = relevant.slice(0, 5);
  const supportingSolutions = relevant.slice(5, 10);

  const topPriorities = pressureScores.slice(0, 5).map((item) => ({
    key: item.key,
    label: item.label,
    category: item.category,
    score: item.score,
    priority: priorityFrom(input.targetTimeline, item.score, item.urgency),
    reason: text(
      locale,
      `Pressure score ${item.score}/100 menunjukkan kombinasi severity, urgency dan impact yang perlu diprioritaskan.`,
      `A pressure score of ${item.score}/100 reflects a combination of severity, urgency and impact that should be prioritized.`,
    ),
  }));

  const complexity = calculateComplexity(input);
  const deliveryRecommendation = (() => {
    const pref = input.deliveryPreference;
    const missingCapabilities = capabilityGaps.filter(
      (item) => item.gapScore >= 65,
    ).length;

    if (
      pref === 'hybrid' ||
      (missingCapabilities >= 5 &&
        primarySolutions.some((item) => item.deliveryModel === 'Managed Service'))
    ) {
      return {
        model: 'Hybrid Advisory + Project / Managed Service',
        reason: text(
          locale,
          'Kombinasi advisory dan delivery berkelanjutan disarankan karena terdapat gap kapabilitas yang memerlukan desain, implementasi, dan operating support secara bertahap.',
          'A hybrid advisory and delivery model is recommended because the capability gaps require phased design, implementation, and operating support.',
        ),
      };
    }

    const normalized: Record<string, string> = {
      advisory: 'Advisory',
      project: 'Project-based',
      managed_service: 'Managed Service',
      assessment: 'Assessment',
      training: 'Training',
      technology_implementation: 'Technology Implementation',
      staff_augmentation: 'Staff Augmentation',
    };

    return {
      model: normalized[pref] || primarySolutions[0]?.deliveryModel || 'Advisory',
      reason: text(
        locale,
        'Model ini selaras dengan preferensi engagement, tingkat urgensi, dan pola gap yang teridentifikasi pada assessment.',
        'This model aligns with the engagement preference, urgency, and gap pattern identified in the assessment.',
      ),
    };
  })();

  const roadmap: FinderRoadmapItem[] = [
    ...primarySolutions.map((solution) => ({
      phase: mapPriorityToPhase(solution.priority),
      title: solution.name,
      objective:
        solution.expectedOutcomes[0] ||
        text(locale, 'Menutup gap prioritas.', 'Close the priority gap.'),
      serviceKey: solution.serviceKey,
      priority: solution.priority,
    })),
    ...supportingSolutions.slice(0, 2).map((solution) => ({
      phase: mapPriorityToPhase(solution.priority),
      title: solution.name,
      objective:
        solution.expectedOutcomes[0] ||
        text(locale, 'Memperkuat supporting capability.', 'Strengthen supporting capability.'),
      serviceKey: solution.serviceKey,
      priority: solution.priority,
    })),
  ].sort((a, b) => {
    const order = {
      '0–30 Days': 0,
      '1–3 Months': 1,
      '3–6 Months': 2,
      '6–18 Months': 3,
    };
    return order[a.phase] - order[b.phase];
  });

  const quickWins = buildQuickWins(input, pressureScores, locale);

  const strategicInitiatives = primarySolutions
    .slice(0, 5)
    .map((item) =>
      text(
        locale,
        `Bangun kapabilitas: ${item.name}`,
        `Build capability: ${item.name}`,
      ),
    );

  const allRecommendations = [...primarySolutions, ...supportingSolutions];
  const tools = recommendedTools(input, allRecommendations, locale);

  const industryLabel = optionLabel(config, 'industry', input.organization.industry);
  const scaleLabel = optionLabel(
    config,
    'organization_scale',
    input.organization.organizationScale,
  );
  const dependencyLabel = optionLabel(
    config,
    'digital_dependency',
    input.technology.digitalDependency,
  );

  const topPressureNames =
    topPriorities.map((item) => item.label).slice(0, 3).join(', ') ||
    text(locale, 'belum ada pressure material', 'no material pressure identified');

  const topGapNames =
    capabilityGaps.map((item) => item.label).slice(0, 4).join(', ') ||
    text(locale, 'tidak ada gap utama yang teridentifikasi', 'no major gap identified');

  const primaryNames =
    primarySolutions.map((item) => item.name).slice(0, 4).join(', ') ||
    text(locale, 'belum ada match kuat', 'no strong match yet');

  return {
    generatedAt: new Date().toISOString(),
    version: {
      questionnaire: config.questionnaireVersion,
      scoring: config.scoringVersion,
      serviceMapping: config.serviceMappingVersion,
      aiPrompt: engineData.aiPromptVersion,
    },
    enterprisePressureScore,
    diagnosticSnapshot: {
      industry: industryLabel,
      organizationScale: scaleLabel,
      digitalDependency: dependencyLabel,
      technologyComplexity: clamp(
        round(
          (input.technology.infrastructure.length / 7) * 35 +
            (input.technology.digitalDependency === 'mission_critical' ? 35 : 20) +
            (input.organization.organizationScale === 'conglomerate'
              ? 30
              : input.organization.organizationScale === 'enterprise'
                ? 25
                : 15),
        ),
      ),
      cyberExposure: pressureMap.Cybersecurity,
      governancePressure: pressureMap.Governance,
      regulatoryPressure: pressureMap.Regulation,
      businessResiliencePressure: pressureMap.Resilience,
    },
    pressureMap,
    pressureScores,
    topPriorities,
    capabilityGaps,
    primarySolutions,
    supportingSolutions,
    deliveryRecommendation,
    engagementComplexity: complexity,
    expectedDuration: expectedDuration(complexity),
    roadmap,
    quickWins,
    strategicInitiatives,
    recommendedTools: tools,
    executiveSummary: {
      currentSituation: text(
        locale,
        `${industryLabel} dengan skala ${scaleLabel} dan ketergantungan teknologi ${dependencyLabel} menghasilkan Enterprise Pressure Score ${enterprisePressureScore}/100.`,
        `${industryLabel} at ${scaleLabel} scale with ${dependencyLabel} technology dependency produces an Enterprise Pressure Score of ${enterprisePressureScore}/100.`,
      ),
      keyPressures: text(
        locale,
        `Pressure utama yang perlu diperhatikan: ${topPressureNames}.`,
        `Key pressures requiring attention: ${topPressureNames}.`,
      ),
      capabilityGaps: text(
        locale,
        `Gap kapabilitas dengan exposure tertinggi: ${topGapNames}.`,
        `Highest-exposure capability gaps: ${topGapNames}.`,
      ),
      riskImplication: text(
        locale,
        'Kombinasi pressure dan gap dapat meningkatkan risiko gangguan layanan, kelemahan kontrol, keterlambatan respons, dan tekanan audit/regulasi. Dampak aktual perlu divalidasi melalui detailed assessment dan evidence review.',
        'The combination of pressures and gaps can increase exposure to service disruption, control weaknesses, delayed response, and audit/regulatory pressure. Actual impact should be validated through detailed assessment and evidence review.',
      ),
      immediatePriorities: text(
        locale,
        `Prioritas awal diarahkan pada ${topPressureNames} dengan quick wins terukur dalam 30 hari pertama.`,
        `Initial priorities should address ${topPressureNames} with measurable quick wins in the first 30 days.`,
      ),
      recommendedSolutions: text(
        locale,
        `Primary RTI solution match: ${primaryNames}.`,
        `Primary RTI solution matches: ${primaryNames}.`,
      ),
      suggestedDeliveryModel: `${deliveryRecommendation.model}. ${deliveryRecommendation.reason}`,
      proposedRoadmap: text(
        locale,
        'Gunakan fase 0–30 hari untuk baseline/critical remediation, 1–3 bulan untuk foundation, 3–6 bulan untuk implementation, dan 6–18 bulan untuk optimization.',
        'Use 0–30 days for baseline/critical remediation, 1–3 months for foundation, 3–6 months for implementation, and 6–18 months for optimization.',
      ),
      nextAction: text(
        locale,
        'Review blueprint bersama RTI consultant, lanjutkan specialized diagnostic bila relevan, lalu gunakan Project Estimator & RFQ Builder ketika scope siap dikomersialkan.',
        'Review the blueprint with an RTI consultant, continue with specialized diagnostics where relevant, then use the Project Estimator & RFQ Builder when the scope is ready for commercial scoping.',
      ),
    },
    disclaimer: text(
      locale,
      'Hasil Enterprise Solution Finder merupakan preliminary diagnostic dan bukan audit, certification, legal opinion, formal assurance, atau quotation final.',
      'Enterprise Solution Finder results are a preliminary diagnostic and are not an audit, certification, legal opinion, formal assurance, or final quotation.',
    ),
  };
}
