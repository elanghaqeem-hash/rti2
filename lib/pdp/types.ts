export type PdpMode = 'quick' | 'comprehensive';
export type PdpCriticality = 'Low' | 'Medium' | 'High' | 'Critical';
export type PdpAnswerValue = 'yes' | 'partial' | 'no' | 'na' | 'planned' | 'unknown';
export type PdpConfidence = 'confirmed' | 'partial' | 'unverified';
export type PdpEvidenceStatus = 'verified' | 'available' | 'not_available' | 'not_required';

export interface PdpProfile {
  companyName: string;
  industry: string;
  organizationSize: string;
  employeeCount?: number;
  dataSubjectCount?: number;
  customerTypes: string[];
  operatingRegions: string[];
  crossBorderOperations: boolean;
  internationalTransfer: boolean;
  publicServiceProcessing: boolean;
  largeScaleProcessing: boolean;
  regularSystematicLargeScaleMonitoring: boolean;
  largeScaleSpecificDataProcessing: boolean;
  largeScaleCriminalDataProcessing: boolean;
  actsAsController: boolean;
  actsAsProcessor: boolean;
  organizationalComplexityHigh: boolean;
  childrenData: boolean;
  healthData: boolean;
  biometricData: boolean;
  geneticData: boolean;
  criminalData: boolean;
  financialData: boolean;
  locationData: boolean;
  profiling: boolean;
  behavioralAnalytics: boolean;
  automatedDecisionMaking: boolean;
  cctv: boolean;
  cookiesTracking: boolean;
  marketingDatabase: boolean;
  cloudSaas: boolean;
  thirdPartyProcessor: boolean;
  outsourcing: boolean;
  mobileApplication: boolean;
  website: boolean;
  employeeData: boolean;
  customerData: boolean;
  vendorData: boolean;
}

export interface PdpQuestion {
  id: string;
  code: string;
  domainId: string;
  domainCode: string;
  domainName: string;
  subdomain?: string;
  questionText: string;
  questionHelp?: string;
  regulationReference?: string;
  articleReference?: string;
  controlObjective?: string;
  riskStatement?: string;
  recommendedEvidence?: string;
  weight: number;
  domainWeight: number;
  criticality: PdpCriticality;
  answerType: string;
  answerOptions: string[];
  profileRequirements: Record<string, boolean | string | number>;
  isQuick: boolean;
  sortOrder: number;
}

export interface PdpResponseInput {
  questionId: string;
  answerValue?: PdpAnswerValue;
  numericValue?: number;
  textValue?: string;
  confidence?: PdpConfidence;
  evidenceStatus?: PdpEvidenceStatus;
}

export interface PdpDomainScore {
  domainId: string;
  code: string;
  name: string;
  score: number;
  answered: number;
  applicable: number;
  criticalGaps: number;
}

export interface PdpFinding {
  questionId: string;
  code: string;
  domainId: string;
  domain: string;
  requirement: string;
  currentCondition: string;
  gap: string;
  risk: string;
  evidence: string;
  regulatoryReference: string;
  recommendedAction: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  suggestedOwner: string;
  targetTimeline: string;
  service?: string;
}

export interface PdpScreeningResult {
  status: string;
  reasons: string[];
}

export interface PdpScoreResult {
  overallScore: number;
  maturityLevel: number;
  maturityLabel: string;
  evidenceConfidence: number;
  completion: number;
  domainScores: PdpDomainScore[];
  criticalFindings: PdpFinding[];
  findings: PdpFinding[];
  topRisks: Array<{
    id: string;
    domain: string;
    riskEvent: string;
    impact: number;
    likelihood: number;
    inherentRisk: number;
    priority: string;
    recommendedAction: string;
  }>;
  dpia: PdpScreeningResult;
  dpo: PdpScreeningResult;
  roadmap: Array<{
    phase: string;
    domain: string;
    action: string;
    owner: string;
    priority: string;
  }>;
  serviceRecommendations: Array<{
    service: string;
    reason: string;
    url?: string;
  }>;
  disclaimer: string;
}
