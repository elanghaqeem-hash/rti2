export type MaturityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface MaturityOption {
  level: MaturityLevel;
  label: string;
  description: string;
}

export interface Question {
  id: string;
  domainId: string;
  capability: string;
  text: string;
  helpText: string;
  weight: number;
  criticality: 'standard' | 'high' | 'critical';
  frameworks: string[];
  evidenceExamples: string[];
  options: MaturityOption[];
  applicability?: 'all' | 'cloud' | 'ai';
}

export interface Domain {
  id: string;
  name: string;
  shortName: string;
  description: string;
  weight: number;
  defaultTarget: MaturityLevel;
  recommendedService: string;
  recommendedServiceUrl: string;
  frameworks: string[];
  evidenceExamples: string[];
  questions: Question[];
}

export const ASSESSMENT_VERSION = '2026.09';

export const MATURITY_LEVELS: MaturityOption[] = [
  {
    level: 0,
    label: 'Level 0 — Non-Existent',
    description: 'Kapabilitas belum tersedia atau belum pernah diterapkan secara terstruktur.',
  },
  {
    level: 1,
    label: 'Level 1 — Initial',
    description: 'Pelaksanaan masih ad hoc, reaktif, dan sangat bergantung pada individu.',
  },
  {
    level: 2,
    label: 'Level 2 — Developing',
    description: 'Proses mulai dibentuk tetapi penerapannya belum konsisten di seluruh organisasi.',
  },
  {
    level: 3,
    label: 'Level 3 — Defined',
    description: 'Proses telah didefinisikan, terdokumentasi, memiliki pemilik, dan diterapkan secara formal.',
  },
  {
    level: 4,
    label: 'Level 4 — Managed',
    description: 'Kinerja diukur, dimonitor, direview, dan ditingkatkan berdasarkan metrik serta risiko.',
  },
  {
    level: 5,
    label: 'Level 5 — Optimized',
    description: 'Kapabilitas telah proaktif, terotomasi, terintegrasi, dan terus dioptimalkan berbasis intelligence.',
  },
];

type DomainDefinition = Omit<Domain, 'questions'> & {
  capabilities: Array<{
    name: string;
    criticality?: Question['criticality'];
    applicability?: Question['applicability'];
  }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildDomain(definition: DomainDefinition): Domain {
  const { capabilities, ...domain } = definition;

  return {
    ...domain,
    questions: capabilities.map((capability, index) => ({
      id: `${domain.id}_${String(index + 1).padStart(2, '0')}_${slugify(capability.name).slice(0, 36)}`,
      domainId: domain.id,
      capability: capability.name,
      text: `Seberapa matang kapabilitas ${capability.name} diterapkan dan dikelola di organisasi Anda?`,
      helpText: `Nilai kondisi yang benar-benar berjalan saat ini untuk ${capability.name}, bukan kondisi yang baru direncanakan.`,
      weight: capability.criticality === 'critical' ? 1.35 : capability.criticality === 'high' ? 1.15 : 1,
      criticality: capability.criticality || 'standard',
      frameworks: domain.frameworks,
      evidenceExamples: domain.evidenceExamples,
      options: MATURITY_LEVELS,
      applicability: capability.applicability || 'all',
    })),
  };
}

export const ASSESSMENT_FRAMEWORKS = [
  'NIST Cybersecurity Framework 2.0',
  'ISO/IEC 27001',
  'ISO/IEC 27002',
  'ISO/IEC 27701',
  'ISO 22301',
  'CIS Controls',
  'COBIT',
  'ITIL',
  'OWASP',
  'Zero Trust principles',
  'NIST AI RMF',
  'Applicable Indonesian technology, privacy, cybersecurity, and financial-sector requirements',
] as const;

export const MATURITY_DOMAINS: Domain[] = [
  buildDomain({
    id: 'it_strategy_governance',
    name: 'IT Strategy & Governance',
    shortName: 'IT Governance',
    description: 'Keterhubungan strategi bisnis, tata kelola teknologi, investasi, arsitektur, dan pengawasan manajemen.',
    weight: 1.1,
    defaultTarget: 4,
    recommendedService: 'RTI Technology Advisory & GRC',
    recommendedServiceUrl: '/services/technology-advisory',
    frameworks: ['COBIT', 'ISO/IEC 27001'],
    evidenceExamples: ['IT strategy', 'IT master plan', 'IT steering committee charter', 'technology policy'],
    capabilities: [
      { name: 'IT strategy & business alignment', criticality: 'high' },
      { name: 'IT governance and decision rights', criticality: 'high' },
      { name: 'enterprise architecture governance' },
      { name: 'IT investment and budgeting' },
      { name: 'IT policy lifecycle management' },
      { name: 'board and management technology reporting' },
    ],
  }),
  buildDomain({
    id: 'cybersecurity_governance',
    name: 'Cybersecurity Governance',
    shortName: 'Cyber Gov',
    description: 'Strategi keamanan siber, struktur pengambilan keputusan, kepemilikan risiko, kebijakan, metrik, dan budaya.',
    weight: 1.2,
    defaultTarget: 4,
    recommendedService: 'RTI Cybersecurity Governance Consulting',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001', 'COBIT'],
    evidenceExamples: ['cybersecurity strategy', 'security policy', 'CISO charter', 'security KPI/KRI report'],
    capabilities: [
      { name: 'cybersecurity strategy', criticality: 'critical' },
      { name: 'security governance structure', criticality: 'high' },
      { name: 'security policies and standards' },
      { name: 'roles, responsibilities, and control ownership' },
      { name: 'cybersecurity metrics and reporting' },
      { name: 'security culture governance' },
    ],
  }),
  buildDomain({
    id: 'cyber_risk_management',
    name: 'Cyber Risk Management',
    shortName: 'Cyber Risk',
    description: 'Identifikasi, analisis, treatment, acceptance, appetite, dan pemantauan risiko siber.',
    weight: 1.25,
    defaultTarget: 4,
    recommendedService: 'RTI Cyber Risk & GRC Advisory',
    recommendedServiceUrl: '/services/policy-sop-governance',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001', 'COBIT'],
    evidenceExamples: ['cyber risk register', 'risk appetite statement', 'risk treatment plan', 'KRI report'],
    capabilities: [
      { name: 'cyber risk identification', criticality: 'critical' },
      { name: 'threat and vulnerability risk analysis', criticality: 'critical' },
      { name: 'inherent and residual risk assessment' },
      { name: 'risk treatment and acceptance' },
      { name: 'cyber risk appetite and thresholds' },
      { name: 'cyber KRI and management reporting' },
    ],
  }),
  buildDomain({
    id: 'asset_management',
    name: 'Asset Management',
    shortName: 'Assets',
    description: 'Inventaris, klasifikasi, ownership, lifecycle, CMDB, shadow IT, dan identifikasi aset kritikal.',
    weight: 1.0,
    defaultTarget: 4,
    recommendedService: 'RTI Technology Operations & GRC',
    recommendedServiceUrl: '/services/technology-support',
    frameworks: ['CIS Controls', 'ISO/IEC 27001'],
    evidenceExamples: ['asset register', 'CMDB extract', 'asset classification standard', 'asset lifecycle SOP'],
    capabilities: [
      { name: 'hardware and endpoint inventory', criticality: 'high' },
      { name: 'software and application inventory' },
      { name: 'information asset inventory and ownership' },
      { name: 'asset classification' },
      { name: 'CMDB and asset lifecycle management' },
      { name: 'shadow IT and critical asset identification' },
    ],
  }),
  buildDomain({
    id: 'identity_access_management',
    name: 'Identity & Access Management',
    shortName: 'IAM',
    description: 'Identity lifecycle, authentication, authorization, privileged access, MFA, review akses, dan segregasi tugas.',
    weight: 1.3,
    defaultTarget: 4,
    recommendedService: 'RTI IAM & Cybersecurity Advisory',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001', 'CIS Controls', 'Zero Trust principles'],
    evidenceExamples: ['IAM architecture', 'access matrix', 'PAM report', 'access review evidence'],
    capabilities: [
      { name: 'identity lifecycle management', criticality: 'critical' },
      { name: 'multi-factor authentication', criticality: 'critical' },
      { name: 'role-based access control' },
      { name: 'privileged access management', criticality: 'critical' },
      { name: 'periodic access review' },
      { name: 'segregation of duties and service-account governance' },
    ],
  }),
  buildDomain({
    id: 'infrastructure_network_security',
    name: 'Infrastructure & Network Security',
    shortName: 'Network',
    description: 'Segmentasi, perimeter, endpoint, remote access, zero trust, konfigurasi aman, dan pemantauan jaringan.',
    weight: 1.25,
    defaultTarget: 4,
    recommendedService: 'RTI Defensive Cybersecurity',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'CIS Controls', 'Zero Trust principles'],
    evidenceExamples: ['network diagram', 'firewall rule review', 'EDR dashboard', 'secure configuration baseline'],
    capabilities: [
      { name: 'network architecture and segmentation', criticality: 'critical' },
      { name: 'firewall and secure gateway governance', criticality: 'high' },
      { name: 'endpoint protection and hardening', criticality: 'critical' },
      { name: 'secure remote access and VPN' },
      { name: 'DNS and wireless security' },
      { name: 'zero trust and network monitoring' },
    ],
  }),
  buildDomain({
    id: 'application_security',
    name: 'Application Security',
    shortName: 'AppSec',
    description: 'Secure SDLC, DevSecOps, code security, API/mobile security, dependency, secrets, dan remediation.',
    weight: 1.25,
    defaultTarget: 4,
    recommendedService: 'RTI VAPT & Secure SDLC',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['OWASP', 'NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001'],
    evidenceExamples: ['secure SDLC standard', 'VAPT report', 'SAST/DAST report', 'dependency scan result'],
    capabilities: [
      { name: 'secure SDLC and security requirements', criticality: 'critical' },
      { name: 'DevSecOps security gates', criticality: 'high' },
      { name: 'SAST, DAST, and code review' },
      { name: 'API and mobile application security', criticality: 'critical' },
      { name: 'dependency and software supply-chain security' },
      { name: 'vulnerability remediation and secrets management' },
    ],
  }),
  buildDomain({
    id: 'cloud_security',
    name: 'Cloud Security',
    shortName: 'Cloud',
    description: 'Governance, architecture, IAM, configuration, workload, container, SaaS, logging, dan incident response cloud.',
    weight: 1.15,
    defaultTarget: 4,
    recommendedService: 'RTI Cloud Security & Architecture',
    recommendedServiceUrl: '/services/technology-advisory',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'CIS Controls', 'Zero Trust principles'],
    evidenceExamples: ['cloud architecture', 'CSPM report', 'cloud IAM review', 'cloud logging configuration'],
    capabilities: [
      { name: 'cloud governance and architecture', criticality: 'high', applicability: 'cloud' },
      { name: 'cloud IAM and privileged access', criticality: 'critical', applicability: 'cloud' },
      { name: 'cloud security posture and configuration management', criticality: 'critical', applicability: 'cloud' },
      { name: 'workload, container, and Kubernetes security', applicability: 'cloud' },
      { name: 'cloud logging and monitoring', applicability: 'cloud' },
      { name: 'SaaS governance and cloud incident response', applicability: 'cloud' },
    ],
  }),
  buildDomain({
    id: 'security_monitoring_soc',
    name: 'Security Monitoring & SOC',
    shortName: 'SOC',
    description: 'Logging, SIEM, detection, alert management, MDR, staffing, SOAR, threat hunting, dan detection engineering.',
    weight: 1.3,
    defaultTarget: 4,
    recommendedService: 'RTI Managed SOC / MDR',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001', 'CIS Controls'],
    evidenceExamples: ['SIEM use-case list', 'SOC SLA', 'alert metrics', 'incident queue', 'SOC runbook'],
    capabilities: [
      { name: 'centralized log management and SIEM', criticality: 'critical' },
      { name: 'security detection use cases', criticality: 'critical' },
      { name: 'alert triage and escalation' },
      { name: '24x7 SOC or MDR coverage', criticality: 'high' },
      { name: 'SOAR and response automation' },
      { name: 'threat hunting and detection engineering' },
    ],
  }),
  buildDomain({
    id: 'threat_intelligence',
    name: 'Threat Intelligence',
    shortName: 'CTI',
    description: 'Threat monitoring, IOC, external intelligence, dark-web/brand exposure, attack surface, dan intelligence sharing.',
    weight: 1.0,
    defaultTarget: 3,
    recommendedService: 'RTI Cyber Threat Intelligence',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001'],
    evidenceExamples: ['threat intelligence report', 'IOC workflow', 'external exposure report', 'threat briefing'],
    capabilities: [
      { name: 'cyber threat intelligence program' },
      { name: 'IOC collection and operationalization' },
      { name: 'external threat and dark-web monitoring' },
      { name: 'brand and digital-risk monitoring' },
      { name: 'attack-surface intelligence' },
      { name: 'strategic, tactical, and operational intelligence sharing' },
    ],
  }),
  buildDomain({
    id: 'incident_response',
    name: 'Incident Response',
    shortName: 'IR',
    description: 'Plan, klasifikasi, escalation, playbook, forensics, komunikasi, latihan, dan lessons learned.',
    weight: 1.3,
    defaultTarget: 4,
    recommendedService: 'RTI Incident Response & DFIR Readiness',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001'],
    evidenceExamples: ['incident response plan', 'playbook', 'tabletop report', 'post-incident review'],
    capabilities: [
      { name: 'incident response plan and governance', criticality: 'critical' },
      { name: 'incident classification and escalation', criticality: 'high' },
      { name: 'response playbooks and team readiness', criticality: 'critical' },
      { name: 'digital forensics readiness' },
      { name: 'breach and crisis communication' },
      { name: 'tabletop exercise and lessons learned' },
    ],
  }),
  buildDomain({
    id: 'vulnerability_attack_surface',
    name: 'Vulnerability & Attack Surface Management',
    shortName: 'Vuln Mgmt',
    description: 'Scanning, VAPT, patching, remediation SLA, attack surface, red/purple teaming, dan configuration weakness.',
    weight: 1.25,
    defaultTarget: 4,
    recommendedService: 'RTI VAPT / Penetration Testing',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'CIS Controls', 'OWASP'],
    evidenceExamples: ['vulnerability scan report', 'VAPT report', 'patch compliance report', 'remediation tracker'],
    capabilities: [
      { name: 'vulnerability scanning coverage', criticality: 'critical' },
      { name: 'independent VAPT / penetration testing', criticality: 'critical' },
      { name: 'patch and remediation SLA governance', criticality: 'high' },
      { name: 'internet-facing attack surface management' },
      { name: 'configuration weakness management' },
      { name: 'red-team and purple-team validation' },
    ],
  }),
  buildDomain({
    id: 'data_security',
    name: 'Data Security',
    shortName: 'Data Sec',
    description: 'Inventory, classification, encryption, DLP, database security, backup, retention, deletion, dan key management.',
    weight: 1.25,
    defaultTarget: 4,
    recommendedService: 'RTI Data Security Advisory',
    recommendedServiceUrl: '/services/cybersecurity',
    frameworks: ['ISO/IEC 27001', 'NIST Cybersecurity Framework 2.0', 'CIS Controls'],
    evidenceExamples: ['data classification policy', 'DLP report', 'encryption standard', 'backup and restore test'],
    capabilities: [
      { name: 'data inventory, ownership, and classification', criticality: 'high' },
      { name: 'encryption at rest and in transit', criticality: 'critical' },
      { name: 'data loss prevention', criticality: 'high' },
      { name: 'database security and privileged access' },
      { name: 'backup integrity and recoverability', criticality: 'critical' },
      { name: 'retention, deletion, and key management' },
    ],
  }),
  buildDomain({
    id: 'privacy_data_protection',
    name: 'Privacy & Personal Data Protection',
    shortName: 'Privacy',
    description: 'Privacy governance, RoPA, DPIA, consent, data-subject rights, DPO, third party, retention, dan breach handling.',
    weight: 1.2,
    defaultTarget: 4,
    recommendedService: 'RTI Privacy & DPO Advisory',
    recommendedServiceUrl: '/services/policy-sop-governance',
    frameworks: ['ISO/IEC 27701', 'ISO/IEC 27001', 'Applicable Indonesian privacy requirements'],
    evidenceExamples: ['RoPA', 'DPIA', 'privacy notice', 'consent record', 'data subject request procedure'],
    capabilities: [
      { name: 'privacy governance and accountability', criticality: 'high' },
      { name: 'personal data inventory and RoPA', criticality: 'critical' },
      { name: 'DPIA for high-risk processing', criticality: 'high' },
      { name: 'consent and privacy-notice management' },
      { name: 'data subject rights and breach handling', criticality: 'critical' },
      { name: 'DPO, third-party, retention, and cross-border governance' },
    ],
  }),
  buildDomain({
    id: 'third_party_cyber_risk',
    name: 'Third-Party Cyber Risk',
    shortName: 'Third Party',
    description: 'Due diligence, onboarding, contractual control, monitoring, fourth-party, dan exit management.',
    weight: 1.1,
    defaultTarget: 4,
    recommendedService: 'RTI Third-Party Risk Advisory',
    recommendedServiceUrl: '/services/policy-sop-governance',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001', 'COBIT'],
    evidenceExamples: ['vendor security questionnaire', 'due diligence record', 'security clause', 'vendor monitoring report'],
    capabilities: [
      { name: 'vendor onboarding and security due diligence', criticality: 'critical' },
      { name: 'vendor security assessment' },
      { name: 'contractual cybersecurity and privacy clauses', criticality: 'high' },
      { name: 'vendor SLA and control monitoring' },
      { name: 'fourth-party risk visibility' },
      { name: 'vendor exit and data-return/destruction controls' },
    ],
  }),
  buildDomain({
    id: 'business_continuity_resilience',
    name: 'Business Continuity & Cyber Resilience',
    shortName: 'Resilience',
    description: 'BCP, DRP, BIA, RTO/RPO, crisis response, immutable backup, ransomware recovery, dan exercise.',
    weight: 1.3,
    defaultTarget: 4,
    recommendedService: 'RTI Business Continuity & Resilience',
    recommendedServiceUrl: '/services/policy-sop-governance',
    frameworks: ['ISO 22301', 'NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001'],
    evidenceExamples: ['BCP', 'DRP', 'BIA', 'DR test report', 'ransomware recovery plan'],
    capabilities: [
      { name: 'business impact analysis', criticality: 'high' },
      { name: 'BCP and crisis-management governance', criticality: 'critical' },
      { name: 'DRP with defined RTO and RPO', criticality: 'critical' },
      { name: 'backup strategy and immutable recovery', criticality: 'critical' },
      { name: 'disaster recovery testing' },
      { name: 'ransomware recovery and crisis communication' },
    ],
  }),
  buildDomain({
    id: 'technology_operations',
    name: 'Technology Operations',
    shortName: 'IT Ops',
    description: 'ITSM, incident/problem/change/release, capacity, configuration, SLA, availability, performance, dan monitoring.',
    weight: 1.05,
    defaultTarget: 4,
    recommendedService: 'RTI Technology Operations & Support',
    recommendedServiceUrl: '/services/technology-support',
    frameworks: ['ITIL', 'COBIT', 'ISO/IEC 27001'],
    evidenceExamples: ['ITSM procedure', 'incident metrics', 'change record', 'service SLA report'],
    capabilities: [
      { name: 'IT service management governance' },
      { name: 'incident and problem management', criticality: 'high' },
      { name: 'change and release management', criticality: 'high' },
      { name: 'capacity and configuration management' },
      { name: 'SLA, availability, and performance management' },
      { name: 'infrastructure and application monitoring' },
    ],
  }),
  buildDomain({
    id: 'digital_technology_architecture',
    name: 'Digital & Technology Architecture',
    shortName: 'Architecture',
    description: 'Enterprise/application architecture, integration, API, modernization, scalability, interoperability, dan standardisasi.',
    weight: 1.05,
    defaultTarget: 4,
    recommendedService: 'RTI Enterprise Architecture & Software Engineering',
    recommendedServiceUrl: '/services/software-development',
    frameworks: ['COBIT', 'ISO/IEC 27001'],
    evidenceExamples: ['enterprise architecture blueprint', 'application map', 'API standard', 'technology standard'],
    capabilities: [
      { name: 'enterprise architecture practice', criticality: 'high' },
      { name: 'application architecture governance' },
      { name: 'integration and API architecture', criticality: 'high' },
      { name: 'legacy modernization roadmap' },
      { name: 'scalability and interoperability' },
      { name: 'technology standardization and lifecycle governance' },
    ],
  }),
  buildDomain({
    id: 'ai_governance_security',
    name: 'AI Governance & AI Security',
    shortName: 'AI Gov',
    description: 'AI strategy, inventory, responsible AI, model risk, privacy, security, third party, GenAI, monitoring, dan incident handling.',
    weight: 1.1,
    defaultTarget: 3,
    recommendedService: 'RTI AI Governance & Technology Advisory',
    recommendedServiceUrl: '/services/technology-advisory',
    frameworks: ['NIST AI RMF', 'ISO/IEC 27001', 'Applicable AI governance principles'],
    evidenceExamples: ['AI inventory', 'AI use policy', 'model risk assessment', 'AI security review'],
    capabilities: [
      { name: 'AI strategy and governance', criticality: 'high', applicability: 'ai' },
      { name: 'AI inventory and use-case approval', applicability: 'ai' },
      { name: 'responsible AI and model-risk management', criticality: 'high', applicability: 'ai' },
      { name: 'AI security, privacy, and access control', criticality: 'critical', applicability: 'ai' },
      { name: 'third-party and generative AI governance', applicability: 'ai' },
      { name: 'model monitoring, prompt security, and AI incident handling', applicability: 'ai' },
    ],
  }),
  buildDomain({
    id: 'people_cyber_culture',
    name: 'People & Cyber Culture',
    shortName: 'People',
    description: 'Awareness, phishing simulation, role-based learning, developer security, executive awareness, dan insider-risk culture.',
    weight: 1.0,
    defaultTarget: 4,
    recommendedService: 'RTI Cybersecurity Awareness Training',
    recommendedServiceUrl: '/services/training-awareness',
    frameworks: ['NIST Cybersecurity Framework 2.0', 'ISO/IEC 27001'],
    evidenceExamples: ['awareness plan', 'training attendance', 'phishing simulation report', 'role-based curriculum'],
    capabilities: [
      { name: 'organization-wide cybersecurity awareness', criticality: 'high' },
      { name: 'phishing simulation and coaching' },
      { name: 'role-based security training' },
      { name: 'secure-development training for engineers' },
      { name: 'executive and board cyber awareness' },
      { name: 'security culture and insider-risk awareness' },
    ],
  }),
];

export const QUICK_ASSESSMENT_QUESTION_COUNT = MATURITY_DOMAINS.length;
export const COMPREHENSIVE_ASSESSMENT_QUESTION_COUNT = MATURITY_DOMAINS.reduce(
  (total, domain) => total + domain.questions.length,
  0,
);
