-- RTICORE Master Produk: official RTI Cybersecurity Company Profile v2.0 / 2026
-- Idempotent catalog seed. Never overwrite prices, historical products, names or scope edits.
-- Approved offering list only; no asserted service pricing or operational transaction data.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS rti_product_categories (
 code TEXT PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER NOT NULL,
 is_supporting INTEGER NOT NULL DEFAULT 0 CHECK (is_supporting IN (0,1)),
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rti_products (
 sku TEXT PRIMARY KEY, category_code TEXT NOT NULL REFERENCES rti_product_categories(code),
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', unit TEXT NOT NULL DEFAULT 'project',
 price_amount REAL, currency TEXT NOT NULL DEFAULT 'IDR',
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 source_ref TEXT NOT NULL DEFAULT 'RTI Cybersecurity Company Profile v2.0/2026',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(price_amount IS NULL OR price_amount >= 0)
);
CREATE TABLE IF NOT EXISTS rti_product_scopes (
 id TEXT PRIMARY KEY, product_sku TEXT NOT NULL REFERENCES rti_products(sku),
 name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(product_sku,name)
);
CREATE TABLE IF NOT EXISTS rti_product_events (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
 target_type TEXT NOT NULL, target_id TEXT NOT NULL,
 before_json TEXT, after_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rti_product_events_target ON rti_product_events(target_type,target_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rti_products_category ON rti_products(category_code,is_active,name);
CREATE INDEX IF NOT EXISTS idx_rti_scopes_product ON rti_product_scopes(product_sku,is_active,sort_order);
INSERT OR IGNORE INTO rti_product_categories (code,name,sort_order,is_supporting) VALUES ('GRC','Governance, Risk & Compliance',10,0);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-001','GRC','ISO/IEC 27001 — SMKI');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-001-S01','RTI-GRC-001','Gap Assessment',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-001-S02','RTI-GRC-001','Implementasi SMKI',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-001-S03','RTI-GRC-001','Sertifikasi Readiness',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-002','GRC','ISO/IEC 20000-1 — ITSM');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-002-S01','RTI-GRC-002','ITSM Implementation',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-002-S02','RTI-GRC-002','Sertifikasi Readiness',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-003','GRC','ISO 22301 — BCMS');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-003-S01','RTI-GRC-003','BCMS Implementation',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-003-S02','RTI-GRC-003','Sertifikasi Readiness',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-004','GRC','PCI DSS');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-004-S01','RTI-GRC-004','PCI DSS Gap Analysis',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-004-S02','RTI-GRC-004','Audit Readiness',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-005','GRC','IT Governance (COBIT)');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-005-S01','RTI-GRC-005','Kebijakan & SOP TI',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-005-S02','RTI-GRC-005','COBIT Framework',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-006','GRC','IT Audit & Compliance');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-006-S01','RTI-GRC-006','Audit TI Independen',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-006-S02','RTI-GRC-006','BI/OJK Compliance',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-006-S03','RTI-GRC-006','ISO/NIST Gap Analysis',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-007','GRC','Business Continuity (BCM/BCP/DRP)');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-007-S01','RTI-GRC-007','BCP',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-007-S02','RTI-GRC-007','DRP',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-007-S03','RTI-GRC-007','DRC',30);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-007-S04','RTI-GRC-007','RTO/RPO',40);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-008','GRC','Maturity Assessment');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-008-S01','RTI-GRC-008','Digital & IT Maturity',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-008-S02','RTI-GRC-008','Security Risk Rating',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-GRC-009','GRC','Cybersecurity Awareness');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-009-S01','RTI-GRC-009','Staff Awareness',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-009-S02','RTI-GRC-009','E-Learning',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-GRC-009-S03','RTI-GRC-009','Phishing Simulation',30);
INSERT OR IGNORE INTO rti_product_categories (code,name,sort_order,is_supporting) VALUES ('OFF','Offensive Security',20,0);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-OFF-001','OFF','Vulnerability Assessment');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-001-S01','RTI-OFF-001','Infrastructure',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-001-S02','RTI-OFF-001','Application',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-001-S03','RTI-OFF-001','Risk Prioritization',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-OFF-002','OFF','Penetration Testing (VAPT)');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-002-S01','RTI-OFF-002','Web',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-002-S02','RTI-OFF-002','Mobile',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-002-S03','RTI-OFF-002','API',30);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-002-S04','RTI-OFF-002','Infrastructure',40);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-002-S05','RTI-OFF-002','Retesting',50);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-OFF-003','OFF','Secure SDLC / DevSecOps');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-003-S01','RTI-OFF-003','Threat Modeling',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-003-S02','RTI-OFF-003','SAST/SCA',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-003-S03','RTI-OFF-003','Secure Coding Training',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-OFF-004','OFF','Red Teaming');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-004-S01','RTI-OFF-004','Adversary Simulation',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-004-S02','RTI-OFF-004','Red Team',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-OFF-004-S03','RTI-OFF-004','Purple Team',30);
INSERT OR IGNORE INTO rti_product_categories (code,name,sort_order,is_supporting) VALUES ('DEF','Defensive Security',30,0);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-DEF-001','DEF','Security Operations (SOC/SIEM)');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-001-S01','RTI-DEF-001','SOC 24/7',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-001-S02','RTI-DEF-001','SIEM',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-001-S03','RTI-DEF-001','Log Correlation',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-DEF-002','DEF','Incident Response');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-002-S01','RTI-DEF-002','Containment',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-002-S02','RTI-DEF-002','Eradication',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-002-S03','RTI-DEF-002','Recovery',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-DEF-003','DEF','Network & Endpoint Hardening');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-003-S01','RTI-DEF-003','Server',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-003-S02','RTI-DEF-003','Network',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-003-S03','RTI-DEF-003','Endpoint',30);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-003-S04','RTI-DEF-003','CIS/Zero Trust',40);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-DEF-004','DEF','Cyber Threat Intelligence (CTI)');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-004-S01','RTI-DEF-004','Threat Monitoring',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-004-S02','RTI-DEF-004','Data Leak Detection',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-004-S03','RTI-DEF-004','Threat Actor Profiling',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-DEF-005','DEF','Digital Forensics');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-005-S01','RTI-DEF-005','Evidence Acquisition',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-005-S02','RTI-DEF-005','Forensic Analysis',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-DEF-005-S03','RTI-DEF-005','Chain-of-Custody',30);
INSERT OR IGNORE INTO rti_product_categories (code,name,sort_order,is_supporting) VALUES ('ADV','Cyber Strategy & Advisory',40,0);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-ADV-001','ADV','Cybersecurity Blueprint');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-001-S01','RTI-ADV-001','Security Strategy',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-001-S02','RTI-ADV-001','Security Architecture',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-001-S03','RTI-ADV-001','Roadmap',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-ADV-002','ADV','IT Master Plan (ITMP)');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-002-S01','RTI-ADV-002','Enterprise Architecture / TOGAF',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-002-S02','RTI-ADV-002','ITMP',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-ADV-003','ADV','Risk Management Advisory');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-003-S01','RTI-ADV-003','Risk Identification',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-003-S02','RTI-ADV-003','Risk Assessment',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-003-S03','RTI-ADV-003','Mitigation',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-ADV-004','ADV','Technology Strategy');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-004-S01','RTI-ADV-004','Capacity Planning',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-ADV-004-S02','RTI-ADV-004','Infrastructure Procurement Advisory',20);
INSERT OR IGNORE INTO rti_product_categories (code,name,sort_order,is_supporting) VALUES ('TAL','Talent & CyberTroops Academy',50,0);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-001','TAL','Red Team Track');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-001-S01','RTI-TAL-001','VAPT & Exploitation',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-001-S02','RTI-TAL-001','Adversary Simulation',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-002','TAL','Blue Team Track');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-002-S01','RTI-TAL-002','SOC Analyst',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-002-S02','RTI-TAL-002','Threat Hunting',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-002-S03','RTI-TAL-002','Incident Response',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-003','TAL','Purple Sprint');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-003-S01','RTI-TAL-003','Red / Blue Team Collaboration',10);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-004','TAL','Bootcamp 16 Minggu');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-004-S01','RTI-TAL-004','Cyber Range',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-004-S02','RTI-TAL-004','Gate Assessment',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-005','TAL','Hire-Train-Deploy');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-005-S01','RTI-TAL-005','Recruitment',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-005-S02','RTI-TAL-005','Training',20);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-005-S03','RTI-TAL-005','Deployment',30);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-006','TAL','Managed Talent & Bench');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-006-S01','RTI-TAL-006','Managed Talent',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-006-S02','RTI-TAL-006','Talent Bench',20);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-TAL-007','TAL','Sertifikasi BNSP & Global');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-007-S01','RTI-TAL-007','BNSP/LSP',10);
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-TAL-007-S02','RTI-TAL-007','International Certification',20);
INSERT OR IGNORE INTO rti_product_categories (code,name,sort_order,is_supporting) VALUES ('RES','Riset Pendukung — Cyber, PDP & AI',60,1);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-RES-001','RES','Cybersecurity Research');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-RES-001-S01','RTI-RES-001','Threat & Vulnerability Research',10);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-RES-002','RES','PDP Research');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-RES-002-S01','RTI-RES-002','UU PDP Readiness Research',10);
INSERT OR IGNORE INTO rti_products (sku,category_code,name) VALUES ('RTI-RES-003','RES','AI Security');
INSERT OR IGNORE INTO rti_product_scopes (id,product_sku,name,sort_order) VALUES ('RTI-RES-003-S01','RTI-RES-003','AI Threat Detection & AI System Security',10);
