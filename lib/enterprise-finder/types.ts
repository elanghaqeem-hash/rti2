export type FinderLocale = 'id' | 'en';
export type CapabilityStatus =
  | 'fully_implemented'
  | 'partially_implemented'
  | 'planned'
  | 'unknown'
  | 'not_implemented';

export type FinderPriority = 'IMMEDIATE' | 'NEAR_TERM' | 'MID_TERM' | 'STRATEGIC';
export type FinderComplexity = 'Low' | 'Moderate' | 'High' | 'Enterprise';

export interface FinderQuestionOption {
  value: string;
  label: string;
  description?: string;
  score: number;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface FinderQuestion {
  key: string;
  step: 1 | 2 | 3 | 4;
  category: string;
  type: 'single' | 'multi' | 'number' | 'text' | 'slider' | 'matrix';
  label: string;
  description?: string;
  required: boolean;
  condition?: Record<string, unknown>;
  weight: number;
  sortOrder: number;
  version: number;
  options: FinderQuestionOption[];
}

export interface FinderService {
  key: string;
  category: string;
  name: string;
  description: string;
  url: string;
  deliveryModel: string;
  typicalDuration: string;
  complexity: FinderComplexity;
  priorityWeight: number;
  diagnosticToolSlug?: string;
  outcomes: string[];
  version: number;
}

export interface FinderServiceMapping {
  serviceKey: string;
  dimensionType:
    | 'industry'
    | 'scale'
    | 'pressure'
    | 'capability'
    | 'objective'
    | 'timeline'
    | 'delivery'
    | 'regulated';
  dimensionValue: string;
  weight: number;
  rationale?: string;
  version: number;
}

export interface FinderPressureRating {
  key: string;
  severity: number;
  urgency: number;
  businessImpact: number;
  regulatoryImpact: number;
  cyberRisk: number;
  operationalImpact: number;
}

export interface FinderOrganizationProfile {
  companyName?: string;
  industry: string;
  subIndustry?: string;
  organizationType?: string;
  location?: string;
  branchCount?: number;
  employeeCount?: number;
  itUsers?: number;
  endpointCount?: number;
  revenueCategory?: string;
  regulatedStatus: string;
  maturityStage?: string;
  organizationScale: string;
}

export interface FinderTechnologyProfile {
  infrastructure: string[];
  digitalDependency: string;
  itTeamSize: string;
  cyberTeam: string;
  applications?: number;
  servers?: number;
  databases?: number;
  thirdParties?: number;
  criticalApplications?: number;
  capabilities: Record<string, CapabilityStatus>;
}

export interface FinderAssessmentInput {
  locale: FinderLocale;
  organization: FinderOrganizationProfile;
  technology: FinderTechnologyProfile;
  pressures: FinderPressureRating[];
  triggerAnswers?: Record<string, string[]>;
  objectives: string[];
  targetTimeline: string;
  deliveryPreference: string;
}

export interface FinderPressureScore {
  key: string;
  label: string;
  category: string;
  score: number;
  severity: number;
  urgency: number;
}

export interface FinderPriorityFinding {
  key: string;
  label: string;
  category: string;
  score: number;
  priority: FinderPriority;
  reason: string;
}

export interface FinderRecommendation {
  serviceKey: string;
  category: string;
  name: string;
  description: string;
  url: string;
  matchScore: number;
  matchLabel: 'Very Strong Match' | 'Strong Match' | 'Relevant' | 'Supporting';
  priority: FinderPriority;
  reason: string;
  expectedOutcomes: string[];
  deliveryModel: string;
  typicalDuration: string;
  complexity: FinderComplexity;
  diagnosticToolSlug?: string;
}

export interface FinderRoadmapItem {
  phase: '0–30 Days' | '1–3 Months' | '3–6 Months' | '6–18 Months';
  title: string;
  objective: string;
  serviceKey?: string;
  priority: FinderPriority;
}

export interface FinderRecommendedTool {
  slug: string;
  name: string;
  reason: string;
  url: string;
}

export interface FinderDiagnosticResult {
  assessmentId?: string;
  generatedAt: string;
  version: {
    questionnaire: number;
    scoring: number;
    serviceMapping: number;
    aiPrompt: number;
  };
  enterprisePressureScore: number;
  diagnosticSnapshot: {
    industry: string;
    organizationScale: string;
    digitalDependency: string;
    technologyComplexity: number;
    cyberExposure: number;
    governancePressure: number;
    regulatoryPressure: number;
    businessResiliencePressure: number;
  };
  pressureMap: Record<
    'Cybersecurity' | 'Technology' | 'Governance' | 'Regulation' | 'Resilience' | 'People' | 'Digital Transformation',
    number
  >;
  pressureScores: FinderPressureScore[];
  topPriorities: FinderPriorityFinding[];
  capabilityGaps: Array<{
    key: string;
    label: string;
    status: CapabilityStatus;
    gapScore: number;
  }>;
  primarySolutions: FinderRecommendation[];
  supportingSolutions: FinderRecommendation[];
  deliveryRecommendation: {
    model: string;
    reason: string;
  };
  engagementComplexity: FinderComplexity;
  expectedDuration: string;
  roadmap: FinderRoadmapItem[];
  quickWins: string[];
  strategicInitiatives: string[];
  recommendedTools: FinderRecommendedTool[];
  executiveSummary: {
    currentSituation: string;
    keyPressures: string;
    capabilityGaps: string;
    riskImplication: string;
    immediatePriorities: string;
    recommendedSolutions: string;
    suggestedDeliveryModel: string;
    proposedRoadmap: string;
    nextAction: string;
  };
  aiNarrative?: {
    text: string;
    provider: string;
  };
  disclaimer: string;
}

export interface FinderConfig {
  locale: FinderLocale;
  questionnaireVersion: number;
  scoringVersion: number;
  serviceMappingVersion: number;
  aiPromptVersion: number;
  questions: FinderQuestion[];
  capabilityStatuses: Array<{
    value: CapabilityStatus;
    label: string;
    gapScore: number;
  }>;
}
