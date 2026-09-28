-- RTI Project Estimator & RFQ Builder v2
-- F1 schema/catalog alignment for AI-assisted scoping.
-- SQLite / Cloudflare D1 compatible. No customer, project, quotation, or real rate-card data is seeded.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS estimator_service_profiles (
  service_id TEXT PRIMARY KEY,
  service_code TEXT NOT NULL UNIQUE,
  pricing_model TEXT NOT NULL,
  engine_key TEXT NOT NULL,
  needs_calibration INTEGER NOT NULL DEFAULT 1 CHECK (needs_calibration IN (0,1)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_policy_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  effective_from TEXT,
  effective_to TEXT,
  floor_margin REAL NOT NULL DEFAULT 0.20,
  premium_factor REAL NOT NULL DEFAULT 1.25,
  rush_factor REAL NOT NULL DEFAULT 1.25,
  market_adjustment REAL NOT NULL DEFAULT 1.0,
  min_margin_alert REAL NOT NULL DEFAULT 0.25,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  approved_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimator_client_segments (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  multiplier REAL NOT NULL,
  needs_calibration INTEGER NOT NULL DEFAULT 1 CHECK (needs_calibration IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimator_sizing_rules_v2 (
  id TEXT PRIMARY KEY,
  policy_version_id TEXT NOT NULL,
  service_code TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  needs_calibration INTEGER NOT NULL DEFAULT 1 CHECK (needs_calibration IN (0,1)),
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(policy_version_id, service_code, rule_key),
  FOREIGN KEY (policy_version_id) REFERENCES estimator_policy_versions(id)
);

CREATE TABLE IF NOT EXISTS estimator_risk_flags_v2 (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  estimate_id TEXT,
  code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  evidence_json TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id) REFERENCES project_estimates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_estimator_service_profiles_code
  ON estimator_service_profiles(service_code);
CREATE INDEX IF NOT EXISTS idx_estimator_risk_flags_session
  ON estimator_risk_flags_v2(session_id, status, created_at DESC);

INSERT OR IGNORE INTO service_categories
  (id, slug, name, description, sort_order, is_active, created_at, updated_at)
VALUES
  ('cat-support','managed-support','Managed Support & Maintenance','Application support, maintenance, SLA and managed technology operations.',55,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

UPDATE services SET
  slug='web-application',
  name='Software Development — Web App / Portal / Dashboard',
  description='Custom web application, portal and dashboard delivery.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-webapp';

UPDATE services SET
  slug='mobile-application',
  name='Software Development — Mobile',
  description='Android, iOS and cross-platform mobile application delivery.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-mobile';

UPDATE services SET
  slug='api-integration-middleware',
  name='API, Integrasi Sistem & Middleware',
  description='API, middleware and enterprise integration delivery.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-integration';

UPDATE services SET
  slug='ai-data-solution',
  name='AI / Data Solution',
  description='Chatbot, RAG, analytics, data and AI-enabled solution delivery.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-ai-assistant';

UPDATE services SET
  slug='vapt-web',
  name='VAPT Web Application',
  description='Web application penetration testing with verification retest.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-vapt';

UPDATE services SET
  slug='it-security-audit',
  name='IT Audit / Security Maturity Assessment',
  description='IT audit, cybersecurity maturity and control assessment.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-cyber-gov';

UPDATE services SET
  slug='governance-iso',
  name='Governance: ISO 27001 / 9001 / 20000',
  description='Gap assessment, implementation and certification preparation.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-iso27001';

UPDATE services SET
  slug='governance-pdp',
  name='Governance: UU PDP',
  description='Privacy gap assessment, RoPA, DPIA and DPO advisory.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-pdp';

UPDATE services SET
  slug='it-advisory',
  name='IT Advisory',
  description='Architecture, IT strategy/masterplan and cloud readiness advisory.',
  billing_unit='project',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-blueprint';

UPDATE services SET
  slug='training-academy',
  name='Training & Cybersecurity Academy',
  description='In-house and public-class training with configurable delivery models.',
  billing_unit='batch',
  updated_at=CURRENT_TIMESTAMP
WHERE id='svc-training';

-- Kept for historical sessions but excluded from the v2 public catalog.
UPDATE services SET is_active=0, updated_at=CURRENT_TIMESTAMP
WHERE id IN ('svc-soc','svc-banking-grc');

INSERT OR IGNORE INTO services
  (id,category_id,slug,name,description,base_effort_days,base_price_min,base_price_max,billing_unit,default_duration_min_weeks,default_duration_max_weeks,is_active,created_at,updated_at)
VALUES
  ('svc-support','cat-support','managed-support','Managed Support & Maintenance','L1/L2/L3 managed support, maintenance and SLA coverage.',20,0,0,'month',4,4,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('svc-vapt-mob','cat-cyber','vapt-mobile','VAPT Mobile','Android/iOS mobile application security testing.',10,0,0,'project',2,4,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('svc-vapt-api','cat-cyber','vapt-api','VAPT API / Web Service','API and web-service penetration testing.',8,0,0,'project',2,4,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('svc-vapt-net','cat-cyber','vapt-network','VAPT Network / Infrastructure / Cloud','Network, infrastructure and cloud configuration security testing.',10,0,0,'project',2,5,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('svc-coderev','cat-cyber','secure-code-review','Secure Code Review / DevSecOps Assessment','Secure code review, SAST triage, threat modeling and DevSecOps assessment.',10,0,0,'project',2,5,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO estimator_service_profiles
  (service_id,service_code,pricing_model,engine_key,needs_calibration,updated_at)
VALUES
  ('svc-webapp','SWDEV-WEB','OTC per sprint/MD','swdev',1,CURRENT_TIMESTAMP),
  ('svc-mobile','SWDEV-MOB','OTC per sprint/MD','swdev',1,CURRENT_TIMESTAMP),
  ('svc-integration','SWDEV-API','OTC per MD','swdev',1,CURRENT_TIMESTAMP),
  ('svc-ai-assistant','SWDEV-AI','OTC per MD + optional MRC','swdev',1,CURRENT_TIMESTAMP),
  ('svc-support','SUPPORT','MRC','support',1,CURRENT_TIMESTAMP),
  ('svc-vapt','VAPT-WEB','OTC per MD','vapt-web',1,CURRENT_TIMESTAMP),
  ('svc-vapt-mob','VAPT-MOB','OTC per MD','vapt-mobile',1,CURRENT_TIMESTAMP),
  ('svc-vapt-api','VAPT-API','OTC per MD','vapt-api',1,CURRENT_TIMESTAMP),
  ('svc-vapt-net','VAPT-NET','OTC per MD','vapt-network',1,CURRENT_TIMESTAMP),
  ('svc-coderev','CODEREV','OTC per MD','code-review',1,CURRENT_TIMESTAMP),
  ('svc-iso27001','GOV-ISO','OTC','governance-iso',1,CURRENT_TIMESTAMP),
  ('svc-pdp','GOV-PDP','OTC / MRC','governance-pdp',1,CURRENT_TIMESTAMP),
  ('svc-cyber-gov','GOV-AUDIT','OTC per MD','governance-audit',1,CURRENT_TIMESTAMP),
  ('svc-blueprint','ADVISORY','OTC per MD','advisory',1,CURRENT_TIMESTAMP),
  ('svc-training','TRAIN','per class / participant','training',1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_policy_versions
  (id,version,effective_from,floor_margin,premium_factor,rush_factor,market_adjustment,min_margin_alert,status,notes,created_at,updated_at)
VALUES
  ('policy-2026-1','2026.1',CURRENT_DATE,0.20,1.25,1.25,1.0,0.25,'draft','KALIBRASI RTI — commercial values require management approval before go-live.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO estimator_client_segments
  (code,name,multiplier,needs_calibration,updated_at)
VALUES
  ('ENT','Enterprise / Tbk / BUMN / korporasi besar',1.30,1,CURRENT_TIMESTAMP),
  ('STD','Korporasi menengah / institusi besar',1.00,1,CURRENT_TIMESTAMP),
  ('SME','UKM / startup / klinik / sekolah swasta',0.85,1,CURRENT_TIMESTAMP),
  ('GOV','Pemerintah / pengadaan formal',0.90,1,CURRENT_TIMESTAMP),
  ('INTL','Klien luar negeri',1.80,1,CURRENT_TIMESTAMP),
  ('EDU-NP','Pendidikan / nirlaba untuk TRAIN & ADVISORY',0.80,1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_settings (key,label,value,is_public,updated_at) VALUES
  ('estimator_ui_language','Default estimator UI language','id',1,CURRENT_TIMESTAMP),
  ('estimator_public_price_mode','Public indicative price mode','range',1,CURRENT_TIMESTAMP),
  ('estimator_calibration_status','Estimator commercial calibration status','KALIBRASI RTI',1,CURRENT_TIMESTAMP),
  ('estimator_confidence_export_min','Minimum confidence for non-watermarked RFQ','70',0,CURRENT_TIMESTAMP),
  ('tshirt_xs_max_md','T-shirt XS maximum MD','5',0,CURRENT_TIMESTAMP),
  ('tshirt_s_max_md','T-shirt S maximum MD','12',0,CURRENT_TIMESTAMP),
  ('tshirt_m_max_md','T-shirt M maximum MD','25',0,CURRENT_TIMESTAMP),
  ('tshirt_l_max_md','T-shirt L maximum MD','45',0,CURRENT_TIMESTAMP),
  ('tshirt_xl_max_md','T-shirt XL maximum MD','80',0,CURRENT_TIMESTAMP),
  ('delivery_efficiency','Default delivery efficiency','0.85',0,CURRENT_TIMESTAMP);

-- Exact reference labels for VAPT Web quick estimate.
UPDATE estimator_questions SET
  label='Target Surface Scope',
  help_text='Pilih target utama yang akan diuji.',
  field_type='dropdown',
  quick_mode=1,
  updated_at=CURRENT_TIMESTAMP
WHERE id='q-vapt-surface';

UPDATE estimator_questions SET
  label='Target Scale / Endpoints',
  help_text='Pilih kisaran endpoint atau skala target.',
  field_type='dropdown',
  quick_mode=1,
  updated_at=CURRENT_TIMESTAMP
WHERE id='q-vapt-assets';

UPDATE estimator_questions SET
  label='Testing Methodology',
  help_text='Grey Box direkomendasikan untuk cakupan authenticated testing.',
  field_type='dropdown',
  quick_mode=1,
  updated_at=CURRENT_TIMESTAMP
WHERE id='q-vapt-auth';

UPDATE estimator_question_options SET label='Web Application' WHERE id='qo-vs-1';
UPDATE estimator_question_options SET label='Mobile Applications (Android APK + iOS IPA)' WHERE id='qo-vs-2';
UPDATE estimator_question_options SET label='Network & Infrastructure' WHERE id='qo-vs-3';
UPDATE estimator_question_options SET label='Cloud Configuration / Combined Surface' WHERE id='qo-vs-4';
UPDATE estimator_question_options SET label='Small (single-tenant, < 20 endpoints)' WHERE id='qo-va-1';
UPDATE estimator_question_options SET label='Standard (multi-tenant app, 20–60 endpoints)' WHERE id='qo-va-2';
UPDATE estimator_question_options SET label='Large / Enterprise (60+ endpoints, custom scoping)' WHERE id='qo-va-3';
UPDATE estimator_question_options SET label='Grey Box (Authenticated credentials — Recommended)' WHERE id='qo-vm-1';
UPDATE estimator_question_options SET label='Black Box' WHERE id='qo-vm-2';
UPDATE estimator_question_options SET label='White Box (source code access)' WHERE id='qo-vm-3';

-- Quick service-specific parameters. Common quick questions remain available as additional context.
INSERT OR IGNORE INTO estimator_questions
  (id,service_id,question_key,label,help_text,field_type,required,complexity_dimension,weight,sort_order,quick_mode,detailed_mode,is_active,created_at,updated_at)
VALUES
  ('q-mob-scale','svc-mobile','mobile_scale','Project Scale','Skala aplikasi mobile dan workflow.','dropdown',1,'scope',1.1,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-mob-platform','svc-mobile','mobile_platform','Platform','Target platform aplikasi.','dropdown',1,'technology',1.0,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-mob-delivery','svc-mobile','delivery_approach','Delivery Approach','Model delivery proyek.','dropdown',1,'resource',0.7,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-api-scale','svc-integration','api_scale','API / Integration Scale','Jumlah layanan dan integrasi utama.','dropdown',1,'scope',1.1,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-api-core','svc-integration','core_integration','Core / Legacy Integration','Tingkat ketergantungan core atau legacy.','dropdown',1,'integration',1.2,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-api-delivery','svc-integration','delivery_approach','Delivery Approach','Model delivery proyek.','dropdown',1,'resource',0.7,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-ai-scale','svc-ai-assistant','ai_scope','AI / Data Scope','Cakupan solusi AI/Data.','dropdown',1,'technology',1.2,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-ai-data','svc-ai-assistant','data_readiness','Data Readiness','Kesiapan sumber dan kualitas data.','dropdown',1,'data',1.1,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-ai-eval','svc-ai-assistant','model_evaluation','Model Evaluation Need','Kebutuhan evaluasi dan guardrail model.','dropdown',1,'security',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-support-apps','svc-support','application_count','Applications in Scope','Jumlah aplikasi yang didukung.','dropdown',1,'scope',1.0,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-support-coverage','svc-support','support_coverage','Coverage','Jam layanan support.','dropdown',1,'resource',1.2,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-support-sla','svc-support','sla_tier','SLA Tier','Tingkat SLA layanan.','dropdown',1,'resource',1.0,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-vm-platform','svc-vapt-mob','mobile_target','Target Surface Scope','Platform mobile yang diuji.','dropdown',1,'security',1.2,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-vm-feature','svc-vapt-mob','mobile_feature','Target Complexity','Fitur keamanan/transaksi utama.','dropdown',1,'security',1.1,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-vm-method','svc-vapt-mob','test_method','Testing Methodology','Metodologi akses pengujian.','dropdown',1,'security',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-va-endpoints','svc-vapt-api','api_endpoints','Target Scale / Endpoints','Jumlah endpoint API.','dropdown',1,'scope',1.2,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-va-auth','svc-vapt-api','api_auth','Authentication','Metode autentikasi API.','dropdown',1,'security',1.0,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-va-doc','svc-vapt-api','api_documentation','API Documentation','Ketersediaan Swagger/Postman/dokumentasi.','dropdown',1,'technology',0.9,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-vn-ext','svc-vapt-net','external_ip_scale','External IP Scope','Jumlah IP eksternal.','dropdown',1,'scope',1.1,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-vn-int','svc-vapt-net','internal_host_scale','Internal Host Scope','Jumlah host internal.','dropdown',1,'scope',1.1,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-vn-cloud','svc-vapt-net','cloud_review','Cloud / Firewall Review','Cakupan konfigurasi cloud/firewall.','dropdown',1,'security',1.0,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-cr-kloc','svc-coderev','kloc_scale','Codebase Size (KLOC)','Ukuran codebase.','dropdown',1,'scope',1.1,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-cr-depth','svc-coderev','review_depth','Review Depth','SAST triage atau manual penuh.','dropdown',1,'security',1.1,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-cr-lang','svc-coderev','language_complexity','Language / Legacy Complexity','Kompleksitas bahasa dan legacy code.','dropdown',1,'technology',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-pdp-units','svc-pdp','business_units','Business Units in Scope','Jumlah unit bisnis untuk data mapping/RoPA.','dropdown',1,'scope',1.0,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-pdp-dpia','svc-pdp','dpia_count','Systems Requiring DPIA','Jumlah sistem prioritas DPIA.','dropdown',1,'regulatory',1.1,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-pdp-dpo','svc-pdp','dpo_hours','DPO Advisory Need','Estimasi jam advisory per bulan.','dropdown',1,'resource',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-audit-units','svc-cyber-gov','audit_units','Business Units','Unit bisnis yang dinilai.','dropdown',1,'scope',1.0,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-audit-domains','svc-cyber-gov','control_domains','Control Domains','Jumlah domain kontrol.','dropdown',1,'regulatory',1.1,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-audit-framework','svc-cyber-gov','assessment_framework','Framework','NIST CSF, COBIT atau custom.','dropdown',1,'regulatory',0.9,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

  ('q-adv-type','svc-blueprint','advisory_type','Advisory Scope','Jenis advisory utama.','dropdown',1,'scope',1.1,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-adv-scale','svc-blueprint','advisory_scale','Organization Scale','Skala organisasi.','dropdown',1,'organization',1.0,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('q-adv-workshop','svc-blueprint','workshop_count','Workshop Intensity','Jumlah workshop/discovery.','dropdown',1,'resource',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_question_options
  (id,question_id,value,label,score,effort_multiplier,price_multiplier,sort_order,is_active)
VALUES
  ('qo-ms-1','q-mob-scale','small','Small (≤5 modules)',2,0.85,0.90,10,1),('qo-ms-2','q-mob-scale','standard','Standard (6–15 modules)',3,1,1,20,1),('qo-ms-3','q-mob-scale','large','Large / Enterprise',5,1.45,1.45,30,1),
  ('qo-mp-1','q-mob-platform','single','Single platform',2,1,1,10,1),('qo-mp-2','q-mob-platform','cross','Cross-platform',3,1.25,1.25,20,1),('qo-mp-3','q-mob-platform','native-dual','Android + iOS native',5,1.7,1.7,30,1),
  ('qo-md-1','q-mob-delivery','fixed','Fixed scope',3,1,1,10,1),('qo-md-2','q-mob-delivery','agile','Agile sprint (Recommended)',3,1,1,20,1),('qo-md-3','q-mob-delivery','dedicated','Dedicated team (monthly)',4,1.1,1.1,30,1),

  ('qo-as-1','q-api-scale','small','Small (≤5 integrations)',2,0.85,0.9,10,1),('qo-as-2','q-api-scale','standard','Standard (6–15 integrations)',3,1,1,20,1),('qo-as-3','q-api-scale','enterprise','Enterprise / core ecosystem',5,1.45,1.5,30,1),
  ('qo-ac-1','q-api-core','none','No core/legacy dependency',2,0.9,0.9,10,1),('qo-ac-2','q-api-core','documented','Documented core APIs',3,1,1,20,1),('qo-ac-3','q-api-core','legacy','Legacy/core with limited documentation',5,1.4,1.4,30,1),
  ('qo-ad-1','q-api-delivery','fixed','Fixed scope',3,1,1,10,1),('qo-ad-2','q-api-delivery','agile','Agile sprint (Recommended)',3,1,1,20,1),('qo-ad-3','q-api-delivery','dedicated','Dedicated team (monthly)',4,1.1,1.1,30,1),

  ('qo-ais-1','q-ai-scale','chatbot','Chatbot / RAG',3,1,1,10,1),('qo-ais-2','q-ai-scale','analytics','Analytics / BI + AI',4,1.2,1.2,20,1),('qo-ais-3','q-ai-scale','custom','Custom AI / ML pipeline',5,1.45,1.5,30,1),
  ('qo-aid-1','q-ai-data','ready','Curated / documented',2,0.9,0.9,10,1),('qo-aid-2','q-ai-data','partial','Partially ready',3,1,1,20,1),('qo-aid-3','q-ai-data','unknown','Unknown / significant preparation',5,1.35,1.4,30,1),
  ('qo-aie-1','q-ai-eval','basic','Basic acceptance tests',2,0.95,0.95,10,1),('qo-aie-2','q-ai-eval','formal','Formal evaluation + guardrails',4,1.2,1.2,20,1),

  ('qo-sa-1','q-support-apps','small','1–2 applications',2,0.8,0.85,10,1),('qo-sa-2','q-support-apps','standard','3–5 applications',3,1,1,20,1),('qo-sa-3','q-support-apps','large','6+ / business critical',5,1.4,1.45,30,1),
  ('qo-sc-1','q-support-coverage','8x5','8x5',2,1,1,10,1),('qo-sc-2','q-support-coverage','12x6','12x6',4,1.4,1.4,20,1),('qo-sc-3','q-support-coverage','24x7','24x7',5,2.2,2.2,30,1),
  ('qo-ss-1','q-support-sla','basic','Basic',2,0.9,0.9,10,1),('qo-ss-2','q-support-sla','standard','Standard',3,1,1,20,1),('qo-ss-3','q-support-sla','premium','Premium',5,1.3,1.35,30,1),

  ('qo-vmp-1','q-vm-platform','android','Android APK',3,1,1,10,1),('qo-vmp-2','q-vm-platform','ios','iOS IPA',3,1,1,20,1),('qo-vmp-3','q-vm-platform','dual','Android APK + iOS IPA',4,1.4,1.4,30,1),
  ('qo-vmf-1','q-vm-feature','basic','Basic',2,1,1,10,1),('qo-vmf-2','q-vm-feature','payment','Payment / transaction',4,1.3,1.3,20,1),('qo-vmf-3','q-vm-feature','pki','Biometric / NFC / Offline / PKI',5,1.5,1.5,30,1),
  ('qo-vmm-1','q-vm-method','grey','Grey Box (Recommended)',3,1.2,1.2,10,1),('qo-vmm-2','q-vm-method','black','Black Box',3,1,1,20,1),('qo-vmm-3','q-vm-method','white','White Box',5,1.5,1.5,30,1),

  ('qo-vae-1','q-va-endpoints','small','<25 endpoints',2,0.85,0.9,10,1),('qo-vae-2','q-va-endpoints','standard','25–60 endpoints',3,1,1,20,1),('qo-vae-3','q-va-endpoints','large','61–150 endpoints',4,1.35,1.4,30,1),('qo-vae-4','q-va-endpoints','enterprise','>150 endpoints',5,1.7,1.8,40,1),
  ('qo-vaa-1','q-va-auth','basic','Basic / token',2,1,1,10,1),('qo-vaa-2','q-va-auth','sso','SSO',3,1.1,1.1,20,1),('qo-vaa-3','q-va-auth','mfa','MFA / PKI / IdAM',5,1.3,1.3,30,1),
  ('qo-vad-1','q-va-doc','swagger','Swagger / Postman available',2,1,1,10,1),('qo-vad-2','q-va-doc','limited','Limited documentation',4,1.2,1.2,20,1),('qo-vad-3','q-va-doc','none','No documentation',5,1.4,1.4,30,1),

  ('qo-vne-1','q-vn-ext','small','1–50 IPs',2,1,1,10,1),('qo-vne-2','q-vn-ext','medium','51–150 IPs',3,1.3,1.3,20,1),('qo-vne-3','q-vn-ext','large','>150 IPs',5,1.7,1.7,30,1),
  ('qo-vni-1','q-vn-int','small','≤100 hosts',2,1,1,10,1),('qo-vni-2','q-vn-int','medium','101–500 hosts',3,1.4,1.4,20,1),('qo-vni-3','q-vn-int','large','>500 hosts',5,1.8,1.8,30,1),
  ('qo-vnc-1','q-vn-cloud','none','No cloud/firewall review',2,0.9,0.9,10,1),('qo-vnc-2','q-vn-cloud','standard','Firewall / one cloud account',3,1,1,20,1),('qo-vnc-3','q-vn-cloud','complex','Multi-cloud / multiple firewalls',5,1.5,1.5,30,1),

  ('qo-crk-1','q-cr-kloc','small','≤15 KLOC',2,0.8,0.85,10,1),('qo-crk-2','q-cr-kloc','standard','16–60 KLOC',3,1,1,20,1),('qo-crk-3','q-cr-kloc','large','>60 KLOC',5,1.5,1.6,30,1),
  ('qo-crd-1','q-cr-depth','sast','SAST + triage',2,0.6,0.7,10,1),('qo-crd-2','q-cr-depth','manual','Full manual review',4,1,1,20,1),
  ('qo-crl-1','q-cr-lang','common','Common modern stack',2,1,1,10,1),('qo-crl-2','q-cr-lang','legacy','Legacy / complex stack',5,1.3,1.3,20,1),

  ('qo-pu-1','q-pdp-units','small','1–3 units',2,0.8,0.85,10,1),('qo-pu-2','q-pdp-units','medium','4–10 units',3,1,1,20,1),('qo-pu-3','q-pdp-units','large','>10 units',5,1.4,1.45,30,1),
  ('qo-pd-1','q-pdp-dpia','none','0–1 systems',2,0.8,0.85,10,1),('qo-pd-2','q-pdp-dpia','medium','2–5 systems',3,1,1,20,1),('qo-pd-3','q-pdp-dpia','large','>5 systems',5,1.5,1.6,30,1),
  ('qo-ph-1','q-pdp-dpo','none','No recurring DPO advisory',2,0.9,0.9,10,1),('qo-ph-2','q-pdp-dpo','8-20','8–20 hours/month',3,1,1,20,1),('qo-ph-3','q-pdp-dpo','20-40','20–40+ hours/month',5,1.4,1.4,30,1),

  ('qo-au-1','q-audit-units','small','1–2 units',2,0.85,0.9,10,1),('qo-au-2','q-audit-units','medium','3–6 units',3,1,1,20,1),('qo-au-3','q-audit-units','large','7+ units',5,1.4,1.45,30,1),
  ('qo-acd-1','q-audit-domains','small','1–5 domains',2,0.85,0.9,10,1),('qo-acd-2','q-audit-domains','medium','6–12 domains',3,1,1,20,1),('qo-acd-3','q-audit-domains','large','13+ domains',5,1.4,1.45,30,1),
  ('qo-af-1','q-audit-framework','nist','NIST CSF',3,1,1,10,1),('qo-af-2','q-audit-framework','cobit','COBIT',3,1,1,20,1),('qo-af-3','q-audit-framework','custom','Custom / multi-framework',5,1.35,1.4,30,1),

  ('qo-at-1','q-adv-type','assessment','Short assessment',2,0.8,0.85,10,1),('qo-at-2','q-adv-type','architecture','Architecture / solution design',3,1,1,20,1),('qo-at-3','q-adv-type','masterplan','IT masterplan / strategy',5,1.5,1.6,30,1),('qo-at-4','q-adv-type','cloud','Cloud readiness',4,1.2,1.25,40,1),
  ('qo-az-1','q-adv-scale','sme','SME',2,0.8,0.85,10,1),('qo-az-2','q-adv-scale','std','Standard',3,1,1,20,1),('qo-az-3','q-adv-scale','ent','Enterprise',5,1.4,1.4,30,1),
  ('qo-aw-1','q-adv-workshop','low','1–2 workshops',2,0.9,0.9,10,1),('qo-aw-2','q-adv-workshop','medium','3–5 workshops',3,1,1,20,1),('qo-aw-3','q-adv-workshop','high','6+ workshops',5,1.3,1.35,30,1);

-- Public guarantees are configuration, not commercial values.
INSERT OR REPLACE INTO service_parameters
  (id,service_id,key,value,value_type,is_internal,updated_at)
VALUES
  ('sp-g-web','svc-webapp','public_guarantees','["Weekly sprint demo & milestone tracking","Technical architecture & secure coding documentation","Bug warranty period per approved RTI policy"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-mob','svc-mobile','public_guarantees','["Weekly sprint demo & milestone tracking","Release readiness documentation","Bug warranty period per approved RTI policy"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-api','svc-integration','public_guarantees','["Integration specification & technical documentation","Milestone tracking","Handover documentation"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-ai','svc-ai-assistant','public_guarantees','["Data/AI scope traceability","Evaluation criteria documented","Operational handover"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-support','svc-support','public_guarantees','["SLA response/resolution per selected tier","Monthly service reporting","Escalation path"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-vw','svc-vapt','public_guarantees','["Free verification retest within approved RTI policy","Executive + technical report","Evidence-based findings"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-vm','svc-vapt-mob','public_guarantees','["Free verification retest within approved RTI policy","Executive + technical report","Mobile security evidence"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-va','svc-vapt-api','public_guarantees','["Free verification retest within approved RTI policy","Executive + technical report","Endpoint-level findings"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-vn','svc-vapt-net','public_guarantees','["Free verification retest within approved RTI policy","Executive + technical report","Infrastructure findings register"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-cr','svc-coderev','public_guarantees','["Code finding traceability","Remediation guidance","Executive + technical report"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-iso','svc-iso27001','public_guarantees','["Gap register","Implementation roadmap","Evidence readiness guidance"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-pdp','svc-pdp','public_guarantees','["Privacy gap register","RoPA/DPIA work products as scoped","Prioritized remediation roadmap"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-audit','svc-cyber-gov','public_guarantees','["Evidence-based assessment","Gap and risk register","Prioritized improvement roadmap"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-adv','svc-blueprint','public_guarantees','["Executive workshop","Target-state recommendation","Implementation roadmap"]','json',0,CURRENT_TIMESTAMP),
  ('sp-g-train','svc-training','public_guarantees','["Training material","Attendance/certificate administration as scoped","Post-session feedback"]','json',0,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO service_dependencies
  (service_id,related_service_id,relation_type,reason,sort_order,is_active)
VALUES
  ('svc-webapp','svc-vapt','recommends','Pre-go-live security testing is recommended for internet-facing or sensitive applications.',10,1),
  ('svc-webapp','svc-support','recommends','Managed support can provide post-go-live operational continuity.',20,1),
  ('svc-mobile','svc-vapt-mob','recommends','Pre-go-live mobile security testing is recommended.',10,1),
  ('svc-mobile','svc-support','recommends','Managed support can provide post-go-live operational continuity.',20,1),
  ('svc-integration','svc-vapt-api','recommends','API security testing is recommended before production exposure.',10,1),
  ('svc-iso27001','svc-training','recommends','Awareness training supports ISMS adoption.',10,1),
  ('svc-pdp','svc-vapt','recommends','Sensitive personal-data systems should be technically validated where relevant.',10,1);
