export interface Question {
  id: string;
  domainId: string;
  text: string;
  options: {
    level: number;
    label: string;
    description: string;
  }[];
}

export interface Domain {
  id: string;
  name: string;
  shortName: string;
  description: string;
  recommendedService: string;
  recommendedServiceUrl: string;
  defaultTarget: number;
  questions: Question[];
}

export const MATURITY_DOMAINS: Domain[] = [
  {
    id: 'it_governance',
    name: 'IT Governance & Alignment',
    shortName: 'Governance',
    description: 'Alignment of IT strategy with board business priorities and formal committee oversight.',
    recommendedService: 'Policy, SOP & Governance',
    recommendedServiceUrl: '/services/policy-sop-governance',
    defaultTarget: 4,
    questions: [
      {
        id: 'gov_1',
        domainId: 'it_governance',
        text: 'How are technology investments and strategic roadmaps approved and monitored by leadership?',
        options: [
          { level: 1, label: 'Ad-hoc (Level 1)', description: 'Individual departments purchase tools independently with no central roadmap.' },
          { level: 2, label: 'Developing (Level 2)', description: 'IT reviews purchases, but formal multi-year business alignment is informal.' },
          { level: 3, label: 'Defined (Level 3)', description: 'Formal IT Steering Committee approves blueprints and aligns investments annually.' },
          { level: 4, label: 'Managed (Level 4)', description: 'Quantified metrics and ROI scorecards track technology outcomes continuously.' },
          { level: 5, label: 'Optimized (Level 5)', description: 'Board-driven agile governance continuously innovates and adjusts capital dynamically.' },
        ],
      },
      {
        id: 'gov_2',
        domainId: 'it_governance',
        text: 'To what extent are IT policies, standards, and standard operating procedures (SOPs) formalized?',
        options: [
          { level: 1, label: 'Initial', description: 'Policies exist primarily as verbal practices; no centralized repository.' },
          { level: 2, label: 'Developing', description: 'Draft policies exist but are irregularly reviewed and inconsistently applied.' },
          { level: 3, label: 'Defined', description: 'Complete set of policies and SOPs approved by management and reviewed annually.' },
          { level: 4, label: 'Managed', description: 'Compliance to SOPs is monitored with digital audit logs and internal reviews.' },
          { level: 5, label: 'Optimized', description: 'Continuous automated policy compliance monitoring integrated into developer CI/CD.' },
        ],
      },
    ],
  },

  {
    id: 'cybersecurity',
    name: 'Cybersecurity & Threat Defense',
    shortName: 'Cybersecurity',
    description: 'Proactive vulnerability discovery, penetration testing, and multi-layered threat mitigation.',
    recommendedService: 'Cybersecurity Hub (Offensive & Defensive)',
    recommendedServiceUrl: '/services/cybersecurity',
    defaultTarget: 5,
    questions: [
      {
        id: 'sec_1',
        domainId: 'cybersecurity',
        text: 'How frequently does your organization conduct independent Penetration Testing (VAPT)?',
        options: [
          { level: 1, label: 'Initial', description: 'Never tested or conducted only after an active security incident.' },
          { level: 2, label: 'Developing', description: 'Automated vulnerability scan run once every year with no manual exploit testing.' },
          { level: 3, label: 'Defined', description: 'Regular annual manual VAPT on critical public apps with documented remediation.' },
          { level: 4, label: 'Managed', description: 'Quarterly VAPT, automated CI/CD security gates, and red teaming exercises.' },
          { level: 5, label: 'Optimized', description: 'Continuous offensive security posture validation with real-time threat intelligence.' },
        ],
      },
      {
        id: 'sec_2',
        domainId: 'cybersecurity',
        text: 'What level of 24/7 security monitoring and incident response (SOC / MDR) is active?',
        options: [
          { level: 1, label: 'Initial', description: 'No centralized logging; firewall and server logs reviewed only post-incident.' },
          { level: 2, label: 'Developing', description: 'Syslog server collects logs, but without automated threat correlation rules.' },
          { level: 3, label: 'Defined', description: 'Centralized SIEM with operational alerts monitored during business hours.' },
          { level: 4, label: 'Managed', description: '24/7 Managed SOC with active EDR host isolation and formal containment runbooks.' },
          { level: 5, label: 'Optimized', description: 'AI-driven threat hunting, automated SOAR playbooks, and threat intelligence mesh.' },
        ],
      },
    ],
  },

  {
    id: 'regulatory_readiness',
    name: 'Regulatory & UU PDP Readiness',
    shortName: 'Compliance',
    description: 'Compliance with UU PDP No. 27/2022, OJK/BI cybersecurity guidelines, and privacy rights.',
    recommendedService: 'UU PDP & ISO Standards Advisory',
    recommendedServiceUrl: '/services/iso-standards',
    defaultTarget: 4,
    questions: [
      {
        id: 'reg_1',
        domainId: 'regulatory_readiness',
        text: 'Has your organization completed a Record of Processing Activities (RoPA) and Data Protection Impact Assessment (DPIA)?',
        options: [
          { level: 1, label: 'Initial', description: 'No data inventory; personal data flow across systems is untracked.' },
          { level: 2, label: 'Developing', description: 'Partial inventory of customer data in main database, but 3rd-party transfers unmapped.' },
          { level: 3, label: 'Defined', description: 'Formal RoPA maintained; DPIA completed for all high-risk data processing systems.' },
          { level: 4, label: 'Managed', description: 'Appointed DPO oversees continuous consent tracking and data subject request handling.' },
          { level: 5, label: 'Optimized', description: 'Automated privacy-by-design pipelines with automated data lifecycle purge.' },
        ],
      },
    ],
  },

  {
    id: 'technology_architecture',
    name: 'Technology Architecture & Scalability',
    shortName: 'Architecture',
    description: 'Resilience, microservices, cloud modularity, and technical debt management.',
    recommendedService: 'Software Engineering & Architecture',
    recommendedServiceUrl: '/services/software-development',
    defaultTarget: 4,
    questions: [
      {
        id: 'arch_1',
        domainId: 'technology_architecture',
        text: 'What architectural paradigm governs your critical enterprise systems?',
        options: [
          { level: 1, label: 'Initial', description: 'Monolithic legacy application with direct database coupling and high deployment risk.' },
          { level: 2, label: 'Developing', description: 'Monolith with rudimentary API layer; deployments still require scheduled downtime.' },
          { level: 3, label: 'Defined', description: 'Modular services with containerized deployment (Docker) and standardized APIs.' },
          { level: 4, label: 'Managed', description: 'Kubernetes cloud-native microservices with automated blue/green zero-downtime releases.' },
          { level: 5, label: 'Optimized', description: 'Event-driven multi-cloud architecture with auto-healing and global traffic routing.' },
        ],
      },
    ],
  },

  {
    id: 'it_operations',
    name: 'IT Operations & Reliability (SRE)',
    shortName: 'Operations',
    description: 'Incident response, mean-time-to-resolution, uptime SLAs, and cloud infrastructure management.',
    recommendedService: 'Technology Operations & Support',
    recommendedServiceUrl: '/services/technology-support',
    defaultTarget: 4,
    questions: [
      {
        id: 'ops_1',
        domainId: 'it_operations',
        text: 'How are infrastructure incidents detected, responded to, and resolved?',
        options: [
          { level: 1, label: 'Initial', description: 'Outages are discovered primarily when users or customers complain.' },
          { level: 2, label: 'Developing', description: 'Basic ping/uptime monitoring with email alerts sent to individual admins.' },
          { level: 3, label: 'Defined', description: 'Centralized telemetry dashboard with defined P1–P4 severity escalation SLAs.' },
          { level: 4, label: 'Managed', description: '24/7 SRE monitoring, automated incident triage, and MTTR under 30 minutes.' },
          { level: 5, label: 'Optimized', description: 'Predictive anomaly detection, automated failover, and post-mortem continuous improvement.' },
        ],
      },
    ],
  },

  {
    id: 'digital_capability',
    name: 'Workforce & Security Capability',
    shortName: 'People',
    description: 'Internal developer secure coding habits, cyber awareness, and technical skills.',
    recommendedService: 'Training & Capability Development',
    recommendedServiceUrl: '/services/training-awareness',
    defaultTarget: 4,
    questions: [
      {
        id: 'peop_1',
        domainId: 'digital_capability',
        text: 'What training programs exist for developers and general staff regarding cybersecurity?',
        options: [
          { level: 1, label: 'Initial', description: 'No training; reliance solely on firewalls and antivirus software.' },
          { level: 2, label: 'Developing', description: 'Brief onboarding slides on passwords with no ongoing reinforcement.' },
          { level: 3, label: 'Defined', description: 'Mandatory annual cyber awareness training and developer secure coding workshops.' },
          { level: 4, label: 'Managed', description: 'Quarterly simulated phishing tests with targeted coaching and tracked metrics.' },
          { level: 5, label: 'Optimized', description: 'Security champion network embedded across all engineering squads.' },
        ],
      },
    ],
  },
];
