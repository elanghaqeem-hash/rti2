-- RTI NIST Cyber Quick Check
-- NIST CSF 2.0 diagnostic configuration + assessment persistence.
-- SQLite-compatible. Seed rows are framework/configuration data, never production assessment data.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nist_framework_versions (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nist_functions (
  framework_version TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  PRIMARY KEY (framework_version, code),
  FOREIGN KEY (framework_version) REFERENCES nist_framework_versions(code)
);

CREATE TABLE IF NOT EXISTS nist_categories (
  framework_version TEXT NOT NULL,
  code TEXT NOT NULL,
  function_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  target_score REAL NOT NULL DEFAULT 75,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  PRIMARY KEY (framework_version, code),
  FOREIGN KEY (framework_version, function_code)
    REFERENCES nist_functions(framework_version, code)
);

CREATE TABLE IF NOT EXISTS nist_questions (
  id TEXT PRIMARY KEY,
  framework_version TEXT NOT NULL,
  questionnaire_version TEXT NOT NULL,
  function_code TEXT NOT NULL,
  category_code TEXT NOT NULL,
  question_code TEXT NOT NULL UNIQUE,
  question_text_en TEXT NOT NULL,
  question_text_id TEXT NOT NULL,
  help_text TEXT,
  executive_explanation TEXT,
  technical_explanation TEXT,
  weight REAL NOT NULL DEFAULT 1,
  question_type TEXT NOT NULL DEFAULT 'scale',
  is_core INTEGER NOT NULL DEFAULT 1 CHECK (is_core IN (0,1)),
  estimated_seconds INTEGER NOT NULL DEFAULT 12,
  risk_signal TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (framework_version, function_code)
    REFERENCES nist_functions(framework_version, code),
  FOREIGN KEY (framework_version, category_code)
    REFERENCES nist_categories(framework_version, code)
);

CREATE INDEX IF NOT EXISTS idx_nist_questions_active
  ON nist_questions(framework_version, questionnaire_version, active, sort_order);

CREATE TABLE IF NOT EXISTS nist_answer_options (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  score REAL NOT NULL,
  verification_required INTEGER NOT NULL DEFAULT 0 CHECK (verification_required IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS nist_evidence_options (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  multiplier REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS nist_scoring_thresholds (
  key TEXT PRIMARY KEY,
  min_score REAL NOT NULL,
  max_score REAL NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS nist_tier_rules (
  tier INTEGER PRIMARY KEY CHECK (tier BETWEEN 1 AND 4),
  label TEXT NOT NULL,
  min_overall REAL NOT NULL,
  min_govern REAL NOT NULL,
  min_confidence REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS nist_service_mappings (
  id TEXT PRIMARY KEY,
  category_code TEXT NOT NULL,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_url TEXT NOT NULL,
  reason_template TEXT NOT NULL,
  priority_order INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_nist_service_mapping_category
  ON nist_service_mappings(category_code, active, priority_order);

CREATE TABLE IF NOT EXISTS nist_assessments (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  employee_count INTEGER,
  it_user_count INTEGER,
  country TEXT,
  region TEXT,
  location_count INTEGER,
  website TEXT,
  technology_context_json TEXT NOT NULL DEFAULT '{}',
  respondent_name TEXT NOT NULL,
  respondent_title TEXT,
  respondent_department TEXT,
  respondent_email TEXT NOT NULL,
  respondent_phone TEXT,
  consent_version TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('quick','detailed')),
  framework_version TEXT NOT NULL,
  questionnaire_version TEXT NOT NULL,
  scoring_model_version TEXT NOT NULL,
  recommendation_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','reviewed','validated')),
  overall_score REAL,
  risk_rating TEXT,
  confidence_score REAL,
  indicative_tier INTEGER,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nist_assessments_email_created
  ON nist_assessments(respondent_email, created_at DESC);

CREATE TABLE IF NOT EXISTS nist_answers (
  assessment_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  answer_score REAL NOT NULL,
  not_sure INTEGER NOT NULL DEFAULT 0 CHECK (not_sure IN (0,1)),
  evidence_status TEXT,
  comment TEXT,
  answered_at TEXT NOT NULL,
  PRIMARY KEY (assessment_id, question_id),
  FOREIGN KEY (assessment_id) REFERENCES nist_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES nist_questions(id),
  FOREIGN KEY (answer_value) REFERENCES nist_answer_options(value)
);

CREATE TABLE IF NOT EXISTS nist_function_scores (
  assessment_id TEXT NOT NULL,
  function_code TEXT NOT NULL,
  function_name TEXT NOT NULL,
  score REAL NOT NULL,
  target_score REAL NOT NULL,
  gap REAL NOT NULL,
  PRIMARY KEY (assessment_id, function_code),
  FOREIGN KEY (assessment_id) REFERENCES nist_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nist_category_scores (
  assessment_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  function_code TEXT NOT NULL,
  score REAL NOT NULL,
  target_score REAL NOT NULL,
  gap REAL NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (assessment_id, category_code),
  FOREIGN KEY (assessment_id) REFERENCES nist_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nist_risk_findings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  title TEXT NOT NULL,
  rating TEXT NOT NULL,
  likelihood INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES nist_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nist_recommendations (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL,
  effort TEXT NOT NULL,
  impact TEXT NOT NULL,
  suggested_timeline TEXT NOT NULL,
  reason TEXT NOT NULL,
  service_code TEXT,
  service_name TEXT,
  service_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES nist_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nist_roadmap_items (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  category_code TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner_suggestion TEXT NOT NULL,
  dependencies TEXT NOT NULL,
  estimated_effort TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES nist_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nist_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO nist_framework_versions(code, title, status, created_at)
VALUES ('NIST-CSF-2.0', 'NIST Cybersecurity Framework 2.0', 'active', '2026-09-27T00:00:00.000Z');

INSERT OR IGNORE INTO nist_functions(framework_version, code, name, description, weight, sort_order) VALUES
('NIST-CSF-2.0','GV','Govern','Cybersecurity risk governance, strategy, accountability, policy, oversight, and supply-chain risk.',1,10),
('NIST-CSF-2.0','ID','Identify','Understand assets, cyber risk, exposure, and improvement opportunities.',1,20),
('NIST-CSF-2.0','PR','Protect','Safeguards that reduce the likelihood and impact of cybersecurity incidents.',1,30),
('NIST-CSF-2.0','DE','Detect','Find and analyze possible cybersecurity attacks and compromises.',1,40),
('NIST-CSF-2.0','RS','Respond','Take action regarding a detected cybersecurity incident.',1,50),
('NIST-CSF-2.0','RC','Recover','Restore assets and operations affected by a cybersecurity incident.',1,60);

INSERT OR IGNORE INTO nist_categories(framework_version, code, function_code, name, description, weight, target_score, sort_order) VALUES
('NIST-CSF-2.0','GV.OC','GV','Organizational Context','Mission, stakeholders, dependencies, and legal/regulatory context are understood.',1,75,10),
('NIST-CSF-2.0','GV.RM','GV','Risk Management Strategy','Cybersecurity risk objectives, appetite, tolerance, and priorities are established.',1,75,20),
('NIST-CSF-2.0','GV.RR','GV','Roles, Responsibilities, and Authorities','Cybersecurity roles, responsibilities, and authorities are established and communicated.',1,75,30),
('NIST-CSF-2.0','GV.PO','GV','Policy','Cybersecurity policies are established, communicated, and maintained.',1,75,40),
('NIST-CSF-2.0','GV.OV','GV','Oversight','Cybersecurity risk management performance is reviewed and adjusted.',1,75,50),
('NIST-CSF-2.0','GV.SC','GV','Cybersecurity Supply Chain Risk Management','Cybersecurity supply-chain risks are identified, managed, monitored, and improved.',1,75,60),
('NIST-CSF-2.0','ID.AM','ID','Asset Management','Assets, systems, services, data, and dependencies are inventoried and managed.',1,75,70),
('NIST-CSF-2.0','ID.RA','ID','Risk Assessment','Threats, vulnerabilities, likelihood, and impact are assessed and prioritized.',1,75,80),
('NIST-CSF-2.0','ID.IM','ID','Improvement','Improvements are identified from evaluations, tests, exercises, and incidents.',1,75,90),
('NIST-CSF-2.0','PR.AA','PR','Identity Management, Authentication, and Access Control','Identities and access are managed according to risk.',1,75,100),
('NIST-CSF-2.0','PR.AT','PR','Awareness and Training','Personnel receive cybersecurity awareness and role-based training.',1,75,110),
('NIST-CSF-2.0','PR.DS','PR','Data Security','Data is protected consistent with risk strategy and confidentiality, integrity, and availability needs.',1,75,120),
('NIST-CSF-2.0','PR.PS','PR','Platform Security','Hardware, software, and services are securely managed and maintained.',1,75,130),
('NIST-CSF-2.0','PR.IR','PR','Technology Infrastructure Resilience','Technology architectures and environments are protected and resilient.',1,75,140),
('NIST-CSF-2.0','DE.CM','DE','Continuous Monitoring','Assets are monitored to find anomalies, indicators of compromise, and adverse events.',1,75,150),
('NIST-CSF-2.0','DE.AE','DE','Adverse Event Analysis','Potentially adverse events are analyzed to characterize incidents and support response.',1,75,160),
('NIST-CSF-2.0','RS.MA','RS','Incident Management','Cybersecurity incidents are managed through established processes.',1,75,170),
('NIST-CSF-2.0','RS.AN','RS','Incident Analysis','Investigations determine what happened, scope, impact, and root cause.',1,75,180),
('NIST-CSF-2.0','RS.CO','RS','Incident Response Reporting and Communication','Incident response communications are coordinated with relevant stakeholders.',1,75,190),
('NIST-CSF-2.0','RS.MI','RS','Incident Mitigation','Incidents are contained, eradicated, and mitigated.',1,75,200),
('NIST-CSF-2.0','RC.RP','RC','Incident Recovery Plan Execution','Recovery activities restore systems and operations after incidents.',1,75,210),
('NIST-CSF-2.0','RC.CO','RC','Incident Recovery Communication','Recovery progress and status are communicated to relevant stakeholders.',1,75,220);

INSERT OR IGNORE INTO nist_answer_options(value,label,description,score,verification_required,sort_order) VALUES
('0','Not Implemented','No process or control is implemented.',0,0,10),
('1','Ad Hoc','Activities are informal, reactive, or case-by-case.',25,0,20),
('2','Defined','A documented process or policy exists but implementation may be incomplete.',50,0,30),
('3','Implemented','The process or control is consistently implemented.',75,0,40),
('4','Measured & Improved','Effectiveness is monitored, measured, tested, and improved.',100,0,50),
('unsure','Not Sure','Insufficient information to confirm effectiveness. Verification is required.',0,1,60);

INSERT OR IGNORE INTO nist_evidence_options(value,label,multiplier,sort_order) VALUES
('available','Evidence Available',1.0,10),
('partial','Partially Available',0.6,20),
('none','No Evidence',0.25,30),
('unspecified','Not Specified',0.4,40);

INSERT OR IGNORE INTO nist_scoring_thresholds(key,min_score,max_score,label,sort_order) VALUES
('critical',0,20,'Critical Exposure',10),
('high',20.000001,40,'High Risk',20),
('developing',40.000001,60,'Developing',30),
('managed',60.000001,80,'Managed',40),
('advanced',80.000001,100,'Advanced',50);

INSERT OR IGNORE INTO nist_tier_rules(tier,label,min_overall,min_govern,min_confidence) VALUES
(1,'Partial',0,0,0),
(2,'Risk Informed',40,40,35),
(3,'Repeatable',65,65,60),
(4,'Adaptive',80,80,75);

INSERT OR IGNORE INTO nist_questions(
  id, framework_version, questionnaire_version, function_code, category_code, question_code,
  question_text_en, question_text_id, help_text, executive_explanation, technical_explanation,
  weight, question_type, is_core, estimated_seconds, risk_signal, active, sort_order, version,
  created_at, updated_at
) VALUES
('nist-q-gvoc','NIST-CSF-2.0','QC-2026.1','GV','GV.OC','GV.OC.Q1',
'Does your organization formally identify business, stakeholder, legal, regulatory, and critical service dependencies that influence cybersecurity decisions?',
'Apakah organisasi secara formal mengidentifikasi kebutuhan bisnis, pemangku kepentingan, kewajiban hukum/regulasi, dan ketergantungan layanan kritikal yang memengaruhi keputusan cybersecurity?',
'Pertimbangkan kewajiban kontraktual, regulator, layanan kritikal, pelanggan, serta dependency utama.',
'Konteks organisasi menjadi dasar penentuan prioritas cyber risk.',
'Cari bukti berupa business context, regulatory inventory, critical service mapping, atau dependency register.',
1,'scale',1,12,'governance_context',1,10,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-gvrm','NIST-CSF-2.0','QC-2026.1','GV','GV.RM','GV.RM.Q1',
'Does senior management approve a cybersecurity risk management strategy, including risk appetite or tolerance and prioritization criteria?',
'Apakah manajemen senior menyetujui strategi manajemen risiko cybersecurity termasuk risk appetite/tolerance dan kriteria prioritas?',
'Nilai apakah cyber risk sudah menjadi bagian dari enterprise risk management dan keputusan investasi.',
'Ketiadaan arah risiko yang disetujui manajemen dapat membuat prioritas keamanan tidak konsisten.',
'Cari risk strategy, risk appetite statement, risk criteria, steering committee minutes, atau cyber risk reporting.',
1,'scale',1,12,'risk_strategy',1,20,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-gvrr','NIST-CSF-2.0','QC-2026.1','GV','GV.RR','GV.RR.Q1',
'Are cybersecurity roles, responsibilities, and decision authorities formally assigned across management, IT, security, risk, and business owners?',
'Apakah peran, tanggung jawab, dan kewenangan keputusan cybersecurity ditetapkan secara formal untuk manajemen, TI, security, risk, dan business owner?',
'Pertimbangkan accountability, segregation of duties, escalation, dan ownership.',
'Peran yang tidak jelas dapat memperlambat keputusan dan respons insiden.',
'Cari RACI, job description, committee charter, policy ownership, atau escalation matrix.',
1,'scale',1,12,'role_accountability',1,30,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-gvpo','NIST-CSF-2.0','QC-2026.1','GV','GV.PO','GV.PO.Q1',
'Does your organization maintain approved cybersecurity policies that are reviewed, communicated, and updated on a defined schedule?',
'Apakah organisasi memiliki kebijakan cybersecurity yang disetujui, dikomunikasikan, direview, dan diperbarui secara berkala?',
'Nilai kelengkapan kebijakan dan bukti lifecycle review.',
'Policy yang tidak mutakhir dapat menimbulkan ketidakkonsistenan kontrol.',
'Cari policy register, approval, review date, distribution evidence, dan exception management.',
1,'scale',1,12,'policy_gap',1,40,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-gvov','NIST-CSF-2.0','QC-2026.1','GV','GV.OV','GV.OV.Q1',
'Does management periodically review cybersecurity performance, material risks, exceptions, incidents, and improvement actions?',
'Apakah manajemen secara berkala mereview kinerja cybersecurity, risiko material, exception, insiden, dan tindak lanjut perbaikan?',
'Pertimbangkan dashboard, KRI/KPI, risk acceptance, audit findings, dan remediation tracking.',
'Kurangnya oversight mengurangi kemampuan manajemen memastikan kontrol bekerja sesuai tujuan.',
'Cari board/committee pack, cyber dashboard, KRI/KPI, open issue aging, dan risk acceptance records.',
1,'scale',1,12,'oversight_gap',1,50,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-gvsc','NIST-CSF-2.0','QC-2026.1','GV','GV.SC','GV.SC.Q1',
'Are cybersecurity risks from critical suppliers, cloud providers, and other third parties assessed before onboarding and monitored during the relationship?',
'Apakah risiko cybersecurity dari pemasok kritikal, cloud provider, dan pihak ketiga dinilai sebelum onboarding dan dimonitor selama hubungan kerja?',
'Pertimbangkan due diligence, contract clauses, risk tiering, periodic review, dan exit requirements.',
'Third-party weakness dapat menjadi jalur serangan atau gangguan layanan.',
'Cari vendor risk assessment, security clauses, supplier inventory, monitoring evidence, dan exit plan.',
1,'scale',1,12,'third_party_risk',1,60,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-idam','NIST-CSF-2.0','QC-2026.1','ID','ID.AM','ID.AM.Q1',
'Does your organization maintain a current inventory of critical hardware, software, cloud services, data assets, APIs, and external dependencies with accountable owners?',
'Apakah organisasi memelihara inventaris terkini atas hardware, software, cloud service, data asset, API, dan dependency eksternal kritikal beserta owner yang bertanggung jawab?',
'Inventaris harus cukup mutakhir untuk mendukung risk assessment dan incident response.',
'Aset yang tidak diketahui sulit dilindungi, dimonitor, atau dipulihkan.',
'Cari CMDB/asset register, cloud inventory, software inventory, data inventory, owner, dan criticality.',
1,'scale',1,12,'asset_visibility',1,70,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-idra','NIST-CSF-2.0','QC-2026.1','ID','ID.RA','ID.RA.Q1',
'Are cybersecurity risk assessments performed periodically using current threats, vulnerabilities, likelihood, business impact, and risk treatment priorities?',
'Apakah cyber risk assessment dilakukan secara berkala dengan mempertimbangkan threat, vulnerability, likelihood, business impact, dan prioritas treatment terkini?',
'Pertimbangkan risk register, vulnerability management, threat intelligence, dan business impact.',
'Risk assessment yang lemah membuat sumber daya keamanan sulit diprioritaskan.',
'Cari cyber risk assessment, risk register, VAPT/vulnerability findings, threat intelligence, dan treatment plan.',
1,'scale',1,12,'risk_assessment_gap',1,80,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-idim','NIST-CSF-2.0','QC-2026.1','ID','ID.IM','ID.IM.Q1',
'Are lessons from audits, tests, exercises, incidents, and control monitoring converted into tracked cybersecurity improvements?',
'Apakah hasil audit, pengujian, exercise, insiden, dan monitoring kontrol dikonversi menjadi program perbaikan cybersecurity yang ditrack?',
'Nilai apakah temuan benar-benar ditutup dan efektivitas perbaikan diverifikasi.',
'Temuan berulang menunjukkan continuous improvement belum efektif.',
'Cari remediation backlog, post-incident review, exercise findings, audit action plan, dan closure evidence.',
1,'scale',1,12,'improvement_gap',1,90,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-praa','NIST-CSF-2.0','QC-2026.1','PR','PR.AA','PR.AA.Q1',
'Are identities and access rights managed through documented joiner-mover-leaver processes, periodic access reviews, MFA, and stronger controls for privileged access?',
'Apakah identitas dan hak akses dikelola melalui proses joiner-mover-leaver, review akses berkala, MFA, dan kontrol lebih kuat untuk privileged access?',
'Fokus pada privileged, remote, critical, dan third-party access.',
'Kelemahan IAM dapat menyebabkan account takeover dan unauthorized access.',
'Cari IAM/PAM configuration, MFA coverage, recertification records, JML workflow, dan privileged account inventory.',
1,'scale',1,12,'identity_compromise',1,100,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-praa2','NIST-CSF-2.0','QC-2026.1','PR','PR.AA','PR.AA.Q2',
'Is multi-factor authentication enforced for privileged, remote, and other high-risk access paths with exceptions formally controlled?',
'Apakah MFA diwajibkan untuk privileged, remote, dan jalur akses berisiko tinggi lainnya dengan exception yang dikendalikan secara formal?',
'Jawab berdasarkan coverage aktual, bukan hanya ketersediaan fitur.',
'MFA yang tidak konsisten meningkatkan kemungkinan credential compromise berdampak besar.',
'Cari MFA policy, identity provider configuration, exception register, dan coverage report.',
1,'scale',1,10,'mfa_gap',1,105,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-prat','NIST-CSF-2.0','QC-2026.1','PR','PR.AT','PR.AT.Q1',
'Do personnel receive recurring cybersecurity awareness and role-based training, with effectiveness measured through tests, simulations, or observed behavior?',
'Apakah personel menerima awareness cybersecurity secara berkala dan role-based training, dengan efektivitas yang diukur melalui test, simulasi, atau perilaku?',
'Pertimbangkan phishing simulation, secure coding, admin training, dan onboarding.',
'Human error dan social engineering tetap berisiko jika training tidak terukur.',
'Cari training completion, phishing simulation, assessment score, secure coding training, dan follow-up.',
1,'scale',1,12,'awareness_gap',1,110,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-prds','NIST-CSF-2.0','QC-2026.1','PR','PR.DS','PR.DS.Q1',
'Is sensitive and critical data classified and protected through appropriate access controls, encryption, retention, backup, and secure disposal?',
'Apakah data sensitif dan kritikal diklasifikasikan serta dilindungi melalui access control, enkripsi, retensi, backup, dan secure disposal yang sesuai?',
'Pertimbangkan data at rest, in transit, backup, dan lifecycle.',
'Data protection yang lemah meningkatkan risiko kebocoran, kehilangan, dan dampak regulasi.',
'Cari classification standard, encryption configuration, DLP/access rules, retention schedule, backup, dan disposal records.',
1,'scale',1,12,'data_breach',1,120,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-prps','NIST-CSF-2.0','QC-2026.1','PR','PR.PS','PR.PS.Q1',
'Are operating systems, applications, network devices, endpoints, and cloud platforms securely configured, patched, and monitored for configuration drift?',
'Apakah operating system, aplikasi, network device, endpoint, dan cloud platform dikonfigurasi secara aman, dipatch, dan dimonitor terhadap configuration drift?',
'Pertimbangkan patch SLA, hardening baseline, endpoint protection, dan vulnerability remediation.',
'Platform yang tidak dipatch atau salah konfigurasi dapat membuka jalur eksploitasi.',
'Cari patch compliance, hardening baseline, EDR status, vulnerability remediation, dan configuration monitoring.',
1,'scale',1,12,'platform_exposure',1,130,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-prir','NIST-CSF-2.0','QC-2026.1','PR','PR.IR','PR.IR.Q1',
'Is critical technology designed for resilience using segmentation, redundancy, secure architecture, capacity planning, and tested continuity arrangements?',
'Apakah teknologi kritikal dirancang resilien melalui segmentasi, redundancy, secure architecture, capacity planning, dan continuity arrangement yang diuji?',
'Nilai ketahanan terhadap ransomware, outage, single point of failure, dan dependency failure.',
'Resilience yang lemah dapat memperbesar dampak insiden dan memperlambat pemulihan.',
'Cari network segmentation, architecture diagram, HA/redundancy, capacity review, resilience test, dan continuity design.',
1,'scale',1,12,'resilience_gap',1,140,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-decm','NIST-CSF-2.0','QC-2026.1','DE','DE.CM','DE.CM.Q1',
'Are critical systems, endpoints, networks, cloud environments, and security controls continuously monitored for suspicious activity and control failures?',
'Apakah sistem kritikal, endpoint, network, cloud environment, dan security control dimonitor secara berkelanjutan untuk aktivitas mencurigakan dan control failure?',
'Pertimbangkan SIEM/SOC, EDR/XDR, network monitoring, cloud logs, dan alert coverage.',
'Monitoring yang terbatas meningkatkan detection dwell time dan kemungkinan serangan tidak terdeteksi.',
'Cari log source coverage, SIEM/SOC dashboards, EDR alerts, monitoring SLA, use cases, dan control health monitoring.',
1,'scale',1,12,'detection_failure',1,150,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-decm2','NIST-CSF-2.0','QC-2026.1','DE','DE.CM','DE.CM.Q2',
'Are security logs from critical sources centrally collected with defined retention, time synchronization, alerting, and escalation coverage?',
'Apakah security log dari sumber kritikal dikumpulkan secara terpusat dengan retensi, sinkronisasi waktu, alerting, dan escalation coverage yang didefinisikan?',
'Jawab berdasarkan sumber log kritikal yang benar-benar onboard dan dimonitor.',
'Kesenjangan log dapat menghambat deteksi, investigasi, dan forensics.',
'Cari log source inventory, retention settings, NTP/time sync, alert rules, dan escalation workflow.',
1,'scale',1,10,'logging_gap',1,155,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-deae','NIST-CSF-2.0','QC-2026.1','DE','DE.AE','DE.AE.Q1',
'Are suspicious events analyzed using documented triage, correlation, threat intelligence, severity classification, and escalation procedures?',
'Apakah event mencurigakan dianalisis menggunakan prosedur triage, korelasi, threat intelligence, severity classification, dan escalation yang terdokumentasi?',
'Pertimbangkan kemampuan membedakan false positive, event, dan incident.',
'Analisis event yang tidak konsisten dapat menyebabkan incident terlambat diidentifikasi.',
'Cari SOC playbook, triage workflow, severity matrix, threat intelligence use, dan case management.',
1,'scale',1,12,'analysis_gap',1,160,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-rsma','NIST-CSF-2.0','QC-2026.1','RS','RS.MA','RS.MA.Q1',
'Does your organization maintain a documented incident response plan with defined severity, roles, escalation, decision authority, and regular exercises?',
'Apakah organisasi memiliki incident response plan terdokumentasi dengan severity, peran, escalation, decision authority, dan exercise berkala?',
'Pertimbangkan ransomware, data breach, third-party incident, dan major outage scenarios.',
'IR plan yang tidak diuji dapat gagal saat tekanan insiden nyata.',
'Cari IR plan, severity matrix, contact tree, tabletop/exercise report, dan lessons learned.',
1,'scale',1,12,'incident_readiness',1,170,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-rsan','NIST-CSF-2.0','QC-2026.1','RS','RS.AN','RS.AN.Q1',
'Can the organization investigate incidents to determine scope, impact, root cause, affected assets/data, and evidence needed for containment and recovery?',
'Dapatkah organisasi menginvestigasi insiden untuk menentukan scope, impact, root cause, aset/data terdampak, serta evidence yang diperlukan untuk containment dan recovery?',
'Pertimbangkan forensics readiness, evidence preservation, timeline reconstruction, dan root-cause analysis.',
'Investigation gap dapat menyebabkan containment tidak lengkap dan insiden berulang.',
'Cari forensic procedure, evidence handling, case timeline, root cause analysis, dan investigation tooling.',
1,'scale',1,12,'forensics_gap',1,180,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-rsco','NIST-CSF-2.0','QC-2026.1','RS','RS.CO','RS.CO.Q1',
'Are incident communication and reporting requirements defined for executives, affected business units, customers, suppliers, insurers, regulators, and other relevant stakeholders?',
'Apakah kebutuhan komunikasi dan pelaporan insiden ditetapkan untuk eksekutif, unit bisnis terdampak, pelanggan, supplier, insurer, regulator, dan stakeholder relevan lainnya?',
'Jangan menilai kewajiban hukum secara final dari tool ini; fokus pada kesiapan proses komunikasi.',
'Komunikasi yang terlambat atau tidak terkoordinasi dapat memperbesar dampak operasional dan reputasi.',
'Cari communication plan, stakeholder matrix, regulator notification workflow, templates, dan approval path.',
1,'scale',1,12,'communication_gap',1,190,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-rsmi','NIST-CSF-2.0','QC-2026.1','RS','RS.MI','RS.MI.Q1',
'Are incident containment, eradication, blocking, isolation, credential reset, and remediation actions supported by documented playbooks and tested escalation paths?',
'Apakah tindakan containment, eradication, blocking, isolation, credential reset, dan remediation didukung playbook terdokumentasi dan escalation path yang diuji?',
'Pertimbangkan kewenangan untuk mengisolasi asset, menonaktifkan account, atau memblokir traffic.',
'Mitigation yang lambat dapat memperluas blast radius insiden.',
'Cari response playbook, SOAR/manual procedure, emergency change path, isolation process, dan recovery handoff.',
1,'scale',1,12,'containment_gap',1,200,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-rcrp','NIST-CSF-2.0','QC-2026.1','RC','RC.RP','RC.RP.Q1',
'Are critical backups, disaster recovery procedures, restoration priorities, recovery objectives, and cyber recovery scenarios regularly tested?',
'Apakah backup kritikal, disaster recovery procedure, restoration priority, recovery objective, dan skenario cyber recovery diuji secara berkala?',
'Fokus pada bukti restore test, bukan hanya keberadaan backup.',
'Backup yang tidak pernah diuji dapat gagal saat ransomware atau disaster.',
'Cari restore test, backup monitoring, RTO/RPO, DR test, immutable/offline backup where appropriate, dan recovery lessons learned.',
1,'scale',1,12,'ransomware_recovery',1,210,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z'),
('nist-q-rcco','NIST-CSF-2.0','QC-2026.1','RC','RC.CO','RC.CO.Q1',
'Are recovery status, service restoration priorities, stakeholder updates, and return-to-normal decisions communicated through defined governance and communication channels?',
'Apakah status recovery, prioritas restorasi layanan, update stakeholder, dan keputusan kembali ke kondisi normal dikomunikasikan melalui governance dan channel yang didefinisikan?',
'Pertimbangkan executive, customer, supplier, regulator, and internal communications as applicable.',
'Recovery communication yang tidak jelas dapat memperpanjang disruption dan menurunkan kepercayaan.',
'Cari recovery communication plan, status template, decision criteria, stakeholder contact list, dan exercise evidence.',
1,'scale',1,12,'recovery_communication_gap',1,220,'1.0','2026-09-27T00:00:00.000Z','2026-09-27T00:00:00.000Z');

INSERT OR IGNORE INTO nist_service_mappings(
  id, category_code, service_code, service_name, service_url, reason_template, priority_order
) VALUES
('svc-gvoc','GV.OC','cyber-governance','Cybersecurity Governance & Risk Advisory','/services/cybersecurity/governance','Organizational context and cyber risk governance require strengthening before controls can be prioritized consistently.',10),
('svc-gvrm','GV.RM','cyber-risk-assessment','Cybersecurity Risk Assessment','/services/cybersecurity/governance','Risk strategy, appetite, or prioritization is below the target profile.',10),
('svc-gvrr','GV.RR','governance-raci','Cybersecurity Governance, RACI & Operating Model','/services/cybersecurity/governance','Cybersecurity accountability and decision rights require clearer assignment.',10),
('svc-gvpo','GV.PO','policy-sop','Cybersecurity Policy & SOP Development','/services/cybersecurity/governance','Cybersecurity policy lifecycle and control documentation require improvement.',10),
('svc-gvov','GV.OV','grc-monitoring','Cyber GRC & Management Oversight','/services/cybersecurity/governance','Management oversight, metrics, or remediation governance is below target.',10),
('svc-gvsc','GV.SC','third-party-risk','Third-Party Cyber Risk Assessment','/services/cybersecurity/governance','Supplier and third-party cyber risk governance requires strengthening.',10),
('svc-idam','ID.AM','asset-discovery','Cyber Asset & Attack Surface Assessment','/services/cybersecurity/offensive','Asset visibility and ownership gaps limit effective risk management.',10),
('svc-idra','ID.RA','vapt','Vulnerability Assessment & Penetration Testing','/services/cybersecurity/offensive','Risk assessment and technical vulnerability validation are below the target posture.',10),
('svc-idim','ID.IM','remediation-program','Cybersecurity Remediation & Improvement Program','/services/cybersecurity/governance','Audit, exercise, incident, or testing lessons are not yet converted into consistent improvement.',10),
('svc-praa','PR.AA','iam-pam','IAM, MFA & Privileged Access Review','/services/cybersecurity/governance','Identity, authentication, or privileged access controls require strengthening.',10),
('svc-prat','PR.AT','cyber-awareness','Cybersecurity Awareness & Phishing Simulation','/training','Awareness and role-based cybersecurity capability are below target.',10),
('svc-prds','PR.DS','data-security','Data Security & Privacy Control Assessment','/services/cybersecurity/governance','Sensitive and critical data protection requires improvement.',10),
('svc-prps','PR.PS','hardening-vm','Platform Hardening & Vulnerability Management','/services/cybersecurity/offensive','Secure configuration, patching, or endpoint/platform protection is below target.',10),
('svc-prir','PR.IR','resilience-assessment','Cyber Resilience Architecture Assessment','/services/cybersecurity/defensive','Technology resilience and secure architecture require strengthening.',10),
('svc-decm','DE.CM','soc-mdr','SOC Readiness / Managed SOC & MDR','/services/cybersecurity/defensive','Continuous security monitoring coverage is below the target profile.',10),
('svc-deae','DE.AE','siem-use-cases','SIEM Use Case & Detection Engineering Assessment','/services/cybersecurity/defensive','Adverse event triage, correlation, and analysis capability require improvement.',10),
('svc-rsma','RS.MA','ir-readiness','Incident Response Readiness & Tabletop Exercise','/services/cybersecurity/defensive','Incident management planning and exercise capability are below target.',10),
('svc-rsan','RS.AN','dfir','Digital Forensics & Incident Response Readiness','/services/cybersecurity/defensive','Incident investigation and root-cause analysis capability require strengthening.',10),
('svc-rsco','RS.CO','crisis-comms','Cyber Incident Communication & Escalation Planning','/services/cybersecurity/governance','Incident reporting and stakeholder communication processes require improvement.',10),
('svc-rsmi','RS.MI','response-playbooks','Incident Response Playbook Development','/services/cybersecurity/defensive','Containment, eradication, and mitigation playbooks are below target.',10),
('svc-rcrp','RC.RP','bcp-dr','BCP/DR & Cyber Recovery Assessment','/services/cybersecurity/governance','Backup restoration, disaster recovery, or cyber recovery testing is below target.',10),
('svc-rcco','RC.CO','recovery-comms','Recovery Governance & Communication Planning','/services/cybersecurity/governance','Recovery communication and return-to-normal governance require improvement.',10);

INSERT OR IGNORE INTO system_parameters(
  group_key, value, label, description, sort_order, is_active, is_system, updated_at
) VALUES
('nist.feature_flags','ai_analysis','AI Analysis','Enable RTI Cyber Advisor analysis on completed NIST assessments.',10,1,1,'2026-09-27T00:00:00.000Z'),
('nist.feature_flags','detailed_assessment','Detailed Assessment','Enable the detailed-assessment continuation CTA.',20,1,1,'2026-09-27T00:00:00.000Z'),
('nist.feature_flags','pdf_report','PDF Report','Enable downloadable executive PDF report.',30,1,1,'2026-09-27T00:00:00.000Z'),
('nist.feature_flags','whatsapp_cta','WhatsApp CTA','Enable Talk to Risetin / WhatsApp conversion CTA.',40,1,1,'2026-09-27T00:00:00.000Z'),
('nist.feature_flags','industry_target_profile','Industry Target Profile','Enable industry-specific target profiles when configured.',50,0,1,'2026-09-27T00:00:00.000Z'),
('nist.feature_flags','benchmarking','Benchmarking','Show benchmark only when sufficient anonymized data exists.',60,0,1,'2026-09-27T00:00:00.000Z');
