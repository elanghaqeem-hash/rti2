export interface ParameterOption {
  group: string;
  value: string;
  label: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  system: boolean;
}

export interface ParameterGroupDefinition {
  key: string;
  label: string;
  description: string;
  logicBound?: boolean;
  options: Omit<ParameterOption, 'group' | 'system'>[];
}

function option(
  value: string,
  label: string,
  sortOrder: number,
  description?: string,
): Omit<ParameterOption, 'group' | 'system'> {
  return { value, label, sortOrder, description, active: true };
}

export const PARAMETER_GROUPS: ParameterGroupDefinition[] = [
  {
    key: 'contact.sectors',
    label: 'Sektor / Industri',
    description: 'Digunakan pada form kontak, lead capture, dan diagnostic tools.',
    options: [
      option('banking_insurance', 'Banking & Insurance', 10),
      option('fintech_payments', 'Fintech & Payments', 20),
      option('government_bumn', 'Government & BUMN/BUMD', 30),
      option('energy_resources', 'Energy & Resources', 40),
      option('enterprise_other', 'Enterprise & Others', 50),
    ],
  },
  {
    key: 'services.primary',
    label: 'Layanan Utama RTI',
    description: 'Pilihan layanan pada RFQ, konsultasi, dan lead generation.',
    options: [
      option('technology-advisory', 'Technology Advisory & Strategy', 10),
      option('software-development', 'Custom Software Engineering', 20),
      option('cybersecurity-vapt', 'Penetration Testing (VAPT)', 30),
      option('cybersecurity-soc', '24/7 Managed SOC / Defensive', 40),
      option('technology-support', 'Managed Cloud & 24/7 Operations', 50),
      option('iso-standards', 'ISO/IEC 27001 Certification Readiness', 60),
      option('pdp-compliance', 'UU PDP Compliance & DPIA', 70),
      option('training', 'Corporate Capability Training', 80),
    ],
  },
  {
    key: 'consultation.topics',
    label: 'Topik Konsultasi',
    description: 'Topik yang dapat dipilih pada penjadwalan konsultasi.',
    options: [
      option('technology-cybersecurity', 'Konsultasi Teknologi & Cybersecurity', 10),
      option('software-development', 'Software Development', 20),
      option('cyber-vapt-soc', 'Cybersecurity / VAPT / SOC', 30),
      option('grc-iso', 'GRC, Policy, SOP & ISO', 40),
      option('blueprint-advisory', 'Technology Blueprint & Advisory', 50),
      option('training-awareness', 'Training & Awareness', 60),
      option('maturity-assessment', 'Technology & Cyber Maturity Assessment', 70),
      option('other', 'Lainnya', 80),
    ],
  },
  {
    key: 'consultation.time_slots',
    label: 'Slot Waktu Konsultasi',
    description: 'Jam konsultasi yang ditawarkan kepada calon klien.',
    options: [
      option('09:00 WIB', '09:00 WIB', 10),
      option('10:00 WIB', '10:00 WIB', 20),
      option('11:00 WIB', '11:00 WIB', 30),
      option('13:00 WIB', '13:00 WIB', 40),
      option('14:00 WIB', '14:00 WIB', 50),
      option('15:00 WIB', '15:00 WIB', 60),
      option('16:00 WIB', '16:00 WIB', 70),
    ],
  },
  {
    key: 'admin.lead_statuses',
    label: 'Status Lead',
    description: 'Status pipeline lead pada Admin Dashboard.',
    logicBound: true,
    options: [
      option('New', 'New', 10),
      option('Qualified', 'Qualified', 20),
      option('Meeting', 'Meeting Booked', 30),
      option('Proposal', 'Proposal', 40),
      option('Won', 'Won', 50),
      option('Lost', 'Lost', 60),
    ],
  },
  {
    key: 'assessment.industries',
    label: 'Assessment - Industri',
    description: 'Pilihan industri pada profil organisasi assessment.',
    options: [
      option('Bank / BPR / BPRS', 'Bank / BPR / BPRS', 10),
      option('Multifinance', 'Multifinance', 20),
      option('Insurance', 'Insurance', 30),
      option('Fintech / Payment', 'Fintech / Payment', 40),
      option('Securities / Capital Market', 'Securities / Capital Market', 50),
      option('Government / Public Sector', 'Government / Public Sector', 60),
      option('BUMN / BUMD', 'BUMN / BUMD', 70),
      option('Healthcare', 'Healthcare', 80),
      option('Manufacturing', 'Manufacturing', 90),
      option('Retail / E-Commerce', 'Retail / E-Commerce', 100),
      option('Education', 'Education', 110),
      option('Technology / Digital Platform', 'Technology / Digital Platform', 120),
      option('Other', 'Other', 130),
    ],
  },
  {
    key: 'assessment.company_sizes',
    label: 'Assessment - Skala Organisasi',
    description: 'Skala perusahaan pada profil assessment.',
    options: [
      option('1-50', '1–50 employees', 10),
      option('51-250', '51–250 employees', 20),
      option('251-1000', '251–1,000 employees', 30),
      option('1001-5000', '1,001–5,000 employees', 40),
      option('5000+', '5,000+ employees', 50),
    ],
  },
  {
    key: 'assessment.regulated',
    label: 'Assessment - Regulated Environment',
    description: 'Nilai ini dipakai engine adaptive assessment.',
    logicBound: true,
    options: [
      option('yes', 'Yes', 10),
      option('no', 'No', 20),
      option('unsure', 'Not sure', 30),
    ],
  },
  {
    key: 'assessment.cloud_adoption',
    label: 'Assessment - Cloud Adoption',
    description: 'Nilai ini dipakai engine adaptive assessment.',
    logicBound: true,
    options: [
      option('none', 'No cloud use', 10),
      option('limited', 'Limited / selected workloads', 20),
      option('hybrid', 'Hybrid', 30),
      option('cloud-first', 'Cloud-first', 40),
    ],
  },
  {
    key: 'assessment.ai_adoption',
    label: 'Assessment - AI Adoption',
    description: 'Nilai ini dipakai engine adaptive assessment.',
    logicBound: true,
    options: [
      option('none', 'No organizational AI use', 10),
      option('pilot', 'Pilot / experimentation', 20),
      option('production', 'Production use cases', 30),
      option('scaled', 'Scaled enterprise AI', 40),
    ],
  },
  {
    key: 'assessment.maturity_levels',
    label: 'Assessment - Maturity Level',
    description: 'Label pilihan maturity 0–5. Value level merupakan key scoring dan tidak boleh diubah.',
    logicBound: true,
    options: [
      option('0', 'Level 0 — Non-Existent', 0, 'Kapabilitas belum tersedia atau belum pernah diterapkan secara terstruktur.'),
      option('1', 'Level 1 — Initial', 10, 'Pelaksanaan masih ad hoc, reaktif, dan sangat bergantung pada individu.'),
      option('2', 'Level 2 — Developing', 20, 'Proses mulai dibentuk tetapi penerapannya belum konsisten di seluruh organisasi.'),
      option('3', 'Level 3 — Defined', 30, 'Proses telah didefinisikan, terdokumentasi, memiliki pemilik, dan diterapkan secara formal.'),
      option('4', 'Level 4 — Managed', 40, 'Kinerja diukur, dimonitor, direview, dan ditingkatkan berdasarkan metrik serta risiko.'),
      option('5', 'Level 5 — Optimized', 50, 'Kapabilitas telah proaktif, terotomasi, terintegrasi, dan terus dioptimalkan berbasis intelligence.'),
    ],
  },
  {
    key: 'assessment.target_maturity',
    label: 'Assessment - Target Maturity',
    description: 'Target maturity yang dapat dipilih per domain.',
    logicBound: true,
    options: [
      option('3', 'Level 3', 30),
      option('4', 'Level 4', 40),
      option('5', 'Level 5', 50),
    ],
  },
  {
    key: 'project.types',
    label: 'Project Estimator - Jenis Proyek',
    description: 'Jenis estimator yang tersedia.',
    logicBound: true,
    options: [
      option('software', 'Software Development', 10),
      option('vapt', 'VAPT / Penetration Testing', 20),
    ],
  },
  {
    key: 'project.app_types',
    label: 'Project Estimator - Platform',
    description: 'Pilihan platform software.',
    logicBound: true,
    options: [
      option('web_only', 'Responsive Enterprise Web Application', 10),
      option('web_mobile', 'Web Platform + Native iOS & Android Apps', 20),
      option('api_gateway', 'High-Throughput API Gateway & Microservices', 30),
    ],
  },
  {
    key: 'project.module_complexity',
    label: 'Project Estimator - Kompleksitas Modul',
    description: 'Pilihan kompleksitas modul software.',
    logicBound: true,
    options: [
      option('low', 'Standard (1 – 3 Core Modules, Simple RBAC)', 10),
      option('mid', 'Comprehensive (4 – 7 Modules, Multi-Role, Workflows)', 20),
      option('high', 'Enterprise-Scale (8+ Modules, Multi-Tenant, Complex Engine)', 30),
    ],
  },
  {
    key: 'project.integrations',
    label: 'Project Estimator - Integrasi',
    description: 'Jumlah dan kompleksitas integrasi pihak ketiga.',
    logicBound: true,
    options: [
      option('single', 'Minimal (1 – 2 APIs, e.g. Payment Gateway only)', 10),
      option('multiple', 'Standard (3 – 5 Integrations: ERP, Core Banking, Notification)', 20),
      option('complex', 'Extensive (Multiple legacy core systems, ESB/Kafka)', 30),
    ],
  },
  {
    key: 'project.ai_capability',
    label: 'Project Estimator - AI',
    description: 'Kebutuhan AI dan analytics.',
    logicBound: true,
    options: [
      option('no', 'Standard CRUD & Business Logic', 10),
      option('yes', 'Enterprise RAG / AI Chat Assistant Integration', 20),
      option('complex', 'Custom ML Model Pipelines & Predictive Analytics', 30),
    ],
  },
  {
    key: 'project.vapt_scope',
    label: 'Project Estimator - VAPT Scope',
    description: 'Surface yang termasuk dalam VAPT.',
    logicBound: true,
    options: [
      option('web_api', 'Web Application + REST APIs', 10),
      option('mobile', 'Mobile Applications (Android APK + iOS IPA)', 20),
      option('network', 'External / Internal Network Infrastructure', 30),
      option('full', 'Full-Scope (Web, Mobile, API & Network)', 40),
    ],
  },
  {
    key: 'project.asset_count',
    label: 'Project Estimator - Asset / Endpoint Scale',
    description: 'Skala target pengujian.',
    logicBound: true,
    options: [
      option('small', 'Small Scope (Single web app or < 20 API endpoints)', 10),
      option('standard', 'Standard Scope (Multi-tenant app, 20 – 60 endpoints)', 20),
      option('large', 'Large Scope (Ecosystem with > 60 endpoints & mobile apps)', 30),
    ],
  },
  {
    key: 'project.test_type',
    label: 'Project Estimator - Testing Methodology',
    description: 'Metodologi VAPT.',
    logicBound: true,
    options: [
      option('grey_box', 'Grey Box (Authenticated credentials - Recommended)', 10),
      option('black_box', 'Black Box (Zero knowledge external attacker simulation)', 20),
      option('white_box', 'White Box (Includes source code audit & architecture review)', 30),
    ],
  },
  {
    key: 'solution.sectors',
    label: 'Solution Finder - Sektor',
    description: 'Sektor organisasi pada Solution Finder.',
    options: [
      option('banking_insurance', 'Banking & Financial Services', 10),
      option('fintech_payments', 'Fintech & Payment Gateway', 20),
      option('government_bumn', 'Government & BUMN / BUMD', 30),
      option('energy_resources', 'Energy, Natural Resources & Utilities', 40),
      option('enterprise_commercial', 'Diversified Conglomerate / Corporate', 50),
    ],
  },
  {
    key: 'solution.challenges',
    label: 'Solution Finder - Tantangan',
    description: 'Daftar tantangan bisnis dan teknologi.',
    options: [
      option('app_modernization', 'Legacy Core Modernization & Slow Development Releases', 10),
      option('audit_regulatory', 'Mandatory Regulatory Audit Pressure (OJK / BI / BSSN / UU PDP)', 20),
      option('cyber_vulnerabilities', 'Recent Cyber Incidents or Unverified Attack Surface Exposure', 30),
      option('system_instability', 'Frequent Infrastructure Downtime & High Incident Resolution Times', 40),
      option('no_clear_roadmap', 'Absence of Multi-Year IT Master Plan & Architecture Direction', 50),
      option('workforce_gap', 'Internal Developer Security Habits & Cyber Awareness Gaps', 60),
    ],
  },
  {
    key: 'solution.scale',
    label: 'Solution Finder - Skala Organisasi',
    description: 'Skala organisasi pada Solution Finder.',
    options: [
      option('scale_growing', 'Growing Tier (< 250 Employees / Regional)', 10),
      option('scale_mid', 'Mid-Market (250 – 1,000 Employees)', 20),
      option('scale_enterprise', 'Large Enterprise (1,000 – 5,000 Employees)', 30),
      option('scale_conglomerate', 'Mission-Critical / National Institution', 40),
    ],
  },
  {
    key: 'solution.urgency',
    label: 'Solution Finder - Urgensi',
    description: 'Horizon pelaksanaan kebutuhan.',
    options: [
      option('immediate', 'Immediate (< 30 Days)', 10),
      option('quarterly', 'This Quarter (1 – 3 Months)', 20),
      option('planning', 'Strategic Planning (3 – 6 Months)', 30),
    ],
  },
  {
    key: 'cyber_quick.answer_scale',
    label: 'Cyber Quick Check - Jawaban',
    description: 'Pilihan jawaban Cyber Quick Check. Value dipakai scoring dan dikunci.',
    logicBound: true,
    options: [
      option('yes', 'Yes / Full', 10),
      option('partial', 'Partial', 20),
      option('no', 'No / Unsure', 30),
    ],
  },
  {
    key: 'training.categories',
    label: 'Training - Kategori',
    description: 'Filter kategori training.',
    options: [
      option('ALL', 'All Programs', 0),
      option('Cybersecurity Awareness', 'Cybersecurity Awareness', 10),
      option('Secure Coding', 'Secure Coding', 20),
      option('ISO Awareness', 'ISO Awareness', 30),
      option('IT Governance', 'IT Governance', 40),
    ],
  },
  {
    key: 'training.pax',
    label: 'Training - Jumlah Peserta',
    description: 'Pilihan jumlah peserta training.',
    options: [
      option('1', '1 Peserta (Individu / Public Schedule)', 10),
      option('2-5', '2 – 5 Peserta (Small Squad)', 20),
      option('6-15', '6 – 15 Peserta (In-House Department)', 30),
      option('15+', 'Lebih dari 15 Peserta (Corporate-Wide)', 40),
    ],
  },
];

export const PARAMETER_GROUP_MAP = Object.fromEntries(
  PARAMETER_GROUPS.map((group) => [group.key, group]),
) as Record<string, ParameterGroupDefinition>;

export function getDefaultParameterOptions(groupKey: string): ParameterOption[] {
  const group = PARAMETER_GROUP_MAP[groupKey];
  if (!group) return [];

  return group.options
    .map((item) => ({ ...item, group: groupKey, system: true }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}
