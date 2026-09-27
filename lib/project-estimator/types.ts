export type EstimatorMode = 'quick' | 'detailed';

export type ServiceCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
};

export type EstimatorService = {
  id: string;
  categoryId: string;
  categoryName: string;
  slug: string;
  name: string;
  description?: string;
  baseEffortDays: number;
  basePriceMin: number;
  basePriceMax: number;
  billingUnit: string;
  durationMinWeeks: number;
  durationMaxWeeks: number;
};

export type QuestionOption = {
  id: string;
  value: string;
  label: string;
  score: number;
  effortMultiplier: number;
  priceMultiplier: number;
};

export type QuestionCondition = {
  sourceKey: string;
  operator: string;
  compareValue?: string;
};

export type EstimatorQuestion = {
  id: string;
  serviceId?: string;
  key: string;
  label: string;
  helpText?: string;
  fieldType:
    | 'text'
    | 'number'
    | 'currency'
    | 'date'
    | 'dropdown'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'slider'
    | 'file'
    | 'textarea';
  required: boolean;
  complexityDimension?: string;
  weight: number;
  sortOrder: number;
  quickMode: boolean;
  detailedMode: boolean;
  options: QuestionOption[];
  conditions: QuestionCondition[];
};

export type EstimatorBootstrap = {
  categories: ServiceCategory[];
  services: EstimatorService[];
  questions: EstimatorQuestion[];
  dimensions: Array<{ key: string; label: string; weight: number }>;
  publicSettings: Record<string, string>;
};

export type SessionProfile = {
  companyName: string;
  industry: string;
  companySize?: string;
  employeeCount?: number;
  officeCount?: number;
  location?: string;
  country?: string;
  website?: string;
  contactName: string;
  contactTitle?: string;
  department?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  preferredChannel?: string;
};

export type SessionInput = {
  mode: EstimatorMode;
  projectName: string;
  businessObjectives: string[];
  serviceId: string;
  targetTimeline?: string;
  budgetExpectation?: string;
  profile: SessionProfile;
  answers: Record<string, unknown>;
};

export type EstimateTeamItem = {
  role: string;
  quantity: number;
  estimatedDays: number;
};

export type ProjectEstimate = {
  id: string;
  sessionId: string;
  version: number;
  serviceId: string;
  serviceName: string;
  complexityIndex: number;
  complexityLevel: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  projectSize: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
  effortDays: number;
  durationMinWeeks: number;
  durationMaxWeeks: number;
  priceMin: number;
  priceMax: number;
  priceConfigured: boolean;
  readinessScore: number;
  team: EstimateTeamItem[];
  factors: string[];
  trace: Record<string, unknown>;
  createdAt: string;
};

export type RfqContent = {
  projectInformation: {
    projectName: string;
    company: string;
    industry: string;
    contactPerson: string;
    service: string;
  };
  background: string;
  projectObjective: string[];
  scopeOfWork: string[];
  technicalRequirements: string[];
  deliverables: string[];
  assumptions: string[];
  customerResponsibilities: string[];
  rtiResponsibilities: string[];
  timelineExpectation: string;
  serviceLevelExpectation: string;
  complianceRequirement: string;
  securityRequirement: string;
  commercialRequirement: string;
  missingInformation: string[];
  aiAssistedDraft?: string;
};

export type RfqRecord = {
  id: string;
  rfqNumber: string;
  sessionId: string;
  estimateId: string;
  version: number;
  status: string;
  content: RfqContent;
  createdAt: string;
  updatedAt: string;
};
