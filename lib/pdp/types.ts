export type PdpAssessmentType = 'quick' | 'detailed';

export type PdpAnswerOption = {
  value: string;
  label: string;
  description: string;
  score: number | null;
  isNa: boolean;
  sortOrder: number;
};

export type PdpEvidenceOption = {
  value: string;
  label: string;
  multiplier: number;
  sortOrder: number;
};

export type PdpDomain = {
  code: string;
  name: string;
  description: string;
  weight: number;
  sortOrder: number;
};

export type PdpQuestion = {
  id: string;
  domainCode: string;
  questionCode: string;
  questionText: string;
  helpText: string | null;
  legalReference: string | null;
  expectedEvidence: string | null;
  riskIfMissing: string | null;
  recommendation: string | null;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  weight: number;
  isCore: boolean;
  estimatedSeconds: number;
  sortOrder: number;
};

export type PdpThreshold = {
  key: string;
  minScore: number;
  maxScore: number;
  label: string;
  sortOrder: number;
};

export type PdpScoringWeight = {
  key: string;
  label: string;
  weight: number;
};

export type PdpReadinessGate = {
  key: string;
  label: string;
  questionId: string;
  minimumScore: number;
  evidenceMinimum: string;
  sortOrder: number;
};

export type PdpServiceMapping = {
  id: string;
  domainCode: string;
  serviceName: string;
  serviceUrlParameter: string;
  reasonTemplate: string;
  priorityOrder: number;
};

export type PdpConfig = {
  frameworkVersion: string;
  frameworkTitle: string;
  questionnaireVersion: string;
  domains: PdpDomain[];
  questions: PdpQuestion[];
  answerOptions: PdpAnswerOption[];
  evidenceOptions: PdpEvidenceOption[];
  scoringWeights: PdpScoringWeight[];
  scoringThresholds: PdpThreshold[];
  readinessGates: PdpReadinessGate[];
  serviceMappings: PdpServiceMapping[];
  parameters: Record<string, string>;
};

export type PdpOrganizationProfile = {
  companyName: string;
  industry: string;
  companySize: string;
  employeeCount: number | null;
  country: string;
  locationCount: number | null;
  processesPersonalData: boolean;
  processesSpecificData: boolean;
  publicServiceProcessing: boolean;
  largeScaleMonitoring: boolean;
  crossBorderTransfer: boolean;
  usesProcessors: boolean;
  automatedDecisioning: boolean;
};

export type PdpRespondentProfile = {
  name: string;
  title: string;
  email: string;
  phone: string;
};

export type PdpAssessmentRecord = {
  id: string;
  companyName: string;
  industry: string;
  companySize: string;
  assessmentType: PdpAssessmentType;
  frameworkVersion: string;
  questionnaireVersion: string;
  status: string;
  implementationScore: number | null;
  evidenceScore: number | null;
  overallScore: number | null;
  readinessLevel: string | null;
  gatesCompleted: number;
  startedAt: string;
  completedAt: string | null;
};

export type PdpAnswerRecord = {
  assessmentId: string;
  questionId: string;
  answerValue: string;
  answerScore: number | null;
  isNa: boolean;
  applicabilityJustification: string | null;
  evidenceStatus: string;
  evidenceNote: string | null;
  comment: string | null;
  answeredAt: string;
};

export type PdpDomainScore = {
  domainCode: string;
  domainName: string;
  implementationScore: number;
  evidenceScore: number;
  overallScore: number;
  gap: number;
  status: string;
  applicableQuestions: number;
};

export type PdpGapFinding = {
  id: string;
  questionId: string;
  domainCode: string;
  questionCode: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  currentCondition: string;
  risk: string;
  recommendation: string;
  legalReference: string | null;
};

export type PdpRoadmapItem = {
  id: string;
  phase: string;
  domainCode: string;
  action: string;
  reason: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  ownerSuggestion: string;
  dependencies: string | null;
  expectedOutcome: string;
};

export type PdpAssessmentResult = {
  assessmentId: string;
  implementationScore: number;
  evidenceScore: number;
  overallScore: number;
  readinessLevel: string;
  completion: {
    answered: number;
    total: number;
    percentage: number;
  };
  gates: {
    completed: number;
    total: number;
    items: Array<{
      key: string;
      label: string;
      complete: boolean;
      answerScore: number | null;
      evidenceStatus: string | null;
    }>;
  };
  domainScores: PdpDomainScore[];
  findings: PdpGapFinding[];
  roadmap: PdpRoadmapItem[];
  services: PdpServiceMapping[];
  parameters: Record<string, string>;
};
