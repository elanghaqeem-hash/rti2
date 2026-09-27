-- RTI Enterprise Solution Finder
-- Configuration master data + operational assessment persistence.
-- This migration contains NO sample assessments, leads, clients, projects, or quotations.
-- INSERT statements below seed only system configuration required by the diagnostic engine.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprise_finder_questions (
  question_key TEXT PRIMARY KEY,
  step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 4),
  category TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (
    question_type IN ('single', 'multi', 'number', 'text', 'slider', 'matrix')
  ),
  label_id TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_id TEXT,
  description_en TEXT,
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
  condition_json TEXT,
  weight REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprise_finder_question_options (
  question_key TEXT NOT NULL,
  value TEXT NOT NULL,
  label_id TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_id TEXT,
  description_en TEXT,
  metadata_json TEXT,
  score REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (question_key, value),
  FOREIGN KEY (question_key) REFERENCES enterprise_finder_questions(question_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_finder_services (
  service_key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name_id TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_id TEXT NOT NULL,
  description_en TEXT NOT NULL,
  url TEXT NOT NULL,
  delivery_model TEXT NOT NULL,
  typical_duration TEXT NOT NULL,
  complexity TEXT NOT NULL CHECK (complexity IN ('Low', 'Moderate', 'High', 'Enterprise')),
  priority_weight REAL NOT NULL DEFAULT 10,
  diagnostic_tool_slug TEXT,
  outcomes_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprise_finder_service_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_key TEXT NOT NULL,
  dimension_type TEXT NOT NULL CHECK (
    dimension_type IN ('industry', 'scale', 'pressure', 'capability', 'objective', 'timeline', 'delivery', 'regulated')
  ),
  dimension_value TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  rationale_id TEXT,
  rationale_en TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (service_key) REFERENCES enterprise_finder_services(service_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_enterprise_finder_mapping_dimension
  ON enterprise_finder_service_mappings(dimension_type, dimension_value, is_active);

CREATE TABLE IF NOT EXISTS enterprise_finder_scoring_weights (
  weight_key TEXT PRIMARY KEY,
  weight_value REAL NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprise_finder_ai_prompts (
  prompt_key TEXT PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enterprise_finder_assessments (
  id TEXT PRIMARY KEY,
  resume_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'completed')),
  locale TEXT NOT NULL DEFAULT 'id' CHECK (locale IN ('id', 'en')),
  questionnaire_version INTEGER NOT NULL DEFAULT 1,
  scoring_version INTEGER NOT NULL DEFAULT 1,
  service_mapping_version INTEGER NOT NULL DEFAULT 1,
  ai_prompt_version INTEGER NOT NULL DEFAULT 1,
  organization_name TEXT,
  industry TEXT,
  organization_scale TEXT,
  digital_dependency TEXT,
  timeline TEXT,
  delivery_preference TEXT,
  complexity TEXT,
  result_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_enterprise_finder_assessments_created
  ON enterprise_finder_assessments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_finder_assessments_status
  ON enterprise_finder_assessments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_finder_answers (
  assessment_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (assessment_id, question_key),
  FOREIGN KEY (assessment_id) REFERENCES enterprise_finder_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_finder_recommendations (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  priority TEXT NOT NULL CHECK (priority IN ('IMMEDIATE', 'NEAR_TERM', 'MID_TERM', 'STRATEGIC')),
  reason TEXT NOT NULL,
  delivery_model TEXT NOT NULL,
  typical_duration TEXT NOT NULL,
  complexity TEXT NOT NULL,
  rank_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES enterprise_finder_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_key) REFERENCES enterprise_finder_services(service_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_finder_recommendations_assessment
  ON enterprise_finder_recommendations(assessment_id, rank_order);

CREATE TABLE IF NOT EXISTS enterprise_finder_events (
  id TEXT PRIMARY KEY,
  assessment_id TEXT,
  event_type TEXT NOT NULL,
  event_payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES enterprise_finder_assessments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_enterprise_finder_events_type_created
  ON enterprise_finder_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_key TEXT,
  old_value_json TEXT,
  new_value_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_key, created_at DESC);

-- Questions -----------------------------------------------------------------
INSERT OR IGNORE INTO enterprise_finder_questions
(question_key, step, category, question_type, label_id, label_en, description_id, description_en, required, condition_json, weight, sort_order, version, is_active, updated_at)
VALUES
('industry', 1, 'organization', 'single', 'Industri utama organisasi', 'Primary industry', 'Pilih sektor yang paling menggambarkan organisasi Anda.', 'Select the sector that best describes your organization.', 1, NULL, 1, 10, 1, 1, CURRENT_TIMESTAMP),
('organization_scale', 1, 'organization', 'single', 'Skala organisasi', 'Organization scale', 'Gunakan ukuran yang paling mendekati kondisi organisasi.', 'Choose the scale that most closely represents your organization.', 1, NULL, 1, 20, 1, 1, CURRENT_TIMESTAMP),
('regulated_status', 1, 'organization', 'single', 'Apakah organisasi berada di lingkungan yang diregulasi?', 'Does the organization operate in a regulated environment?', NULL, NULL, 1, NULL, 1, 30, 1, 1, CURRENT_TIMESTAMP),
('infrastructure', 2, 'technology', 'multi', 'Lingkungan infrastruktur utama', 'Primary infrastructure environment', 'Pilih semua yang relevan.', 'Select all that apply.', 1, NULL, 1, 10, 1, 1, CURRENT_TIMESTAMP),
('digital_dependency', 2, 'technology', 'single', 'Ketergantungan bisnis pada teknologi', 'Business dependency on technology', NULL, NULL, 1, NULL, 1.2, 20, 1, 1, CURRENT_TIMESTAMP),
('it_team_size', 2, 'technology', 'single', 'Ukuran tim TI', 'IT team size', NULL, NULL, 1, NULL, 0.8, 30, 1, 1, CURRENT_TIMESTAMP),
('cyber_team', 2, 'technology', 'single', 'Model kapabilitas cybersecurity saat ini', 'Current cybersecurity operating model', NULL, NULL, 1, NULL, 1, 40, 1, 1, CURRENT_TIMESTAMP),
('capabilities', 2, 'capability', 'matrix', 'Status kapabilitas saat ini', 'Current capability status', 'Nilai setiap kapabilitas yang relevan.', 'Rate the status of each relevant capability.', 1, NULL, 1.3, 50, 1, 1, CURRENT_TIMESTAMP),
('pressures', 3, 'pressure', 'multi', 'Apa yang mendorong perubahan?', 'What is driving change?', 'Pilih seluruh tantangan atau tekanan utama yang relevan.', 'Select all material challenges or pressures that apply.', 1, NULL, 1.5, 10, 1, 1, CURRENT_TIMESTAMP),
('pressure_rating', 3, 'pressure', 'matrix', 'Prioritaskan pressure yang dipilih', 'Prioritize selected pressures', 'Beri nilai Severity, Urgency, Business, Regulatory, Cyber dan Operational impact dari 1–5.', 'Rate Severity, Urgency, Business, Regulatory, Cyber and Operational impact from 1–5.', 1, '{"dependsOn":"pressures","operator":"not_empty"}', 1.5, 20, 1, 1, CURRENT_TIMESTAMP),
('data_breach_trigger', 3, 'trigger', 'multi', 'Detail insiden kebocoran data', 'Data breach incident details', 'Hanya muncul jika Data Breach dipilih.', 'Shown only when Data Breach is selected.', 0, '{"dependsOn":"pressures","operator":"contains","value":"data_breach"}', 1, 30, 1, 1, CURRENT_TIMESTAMP),
('iso27001_trigger', 3, 'trigger', 'multi', 'Kesiapan ISO/IEC 27001', 'ISO/IEC 27001 readiness context', 'Hanya muncul jika kebutuhan ISO 27001 dipilih.', 'Shown only when ISO 27001 is selected.', 0, '{"dependsOn":"pressures","operator":"contains","value":"iso_27001"}', 1, 40, 1, 1, CURRENT_TIMESTAMP),
('soc_trigger', 3, 'trigger', 'multi', 'Konteks kebutuhan SOC', 'SOC requirement context', 'Hanya muncul jika kebutuhan SOC/SIEM dipilih.', 'Shown only when SOC/SIEM need is selected.', 0, '{"dependsOn":"pressures","operator":"contains_any","value":["soc_requirement","siem_requirement"]}', 1, 50, 1, 1, CURRENT_TIMESTAMP),
('objective', 4, 'engagement', 'multi', 'Outcome utama yang ingin dicapai', 'Primary outcomes you want to achieve', NULL, NULL, 1, NULL, 1, 10, 1, 1, CURRENT_TIMESTAMP),
('target_timeline', 4, 'engagement', 'single', 'Target timeline', 'Target timeline', NULL, NULL, 1, NULL, 1.2, 20, 1, 1, CURRENT_TIMESTAMP),
('delivery_preference', 4, 'engagement', 'single', 'Preferensi model engagement', 'Preferred engagement model', NULL, NULL, 1, NULL, 0.8, 30, 1, 1, CURRENT_TIMESTAMP);

-- Options -------------------------------------------------------------------
INSERT OR IGNORE INTO enterprise_finder_question_options
(question_key, value, label_id, label_en, description_id, description_en, metadata_json, score, sort_order, is_active, updated_at)
VALUES
('industry','banking','Perbankan','Banking',NULL,NULL,'{"regulated":true}',0,10,1,CURRENT_TIMESTAMP),
('industry','islamic_banking','Perbankan Syariah','Islamic Banking',NULL,NULL,'{"regulated":true}',0,20,1,CURRENT_TIMESTAMP),
('industry','insurance','Asuransi','Insurance',NULL,NULL,'{"regulated":true}',0,30,1,CURRENT_TIMESTAMP),
('industry','securities','Sekuritas / Pasar Modal','Securities / Capital Market',NULL,NULL,'{"regulated":true}',0,40,1,CURRENT_TIMESTAMP),
('industry','multifinance','Multifinance','Multifinance',NULL,NULL,'{"regulated":true}',0,50,1,CURRENT_TIMESTAMP),
('industry','fintech','Fintech','Fintech',NULL,NULL,'{"regulated":true}',0,60,1,CURRENT_TIMESTAMP),
('industry','payment','Pembayaran','Payment',NULL,NULL,'{"regulated":true}',0,70,1,CURRENT_TIMESTAMP),
('industry','government','Pemerintah / Public Sector','Government / Public Sector',NULL,NULL,'{"regulated":true}',0,80,1,CURRENT_TIMESTAMP),
('industry','state_owned','BUMN / BUMD','State-Owned Enterprise',NULL,NULL,'{"regulated":true}',0,90,1,CURRENT_TIMESTAMP),
('industry','healthcare','Healthcare / Rumah Sakit','Healthcare / Hospital',NULL,NULL,'{}',0,100,1,CURRENT_TIMESTAMP),
('industry','manufacturing','Manufaktur','Manufacturing',NULL,NULL,'{}',0,110,1,CURRENT_TIMESTAMP),
('industry','oil_gas','Oil & Gas','Oil & Gas',NULL,NULL,'{}',0,120,1,CURRENT_TIMESTAMP),
('industry','mining','Pertambangan','Mining',NULL,NULL,'{}',0,130,1,CURRENT_TIMESTAMP),
('industry','energy','Energi / Utilities','Energy / Utilities',NULL,NULL,'{}',0,140,1,CURRENT_TIMESTAMP),
('industry','telco','Telekomunikasi','Telecommunications',NULL,NULL,'{}',0,150,1,CURRENT_TIMESTAMP),
('industry','technology','Teknologi / Digital Platform','Technology / Digital Platform',NULL,NULL,'{}',0,160,1,CURRENT_TIMESTAMP),
('industry','retail','Retail / E-Commerce','Retail / E-Commerce',NULL,NULL,'{}',0,170,1,CURRENT_TIMESTAMP),
('industry','logistics','Logistik / Transportasi','Logistics / Transportation',NULL,NULL,'{}',0,180,1,CURRENT_TIMESTAMP),
('industry','education','Pendidikan','Education',NULL,NULL,'{}',0,190,1,CURRENT_TIMESTAMP),
('industry','hospitality','Hospitality','Hospitality',NULL,NULL,'{}',0,200,1,CURRENT_TIMESTAMP),
('industry','professional_services','Professional Services','Professional Services',NULL,NULL,'{}',0,210,1,CURRENT_TIMESTAMP),
('industry','startup','Startup','Startup',NULL,NULL,'{}',0,220,1,CURRENT_TIMESTAMP),
('industry','other','Lainnya','Other',NULL,NULL,'{}',0,230,1,CURRENT_TIMESTAMP),

('organization_scale','micro','Micro','Micro',NULL,NULL,'{}',1,10,1,CURRENT_TIMESTAMP),
('organization_scale','small','Small','Small',NULL,NULL,'{}',2,20,1,CURRENT_TIMESTAMP),
('organization_scale','medium','Medium','Medium',NULL,NULL,'{}',3,30,1,CURRENT_TIMESTAMP),
('organization_scale','large','Large','Large',NULL,NULL,'{}',4,40,1,CURRENT_TIMESTAMP),
('organization_scale','enterprise','Enterprise','Enterprise',NULL,NULL,'{}',5,50,1,CURRENT_TIMESTAMP),
('organization_scale','conglomerate','Conglomerate / National Institution','Conglomerate / National Institution',NULL,NULL,'{}',6,60,1,CURRENT_TIMESTAMP),

('regulated_status','yes','Ya','Yes',NULL,NULL,'{}',1,10,1,CURRENT_TIMESTAMP),
('regulated_status','no','Tidak','No',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('regulated_status','unsure','Belum yakin','Not sure',NULL,NULL,'{}',0.5,30,1,CURRENT_TIMESTAMP),

('infrastructure','on_prem','On-Premise','On-Premise',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('infrastructure','private_cloud','Private Cloud','Private Cloud',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('infrastructure','public_cloud','Public Cloud','Public Cloud',NULL,NULL,'{}',0,30,1,CURRENT_TIMESTAMP),
('infrastructure','hybrid_cloud','Hybrid Cloud','Hybrid Cloud',NULL,NULL,'{}',0,40,1,CURRENT_TIMESTAMP),
('infrastructure','multi_cloud','Multi-Cloud','Multi-Cloud',NULL,NULL,'{}',0,50,1,CURRENT_TIMESTAMP),
('infrastructure','saas_heavy','SaaS-Heavy','SaaS-Heavy',NULL,NULL,'{}',0,60,1,CURRENT_TIMESTAMP),
('infrastructure','outsourced','Outsourced Infrastructure','Outsourced Infrastructure',NULL,NULL,'{}',0,70,1,CURRENT_TIMESTAMP),

('digital_dependency','low','Low','Low',NULL,NULL,'{}',1,10,1,CURRENT_TIMESTAMP),
('digital_dependency','moderate','Moderate','Moderate',NULL,NULL,'{}',2,20,1,CURRENT_TIMESTAMP),
('digital_dependency','high','High','High',NULL,NULL,'{}',3,30,1,CURRENT_TIMESTAMP),
('digital_dependency','very_high','Very High','Very High',NULL,NULL,'{}',4,40,1,CURRENT_TIMESTAMP),
('digital_dependency','mission_critical','Mission Critical','Mission Critical',NULL,NULL,'{}',5,50,1,CURRENT_TIMESTAMP),

('it_team_size','none','Tidak ada dedicated IT','No dedicated IT',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('it_team_size','lt5','< 5','< 5',NULL,NULL,'{}',1,20,1,CURRENT_TIMESTAMP),
('it_team_size','5_20','5–20','5–20',NULL,NULL,'{}',2,30,1,CURRENT_TIMESTAMP),
('it_team_size','21_50','21–50','21–50',NULL,NULL,'{}',3,40,1,CURRENT_TIMESTAMP),
('it_team_size','51_100','51–100','51–100',NULL,NULL,'{}',4,50,1,CURRENT_TIMESTAMP),
('it_team_size','gt100','> 100','> 100',NULL,NULL,'{}',5,60,1,CURRENT_TIMESTAMP),

('cyber_team','none','Belum ada','None',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('cyber_team','part_of_it','Bagian dari TI','Part of IT',NULL,NULL,'{}',1,20,1,CURRENT_TIMESTAMP),
('cyber_team','dedicated','Dedicated Security Team','Dedicated Security Team',NULL,NULL,'{}',2,30,1,CURRENT_TIMESTAMP),
('cyber_team','soc','SOC Internal','Internal SOC',NULL,NULL,'{}',3,40,1,CURRENT_TIMESTAMP),
('cyber_team','mssp','MSSP','MSSP',NULL,NULL,'{}',3,50,1,CURRENT_TIMESTAMP),
('cyber_team','hybrid_soc','Hybrid SOC','Hybrid SOC',NULL,NULL,'{}',4,60,1,CURRENT_TIMESTAMP),

('capabilities','it_governance','IT Governance','IT Governance',NULL,NULL,'{"category":"Governance"}',0,10,1,CURRENT_TIMESTAMP),
('capabilities','it_strategy','IT Strategy','IT Strategy',NULL,NULL,'{"category":"Governance"}',0,20,1,CURRENT_TIMESTAMP),
('capabilities','enterprise_architecture','Enterprise Architecture','Enterprise Architecture',NULL,NULL,'{"category":"Technology"}',0,30,1,CURRENT_TIMESTAMP),
('capabilities','cyber_program','Cybersecurity Program','Cybersecurity Program',NULL,NULL,'{"category":"Cybersecurity"}',0,40,1,CURRENT_TIMESTAMP),
('capabilities','soc','SOC','SOC',NULL,NULL,'{"category":"Cybersecurity"}',0,50,1,CURRENT_TIMESTAMP),
('capabilities','siem','SIEM','SIEM',NULL,NULL,'{"category":"Cybersecurity"}',0,60,1,CURRENT_TIMESTAMP),
('capabilities','edr_xdr','EDR / XDR','EDR / XDR',NULL,NULL,'{"category":"Cybersecurity"}',0,70,1,CURRENT_TIMESTAMP),
('capabilities','vulnerability_management','Vulnerability Management','Vulnerability Management',NULL,NULL,'{"category":"Cybersecurity"}',0,80,1,CURRENT_TIMESTAMP),
('capabilities','penetration_testing','Penetration Testing','Penetration Testing',NULL,NULL,'{"category":"Cybersecurity"}',0,90,1,CURRENT_TIMESTAMP),
('capabilities','incident_response','Incident Response','Incident Response',NULL,NULL,'{"category":"Cybersecurity"}',0,100,1,CURRENT_TIMESTAMP),
('capabilities','threat_intelligence','Threat Intelligence','Threat Intelligence',NULL,NULL,'{"category":"Cybersecurity"}',0,110,1,CURRENT_TIMESTAMP),
('capabilities','bcm_bcp','BCM / BCP','BCM / BCP',NULL,NULL,'{"category":"Resilience"}',0,120,1,CURRENT_TIMESTAMP),
('capabilities','disaster_recovery','Disaster Recovery','Disaster Recovery',NULL,NULL,'{"category":"Resilience"}',0,130,1,CURRENT_TIMESTAMP),
('capabilities','data_protection','Data Protection','Data Protection',NULL,NULL,'{"category":"Privacy"}',0,140,1,CURRENT_TIMESTAMP),
('capabilities','privacy_governance','Privacy Governance','Privacy Governance',NULL,NULL,'{"category":"Privacy"}',0,150,1,CURRENT_TIMESTAMP),
('capabilities','iso27001','ISO/IEC 27001','ISO/IEC 27001',NULL,NULL,'{"category":"ISO"}',0,160,1,CURRENT_TIMESTAMP),
('capabilities','iso27701','ISO/IEC 27701','ISO/IEC 27701',NULL,NULL,'{"category":"ISO"}',0,170,1,CURRENT_TIMESTAMP),
('capabilities','risk_management','Risk Management','Risk Management',NULL,NULL,'{"category":"GRC"}',0,180,1,CURRENT_TIMESTAMP),
('capabilities','grc','GRC','GRC',NULL,NULL,'{"category":"GRC"}',0,190,1,CURRENT_TIMESTAMP),
('capabilities','internal_audit','Internal Audit','Internal Audit',NULL,NULL,'{"category":"GRC"}',0,200,1,CURRENT_TIMESTAMP),
('capabilities','it_audit','IT Audit','IT Audit',NULL,NULL,'{"category":"GRC"}',0,210,1,CURRENT_TIMESTAMP),
('capabilities','policy_sop','Policies / SOP','Policies / SOP',NULL,NULL,'{"category":"Governance"}',0,220,1,CURRENT_TIMESTAMP),
('capabilities','security_awareness','Security Awareness','Security Awareness',NULL,NULL,'{"category":"People"}',0,230,1,CURRENT_TIMESTAMP),
('capabilities','data_governance','Data Governance','Data Governance',NULL,NULL,'{"category":"Governance"}',0,240,1,CURRENT_TIMESTAMP),
('capabilities','vendor_risk','Vendor Risk Management','Vendor Risk Management',NULL,NULL,'{"category":"GRC"}',0,250,1,CURRENT_TIMESTAMP),
('capabilities','application_security','Application Security','Application Security',NULL,NULL,'{"category":"Cybersecurity"}',0,260,1,CURRENT_TIMESTAMP),
('capabilities','secure_sdlc','Secure SDLC','Secure SDLC',NULL,NULL,'{"category":"Cybersecurity"}',0,270,1,CURRENT_TIMESTAMP),

('pressures','legacy_systems','Legacy systems','Legacy systems',NULL,NULL,'{"category":"Digital Transformation"}',0,10,1,CURRENT_TIMESTAMP),
('pressures','manual_processes','Proses manual','Manual processes',NULL,NULL,'{"category":"Digital Transformation"}',0,20,1,CURRENT_TIMESTAMP),
('pressures','fragmented_apps','Aplikasi terfragmentasi','Fragmented applications',NULL,NULL,'{"category":"Digital Transformation"}',0,30,1,CURRENT_TIMESTAMP),
('pressures','poor_integration','Integrasi sistem lemah','Poor system integration',NULL,NULL,'{"category":"Digital Transformation"}',0,40,1,CURRENT_TIMESTAMP),
('pressures','digital_transformation','Digital transformation','Digital transformation',NULL,NULL,'{"category":"Digital Transformation"}',0,50,1,CURRENT_TIMESTAMP),
('pressures','automation','Kebutuhan otomasi','Automation requirements',NULL,NULL,'{"category":"Digital Transformation"}',0,60,1,CURRENT_TIMESTAMP),
('pressures','technology_roadmap','Technology roadmap belum jelas','Technology roadmap unclear',NULL,NULL,'{"category":"Digital Transformation"}',0,70,1,CURRENT_TIMESTAMP),

('pressures','cyberattack_concern','Kekhawatiran serangan siber','Cyberattack concern',NULL,NULL,'{"category":"Cybersecurity"}',0,100,1,CURRENT_TIMESTAMP),
('pressures','ransomware','Ransomware','Ransomware',NULL,NULL,'{"category":"Cybersecurity"}',0,110,1,CURRENT_TIMESTAMP),
('pressures','phishing','Phishing','Phishing',NULL,NULL,'{"category":"Cybersecurity"}',0,120,1,CURRENT_TIMESTAMP),
('pressures','security_incident','Security incident','Security incident',NULL,NULL,'{"category":"Cybersecurity"}',0,130,1,CURRENT_TIMESTAMP),
('pressures','data_breach','Data breach','Data breach',NULL,NULL,'{"category":"Cybersecurity"}',0,140,1,CURRENT_TIMESTAMP),
('pressures','security_visibility','Security visibility rendah','Low security visibility',NULL,NULL,'{"category":"Cybersecurity"}',0,150,1,CURRENT_TIMESTAMP),
('pressures','soc_requirement','Kebutuhan SOC','SOC requirement',NULL,NULL,'{"category":"Cybersecurity"}',0,160,1,CURRENT_TIMESTAMP),
('pressures','siem_requirement','Kebutuhan SIEM','SIEM requirement',NULL,NULL,'{"category":"Cybersecurity"}',0,170,1,CURRENT_TIMESTAMP),
('pressures','incident_response','Incident response','Incident response',NULL,NULL,'{"category":"Cybersecurity"}',0,180,1,CURRENT_TIMESTAMP),
('pressures','vulnerability','Vulnerability exposure','Vulnerability exposure',NULL,NULL,'{"category":"Cybersecurity"}',0,190,1,CURRENT_TIMESTAMP),
('pressures','penetration_testing','Kebutuhan penetration testing','Penetration testing requirement',NULL,NULL,'{"category":"Cybersecurity"}',0,200,1,CURRENT_TIMESTAMP),
('pressures','threat_intelligence','Threat intelligence','Threat intelligence',NULL,NULL,'{"category":"Cybersecurity"}',0,210,1,CURRENT_TIMESTAMP),

('pressures','weak_governance','Governance lemah','Weak governance',NULL,NULL,'{"category":"Governance"}',0,300,1,CURRENT_TIMESTAMP),
('pressures','unclear_accountability','Akuntabilitas belum jelas','Unclear accountability',NULL,NULL,'{"category":"Governance"}',0,310,1,CURRENT_TIMESTAMP),
('pressures','outdated_policies','Policy/SOP usang','Outdated policies / SOP',NULL,NULL,'{"category":"Governance"}',0,320,1,CURRENT_TIMESTAMP),
('pressures','audit_findings','Temuan audit','Audit findings',NULL,NULL,'{"category":"Governance"}',0,330,1,CURRENT_TIMESTAMP),
('pressures','internal_control','Kelemahan internal control','Internal control weakness',NULL,NULL,'{"category":"Governance"}',0,340,1,CURRENT_TIMESTAMP),
('pressures','grc_implementation','Kebutuhan implementasi GRC','GRC implementation',NULL,NULL,'{"category":"Governance"}',0,350,1,CURRENT_TIMESTAMP),

('pressures','regulatory_exam','Regulatory examination','Regulatory examination',NULL,NULL,'{"category":"Regulation"}',0,400,1,CURRENT_TIMESTAMP),
('pressures','upcoming_audit','Audit mendatang','Upcoming audit',NULL,NULL,'{"category":"Regulation"}',0,410,1,CURRENT_TIMESTAMP),
('pressures','certification','Kebutuhan sertifikasi','Certification requirements',NULL,NULL,'{"category":"Regulation"}',0,420,1,CURRENT_TIMESTAMP),
('pressures','data_privacy','Kebutuhan data privacy','Data privacy requirements',NULL,NULL,'{"category":"Regulation"}',0,430,1,CURRENT_TIMESTAMP),
('pressures','iso_27001','ISO/IEC 27001 readiness','ISO/IEC 27001 readiness',NULL,NULL,'{"category":"Regulation"}',0,440,1,CURRENT_TIMESTAMP),
('pressures','pdp_compliance','Kepatuhan UU PDP','UU PDP compliance',NULL,NULL,'{"category":"Regulation"}',0,450,1,CURRENT_TIMESTAMP),

('pressures','business_interruption','Gangguan bisnis','Business interruption',NULL,NULL,'{"category":"Resilience"}',0,500,1,CURRENT_TIMESTAMP),
('pressures','disaster_recovery','Kekhawatiran disaster recovery','Disaster recovery concern',NULL,NULL,'{"category":"Resilience"}',0,510,1,CURRENT_TIMESTAMP),
('pressures','bcp_gap','BCP gap','BCP gap',NULL,NULL,'{"category":"Resilience"}',0,520,1,CURRENT_TIMESTAMP),
('pressures','cyber_resilience','Cyber resilience','Cyber resilience',NULL,NULL,'{"category":"Resilience"}',0,530,1,CURRENT_TIMESTAMP),
('pressures','crisis_management','Crisis management','Crisis management',NULL,NULL,'{"category":"Resilience"}',0,540,1,CURRENT_TIMESTAMP),

('pressures','insufficient_it','Kapasitas resource TI terbatas','Insufficient IT resources',NULL,NULL,'{"category":"Technology"}',0,600,1,CURRENT_TIMESTAMP),
('pressures','skill_gap','Skill gap','Skill gap',NULL,NULL,'{"category":"People"}',0,610,1,CURRENT_TIMESTAMP),
('pressures','architecture_issue','Masalah arsitektur','Architecture issues',NULL,NULL,'{"category":"Technology"}',0,620,1,CURRENT_TIMESTAMP),
('pressures','system_performance','Kinerja sistem','System performance',NULL,NULL,'{"category":"Technology"}',0,630,1,CURRENT_TIMESTAMP),
('pressures','infrastructure_modernization','Modernisasi infrastruktur','Infrastructure modernization',NULL,NULL,'{"category":"Technology"}',0,640,1,CURRENT_TIMESTAMP),
('pressures','cloud_migration','Cloud migration','Cloud migration',NULL,NULL,'{"category":"Technology"}',0,650,1,CURRENT_TIMESTAMP),
('pressures','system_development','Kebutuhan pengembangan sistem','System development requirement',NULL,NULL,'{"category":"Technology"}',0,660,1,CURRENT_TIMESTAMP),
('pressures','cyber_awareness','Cybersecurity awareness','Cybersecurity awareness',NULL,NULL,'{"category":"People"}',0,700,1,CURRENT_TIMESTAMP),
('pressures','employee_security','Perilaku keamanan karyawan','Employee security behavior',NULL,NULL,'{"category":"People"}',0,710,1,CURRENT_TIMESTAMP),

('objective','solve_immediate','Selesaikan masalah segera','Solve immediate problem',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('objective','reduce_cyber_risk','Kurangi cyber risk','Reduce cyber risk',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('objective','meet_regulatory','Penuhi requirement regulasi','Meet regulatory requirement',NULL,NULL,'{}',0,30,1,CURRENT_TIMESTAMP),
('objective','prepare_certification','Persiapkan sertifikasi','Prepare certification',NULL,NULL,'{}',0,40,1,CURRENT_TIMESTAMP),
('objective','improve_governance','Perkuat governance','Improve governance',NULL,NULL,'{}',0,50,1,CURRENT_TIMESTAMP),
('objective','modernize_technology','Modernisasi teknologi','Modernize technology',NULL,NULL,'{}',0,60,1,CURRENT_TIMESTAMP),
('objective','improve_resilience','Perkuat operational resilience','Improve operational resilience',NULL,NULL,'{}',0,70,1,CURRENT_TIMESTAMP),
('objective','build_cyber_capability','Bangun kapabilitas cybersecurity','Build cybersecurity capability',NULL,NULL,'{}',0,80,1,CURRENT_TIMESTAMP),
('objective','outsource_capability','Outsource capability teknologi','Outsource technology capability',NULL,NULL,'{}',0,90,1,CURRENT_TIMESTAMP),
('objective','develop_internal','Kembangkan kapabilitas internal','Develop internal capability',NULL,NULL,'{}',0,100,1,CURRENT_TIMESTAMP),
('objective','audit_readiness','Perkuat audit readiness','Improve audit readiness',NULL,NULL,'{}',0,110,1,CURRENT_TIMESTAMP),
('objective','digital_platform','Bangun digital platform','Develop digital platform',NULL,NULL,'{}',0,120,1,CURRENT_TIMESTAMP),

('target_timeline','emergency','Emergency / Immediately','Emergency / Immediately',NULL,NULL,'{}',5,10,1,CURRENT_TIMESTAMP),
('target_timeline','lt30','< 30 Hari','< 30 Days',NULL,NULL,'{}',5,20,1,CURRENT_TIMESTAMP),
('target_timeline','1_3_months','1–3 Bulan','1–3 Months',NULL,NULL,'{}',4,30,1,CURRENT_TIMESTAMP),
('target_timeline','3_6_months','3–6 Bulan','3–6 Months',NULL,NULL,'{}',3,40,1,CURRENT_TIMESTAMP),
('target_timeline','6_12_months','6–12 Bulan','6–12 Months',NULL,NULL,'{}',2,50,1,CURRENT_TIMESTAMP),
('target_timeline','gt12','> 12 Bulan','> 12 Months',NULL,NULL,'{}',1,60,1,CURRENT_TIMESTAMP),
('target_timeline','exploring','Eksplorasi opsi','Exploring Options',NULL,NULL,'{}',0,70,1,CURRENT_TIMESTAMP),

('delivery_preference','advisory','Advisory','Advisory',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('delivery_preference','project','Project','Project',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('delivery_preference','managed_service','Managed Service','Managed Service',NULL,NULL,'{}',0,30,1,CURRENT_TIMESTAMP),
('delivery_preference','assessment','Assessment','Assessment',NULL,NULL,'{}',0,40,1,CURRENT_TIMESTAMP),
('delivery_preference','training','Training','Training',NULL,NULL,'{}',0,50,1,CURRENT_TIMESTAMP),
('delivery_preference','technology_implementation','Technology Implementation','Technology Implementation',NULL,NULL,'{}',0,60,1,CURRENT_TIMESTAMP),
('delivery_preference','staff_augmentation','Staff Augmentation','Staff Augmentation',NULL,NULL,'{}',0,70,1,CURRENT_TIMESTAMP),
('delivery_preference','hybrid','Hybrid','Hybrid',NULL,NULL,'{}',0,80,1,CURRENT_TIMESTAMP),

('data_breach_trigger','contained','Insiden telah di-contain','Incident has been contained',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('data_breach_trigger','investigation_ongoing','Investigasi masih berjalan','Investigation is ongoing',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('data_breach_trigger','personal_data','Melibatkan data pribadi/sensitif','Sensitive/personal data may be involved',NULL,NULL,'{}',0,30,1,CURRENT_TIMESTAMP),
('data_breach_trigger','management_informed','Manajemen telah diinformasikan','Management has been informed',NULL,NULL,'{}',0,40,1,CURRENT_TIMESTAMP),
('data_breach_trigger','forensic_required','Memerlukan digital forensics','Digital forensics may be required',NULL,NULL,'{}',0,50,1,CURRENT_TIMESTAMP),

('iso27001_trigger','isms_exists','ISMS sudah tersedia','ISMS already established',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('iso27001_trigger','scope_defined','Scope telah didefinisikan','Scope has been defined',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('iso27001_trigger','risk_assessment','Risk assessment tersedia','Risk assessment is available',NULL,NULL,'{}',0,30,1,CURRENT_TIMESTAMP),
('iso27001_trigger','policies_documented','Policy telah terdokumentasi','Policies are documented',NULL,NULL,'{}',0,40,1,CURRENT_TIMESTAMP),

('soc_trigger','soc_exists','SOC sudah tersedia','SOC already exists',NULL,NULL,'{}',0,10,1,CURRENT_TIMESTAMP),
('soc_trigger','siem_exists','SIEM sudah tersedia','SIEM already exists',NULL,NULL,'{}',0,20,1,CURRENT_TIMESTAMP),
('soc_trigger','needs_24x7','Butuh coverage 24x7','Requires 24x7 coverage',NULL,NULL,'{}',0,30,1,CURRENT_TIMESTAMP),
('soc_trigger','cloud_monitoring','Butuh monitoring cloud','Cloud monitoring is required',NULL,NULL,'{}',0,40,1,CURRENT_TIMESTAMP);

-- Service library -----------------------------------------------------------
INSERT OR IGNORE INTO enterprise_finder_services
(service_key, category, name_id, name_en, description_id, description_en, url, delivery_model, typical_duration, complexity, priority_weight, diagnostic_tool_slug, outcomes_json, is_active, version, updated_at)
VALUES
('technology_advisory','Technology','Technology Advisory & Strategy','Technology Advisory & Strategy','Penyelarasan strategi bisnis, operating model, investasi TI, dan roadmap teknologi.','Align business strategy, technology operating model, investment and roadmap.','/services/technology-advisory','Advisory','4–8 weeks','Moderate',14,'maturity-assessment','["Technology roadmap","Investment priorities","Target operating model"]',1,1,CURRENT_TIMESTAMP),
('technology_blueprint','Technology','Technology Blueprint & Enterprise Architecture','Technology Blueprint & Enterprise Architecture','Blueprint arsitektur, integrasi, data, cloud dan rencana investasi multi-tahun.','Enterprise architecture, integration, data, cloud and multi-year investment blueprint.','/services/technology-blueprint','Advisory','6–12 weeks','High',15,'maturity-assessment','["Target architecture","IT master plan","Transformation roadmap"]',1,1,CURRENT_TIMESTAMP),
('software_development','Technology','Software Development','Software Development','Pengembangan aplikasi enterprise, web/mobile/API, integrasi dan modernisasi legacy.','Enterprise application, web/mobile/API, integration and legacy modernization.','/services/software-development','Project','8–32 weeks','High',12,'project-estimator','["Secure digital platform","System integration","Delivery roadmap"]',1,1,CURRENT_TIMESTAMP),
('technology_support','Technology','Technology Operations & Support','Technology Operations & Support','Managed technology operations, cloud, reliability dan incident management.','Managed technology operations, cloud, reliability and incident management.','/services/technology-support','Managed Service','Ongoing','High',10,NULL,'["Operational reliability","Monitoring","Incident response"]',1,1,CURRENT_TIMESTAMP),

('cyber_maturity','Cybersecurity','Cybersecurity Maturity Assessment','Cybersecurity Maturity Assessment','Baseline maturity, risk exposure, gap dan cyber transformation roadmap.','Cyber maturity baseline, risk exposure, gaps and transformation roadmap.','/services/maturity-assessment','Assessment','2–6 weeks','Moderate',16,'maturity-assessment','["Maturity baseline","Gap analysis","Prioritized roadmap"]',1,1,CURRENT_TIMESTAMP),
('vapt','Cybersecurity','Vulnerability Assessment & Penetration Testing','Vulnerability Assessment & Penetration Testing','Validasi attack surface dan exploitability secara terstruktur.','Structured validation of attack surface and exploitability.','/services/cybersecurity/offensive','Assessment','2–6 weeks','Moderate',15,'cyber-quick-check','["Validated findings","Remediation priorities","Retest evidence"]',1,1,CURRENT_TIMESTAMP),
('soc_mdr','Cybersecurity','SOC / Managed Detection & Response','SOC / Managed Detection & Response','Monitoring, detection, triage dan response berkelanjutan.','Continuous monitoring, detection, triage and response.','/services/cybersecurity/defensive','Managed Service','Ongoing','Enterprise',16,'cyber-quick-check','["Security visibility","Threat detection","Response workflow"]',1,1,CURRENT_TIMESTAMP),
('siem','Cybersecurity','SIEM Engineering & Implementation','SIEM Engineering & Implementation','Implementasi telemetry, correlation, use case dan log governance.','Telemetry, correlation, use cases and log governance implementation.','/services/cybersecurity/defensive','Technology Implementation','6–16 weeks','High',14,'cyber-quick-check','["Centralized telemetry","Detection use cases","Log governance"]',1,1,CURRENT_TIMESTAMP),
('incident_response','Cybersecurity','Incident Response & DFIR','Incident Response & DFIR','Containment, investigation, evidence preservation dan recovery advisory.','Containment, investigation, evidence preservation and recovery advisory.','/services/cybersecurity/defensive','Project','Immediate–6 weeks','High',18,'cyber-quick-check','["Incident containment","Forensic findings","Recovery actions"]',1,1,CURRENT_TIMESTAMP),
('threat_intelligence','Cybersecurity','Threat Intelligence & Attack Surface Management','Threat Intelligence & Attack Surface Management','Intelligence ancaman, external exposure dan prioritasi defensive action.','Threat intelligence, external exposure and defensive action prioritization.','/services/cybersecurity/defensive','Managed Service','Ongoing','High',12,'cyber-quick-check','["Threat context","Exposure monitoring","Prioritized actions"]',1,1,CURRENT_TIMESTAMP),
('cyber_governance','Cybersecurity','Cybersecurity Governance','Cybersecurity Governance','Governance, policy, risk ownership dan security program alignment.','Governance, policy, risk ownership and security program alignment.','/services/cybersecurity/governance','Advisory','6–16 weeks','High',15,'cyber-quick-check','["Governance model","Security policies","Risk roadmap"]',1,1,CURRENT_TIMESTAMP),

('grc','GRC','Integrated GRC Implementation','Integrated GRC Implementation','Integrasi risk, control, compliance, issue dan assurance workflow.','Integrated risk, control, compliance, issue and assurance workflow.','/services/policy-sop-governance','Project','8–24 weeks','Enterprise',14,NULL,'["Unified GRC model","Control visibility","Issue workflow"]',1,1,CURRENT_TIMESTAMP),
('risk_management','GRC','Enterprise & Technology Risk Management','Enterprise & Technology Risk Management','Framework risk, taxonomy, appetite, RCSA/KRI dan reporting.','Risk framework, taxonomy, appetite, RCSA/KRI and reporting.','/services/policy-sop-governance','Advisory','6–16 weeks','High',13,NULL,'["Risk framework","RCSA/KRI","Management reporting"]',1,1,CURRENT_TIMESTAMP),
('internal_control','GRC','Internal Control & ICOFR Advisory','Internal Control & ICOFR Advisory','Process-control mapping, control design, testing readiness dan remediation.','Process-control mapping, control design, testing readiness and remediation.','/services/policy-sop-governance','Advisory','8–20 weeks','High',13,NULL,'["Control framework","RCM","Remediation roadmap"]',1,1,CURRENT_TIMESTAMP),
('audit_readiness','GRC','Internal / IT Audit Readiness','Internal / IT Audit Readiness','Assessment evidence, control readiness dan closure temuan audit.','Evidence assessment, control readiness and audit finding closure.','/services/policy-sop-governance','Assessment','3–8 weeks','Moderate',13,NULL,'["Evidence readiness","Gap register","Closure plan"]',1,1,CURRENT_TIMESTAMP),
('policy_sop','Governance','Policy, SOP & Governance','Policy, SOP & Governance','Penyusunan governance framework, policy, standard dan SOP yang operasional.','Practical governance framework, policy, standard and SOP development.','/services/policy-sop-governance','Advisory','4–12 weeks','Moderate',12,NULL,'["Policy framework","Operational SOP","Accountability model"]',1,1,CURRENT_TIMESTAMP),

('pdp_readiness','Privacy','UU PDP Data Protection Readiness','UU PDP Data Protection Readiness','Privacy diagnostic, gap, RoPA/DPIA/DPO dan roadmap pelindungan data.','Privacy diagnostic, gaps, RoPA/DPIA/DPO and data protection roadmap.','/tools/pdp-readiness','Assessment','2–6 weeks','Moderate',16,'pdp-readiness','["Privacy gaps","RoPA/DPIA priorities","Implementation roadmap"]',1,1,CURRENT_TIMESTAMP),
('privacy_governance','Privacy','Privacy Governance & DPO Advisory','Privacy Governance & DPO Advisory','Governance privacy, data subject rights, DPO, RoPA, DPIA dan control implementation.','Privacy governance, data subject rights, DPO, RoPA, DPIA and control implementation.','/services/policy-sop-governance','Advisory','6–16 weeks','High',14,'pdp-readiness','["Privacy governance","DPO model","RoPA/DPIA"]',1,1,CURRENT_TIMESTAMP),

('iso27001','ISO','ISO/IEC 27001 Readiness & Implementation','ISO/IEC 27001 Readiness & Implementation','Readiness assessment dan implementasi ISMS menuju audit sertifikasi pihak ketiga.','Readiness assessment and ISMS implementation toward third-party certification audit.','/services/iso-standards','Advisory','3–9 months','High',16,'iso27001-readiness','["ISMS scope","Risk treatment","Certification readiness"]',1,1,CURRENT_TIMESTAMP),
('iso22301','ISO','ISO 22301 / Business Continuity Management','ISO 22301 / Business Continuity Management','BCMS, BIA, strategy, plan, exercise dan continual improvement.','BCMS, BIA, strategy, plans, exercises and continual improvement.','/services/iso-standards','Advisory','3–9 months','High',13,NULL,'["BCMS framework","BIA","BCP exercise"]',1,1,CURRENT_TIMESTAMP),
('iso27701','ISO','ISO/IEC 27701 Privacy Information Management','ISO/IEC 27701 Privacy Information Management','Extension privacy information management terintegrasi dengan ISMS.','Privacy information management extension integrated with ISMS.','/services/iso-standards','Advisory','3–9 months','High',12,'pdp-readiness','["PIMS framework","Privacy controls","Audit readiness"]',1,1,CURRENT_TIMESTAMP),

('bcm','Resilience','Business Continuity & Disaster Recovery','Business Continuity & Disaster Recovery','BIA, BCM/BCP/DRP, exercise, recovery strategy dan resilience governance.','BIA, BCM/BCP/DRP, exercises, recovery strategy and resilience governance.','/services/policy-sop-governance','Advisory','8–20 weeks','High',15,NULL,'["BIA","Recovery strategy","BCP/DRP"]',1,1,CURRENT_TIMESTAMP),
('crisis_management','Resilience','Cyber Crisis & Crisis Management','Cyber Crisis & Crisis Management','Crisis governance, escalation, communication dan tabletop simulation.','Crisis governance, escalation, communication and tabletop simulation.','/services/cybersecurity/governance','Advisory','3–8 weeks','Moderate',12,NULL,'["Crisis playbook","Escalation model","Tabletop exercise"]',1,1,CURRENT_TIMESTAMP),

('security_awareness','Training','Cybersecurity Awareness & Simulation','Cybersecurity Awareness & Simulation','Program awareness berbasis risiko, phishing simulation dan behavior reinforcement.','Risk-based awareness, phishing simulation and behavior reinforcement.','/services/training-awareness','Training','1 day–12 months','Moderate',12,NULL,'["Awareness uplift","Behavior metrics","Role-based learning"]',1,1,CURRENT_TIMESTAMP),
('secure_coding_training','Training','Secure Coding Training','Secure Coding Training','Pelatihan secure SDLC, OWASP, code review dan developer security practices.','Secure SDLC, OWASP, code review and developer security training.','/services/training-awareness','Training','1–5 days','Moderate',10,NULL,'["Developer capability","Secure SDLC practices","Reduced recurring defects"]',1,1,CURRENT_TIMESTAMP),
('governance_training','Training','IT Governance, Risk & Audit Training','IT Governance, Risk & Audit Training','Capability development bagi governance, risk, compliance dan internal audit.','Capability development for governance, risk, compliance and internal audit teams.','/services/training-awareness','Training','1–5 days','Moderate',10,NULL,'["Practical capability","Common methodology","Implementation templates"]',1,1,CURRENT_TIMESTAMP);

-- Explainable mapping rules -----------------------------------------------
INSERT OR IGNORE INTO enterprise_finder_service_mappings
(service_key, dimension_type, dimension_value, weight, rationale_id, rationale_en, is_active, version, updated_at)
VALUES
('technology_blueprint','pressure','legacy_systems',24,'Legacy membutuhkan target architecture dan roadmap transisi.','Legacy environments benefit from a target architecture and transition roadmap.',1,1,CURRENT_TIMESTAMP),
('technology_blueprint','pressure','fragmented_apps',22,'Fragmentasi aplikasi membutuhkan enterprise architecture dan integration blueprint.','Application fragmentation requires enterprise architecture and integration blueprint.',1,1,CURRENT_TIMESTAMP),
('technology_blueprint','pressure','poor_integration',24,'Integrasi lemah membutuhkan blueprint API, middleware dan data flow.','Weak integration requires API, middleware and data-flow blueprinting.',1,1,CURRENT_TIMESTAMP),
('technology_blueprint','pressure','technology_roadmap',28,'Roadmap yang belum jelas merupakan trigger langsung untuk technology blueprint.','An unclear technology roadmap directly supports a technology blueprint engagement.',1,1,CURRENT_TIMESTAMP),
('technology_advisory','pressure','digital_transformation',24,'Transformasi digital memerlukan business-to-technology alignment.','Digital transformation requires business-to-technology alignment.',1,1,CURRENT_TIMESTAMP),
('technology_advisory','objective','modernize_technology',18,'Outcome modernisasi membutuhkan prioritas investasi dan operating model.','Modernization requires investment priorities and an operating model.',1,1,CURRENT_TIMESTAMP),
('software_development','pressure','system_development',30,'Kebutuhan pengembangan sistem memerlukan delivery project yang terstruktur.','System development needs a structured delivery project.',1,1,CURRENT_TIMESTAMP),
('software_development','pressure','automation',24,'Otomasi proses dapat direalisasikan melalui platform dan integration engineering.','Process automation can be delivered through platform and integration engineering.',1,1,CURRENT_TIMESTAMP),
('software_development','objective','digital_platform',25,'Target digital platform berhubungan langsung dengan software engineering.','A digital-platform objective directly maps to software engineering.',1,1,CURRENT_TIMESTAMP),
('technology_support','pressure','system_performance',22,'Kinerja sistem membutuhkan observability, reliability dan operational support.','System performance needs observability, reliability and operational support.',1,1,CURRENT_TIMESTAMP),
('technology_support','objective','outsource_capability',22,'Outsourcing capability mendukung managed operations.','Capability outsourcing supports managed operations.',1,1,CURRENT_TIMESTAMP),

('cyber_maturity','pressure','cyberattack_concern',18,'Kekhawatiran serangan perlu dikonversi menjadi baseline maturity dan risk roadmap.','Cyberattack concerns should be converted into a maturity baseline and risk roadmap.',1,1,CURRENT_TIMESTAMP),
('cyber_maturity','capability','cyber_program',22,'Cyber program yang belum matang memerlukan diagnostic baseline.','An immature cyber program needs a diagnostic baseline.',1,1,CURRENT_TIMESTAMP),
('cyber_maturity','objective','reduce_cyber_risk',20,'Risk reduction membutuhkan prioritas berbasis maturity dan exposure.','Risk reduction needs maturity- and exposure-based prioritization.',1,1,CURRENT_TIMESTAMP),
('vapt','pressure','vulnerability',30,'Vulnerability exposure memerlukan validasi teknis dan exploitability.','Vulnerability exposure requires technical validation and exploitability testing.',1,1,CURRENT_TIMESTAMP),
('vapt','pressure','penetration_testing',34,'Kebutuhan penetration testing merupakan match langsung.','A penetration-testing requirement is a direct match.',1,1,CURRENT_TIMESTAMP),
('vapt','capability','penetration_testing',18,'Kapabilitas pentest yang belum tersedia meningkatkan relevansi layanan VAPT.','Missing penetration-testing capability increases VAPT relevance.',1,1,CURRENT_TIMESTAMP),
('soc_mdr','pressure','security_visibility',30,'Visibility rendah membutuhkan continuous monitoring dan detection.','Low visibility requires continuous monitoring and detection.',1,1,CURRENT_TIMESTAMP),
('soc_mdr','pressure','soc_requirement',34,'Kebutuhan SOC merupakan match langsung.','A SOC requirement is a direct match.',1,1,CURRENT_TIMESTAMP),
('soc_mdr','capability','soc',20,'SOC yang belum tersedia meningkatkan kebutuhan managed detection.','Missing SOC capability increases the need for managed detection.',1,1,CURRENT_TIMESTAMP),
('siem','pressure','siem_requirement',34,'Kebutuhan SIEM memerlukan telemetry, correlation dan use-case engineering.','A SIEM need requires telemetry, correlation and use-case engineering.',1,1,CURRENT_TIMESTAMP),
('siem','capability','siem',20,'SIEM yang belum tersedia meningkatkan relevansi implementation.','Missing SIEM capability increases implementation relevance.',1,1,CURRENT_TIMESTAMP),
('incident_response','pressure','security_incident',32,'Security incident membutuhkan containment dan investigation segera.','A security incident requires immediate containment and investigation.',1,1,CURRENT_TIMESTAMP),
('incident_response','pressure','data_breach',36,'Data breach membutuhkan incident response, evidence preservation dan recovery.','A data breach requires incident response, evidence preservation and recovery.',1,1,CURRENT_TIMESTAMP),
('incident_response','pressure','ransomware',36,'Ransomware memerlukan containment dan recovery yang diprioritaskan.','Ransomware requires prioritized containment and recovery.',1,1,CURRENT_TIMESTAMP),
('incident_response','pressure','incident_response',34,'Kebutuhan incident response merupakan match langsung.','An incident-response need is a direct match.',1,1,CURRENT_TIMESTAMP),
('threat_intelligence','pressure','threat_intelligence',32,'Kebutuhan intelligence merupakan match langsung.','A threat-intelligence need is a direct match.',1,1,CURRENT_TIMESTAMP),
('threat_intelligence','pressure','cyberattack_concern',16,'Threat intelligence membantu memberi konteks ancaman aktual terhadap exposure.','Threat intelligence helps contextualize threats against exposure.',1,1,CURRENT_TIMESTAMP),
('cyber_governance','pressure','weak_governance',26,'Weak governance membutuhkan ownership, policy dan security program governance.','Weak governance requires ownership, policy and security program governance.',1,1,CURRENT_TIMESTAMP),
('cyber_governance','pressure','cyber_resilience',22,'Cyber resilience membutuhkan governance lintas prevention, response dan recovery.','Cyber resilience needs governance across prevention, response and recovery.',1,1,CURRENT_TIMESTAMP),
('cyber_governance','industry','banking',10,'Perbankan memiliki kebutuhan governance dan assurance yang tinggi.','Banking has elevated governance and assurance needs.',1,1,CURRENT_TIMESTAMP),
('cyber_governance','industry','islamic_banking',10,'Perbankan syariah memiliki kebutuhan governance dan assurance yang tinggi.','Islamic banking has elevated governance and assurance needs.',1,1,CURRENT_TIMESTAMP),
('cyber_governance','industry','securities',10,'Pasar modal memiliki kebutuhan governance dan cyber assurance yang tinggi.','Capital markets have elevated governance and cyber assurance needs.',1,1,CURRENT_TIMESTAMP),

('grc','pressure','grc_implementation',32,'Kebutuhan GRC merupakan match langsung untuk integrated GRC.','A GRC implementation need is a direct match for integrated GRC.',1,1,CURRENT_TIMESTAMP),
('grc','pressure','audit_findings',18,'Temuan audit yang berulang dapat membutuhkan issue/control workflow terintegrasi.','Recurring audit findings may require integrated issue/control workflows.',1,1,CURRENT_TIMESTAMP),
('risk_management','pressure','weak_governance',18,'Governance lemah sering memerlukan risk ownership dan taxonomy yang lebih jelas.','Weak governance often needs clearer risk ownership and taxonomy.',1,1,CURRENT_TIMESTAMP),
('risk_management','objective','improve_governance',18,'Governance improvement membutuhkan risk framework yang terukur.','Governance improvement benefits from a measurable risk framework.',1,1,CURRENT_TIMESTAMP),
('internal_control','pressure','internal_control',32,'Kelemahan internal control merupakan match langsung.','Internal-control weakness is a direct match.',1,1,CURRENT_TIMESTAMP),
('audit_readiness','pressure','audit_findings',28,'Temuan audit membutuhkan evidence review dan closure plan.','Audit findings require evidence review and a closure plan.',1,1,CURRENT_TIMESTAMP),
('audit_readiness','pressure','upcoming_audit',30,'Audit mendatang meningkatkan kebutuhan readiness assessment.','An upcoming audit increases the need for readiness assessment.',1,1,CURRENT_TIMESTAMP),
('policy_sop','pressure','outdated_policies',32,'Policy/SOP usang membutuhkan refresh berbasis governance dan proses aktual.','Outdated policies/SOP require refresh against governance and actual processes.',1,1,CURRENT_TIMESTAMP),
('policy_sop','pressure','unclear_accountability',24,'Akuntabilitas yang tidak jelas membutuhkan governance structure dan RACI.','Unclear accountability requires governance structure and RACI.',1,1,CURRENT_TIMESTAMP),

('pdp_readiness','pressure','data_privacy',32,'Kebutuhan privacy memerlukan diagnostic readiness dan gap analysis.','Privacy requirements need readiness diagnostics and gap analysis.',1,1,CURRENT_TIMESTAMP),
('pdp_readiness','pressure','pdp_compliance',36,'UU PDP readiness merupakan match langsung.','UU PDP readiness is a direct match.',1,1,CURRENT_TIMESTAMP),
('pdp_readiness','capability','data_protection',20,'Data protection yang belum matang meningkatkan kebutuhan readiness assessment.','Immature data protection increases the need for readiness assessment.',1,1,CURRENT_TIMESTAMP),
('privacy_governance','capability','privacy_governance',24,'Privacy governance yang belum tersedia membutuhkan operating model dan control.','Missing privacy governance requires an operating model and controls.',1,1,CURRENT_TIMESTAMP),
('privacy_governance','pressure','data_privacy',22,'Data privacy pressure membutuhkan governance, RoPA/DPIA dan rights handling.','Data privacy pressure requires governance, RoPA/DPIA and rights handling.',1,1,CURRENT_TIMESTAMP),

('iso27001','pressure','iso_27001',38,'ISO/IEC 27001 readiness merupakan match langsung.','ISO/IEC 27001 readiness is a direct match.',1,1,CURRENT_TIMESTAMP),
('iso27001','pressure','certification',24,'Target sertifikasi dapat membutuhkan ISMS readiness dan implementation.','A certification target may require ISMS readiness and implementation.',1,1,CURRENT_TIMESTAMP),
('iso27001','objective','prepare_certification',22,'Outcome sertifikasi memperkuat relevansi ISO readiness.','A certification objective increases ISO readiness relevance.',1,1,CURRENT_TIMESTAMP),
('iso22301','pressure','bcp_gap',30,'BCP gap membutuhkan BCMS/BIA dan exercise yang terstruktur.','A BCP gap requires structured BCMS/BIA and exercises.',1,1,CURRENT_TIMESTAMP),
('iso22301','pressure','business_interruption',24,'Business interruption meningkatkan prioritas continuity management.','Business interruption increases continuity-management priority.',1,1,CURRENT_TIMESTAMP),
('iso27701','pressure','data_privacy',18,'Privacy management dapat diperkuat melalui PIMS yang terintegrasi dengan ISMS.','Privacy management can be strengthened through a PIMS integrated with ISMS.',1,1,CURRENT_TIMESTAMP),

('bcm','pressure','business_interruption',34,'Gangguan bisnis membutuhkan BIA, recovery strategy dan BCP/DRP.','Business interruption requires BIA, recovery strategy and BCP/DRP.',1,1,CURRENT_TIMESTAMP),
('bcm','pressure','disaster_recovery',32,'DR concern membutuhkan recovery design dan exercise.','DR concern requires recovery design and exercises.',1,1,CURRENT_TIMESTAMP),
('bcm','pressure','bcp_gap',32,'BCP gap merupakan match langsung untuk BCM engagement.','A BCP gap is a direct match for BCM engagement.',1,1,CURRENT_TIMESTAMP),
('bcm','objective','improve_resilience',20,'Resilience objective meningkatkan relevansi BCM/DR.','A resilience objective increases BCM/DR relevance.',1,1,CURRENT_TIMESTAMP),
('crisis_management','pressure','crisis_management',32,'Crisis management gap merupakan match langsung.','A crisis-management gap is a direct match.',1,1,CURRENT_TIMESTAMP),
('crisis_management','pressure','cyber_resilience',18,'Cyber resilience membutuhkan escalation dan tabletop readiness.','Cyber resilience requires escalation and tabletop readiness.',1,1,CURRENT_TIMESTAMP),

('security_awareness','pressure','cyber_awareness',34,'Cyber awareness gap membutuhkan program capability dan behavior reinforcement.','A cyber-awareness gap requires capability and behavior reinforcement.',1,1,CURRENT_TIMESTAMP),
('security_awareness','pressure','employee_security',32,'Security behavior membutuhkan awareness dan simulation program.','Security behavior needs awareness and simulation programs.',1,1,CURRENT_TIMESTAMP),
('security_awareness','capability','security_awareness',18,'Program awareness yang belum tersedia meningkatkan relevansi training.','Missing awareness capability increases training relevance.',1,1,CURRENT_TIMESTAMP),
('secure_coding_training','capability','secure_sdlc',20,'Secure SDLC yang belum matang membutuhkan capability building untuk developer.','Immature secure SDLC needs developer capability building.',1,1,CURRENT_TIMESTAMP),
('secure_coding_training','capability','application_security',18,'Application security gap dapat dikurangi melalui secure coding practices.','Application-security gaps can be reduced through secure coding practices.',1,1,CURRENT_TIMESTAMP),
('governance_training','pressure','skill_gap',24,'Skill gap governance/risk membutuhkan capability development terstruktur.','Governance/risk skill gaps need structured capability development.',1,1,CURRENT_TIMESTAMP),
('governance_training','objective','develop_internal',20,'Pengembangan kapabilitas internal mendukung model training.','Internal capability development supports a training model.',1,1,CURRENT_TIMESTAMP),

-- Delivery preference boosts
('technology_advisory','delivery','advisory',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('technology_blueprint','delivery','advisory',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('software_development','delivery','project',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('technology_support','delivery','managed_service',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('soc_mdr','delivery','managed_service',10,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('vapt','delivery','assessment',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('cyber_maturity','delivery','assessment',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('iso27001','delivery','advisory',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('security_awareness','delivery','training',10,NULL,NULL,1,1,CURRENT_TIMESTAMP),

-- Urgency boosts
('incident_response','timeline','emergency',18,'Urgensi emergency meningkatkan prioritas incident response.','Emergency urgency increases incident-response priority.',1,1,CURRENT_TIMESTAMP),
('incident_response','timeline','lt30',12,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('vapt','timeline','lt30',6,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('audit_readiness','timeline','lt30',8,NULL,NULL,1,1,CURRENT_TIMESTAMP),
('soc_mdr','timeline','1_3_months',6,NULL,NULL,1,1,CURRENT_TIMESTAMP);

-- Scoring weights -----------------------------------------------------------
INSERT OR IGNORE INTO enterprise_finder_scoring_weights
(weight_key, weight_value, description, version, is_active, updated_at)
VALUES
('pressure.severity',0.20,'Severity component of Enterprise Pressure Score',1,1,CURRENT_TIMESTAMP),
('pressure.urgency',0.20,'Urgency component of Enterprise Pressure Score',1,1,CURRENT_TIMESTAMP),
('pressure.business',0.20,'Business impact component',1,1,CURRENT_TIMESTAMP),
('pressure.regulatory',0.15,'Regulatory impact component',1,1,CURRENT_TIMESTAMP),
('pressure.cyber',0.15,'Cyber risk component',1,1,CURRENT_TIMESTAMP),
('pressure.operational',0.10,'Operational impact component',1,1,CURRENT_TIMESTAMP),
('match.mapping',0.70,'Configured service mapping contribution',1,1,CURRENT_TIMESTAMP),
('match.capability_gap',0.20,'Capability gap contribution',1,1,CURRENT_TIMESTAMP),
('match.base',0.10,'Service priority baseline contribution',1,1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO enterprise_finder_ai_prompts
(prompt_key, prompt_text, version, is_active, updated_at)
VALUES
('executive_summary',
'Anda adalah RTI Enterprise Advisory Engine. Gunakan HANYA fakta yang terdapat pada payload assessment dan deterministic diagnosis. Jangan mengarang kondisi customer, regulasi, audit finding, sertifikasi, legal opinion, atau quotation. Jangan menyatakan organisasi compliant/non-compliant secara final. Jelaskan current situation, key pressures, capability gaps, risk implication, immediate priorities, recommended RTI solutions, delivery model, roadmap, dan next action. Nyatakan bahwa hasil adalah preliminary diagnostic.',
1,1,CURRENT_TIMESTAMP);
