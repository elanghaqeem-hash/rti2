-- RTI UU PDP Data Protection Readiness
-- Versioned, evidence-aware diagnostic framework for UU No. 27 Tahun 2022.
-- SQLite-compatible. Seed rows are framework/configuration data only.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pdp_framework_versions (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_domains (
  framework_version TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  PRIMARY KEY (framework_version, code),
  FOREIGN KEY (framework_version) REFERENCES pdp_framework_versions(code)
);

CREATE TABLE IF NOT EXISTS pdp_questions (
  id TEXT PRIMARY KEY,
  framework_version TEXT NOT NULL,
  questionnaire_version TEXT NOT NULL,
  domain_code TEXT NOT NULL,
  question_code TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  help_text TEXT,
  legal_reference TEXT,
  expected_evidence TEXT,
  risk_if_missing TEXT,
  recommendation TEXT,
  criticality TEXT NOT NULL DEFAULT 'Medium'
    CHECK (criticality IN ('Critical','High','Medium','Low')),
  weight REAL NOT NULL DEFAULT 1,
  is_core INTEGER NOT NULL DEFAULT 0 CHECK (is_core IN (0,1)),
  estimated_seconds INTEGER NOT NULL DEFAULT 25,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (framework_version, domain_code)
    REFERENCES pdp_domains(framework_version, code)
);

CREATE INDEX IF NOT EXISTS idx_pdp_questions_active
  ON pdp_questions(framework_version, questionnaire_version, active, is_core, sort_order);

CREATE TABLE IF NOT EXISTS pdp_answer_options (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  score REAL,
  is_na INTEGER NOT NULL DEFAULT 0 CHECK (is_na IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS pdp_evidence_options (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  multiplier REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS pdp_scoring_weights (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  weight REAL NOT NULL CHECK (weight >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS pdp_scoring_thresholds (
  key TEXT PRIMARY KEY,
  min_score REAL NOT NULL,
  max_score REAL NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS pdp_readiness_gates (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  question_id TEXT NOT NULL,
  minimum_score REAL NOT NULL DEFAULT 75,
  evidence_minimum TEXT NOT NULL DEFAULT 'exists',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  FOREIGN KEY (question_id) REFERENCES pdp_questions(id)
);

CREATE TABLE IF NOT EXISTS pdp_service_mappings (
  id TEXT PRIMARY KEY,
  domain_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_url_parameter TEXT NOT NULL,
  reason_template TEXT NOT NULL,
  priority_order INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS pdp_assessments (
  id TEXT PRIMARY KEY,
  access_token_hash TEXT NOT NULL,
  organization_id TEXT,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  employee_count INTEGER,
  country TEXT,
  location_count INTEGER,
  processes_personal_data INTEGER NOT NULL DEFAULT 1 CHECK (processes_personal_data IN (0,1)),
  processes_specific_data INTEGER NOT NULL DEFAULT 0 CHECK (processes_specific_data IN (0,1)),
  public_service_processing INTEGER NOT NULL DEFAULT 0 CHECK (public_service_processing IN (0,1)),
  large_scale_monitoring INTEGER NOT NULL DEFAULT 0 CHECK (large_scale_monitoring IN (0,1)),
  cross_border_transfer INTEGER NOT NULL DEFAULT 0 CHECK (cross_border_transfer IN (0,1)),
  uses_processors INTEGER NOT NULL DEFAULT 0 CHECK (uses_processors IN (0,1)),
  automated_decisioning INTEGER NOT NULL DEFAULT 0 CHECK (automated_decisioning IN (0,1)),
  respondent_name TEXT NOT NULL,
  respondent_title TEXT,
  respondent_email TEXT NOT NULL,
  respondent_phone TEXT,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('quick','detailed')),
  framework_version TEXT NOT NULL,
  questionnaire_version TEXT NOT NULL,
  scoring_model_version TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  evidence_processing_consent INTEGER NOT NULL DEFAULT 0 CHECK (evidence_processing_consent IN (0,1)),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','reviewed','validated')),
  implementation_score REAL,
  evidence_score REAL,
  overall_score REAL,
  readiness_level TEXT,
  gates_completed INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pdp_assessments_created
  ON pdp_assessments(created_at DESC);

CREATE TABLE IF NOT EXISTS pdp_answers (
  assessment_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  answer_score REAL,
  is_na INTEGER NOT NULL DEFAULT 0 CHECK (is_na IN (0,1)),
  applicability_justification TEXT,
  evidence_status TEXT NOT NULL DEFAULT 'none',
  evidence_note TEXT,
  comment TEXT,
  answered_at TEXT NOT NULL,
  PRIMARY KEY (assessment_id, question_id),
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES pdp_questions(id),
  FOREIGN KEY (answer_value) REFERENCES pdp_answer_options(value),
  FOREIGN KEY (evidence_status) REFERENCES pdp_evidence_options(value)
);

CREATE TABLE IF NOT EXISTS pdp_domain_scores (
  assessment_id TEXT NOT NULL,
  domain_code TEXT NOT NULL,
  domain_name TEXT NOT NULL,
  implementation_score REAL NOT NULL,
  evidence_score REAL NOT NULL,
  overall_score REAL NOT NULL,
  gap REAL NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (assessment_id, domain_code),
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdp_gap_findings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  domain_code TEXT NOT NULL,
  question_code TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical','High','Medium','Low')),
  current_condition TEXT NOT NULL,
  risk TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  legal_reference TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES pdp_questions(id)
);

CREATE INDEX IF NOT EXISTS idx_pdp_gap_assessment_severity
  ON pdp_gap_findings(assessment_id, severity);

CREATE TABLE IF NOT EXISTS pdp_roadmap_items (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  domain_code TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner_suggestion TEXT NOT NULL,
  dependencies TEXT,
  expected_outcome TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdp_evidence_files (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  question_id TEXT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  classification TEXT NOT NULL DEFAULT 'Confidential',
  scan_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES pdp_questions(id)
);

CREATE TABLE IF NOT EXISTS pdp_generated_reports (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  report_version TEXT NOT NULL,
  framework_version TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdp_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO pdp_framework_versions(code,title,status,created_at)
VALUES ('UU-PDP-27-2022-RTI-1.0','RTI UU PDP Data Protection Readiness v1.0','active','2026-09-29T00:00:00.000Z');

INSERT OR IGNORE INTO pdp_domains(framework_version,code,name,description,weight,sort_order) VALUES
('UU-PDP-27-2022-RTI-1.0','GOV','Governance & Accountability','Governance, privacy ownership, DPO applicability, policy, training, oversight, and accountability evidence.',1.1,10),
('UU-PDP-27-2022-RTI-1.0','INV','Data Inventory & Lifecycle','Personal-data inventory, processing records, data flows, retention, deletion, and accuracy.',1.0,20),
('UU-PDP-27-2022-RTI-1.0','LGL','Legal Basis, Consent & Transparency','Lawful basis, consent, notices, purpose limitation, and transparency.',1.1,30),
('UU-PDP-27-2022-RTI-1.0','RGT','Data Subject Rights','Operational mechanisms for data-subject requests, verification, tracking, and fulfillment.',1.1,40),
('UU-PDP-27-2022-RTI-1.0','RSK','DPIA & High-Risk Processing','High-risk processing identification, DPIA, automated decisions, specific data, new technology, and treatment.',1.1,50),
('UU-PDP-27-2022-RTI-1.0','TPR','Processors, Third Parties & Transfers','Processor governance, contracts, supplier oversight, domestic transfers, and cross-border transfers.',1.0,60),
('UU-PDP-27-2022-RTI-1.0','SEC','Security, Breach & Resilience','Technical/organizational security, confidentiality, access, monitoring, breach response, and 3x24-hour notification readiness.',1.2,70);

INSERT OR IGNORE INTO pdp_answer_options(value,label,description,score,is_na,sort_order) VALUES
('0','Belum Ada','Belum terdapat kebijakan, proses, kontrol, atau praktik yang dapat ditunjukkan.',0,0,10),
('1','Ad Hoc','Aktivitas dilakukan secara informal atau insidental dan belum konsisten.',25,0,20),
('2','Sebagian / Dalam Implementasi','Sebagian persyaratan telah diterapkan, tetapi cakupan atau konsistensinya belum memadai.',50,0,30),
('3','Diterapkan','Proses atau kontrol telah diterapkan secara konsisten pada cakupan yang relevan.',75,0,40),
('4','Dikelola & Dibuktikan','Proses telah terdokumentasi, memiliki bukti, dimonitor, dan ditinjau untuk perbaikan.',100,0,50),
('unsure','Belum Diketahui','Informasi belum memadai untuk memastikan status implementasi.',0,0,60),
('na','Tidak Berlaku','Gunakan hanya jika benar-benar tidak relevan terhadap konteks pemrosesan dan sertakan justifikasi.',NULL,1,70);

INSERT OR IGNORE INTO pdp_evidence_options(value,label,multiplier,sort_order) VALUES
('none','Belum Ada Evidence',0.00,10),
('planned','Evidence Direncanakan',0.20,20),
('exists','Evidence Ada',0.60,30),
('uploaded','Evidence Diunggah',0.80,40),
('reviewed','Evidence Direview',1.00,50),
('improve','Evidence Perlu Diperbaiki',0.45,60);

INSERT OR IGNORE INTO pdp_scoring_weights(key,label,weight,active) VALUES
('implementation','Implementation Readiness',0.75,1),
('evidence','Evidence Readiness',0.25,1);

INSERT OR IGNORE INTO pdp_scoring_thresholds(key,min_score,max_score,label,sort_order) VALUES
('foundational',0,39.999,'Foundational',10),
('developing',40,59.999,'Developing',20),
('defined',60,74.999,'Defined',30),
('advanced',75,89.999,'Advanced Readiness',40),
('high',90,100,'High Readiness',50);

-- GOV: Governance & Accountability
INSERT OR IGNORE INTO pdp_questions(
  id,framework_version,questionnaire_version,domain_code,question_code,question_text,help_text,legal_reference,
  expected_evidence,risk_if_missing,recommendation,criticality,weight,is_core,estimated_seconds,active,sort_order,version,created_at,updated_at
) VALUES
('pdp-q-gov-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','GOV','GOV.Q1',
'Apakah organisasi telah menetapkan tata kelola Pelindungan Data Pribadi, termasuk sponsor manajemen, pemilik kebijakan, peran lintas fungsi, dan jalur eskalasi?',
'Nilai apakah privacy governance menjadi bagian dari pengambilan keputusan organisasi, bukan hanya aktivitas legal atau TI.',
'UU 27/2022 Pasal 47',
'Kebijakan PDP, privacy governance charter, RACI, surat penunjukan, notulen komite.',
'Akuntabilitas tidak jelas dapat membuat kewajiban PDP tidak memiliki owner dan tindak lanjut.',
'Tetapkan governance charter, RACI, sponsor eksekutif, dan mekanisme eskalasi PDP.','Critical',1.4,1,25,1,10,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-gov-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','GOV','GOV.Q2',
'Apakah organisasi telah menilai secara formal apakah salah satu kondisi wajib penunjukan pejabat/petugas fungsi Pelindungan Data Pribadi terpenuhi dan, jika terpenuhi, telah menunjuk fungsi tersebut?',
'Jangan menganggap semua organisasi wajib menunjuk DPO. Evaluasi harus mempertimbangkan masing-masing kondisi Pasal 53 ayat (1), termasuk pelayanan publik, pemantauan teratur dan sistematis skala besar, serta pemrosesan skala besar atas Data Pribadi spesifik dan/atau terkait tindak pidana. Gunakan pembacaan Pasal 53 ayat (1) setelah Putusan MK No. 151/PUU-XXII/2024 yang memaknai penghubung kriterianya sebagai dan/atau.',
'UU 27/2022 Pasal 53–54 jo. Putusan MK No. 151/PUU-XXII/2024',
'DPO applicability assessment, surat penunjukan, job description, bukti independensi/fungsi, laporan aktivitas.',
'Kewajiban penunjukan dapat terlewat atau fungsi DPO tidak efektif.',
'Lakukan DPO applicability assessment dan dokumentasikan penunjukan, kompetensi, serta tugas bila kondisi Pasal 53 terpenuhi.','Critical',1.5,1,30,1,20,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-gov-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','GOV','GOV.Q3',
'Apakah peran Pengendali Data Pribadi, Prosesor Data Pribadi, business owner, TI, security, legal, risk, compliance, dan internal audit telah dipetakan untuk proses utama?',
'Gunakan RACI dan pemetaan peran per proses, sistem, atau layanan.',
'UU 27/2022 Pasal 19, Pasal 47, Pasal 51',
'Role mapping, RACI, process owner register, processor/controller classification.',
'Kesalahan klasifikasi peran dapat menyebabkan kewajiban kontraktual dan operasional tidak dipenuhi.',
'Petakan peran controller/processor dan ownership per proses pemrosesan.','High',1.1,0,25,1,30,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-gov-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','GOV','GOV.Q4',
'Apakah kebijakan, standar, dan SOP Pelindungan Data Pribadi telah disetujui, dikomunikasikan, dan direview secara berkala?',
'Periksa lifecycle kebijakan dan keterkaitannya dengan proses operasional.',
'UU 27/2022 Pasal 47',
'Policy register, approval, review date, SOP, bukti distribusi.',
'Kontrol dapat berjalan tidak konsisten atau hanya bergantung pada praktik individual.',
'Bangun policy framework PDP dan jadwal review yang terdokumentasi.','High',1.0,0,25,1,40,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-gov-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','GOV','GOV.Q5',
'Apakah awareness dan pelatihan PDP diberikan berdasarkan peran serta dievaluasi efektivitasnya?',
'Prioritaskan fungsi yang memproses data pribadi secara intensif, seperti HR, marketing, customer service, product, IT, security, dan procurement.',
'UU 27/2022 Pasal 47',
'Training plan, attendance, quiz result, phishing/privacy campaign, role-based training.',
'Human error dan keputusan pemrosesan yang keliru dapat meningkatkan risiko pelanggaran.',
'Terapkan training berbasis peran dan ukur completion serta efektivitas.','Medium',0.9,0,25,1,50,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-gov-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','GOV','GOV.Q6',
'Apakah manajemen menerima dashboard berkala tentang permintaan hak subjek data, DPIA, vendor risk, insiden, exception, dan remediation?',
'Dashboard perlu berorientasi keputusan dan menunjukkan issue aging, owner, serta status tindakan.',
'UU 27/2022 Pasal 47',
'Privacy dashboard, management review pack, KPI/KRI, action tracker.',
'Manajemen dapat tidak mengetahui risiko material atau keterlambatan remediasi.',
'Bangun privacy KPI/KRI dan review berkala oleh manajemen.','Medium',0.9,0,25,1,60,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

-- INV: Data Inventory & Lifecycle
('pdp-q-inv-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','INV','INV.Q1',
'Apakah organisasi memiliki inventaris aktivitas pemrosesan data pribadi (misalnya RoPA) yang mencakup tujuan, kategori data, subjek data, sistem, penerima, retensi, transfer, dan owner?',
'RoPA digunakan sebagai bukti akuntabilitas dan pemetaan aktivitas pemrosesan; istilah RoPA adalah praktik tata kelola, bukan istilah yang harus dianggap sebagai judul dokumen wajib dalam UU.',
'UU 27/2022 Pasal 16 ayat (2), Pasal 47',
'RoPA/data processing inventory, data-flow map, system register, owner register.',
'Tanpa inventaris, organisasi sulit memastikan dasar pemrosesan, hak subjek data, retensi, vendor, dan transfer.',
'Bangun processing inventory terpusat yang terhubung dengan sistem, owner, legal basis, retensi, dan third party.','Critical',1.5,1,30,1,110,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-inv-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','INV','INV.Q2',
'Apakah kategori Data Pribadi umum dan Data Pribadi yang bersifat spesifik telah diklasifikasikan dan dipetakan ke sistem/proses yang memprosesnya?',
'Identifikasi data spesifik karena risiko dan pengamanannya dapat lebih tinggi.',
'UU 27/2022 Pasal 4',
'Data classification standard, data inventory, system mapping.',
'Data berisiko tinggi dapat tidak memperoleh pengamanan dan pengawasan yang sesuai.',
'Klasifikasikan jenis data dan tandai pemrosesan data spesifik serta owner-nya.','High',1.1,0,25,1,120,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-inv-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','INV','INV.Q3',
'Apakah aliran data dari pengumpulan hingga penghapusan, termasuk API, file transfer, cloud, cabang, dan pihak ketiga, telah dipetakan?',
'Fokus pada sumber, tujuan, transit, storage, recipient, dan cross-border path.',
'UU 27/2022 Pasal 16, Pasal 47',
'Data flow diagram, architecture diagram, interface inventory.',
'Shadow processing dan transfer tidak teridentifikasi dapat menciptakan exposure.',
'Bangun data-flow map dan kaitkan dengan RoPA, vendor, serta sistem.','High',1.1,0,25,1,130,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-inv-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','INV','INV.Q4',
'Apakah organisasi memiliki jadwal retensi data yang terdokumentasi berdasarkan tujuan pemrosesan dan kewajiban hukum/kontraktual?',
'Retensi harus dapat ditelusuri ke jenis record dan owner.',
'UU 27/2022 Pasal 21, Pasal 44',
'Retention schedule, record classification, legal hold matrix.',
'Penyimpanan terlalu lama meningkatkan exposure dan potensi pelanggaran hak.',
'Tetapkan retention schedule dan proses legal hold yang terdokumentasi.','High',1.1,1,25,1,140,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-inv-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','INV','INV.Q5',
'Apakah penghapusan atau pemusnahan data dapat dilaksanakan secara terkontrol, termasuk pada backup, arsip, media fisik, dan pihak ketiga bila relevan?',
'Verifikasi mekanisme teknis dan operasional, bukan hanya klausul kebijakan.',
'UU 27/2022 Pasal 43–45',
'Deletion SOP, destruction certificate, purge logs, vendor confirmation.',
'Data yang seharusnya dihapus dapat tetap tersedia dan menjadi sumber exposure.',
'Implementasikan deletion workflow end-to-end dan bukti pemusnahan.','High',1.0,0,25,1,150,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-inv-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','INV','INV.Q6',
'Apakah terdapat kontrol untuk menjaga data tetap akurat, lengkap, tidak menyesatkan, dan mutakhir sesuai tujuan pemrosesan?',
'Pertimbangkan data correction workflow, data quality checks, reconciliation, dan master-data governance.',
'UU 27/2022 Pasal 16 ayat (2)',
'Data quality rules, correction logs, reconciliation, master-data controls.',
'Keputusan dapat dibuat menggunakan data tidak akurat dan merugikan subjek data.',
'Tetapkan data quality control dan mekanisme koreksi yang dapat diaudit.','Medium',0.9,0,25,1,160,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

-- LGL: Legal Basis, Consent & Transparency
('pdp-q-lgl-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','LGL','LGL.Q1',
'Apakah setiap tujuan pemrosesan telah memiliki dasar pemrosesan yang terdokumentasi dan dapat dijelaskan kepada pihak terkait?',
'Dasar pemrosesan tidak selalu persetujuan; dokumentasikan basis yang relevan untuk setiap tujuan.',
'UU 27/2022 Pasal 20',
'Legal basis register, RoPA, legal assessment, processing purpose register.',
'Pemrosesan dapat berlangsung tanpa dasar yang tepat atau tidak konsisten antar proses.',
'Petakan legal basis per tujuan pemrosesan dan lakukan review perubahan tujuan.','Critical',1.5,1,30,1,210,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-lgl-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','LGL','LGL.Q2',
'Apakah privacy notice/informasi pemrosesan menjelaskan legalitas, tujuan, jenis data, retensi, rincian informasi, jangka waktu pemrosesan, dan hak Subjek Data?',
'Review seluruh touchpoint: website, aplikasi, form, HR, CCTV, event, marketing, dan kanal offline.',
'UU 27/2022 Pasal 21',
'Privacy notice, collection notice, employee privacy notice, change log.',
'Subjek data dapat tidak memperoleh informasi yang diwajibkan atau informasi menjadi tidak konsisten.',
'Susun privacy notice per konteks dan kelola perubahan secara terkontrol.','Critical',1.4,1,30,1,220,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-lgl-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','LGL','LGL.Q3',
'Jika pemrosesan menggunakan persetujuan, apakah persetujuan diberikan secara sah, eksplisit, terdokumentasi/terekam, dan dapat ditarik kembali?',
'Jangan gunakan consent sebagai default bila dasar pemrosesan lain lebih tepat.',
'UU 27/2022 Pasal 20–23, Pasal 40',
'Consent wording, consent log, withdrawal log, preference center.',
'Consent yang tidak sah atau tidak dapat dibuktikan dapat melemahkan dasar pemrosesan.',
'Bangun consent lifecycle termasuk capture, versioning, withdrawal, dan audit trail.','High',1.2,0,30,1,230,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-lgl-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','LGL','LGL.Q4',
'Apakah organisasi mempunyai kontrol tambahan untuk pemrosesan data anak dan/atau orang dengan disabilitas bila aktivitas tersebut relevan?',
'Pastikan consent/otorisasi dan desain interaksi disesuaikan dengan persyaratan yang berlaku.',
'UU 27/2022 Pasal 25–26',
'Special population procedure, guardian consent evidence, accessible privacy notice.',
'Pemrosesan kelompok rentan dapat dilakukan tanpa mekanisme pelindungan yang memadai.',
'Definisikan mekanisme pemrosesan kelompok rentan dan bukti otorisasi yang sesuai.','High',1.0,0,25,1,240,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-lgl-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','LGL','LGL.Q5',
'Apakah perubahan tujuan, metode, atau informasi penting pemrosesan memicu review legal basis dan pembaruan pemberitahuan kepada Subjek Data sebelum perubahan diterapkan?',
'Integrasikan privacy review ke product/change management.',
'UU 27/2022 Pasal 21 ayat (2), Pasal 27',
'Change checklist, privacy review, revised notice, approval log.',
'Perubahan pemrosesan dapat berlangsung di luar ekspektasi atau dasar yang sebelumnya digunakan.',
'Tambahkan privacy checkpoint pada change/product lifecycle.','High',1.0,0,25,1,250,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-lgl-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','LGL','LGL.Q6',
'Jika organisasi mengandalkan kepentingan sah lainnya, apakah tujuan, kebutuhan, dan keseimbangan kepentingan organisasi dengan hak Subjek Data telah dinilai dan didokumentasikan?',
'Gunakan balancing assessment yang dapat direview.',
'UU 27/2022 Pasal 20 ayat (2) huruf f',
'Legitimate-interest assessment/balancing test, approval, review date.',
'Organisasi dapat mengandalkan dasar pemrosesan tanpa analisis keseimbangan yang memadai.',
'Gunakan template balancing assessment dan approval yang terdokumentasi.','Medium',0.9,0,25,1,260,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

-- RGT: Data Subject Rights
('pdp-q-rgt-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RGT','RGT.Q1',
'Apakah tersedia kanal dan SOP terintegrasi untuk menerima, memverifikasi, melacak, memenuhi, atau menolak secara sah permintaan hak Subjek Data?',
'Permohonan dapat datang melalui kanal elektronik maupun nonelektronik dan perlu dicatat.',
'UU 27/2022 Pasal 5–15',
'Data subject request SOP, request portal, ticket log, SLA matrix.',
'Permintaan dapat hilang, terlambat, atau ditangani tidak konsisten.',
'Bangun request workflow end-to-end dengan owner, SLA internal, dan audit trail.','Critical',1.5,1,30,1,310,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rgt-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RGT','RGT.Q2',
'Apakah identitas dan kewenangan pemohon diverifikasi secara proporsional tanpa mengumpulkan data berlebihan?',
'Pertimbangkan proxy, kuasa, akun digital, dan risiko impersonation.',
'UU 27/2022 Pasal 14, prinsip pemrosesan Pasal 16',
'Identity verification SOP, authorization record, request log.',
'Data dapat diberikan kepada pihak yang tidak berhak atau verifikasi dapat mengumpulkan data berlebihan.',
'Terapkan risk-based identity verification untuk setiap tipe permintaan.','High',1.0,0,25,1,320,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rgt-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RGT','RGT.Q3',
'Apakah organisasi mampu memberikan akses dan melakukan perbaikan/pembaruan data secara terkoordinasi di seluruh sistem yang relevan?',
'Pastikan response mencakup sistem utama dan downstream bila relevan.',
'UU 27/2022 Pasal 7–8, Pasal 30',
'Access/correction workflow, response package, correction log.',
'Respons dapat tidak lengkap atau data tetap salah di sistem lain.',
'Petakan source of truth dan orkestrasi perubahan ke downstream system.','High',1.0,0,25,1,330,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rgt-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RGT','RGT.Q4',
'Apakah permintaan penghapusan/pemusnahan dapat dieksekusi dan dibuktikan pada sistem, arsip, backup, dan pihak ketiga sesuai kondisi yang berlaku?',
'Kelola pengecualian seperti legal hold secara terdokumentasi.',
'UU 27/2022 Pasal 9, Pasal 43–45',
'Deletion request log, legal hold record, purge evidence.',
'Data dapat tetap diproses meskipun sudah memenuhi kondisi penghapusan.',
'Integrasikan rights workflow dengan data lifecycle dan vendor deletion.','High',1.1,0,25,1,340,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rgt-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RGT','RGT.Q5',
'Apakah organisasi dapat menangani penarikan persetujuan serta permintaan penundaan atau pembatasan pemrosesan dalam waktu yang ditetapkan oleh UU?',
'Kemampuan operasional perlu mencakup stop-processing flag dan orkestrasi ke sistem terkait.',
'UU 27/2022 Pasal 40–41',
'Consent withdrawal log, suppression list, processing restriction log.',
'Pemrosesan dapat terus berjalan setelah permintaan yang sah diterima.',
'Bangun stop/restrict processing workflow yang terintegrasi dan dapat diaudit.','Critical',1.3,1,30,1,350,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rgt-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RGT','RGT.Q6',
'Apakah seluruh permintaan hak Subjek Data dipantau berdasarkan usia kasus, SLA internal, keputusan, pengecualian, dan bukti penyelesaian?',
'Gunakan dashboard operasional untuk mencegah request overdue.',
'UU 27/2022 Pasal 5–14',
'Case dashboard, SLA report, rejection rationale, closure evidence.',
'Keterlambatan dan keputusan yang tidak konsisten sulit dideteksi.',
'Implementasikan case metrics, QA review, dan escalation.','Medium',0.9,0,25,1,360,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

-- RSK: DPIA & High-Risk Processing
('pdp-q-rsk-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RSK','RSK.Q1',
'Apakah terdapat mekanisme screening untuk menentukan apakah suatu pemrosesan berpotensi risiko tinggi dan memerlukan penilaian dampak Pelindungan Data Pribadi?',
'Screening sebaiknya menjadi bagian product/change/vendor onboarding.',
'UU 27/2022 Pasal 34',
'DPIA screening checklist, change review, project intake.',
'Pemrosesan berisiko tinggi dapat diluncurkan tanpa penilaian dampak.',
'Terapkan DPIA screening pada proyek, produk, perubahan teknologi, dan pemrosesan baru.','Critical',1.5,1,30,1,410,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rsk-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RSK','RSK.Q2',
'Jika pemrosesan berisiko tinggi teridentifikasi, apakah DPIA dilakukan sebelum implementasi dan menghasilkan treatment, approval, serta bukti residual risk?',
'DPIA perlu menilai risiko terhadap hak Subjek Data dan langkah mitigasinya.',
'UU 27/2022 Pasal 34',
'DPIA report, risk treatment, approval, residual risk acceptance.',
'Risiko hak subjek data dapat tidak teridentifikasi atau tidak dimitigasi.',
'Standarkan DPIA method, treatment tracking, dan approval.','Critical',1.5,1,30,1,420,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rsk-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RSK','RSK.Q3',
'Apakah pemrosesan yang menggunakan pengambilan keputusan otomatis dengan akibat hukum atau dampak signifikan telah dipetakan dan dinilai risikonya?',
'Identifikasi scoring, profiling, fraud decisioning, eligibility, HR screening, dan penggunaan AI/ML yang relevan.',
'UU 27/2022 Pasal 10, Pasal 34',
'Automated decision inventory, model/process assessment, human review procedure.',
'Dampak signifikan terhadap individu dapat terjadi tanpa oversight memadai.',
'Inventaris automated decisioning dan tetapkan human oversight serta review risiko.','High',1.1,0,25,1,430,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rsk-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RSK','RSK.Q4',
'Apakah penggunaan teknologi baru yang memproses data pribadi melewati privacy-by-design review sebelum go-live?',
'Contoh: biometrik, AI, IoT, analytics, facial recognition, behavioral monitoring.',
'UU 27/2022 Pasal 34',
'Architecture review, privacy design checklist, security/privacy sign-off.',
'Teknologi baru dapat memperluas pemrosesan tanpa safeguards yang memadai.',
'Integrasikan privacy-by-design dan DPIA screening ke SDLC/change lifecycle.','High',1.1,0,25,1,440,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rsk-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RSK','RSK.Q5',
'Apakah pemrosesan skala besar atas Data Pribadi yang bersifat spesifik dan aktivitas pemantauan sistematis skala besar telah diidentifikasi secara eksplisit?',
'Gunakan inventory untuk menandai volume, sensitivitas, monitoring, dan affected population.',
'UU 27/2022 Pasal 34, Pasal 53',
'Risk inventory, DPO applicability assessment, DPIA screening.',
'Kewajiban DPIA dan/atau fungsi PDP dapat tidak terpicu karena karakter pemrosesan tidak dikenali.',
'Tandai high-risk processing attributes pada RoPA dan review berkala.','High',1.1,0,25,1,450,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-rsk-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','RSK','RSK.Q6',
'Apakah risiko privasi dari DPIA, audit, insiden, complaint, dan proyek dikelola dalam register dengan owner, target date, status, dan residual risk?',
'Hubungkan privacy risk dengan ERM/GRC bila tersedia.',
'UU 27/2022 Pasal 34, Pasal 47',
'Privacy risk register, remediation tracker, risk acceptance.',
'Risiko dapat diketahui tetapi tidak ditangani atau tidak memiliki owner.',
'Bangun privacy risk register dan governance remediation/acceptance.','High',1.0,0,25,1,460,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

-- TPR: Processors, Third Parties & Transfers
('pdp-q-tpr-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','TPR','TPR.Q1',
'Apakah seluruh Prosesor Data Pribadi dan pihak ketiga yang memproses data atas nama organisasi telah diinventarisasi dan melalui due diligence berbasis risiko?',
'Prioritaskan cloud/SaaS, payroll, marketing, call center, analytics, outsourcing, dan penyedia kritikal.',
'UU 27/2022 Pasal 51–52',
'Processor inventory, vendor due diligence, privacy/security assessment.',
'Organisasi dapat tidak mengetahui lokasi, tujuan, subprocessor, atau risiko pemrosesan oleh vendor.',
'Bangun processor inventory dan tiering berbasis risiko.','Critical',1.3,1,30,1,510,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-tpr-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','TPR','TPR.Q2',
'Apakah kontrak dengan Prosesor Data Pribadi memuat instruksi pemrosesan, kerahasiaan, keamanan, insiden, subprocessor, pengembalian/penghapusan data, dan bukti kepatuhan yang relevan?',
'Klausul disesuaikan dengan peran dan risiko; jangan sekadar template generik.',
'UU 27/2022 Pasal 51–52',
'DPA/data-processing clause, security schedule, breach clause, exit clause.',
'Instruksi dan tanggung jawab vendor dapat tidak jelas atau sulit ditegakkan.',
'Standarkan DPA dan clause library berbasis risk tier.','Critical',1.4,0,30,1,520,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-tpr-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','TPR','TPR.Q3',
'Apakah penggunaan subprocessor oleh vendor dikendalikan dan transparan sesuai pengaturan kontraktual yang berlaku?',
'Ketahui rantai pemrosesan dan lokasi data hingga subprocessor material.',
'UU 27/2022 Pasal 51',
'Subprocessor list, approval/change notice, contract clause.',
'Risiko dapat berpindah ke pihak yang tidak pernah dinilai organisasi.',
'Wajibkan transparansi dan mekanisme review perubahan subprocessor.','High',1.0,0,25,1,530,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-tpr-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','TPR','TPR.Q4',
'Apakah vendor dan Prosesor dipantau secara berkala berdasarkan risk tier, insiden, assurance, perubahan layanan, dan temuan audit?',
'Due diligence tidak berhenti setelah onboarding.',
'UU 27/2022 Pasal 37, Pasal 51–52',
'Periodic review, SOC/ISO evidence, issue tracker, vendor scorecard.',
'Penurunan posture vendor dapat tidak diketahui selama kontrak berjalan.',
'Terapkan continuous/periodic assurance berbasis risk tier.','High',1.0,0,25,1,540,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-tpr-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','TPR','TPR.Q5',
'Apakah transfer data kepada Pengendali lain di Indonesia memiliki tujuan, dasar, perlindungan, dan accountability yang terdokumentasi?',
'Pemetaan transfer harus mencakup recipient, purpose, data category, dan safeguards.',
'UU 27/2022 Pasal 55',
'Data sharing agreement, transfer register, RoPA.',
'Data dapat dibagikan tanpa governance dan perlindungan yang memadai.',
'Bangun data-sharing register dan approval untuk transfer domestik.','High',1.0,0,25,1,550,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-tpr-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','TPR','TPR.Q6',
'Jika terdapat transfer data ke luar wilayah Indonesia, apakah mekanisme transfer dinilai dan didokumentasikan sesuai urutan safeguard yang ditetapkan UU?',
'Evaluasi tingkat pelindungan negara penerima dan mekanisme safeguard yang relevan sebelum transfer.',
'UU 27/2022 Pasal 56',
'Cross-border transfer assessment, contract, recipient assessment, transfer register.',
'Transfer lintas negara dapat dilakukan tanpa safeguard yang dapat dipertanggungjawabkan.',
'Terapkan transfer impact/adequacy assessment dan approval sebelum cross-border transfer.','Critical',1.4,1,30,1,560,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

-- SEC: Security, Breach & Resilience
('pdp-q-sec-01','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','SEC','SEC.Q1',
'Apakah langkah teknis dan operasional keamanan data pribadi ditetapkan berdasarkan sifat data, risiko pemrosesan, dan tingkat keamanan yang dibutuhkan?',
'Nilai kebijakan dan implementasi kontrol, termasuk access, encryption, logging, endpoint, network, secure configuration, backup, dan vulnerability management.',
'UU 27/2022 Pasal 35–39',
'Security policy, control baseline, risk assessment, configurations, test records.',
'Data dapat terekspos karena pengamanan tidak proporsional dengan risiko.',
'Definisikan security baseline berbasis data classification dan risk.','Critical',1.5,1,30,1,610,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-sec-02','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','SEC','SEC.Q2',
'Apakah akses ke data pribadi mengikuti least privilege, strong authentication, periodic access review, dan segregation of duties yang relevan?',
'Periksa privileged access, shared account, dormant account, dan joiner-mover-leaver.',
'UU 27/2022 Pasal 35–39',
'IAM policy, access matrix, MFA evidence, access review, JML records.',
'Akses tidak sah dapat menyebabkan disclosure atau perubahan data.',
'Terapkan least privilege, MFA, PAM/JML, dan periodic recertification.','High',1.2,0,25,1,620,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-sec-03','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','SEC','SEC.Q3',
'Apakah keamanan sistem yang memproses data pribadi diuji dan dimonitor secara berkala melalui vulnerability management, logging, detection, backup/recovery test, dan assurance lainnya?',
'Fokus pada efektivitas, coverage, frequency, dan remediation.',
'UU 27/2022 Pasal 35–39',
'VA/PT report, SIEM logs, monitoring dashboard, backup restore test, remediation tracker.',
'Kelemahan teknis dapat tidak terdeteksi atau recovery tidak dapat diandalkan.',
'Terapkan security assurance cycle dan measurable remediation.','High',1.1,0,25,1,630,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-sec-04','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','SEC','SEC.Q4',
'Apakah terdapat prosedur insiden/kegagalan Pelindungan Data Pribadi yang mengatur triage, containment, assessment dampak, legal/privacy escalation, komunikasi, dan pemulihan?',
'Integrasikan cyber incident response dengan legal, privacy, risk, komunikasi, vendor, dan manajemen.',
'UU 27/2022 Pasal 46',
'Incident response plan, breach playbook, escalation matrix, exercise record.',
'Insiden dapat terlambat diidentifikasi, dinilai, atau dikomunikasikan.',
'Bangun personal-data breach playbook dan lakukan tabletop exercise.','Critical',1.5,0,30,1,640,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-sec-05','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','SEC','SEC.Q5',
'Apakah organisasi mampu menyiapkan dan menyampaikan pemberitahuan tertulis atas kegagalan Pelindungan Data Pribadi paling lambat 3x24 jam kepada pihak yang diwajibkan oleh UU?',
'Kesiapan mencakup deteksi awal, legal trigger, data yang harus dikomunikasikan, approval, evidence, dan jalur pemberitahuan.',
'UU 27/2022 Pasal 46',
'Breach notification SOP/template, contact matrix, timer/escalation, simulation.',
'Keterlambatan atau isi pemberitahuan yang tidak memadai dapat memperbesar dampak kepatuhan dan reputasi.',
'Tetapkan breach clock, template, ownership, escalation, dan exercise 3x24 jam.','Critical',1.6,1,30,1,650,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pdp-q-sec-06','UU-PDP-27-2022-RTI-1.0','PDP-2026.1','SEC','SEC.Q6',
'Apakah organisasi memelihara register insiden/kegagalan PDP, melakukan root-cause analysis, melacak corrective action, dan memasukkan lessons learned ke kontrol atau kebijakan?',
'Gunakan review pasca insiden untuk mencegah recurrence.',
'UU 27/2022 Pasal 46–47',
'Incident register, RCA, corrective action tracker, lessons learned.',
'Penyebab akar dapat berulang dan organisasi tidak dapat menunjukkan perbaikan berkelanjutan.',
'Formalize post-incident review, RCA, dan evidence-based closure.','High',1.0,0,25,1,660,'1.0',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO pdp_readiness_gates(key,label,question_id,minimum_score,evidence_minimum,sort_order,active) VALUES
('governance','Governance & Accountability','pdp-q-gov-01',75,'exists',10,1),
('inventory','Processing Inventory / RoPA','pdp-q-inv-01',75,'exists',20,1),
('legal_basis','Legal Basis & Transparency','pdp-q-lgl-01',75,'exists',30,1),
('rights','Data Subject Rights','pdp-q-rgt-01',75,'exists',40,1),
('dpia','DPIA / High-Risk Processing','pdp-q-rsk-01',75,'exists',50,1),
('third_party','Processor & Third-Party Governance','pdp-q-tpr-01',75,'exists',60,1),
('breach','Security & Breach Notification','pdp-q-sec-05',75,'exists',70,1);

INSERT OR IGNORE INTO pdp_service_mappings(id,domain_code,service_name,service_url_parameter,reason_template,priority_order,active) VALUES
('pdp-svc-gov','GOV','PDP Governance & DPO Advisory','PDP_CONSULTATION_URL','Governance/accountability gaps indicate a need for operating model, policy, role, and DPO-function support.',10,1),
('pdp-svc-inv','INV','RoPA & Data Mapping Workshop','PDP_CONSULTATION_URL','Inventory/lifecycle gaps indicate a need for processing inventory, data-flow mapping, retention, and deletion design.',20,1),
('pdp-svc-lgl','LGL','Privacy Notice, Legal Basis & Consent Review','PDP_CONSULTATION_URL','Legal-basis and transparency gaps require structured review with legal/privacy stakeholders.',30,1),
('pdp-svc-rgt','RGT','Data Subject Rights Workflow Design','PDP_CONSULTATION_URL','Rights-handling gaps indicate a need for request workflow, SLA, verification, and system orchestration.',40,1),
('pdp-svc-rsk','RSK','DPIA & Privacy-by-Design Implementation','PDP_CONSULTATION_URL','High-risk-processing gaps indicate a need for DPIA screening, assessment, and privacy-by-design integration.',50,1),
('pdp-svc-tpr','TPR','Third-Party Privacy & Cross-Border Transfer Review','PDP_CONSULTATION_URL','Processor/transfer gaps indicate a need for due diligence, contractual controls, monitoring, and transfer governance.',60,1),
('pdp-svc-sec','SEC','Privacy Security & Breach Readiness Assessment','PDP_CONSULTATION_URL','Security/breach gaps indicate a need for technical control validation and 3x24-hour breach-response readiness.',70,1);

INSERT OR IGNORE INTO system_parameters(group_key,value,label,description,sort_order,is_active,is_system,updated_at) VALUES
('pdp_readiness.scalar','PDP_QUICK_DURATION','7–10 menit','Duration label for the UU PDP Quick Scan.',10,1,1,CURRENT_TIMESTAMP),
('pdp_readiness.scalar','PDP_DETAILED_DURATION','20–35 menit','Duration label for the detailed UU PDP assessment.',20,1,1,CURRENT_TIMESTAMP),
('pdp_readiness.scalar','PDP_CONSULTATION_URL','/consultation','RTI consultation route used by PDP readiness CTA.',30,1,1,CURRENT_TIMESTAMP),
('pdp_readiness.scalar','PDP_REPORT_TITLE','RTI UU PDP Data Protection Readiness Assessment','Default report title.',40,1,1,CURRENT_TIMESTAMP),
('pdp_readiness.scalar','PDP_DISCLAIMER','Hasil assessment ini merupakan indikator kesiapan internal RTI berdasarkan jawaban dan evidence yang tersedia. Hasil ini bukan opini hukum, keputusan regulator, atau pernyataan kepatuhan resmi terhadap UU PDP.','Assessment disclaimer.',50,1,1,CURRENT_TIMESTAMP),
('pdp_readiness.scalar','PDP_LEGAL_BASELINE','UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, termasuk interpretasi Pasal 53 ayat (1) berdasarkan Putusan MK No. 151/PUU-XXII/2024.','Legal baseline shown in the PDP readiness tool.',60,1,1,CURRENT_TIMESTAMP);
