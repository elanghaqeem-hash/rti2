export type NistAssessmentType = 'quick' | 'detailed';

export type NistEvidenceStatus = 'available' | 'partial' | 'none' | 'unspecified';

export interface NistFunctionConfig {
  code: string;
  name: string;
  description: string;
  weight: number;
  sortOrder: number;
}

export interface NistCategoryConfig {
  code: string;
  functionCode: string;
  name: string;
  description: string;
  weight: number;
  targetScore: number;
  sortOrder: number;
}

export interface NistQuestionConfig {
  id: string;
  functionCode: string;
  categoryCode: string;
  questionCode: string;
  textEn: string;
  textId: string;
  helpText: string;
  executiveExplanation: string;
  technicalExplanation: string;
  weight: number;
  questionType: string;
  isCore: boolean;
  estimatedSeconds: number;
  riskSignal: string;
  sortOrder: number;
  version: string;
}

export interface NistAnswerOption {
  value: string;
  label: string;
  description: string;
  score: number;
  verificationRequired: boolean;
  sortOrder: number;
}

export interface NistEvidenceOption {
  value: string;
  label: string;
  multiplier: number;
  sortOrder: number;
}

export interface NistScoringThreshold {
  key: string;
  minScore: number;
  maxScore: number;
  label: string;
  sortOrder: number;
}

export interface NistTierRule {
  tier: 1 | 2 | 3 | 4;
  label: string;
  minOverall: number;
  minGovern: number;
  minConfidence: number;
}

export interface NistBranchingRule {
  id: string;
  parentQuestionId: string;
  answerValues: string[];
  followUpQuestionId: string;
  sortOrder: number;
}

export interface NistServiceMapping {
  id: string;
  categoryCode: string;
  serviceCode: string;
  serviceName: string;
  serviceUrl: string;
  reasonTemplate: string;
  priorityOrder: number;
}

export interface NistAssessmentConfig {
  frameworkVersion: string;
  questionnaireVersion: string;
  scoringModelVersion: string;
  recommendationVersion: string;
  functions: NistFunctionConfig[];
  categories: NistCategoryConfig[];
  questions: NistQuestionConfig[];
  answerOptions: NistAnswerOption[];
  evidenceOptions: NistEvidenceOption[];
  scoringThresholds: NistScoringThreshold[];
  tierRules: NistTierRule[];
  branchingRules: NistBranchingRule[];
  serviceMappings: NistServiceMapping[];
}

export interface NistOrganizationProfile {
  companyName: string;
  industry: string;
  companySize: string;
  employeeCount?: number | null;
  itUserCount?: number | null;
  country?: string;
  region?: string;
  locationCount?: number | null;
  website?: string;
  technologyContext?: Record<string, boolean>;
}

export interface NistRespondentProfile {
  name: string;
  title?: string;
  department?: string;
  email: string;
  phone?: string;
}

export interface NistAssessmentRecord {
  id: string;
  organizationId?: string | null;
  assessmentType: NistAssessmentType;
  frameworkVersion: string;
  questionnaireVersion: string;
  scoringModelVersion: string;
  recommendationVersion: string;
  status: 'in_progress' | 'completed' | 'reviewed' | 'validated';
  organization: NistOrganizationProfile;
  respondent: NistRespondentProfile;
  overallScore?: number | null;
  riskRating?: string | null;
  confidenceScore?: number | null;
  indicativeTier?: number | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface NistAnswerInput {
  questionId: string;
  answerValue: string;
  evidenceStatus?: NistEvidenceStatus;
  comment?: string;
}

export interface NistAnswerRecord extends NistAnswerInput {
  answerScore: number;
  notSure: boolean;
  answeredAt: string;
}

export interface NistCategoryScore {
  categoryCode: string;
  categoryName: string;
  functionCode: string;
  score: number;
  targetScore: number;
  gap: number;
  status: string;
}

export interface NistFunctionScore {
  functionCode: string;
  functionName: string;
  score: number;
  targetScore: number;
  gap: number;
}

export interface NistRiskFinding {
  id: string;
  categoryCode: string;
  title: string;
  rating: 'Critical' | 'High' | 'Medium' | 'Low';
  likelihood: number;
  impact: number;
  reason: string;
}

export interface NistRecommendation {
  id: string;
  categoryCode: string;
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  impact: 'High' | 'Medium';
  suggestedTimeline: '0–30 Days' | '31–60 Days' | '61–90 Days' | '3–6 Months' | '6–12 Months' | '12–24 Months';
  reason: string;
  serviceCode?: string;
  serviceName?: string;
  serviceUrl?: string;
}

export interface NistRoadmapItem {
  id: string;
  phase: '0–30 Days' | '31–60 Days' | '61–90 Days' | '3–6 Months' | '6–12 Months' | '12–24 Months';
  categoryCode: string;
  action: string;
  reason: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  ownerSuggestion: string;
  dependencies: string;
  estimatedEffort: 'Low' | 'Medium' | 'High';
  expectedOutcome: string;
}

export interface NistAssessmentResult {
  assessmentId: string;
  overallScore: number;
  riskRating: string;
  confidenceScore: number;
  indicativeTier: {
    tier: 1 | 2 | 3 | 4;
    label: string;
  };
  completion: number;
  strongestFunction?: NistFunctionScore;
  weakestFunction?: NistFunctionScore;
  criticalGapCount: number;
  functionScores: NistFunctionScore[];
  categoryScores: NistCategoryScore[];
  findings: NistRiskFinding[];
  recommendations: NistRecommendation[];
  roadmap: NistRoadmapItem[];
  strengths: NistCategoryScore[];
  gaps: NistCategoryScore[];
  benchmark: null;
  methodologyDisclaimer: string;
}
