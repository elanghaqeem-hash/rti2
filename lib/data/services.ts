export interface ServiceDetail {
  slug: string;
  pillar: string;
  title: string;
  headline: string;
  subheadline: string;
  visualType: string;
  outcomes: string[];
  capabilities: string[];
  faq: { question: string; answer: string }[];
  relatedToolSlug?: string;
  relatedToolName?: string;
  ctaText: string;
}

export const SERVICES_CATALOG: Record<string, ServiceDetail> = {
  'technology-advisory': {
    slug: 'technology-advisory',
    pillar: 'Strategy',
    title: 'Technology Advisory',
    headline: 'Turning Strategy Into Technology Roadmaps',
    subheadline:
      'We guide executives through complex digital transitions, architecture modernizations, vendor evaluations, and technology capital allocation.',
    visualType: 'roadmap-curve',
    outcomes: [
      'Eliminate redundant IT investments and vendor lock-in.',
      'Establish a clear 3-year phased technology capability roadmap.',
      'Align technology architecture directly with board-level business goals.',
    ],
    capabilities: [
      'Digital Transformation Strategy',
      'IT Operating Model Design',
      'Vendor & Solution Evaluation',
      'IT Due Diligence & Advisory',
      'Cost Optimization & Rationalization',
      'CTO/CIO Advisory Services',
    ],
    faq: [
      {
        question: 'What is the primary deliverable of a Technology Advisory engagement?',
        answer:
          'You receive a comprehensive, board-ready Technology Strategy & Target Architecture Blueprint complete with prioritized phases, investment estimates, and risk governance.',
      },
      {
        question: 'How long does a typical advisory engagement take?',
        answer:
          'Depending on organizational scope, engagements typically span 4 to 8 weeks with bi-weekly executive milestone reviews.',
      },
    ],
    relatedToolSlug: 'maturity-assessment',
    relatedToolName: 'Technology Maturity Assessment',
    ctaText: 'Build Your Technology Roadmap →',
  },

  'software-development': {
    slug: 'software-development',
    pillar: 'Software',
    title: 'Software Development',
    headline: 'We Build Technology Around Your Business',
    subheadline:
      'High-throughput, secure-by-design enterprise web, mobile, and API systems engineered for long-term scalability and business agility.',
    visualType: 'software-sdlc',
    outcomes: [
      'Accelerate time-to-market with modern microservice architectures.',
      'Ensure zero technical debt through automated testing and clean code principles.',
      'Achieve high concurrent user throughput and fault-tolerant scaling.',
    ],
    capabilities: [
      'Custom Web & Mobile Engineering',
      'Enterprise API & Integration Platforms',
      'Cloud-Native Microservices',
      'Legacy Modernization & Refactoring',
      'Data Pipelines & Business Intelligence',
      'Enterprise AI Integration',
    ],
    faq: [
      {
        question: 'What tech stack do you recommend for enterprise web development?',
        answer:
          'We leverage modern, proven ecosystems including Next.js/React, TypeScript, Go, Python, and Java Spring, backed by PostgreSQL and cloud-native Kubernetes containers.',
      },
      {
        question: 'How do you ensure security during software development?',
        answer:
          'We practice DevSecOps: automated SAST/DAST in CI/CD pipelines, dependency vulnerability scanning, secure code reviews, and OWASP Top 10 compliance testing before release.',
      },
    ],
    relatedToolSlug: 'project-estimator',
    relatedToolName: 'Project Estimator & RFQ Builder',
    ctaText: 'Discuss Your Software Project →',
  },

  'technology-support': {
    slug: 'technology-support',
    pillar: 'Operations',
    title: 'Technology Operations & Support',
    headline: 'Keeping Technology Running. Reliably.',
    subheadline:
      'Managed cloud infrastructure, 24/7 reliability engineering, automated telemetry, and SLA-guaranteed operational support.',
    visualType: 'command-center',
    outcomes: [
      'Maintain 99.9%+ system availability through proactive telemetry.',
      'Reduce incident mean-time-to-resolution (MTTR) by up to 60%.',
      'Relieve internal IT teams from repetitive infrastructure maintenance.',
    ],
    capabilities: [
      '24/7 Infrastructure & App Monitoring',
      'Cloud Operations (AWS, GCP, Azure, Local DC)',
      'Site Reliability Engineering (SRE)',
      'Incident Response & Problem Management',
      'Automated Backup & Disaster Recovery (DR)',
      'Capacity Planning & Cost Governance',
    ],
    faq: [
      {
        question: 'What SLAs do you provide for operational support?',
        answer:
          'We offer tiered SLAs up to 15-minute response times for critical P1 incidents with 24/7 engineering coverage and formal post-mortem root cause analyses (RCA).',
      },
    ],
    relatedToolSlug: 'solution-finder',
    relatedToolName: 'Solution Finder Wizard',
    ctaText: 'Secure Your Operational SLA →',
  },

  'technology-blueprint': {
    slug: 'technology-blueprint',
    pillar: 'Strategy',
    title: 'Technology Blueprint',
    headline: 'Build Technology With Direction',
    subheadline:
      'A structured enterprise master plan detailing business strategy, technical architecture, data models, and multi-year investment plans.',
    visualType: 'temple-framework',
    outcomes: [
      'Prevent disjointed ad-hoc software purchases across departments.',
      'Define clear architectural standards and API governance protocols.',
      'Equip leadership with predictable multi-year technology capital budgets.',
    ],
    capabilities: [
      'Enterprise Architecture Blueprint',
      'IT Master Plan (ITMP) formulation',
      'Data Architecture & Governance Model',
      'Integration & Middleware Blueprint',
      'Infrastructure & Cloud Migration Plan',
    ],
    faq: [
      {
        question: 'Does the blueprint comply with regulatory requirements?',
        answer:
          'Yes. For regulated sectors, our blueprints incorporate OJK (POJK/SEOJK), Bank Indonesia, and BSSN guidelines to ensure regulatory peace of mind.',
      },
    ],
    relatedToolSlug: 'maturity-assessment',
    relatedToolName: 'Technology Maturity Assessment',
    ctaText: 'Design Your Master Blueprint →',
  },

  'policy-sop-governance': {
    slug: 'policy-sop-governance',
    pillar: 'Governance',
    title: 'Policy, SOP & Governance',
    headline: 'From Governance Principles to Operational Practice',
    subheadline:
      'Institutionalize IT controls, standard operating procedures, and risk policies that teams actually follow.',
    visualType: 'governance-pyramid',
    outcomes: [
      'Pass internal and external regulatory audits without last-minute scrambling.',
      'Eliminate operational key-person dependencies through standardized SOPs.',
      'Maintain an audit-ready trail of digital evidence and operational logs.',
    ],
    capabilities: [
      'IT Governance Framework (COBIT, ITIL)',
      'IT Policy & Standard Formulation',
      'Standard Operating Procedures (SOP) Drafting',
      'Role & Access Matrix Governance',
      'Third-Party / Vendor Risk Policies',
    ],
    faq: [
      {
        question: 'How do you ensure SOPs are practical and not just shelf-ware?',
        answer:
          'We co-design SOPs through interviews with operational staff, validating workflows against real tools and systems before codifying them into policies.',
      },
    ],
    relatedToolSlug: 'pdp-readiness',
    relatedToolName: 'UU PDP Readiness Check',
    ctaText: 'Formalize Your Governance →',
  },

  'maturity-assessment': {
    slug: 'maturity-assessment',
    pillar: 'Strategy',
    title: 'Maturity Assessment',
    headline: 'Know Where You Are. Define Where You Need to Be.',
    subheadline:
      'Comprehensive, evidence-based maturity benchmarking across 10 IT and cybersecurity domains to prioritize strategic capital and effort.',
    visualType: 'radar-heatmap',
    outcomes: [
      'Uncover critical operational and cyber blind spots before regulators or auditors do.',
      'Benchmark your organization against peers in banking, fintech, and enterprise sectors.',
      'Generate clear, executive-level gap heatmaps and actionable quick wins.',
    ],
    capabilities: [
      'Technology Capability Assessment (10 Domains)',
      'NIST CSF 2.0 Security Benchmarking',
      'COBIT-Aligned Process Maturity',
      'Regulatory Gap Analysis (OJK / BI / BSSN)',
      'Post-Merger IT Integration Assessment',
    ],
    faq: [
      {
        question: 'How is the assessment conducted?',
        answer:
          'We combine automated self-service digital questionnaires with on-site document reviews, stakeholder interviews, and technical sampling to produce an objective scorecard.',
      },
    ],
    relatedToolSlug: 'maturity-assessment',
    relatedToolName: 'Start Free 10-Domain Assessment',
    ctaText: 'Request an On-Site Assessment →',
  },

  'cybersecurity': {
    slug: 'cybersecurity',
    pillar: 'Cybersecurity',
    title: 'Cybersecurity Hub',
    headline: 'Secure Today. Resilient Tomorrow.',
    subheadline:
      'Holistic enterprise cybersecurity bridging offensive vulnerability discovery, 24/7 defensive operations, and regulatory security governance.',
    visualType: 'cyber-ring',
    outcomes: [
      'Dramatically shrink your organization’s exposed attack surface.',
      'Detect and contain advanced threats before data exfiltration occurs.',
      'Satisfy mandatory UU PDP and sector-specific cybersecurity mandates.',
    ],
    capabilities: [
      'Penetration Testing (Web, Mobile, API, Network)',
      'Security Operations Center (SOC / MDR)',
      'Threat Modeling & Architecture Review',
      'Vulnerability Management Program',
      'Incident Response & Digital Forensics',
      'CISO-as-a-Service & Cyber Governance',
    ],
    faq: [
      {
        question: 'What is your methodology for penetration testing?',
        answer:
          'We follow OWASP WSTG, PTES, and OSSTMM standards, pairing manual exploitation with automated scanning to eliminate false positives.',
      },
    ],
    relatedToolSlug: 'cyber-quick-check',
    relatedToolName: 'NIST Cyber Quick Check',
    ctaText: 'Assess Your Cyber Exposure →',
  },

  'cybersecurity-offensive': {
    slug: 'cybersecurity/offensive',
    pillar: 'Cybersecurity',
    title: 'Offensive Security & VAPT',
    headline: 'Find Weaknesses Before Attackers Do',
    subheadline:
      'Rigorous ethical penetration testing, red teaming, and code reviews conducted by certified offensive security practitioners.',
    visualType: 'attack-surface',
    outcomes: [
      'Validate real-world exploitability with zero hypothetical noise.',
      'Obtain developer-friendly remediation steps with sample code fixes.',
      'Receive official retesting and verification sign-offs for compliance.',
    ],
    capabilities: [
      'Web Application Penetration Testing',
      'Mobile App VAPT (iOS & Android)',
      'API & Microservices Security Testing',
      'External & Internal Network Pentest',
      'Red Teaming & Adversary Emulation',
      'Secure Source Code Review (SAST)',
    ],
    faq: [
      {
        question: 'Do you offer re-testing after vulnerabilities are patched?',
        answer:
          'Yes, every VAPT engagement includes one complimentary verification retest to confirm remediation before final report issuance.',
      },
    ],
    relatedToolSlug: 'cyber-quick-check',
    relatedToolName: 'Cyber Quick Check',
    ctaText: 'Schedule a VAPT Engagement →',
  },

  'cybersecurity-defensive': {
    slug: 'cybersecurity/defensive',
    pillar: 'Cybersecurity',
    title: 'Defensive Security & SOC',
    headline: 'Detect. Defend. Respond.',
    subheadline:
      'Managed threat detection, security log correlation, endpoint hardening, and rapid incident containment runbooks.',
    visualType: 'soc-pipeline',
    outcomes: [
      'Continuous 24/7 visibility into malicious lateral movement and anomalous logins.',
      'Rapid incident containment within minutes of anomalous alert trigger.',
      'Centralized compliance log retention compliant with Indonesian regulations.',
    ],
    capabilities: [
      'Managed Detection & Response (MDR)',
      'SIEM Engineering & Telemetry Ingestion',
      'Endpoint Detection & Response (EDR)',
      'Cloud Security Posture Management (CSPM)',
      'Incident Response Retainer & Containment',
    ],
    faq: [
      {
        question: 'Can you work with our existing cloud and on-premise log sources?',
        answer:
          'Yes, our detection pipelines ingest telemetry across AWS, GCP, Azure, Microsoft 365, active directory, firewalls, and on-premise syslog servers.',
      },
    ],
    relatedToolSlug: 'security-headers-check',
    relatedToolName: 'Passive Security Headers Check',
    ctaText: 'Deploy Defensive Monitoring →',
  },

  'cybersecurity-governance': {
    slug: 'cybersecurity/governance',
    pillar: 'Cybersecurity',
    title: 'Cybersecurity Governance',
    headline: 'Security Starts With Governance',
    subheadline:
      'Align security programs with NIST CSF, POJK/SEOJK resilience rules, ISO 27001 ISMS, and board-level risk management.',
    visualType: 'governance-wheel',
    outcomes: [
      'Demonstrate defensible security diligence to regulators, board members, and clients.',
      'Establish practical third-party cybersecurity risk assessment protocols.',
      'Quantify cyber risk in financial terms for executive decision-making.',
    ],
    capabilities: [
      'Information Security Management System (ISMS)',
      'NIST CSF 2.0 Governance Implementation',
      'Financial Cyber Resilience Compliance (OJK / BI)',
      'Third-Party Cyber Risk Management (TPCRM)',
      'Cyber Crisis Management Simulation (Tabletop)',
    ],
    faq: [
      {
        question: 'How do you handle OJK cyber resilience requirements?',
        answer:
          'We evaluate your cybersecurity architecture against POJK and SEOJK directives, providing specific policy templates and control matrices required during audits.',
      },
    ],
    relatedToolSlug: 'iso27001-readiness',
    relatedToolName: 'ISO 27001 Readiness Checklist',
    ctaText: 'Align Security Governance →',
  },

  'iso-standards': {
    slug: 'iso-standards',
    pillar: 'Governance',
    title: 'ISO & Standards Consulting',
    headline: 'From Readiness to Certification',
    subheadline:
      'End-to-end guidance for ISO/IEC 27001 (ISMS), ISO 27701 (Privacy), and ISO 20000 (ITSM) certification readiness.',
    visualType: 'iso-staircase',
    outcomes: [
      'Achieve first-time audit pass with zero major non-conformities.',
      'Institutionalize an ongoing Continual Improvement framework.',
      'Unlock enterprise and government tenders requiring accredited ISO standards.',
    ],
    capabilities: [
      'ISO/IEC 27001:2022 Readiness & Implementation',
      'Annex A Controls Assessment (Organizational, People, Physical, Tech)',
      'ISO/IEC 27701 Privacy Information Management',
      'ISO 20000-1 IT Service Management',
      'Internal Audit & Management Review Preparation',
    ],
    faq: [
      {
        question: 'Does Risetin issue the official ISO certificate?',
        answer:
          'No. Certificates are legally issued by accredited third-party certification bodies. Risetin serves as your expert implementation and readiness consulting partner to guarantee you pass.',
      },
    ],
    relatedToolSlug: 'iso27001-readiness',
    relatedToolName: 'ISO 27001 Readiness Checklist',
    ctaText: 'Start Your ISO Readiness Journey →',
  },

  'training-awareness': {
    slug: 'training-awareness',
    pillar: 'People',
    title: 'Training & Capability Development',
    headline: 'Technology Works Better When People Understand It',
    subheadline:
      'Transform people from the weakest security link into your first line of defense through practical, interactive workforce upskilling.',
    visualType: 'learning-curve',
    outcomes: [
      'Cultivate an instinctual security culture across all departments.',
      'Equip developers with real-world defensive coding practices.',
      'Fulfill mandatory annual employee cyber awareness training requirements.',
    ],
    capabilities: [
      'Cybersecurity Awareness & Phishing Simulations',
      'Secure Coding for Developers (OWASP / Cloud-Native)',
      'IT Governance & Risk for Leaders',
      'ISO 27001 Lead Implementer / Internal Auditor Prep',
      'Custom Corporate In-House Bootcamps',
    ],
    faq: [
      {
        question: 'Can training be customized for in-house corporate teams?',
        answer:
          'Yes, we regularly deliver tailored in-house sessions (onsite or virtual) featuring real case studies and labs relevant to your organization’s tech stack.',
      },
    ],
    relatedToolSlug: 'solution-finder',
    relatedToolName: 'Find Corporate Training Course',
    ctaText: 'Explore Corporate Training →',
  },
};
