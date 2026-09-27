export interface NistQuestion {
  id: string;
  func: 'Govern' | 'Identify' | 'Protect' | 'Detect' | 'Respond' | 'Recover';
  prompt: string;
  weight: number;
}

export const NIST_QUESTIONS: NistQuestion[] = [
  // GOVERN
  {
    id: 'gv_1',
    func: 'Govern',
    prompt: 'Does your organization have an approved cybersecurity policy and designated executive lead (CISO / IT Head)?',
    weight: 10,
  },
  {
    id: 'gv_2',
    func: 'Govern',
    prompt: 'Are third-party vendor risks and cloud providers assessed for security and compliance before contract signing?',
    weight: 10,
  },

  // IDENTIFY
  {
    id: 'id_1',
    func: 'Identify',
    prompt: 'Do you maintain an up-to-date inventory of all digital assets, databases, APIs, and cloud services?',
    weight: 10,
  },
  {
    id: 'id_2',
    func: 'Identify',
    prompt: 'Is personal data identified and classified in accordance with UU PDP (Undang-Undang Pelindungan Data Pribadi)?',
    weight: 10,
  },
  {
    id: 'id_3',
    func: 'Identify',
    prompt: 'Are annual technical vulnerability assessments and penetration tests (VAPT) performed by certified third parties?',
    weight: 10,
  },

  // PROTECT
  {
    id: 'pr_1',
    func: 'Protect',
    prompt: 'Is Multi-Factor Authentication (MFA) strictly enforced for all administrative and remote employee access?',
    weight: 10,
  },
  {
    id: 'pr_2',
    func: 'Protect',
    prompt: 'Is sensitive data encrypted both at rest (AES-256) and in transit (TLS 1.3)?',
    weight: 10,
  },
  {
    id: 'pr_3',
    func: 'Protect',
    prompt: 'Are staff and software developers regularly trained in cyber awareness and secure coding practices?',
    weight: 10,
  },

  // DETECT
  {
    id: 'de_1',
    func: 'Detect',
    prompt: 'Are security logs across firewalls, servers, and cloud accounts centralized and correlated in a SIEM?',
    weight: 10,
  },
  {
    id: 'de_2',
    func: 'Detect',
    prompt: 'Does your organization operate Endpoint Detection and Response (EDR) or 24/7 SOC telemetry?',
    weight: 10,
  },

  // RESPOND
  {
    id: 'rs_1',
    func: 'Respond',
    prompt: 'Is there a documented Cyber Incident Response Plan (IRP) with defined communication and containment roles?',
    weight: 10,
  },
  {
    id: 'rs_2',
    func: 'Respond',
    prompt: 'Has your team conducted a tabletop simulation of a ransomware or data breach scenario within the last 12 months?',
    weight: 10,
  },

  // RECOVER
  {
    id: 'rc_1',
    func: 'Recover',
    prompt: 'Are immutable, air-gapped backups tested regularly for rapid restoration in disaster recovery scenarios?',
    weight: 10,
  },
  {
    id: 'rc_2',
    func: 'Recover',
    prompt: 'Are business continuity runbooks documented and validated with business unit stakeholders?',
    weight: 10,
  },
];
