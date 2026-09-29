-- RTI Project Estimator / Internal Access v6.4
-- Granular RBAC for internal RTI users.
-- No default password/user account is seeded in source control.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'scrypt-v1',
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_by TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, username);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

INSERT OR IGNORE INTO roles (id,code,name,description,is_active,created_at,updated_at) VALUES
  ('role-super-admin','super_admin','Super Admin','Full internal access including user, policy and security administration.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-management','management','Management / Director','Management review, policy approval, quotation approval and analytics.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-sales-head','sales_head','Sales Head','Sales pipeline ownership, quotation review and delegated commercial approval.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-sales','sales','Sales','Lead/scoping collaboration and quotation preparation.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-presales','presales','Pre-Sales','Technical discovery, scope validation and quotation preparation.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-tech-lead','tech_lead','Tech Lead','Technical validation for software development and support engagements.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-security-lead','security_lead','Security Lead','Technical validation for VAPT, security and governance engagements.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-trainer-lead','trainer_lead','Trainer Lead','Training scope and delivery validation.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('role-finance','finance','Finance','Commercial costing, quotation financial review and reporting.',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO permissions (id,code,name,description,created_at) VALUES
  ('perm-scoping-read','scoping:read','Read scoping','View estimator sessions and scope.',CURRENT_TIMESTAMP),
  ('perm-scoping-write','scoping:write','Edit scoping','Update internal project scope and assumptions.',CURRENT_TIMESTAMP),
  ('perm-scoping-validate','scoping:validate','Validate scoping','Validate technical scope for quotation readiness.',CURRENT_TIMESTAMP),
  ('perm-pricing-read','pricing:read','Read pricing','View internal BoQ and pricing bands.',CURRENT_TIMESTAMP),
  ('perm-pricing-write','pricing:write','Edit pricing','Edit BoQ and commercial costing.',CURRENT_TIMESTAMP),
  ('perm-pricing-override','pricing:override','Override pricing','Request or apply controlled pricing exceptions.',CURRENT_TIMESTAMP),
  ('perm-quotation-read','quotation:read','Read quotation','View quotations.',CURRENT_TIMESTAMP),
  ('perm-quotation-create','quotation:create','Create quotation','Create quotations from validated estimates.',CURRENT_TIMESTAMP),
  ('perm-quotation-approve','quotation:approve','Approve quotation','Approve or reject quotations within workflow.',CURRENT_TIMESTAMP),
  ('perm-quotation-send','quotation:send','Send quotation','Mark/send approved quotations.',CURRENT_TIMESTAMP),
  ('perm-policy-read','policy:read','Read policy','View estimator commercial policy and calibration.',CURRENT_TIMESTAMP),
  ('perm-policy-write','policy:write','Edit policy','Edit draft policy, segments and calibration data.',CURRENT_TIMESTAMP),
  ('perm-policy-publish','policy:publish','Publish policy','Publish an approved estimator policy.',CURRENT_TIMESTAMP),
  ('perm-catalog-read','catalog:read','Read catalog','View estimator catalog/configuration.',CURRENT_TIMESTAMP),
  ('perm-catalog-write','catalog:write','Edit catalog','Edit estimator services/questions/rules/resources.',CURRENT_TIMESTAMP),
  ('perm-users-read','users:read','Read users','View RTI internal users and assignments.',CURRENT_TIMESTAMP),
  ('perm-users-write','users:write','Manage users','Create/disable users and assign roles.',CURRENT_TIMESTAMP),
  ('perm-analytics-read','analytics:read','Read analytics','View estimator funnel, KPI and estimate accuracy.',CURRENT_TIMESTAMP),
  ('perm-portal-manage','portal:manage','Manage client portal','Respond to client portal communication.',CURRENT_TIMESTAMP),
  ('perm-retention-read','retention:read','Read retention','Preview privacy retention candidates.',CURRENT_TIMESTAMP),
  ('perm-retention-run','retention:run','Run retention','Execute approved anonymization retention jobs.',CURRENT_TIMESTAMP),
  ('perm-ai-audit','ai:audit','Read AI audit','Review AI scoping audit/provenance records.',CURRENT_TIMESTAMP);

-- Super Admin and Management receive full permissions.
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-super-admin', id FROM permissions;
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-management', id FROM permissions;

-- Sales Head
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-sales-head', id FROM permissions WHERE code IN (
  'scoping:read','scoping:write','scoping:validate','pricing:read',
  'quotation:read','quotation:create','quotation:approve','quotation:send',
  'analytics:read','portal:manage'
);

-- Sales
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-sales', id FROM permissions WHERE code IN (
  'scoping:read','scoping:write','quotation:read','quotation:create','quotation:send',
  'analytics:read','portal:manage'
);

-- Pre-Sales
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-presales', id FROM permissions WHERE code IN (
  'scoping:read','scoping:write','scoping:validate','pricing:read',
  'quotation:read','quotation:create','analytics:read','ai:audit','portal:manage'
);

-- Technical leads
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-tech-lead', id FROM permissions WHERE code IN (
  'scoping:read','scoping:write','scoping:validate','quotation:read','ai:audit'
);
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-security-lead', id FROM permissions WHERE code IN (
  'scoping:read','scoping:write','scoping:validate','quotation:read','ai:audit'
);
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-trainer-lead', id FROM permissions WHERE code IN (
  'scoping:read','scoping:write','scoping:validate','quotation:read'
);

-- Finance
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
SELECT 'role-finance', id FROM permissions WHERE code IN (
  'pricing:read','pricing:write','quotation:read','quotation:approve','analytics:read'
);
