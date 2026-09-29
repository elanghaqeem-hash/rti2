import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { getRuntimeDatabase } from '@/lib/server/runtime-database';
import { validateAdminCredentials } from '@/lib/admin/auth';

export type InternalIdentity = {
  sub: string;
  userId: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  authSource: 'database' | 'legacy-env';
};

const PASSWORD_ALGO = 'scrypt-v1';
const KEYLEN = 64;

function normalizeUsername(value: string) {
  return String(value || '').trim().toLowerCase().slice(0, 120);
}

export function validateInternalPasswordPolicy(password: string) {
  const value = String(password || '');
  if (value.length < 12) return 'Password minimal 12 karakter.';
  if (value.length > 256) return 'Password terlalu panjang.';
  if (!/[a-z]/.test(value)) return 'Password harus mengandung huruf kecil.';
  if (!/[A-Z]/.test(value)) return 'Password harus mengandung huruf besar.';
  if (!/\d/.test(value)) return 'Password harus mengandung angka.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password harus mengandung simbol.';
  return null;
}

export function hashInternalPassword(password: string, salt?: string) {
  const policyError = validateInternalPasswordPolicy(password);
  if (policyError) throw new Error(policyError);
  const actualSalt = salt || randomBytes(24).toString('base64url');
  return {
    hash: scryptSync(password, actualSalt, KEYLEN).toString('base64url'),
    salt: actualSalt,
    algorithm: PASSWORD_ALGO,
  };
}

function verifyPassword(password: string, salt: string, expected: string, algorithm: string) {
  if (algorithm !== PASSWORD_ALGO || !salt || !expected) return false;
  try {
    const actual = scryptSync(password, salt, KEYLEN);
    const target = Buffer.from(expected, 'base64url');
    return actual.length === target.length && timingSafeEqual(actual, target);
  } catch {
    return false;
  }
}

async function identityForUser(userId: string): Promise<InternalIdentity | null> {
  const db = await getRuntimeDatabase();
  const user = await db.queryOne<any>(
    'SELECT id,username,must_change_password,is_active FROM users WHERE id=?',
    [userId],
  );
  if (!user || Number(user.is_active) !== 1) return null;

  const roles = await db.queryAll<{ code: string }>(
    'SELECT r.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id ' +
      'WHERE ur.user_id=? AND r.is_active=1 ORDER BY r.code',
    [userId],
  );
  const permissions = await db.queryAll<{ code: string }>(
    'SELECT DISTINCT p.code FROM user_roles ur ' +
      'JOIN roles r ON r.id=ur.role_id AND r.is_active=1 ' +
      'JOIN role_permissions rp ON rp.role_id=r.id ' +
      'JOIN permissions p ON p.id=rp.permission_id ' +
      'WHERE ur.user_id=? ORDER BY p.code',
    [userId],
  );

  return {
    sub: String(user.username),
    userId: String(user.id),
    roles: roles.map((row) => row.code),
    permissions: permissions.map((row) => row.code),
    mustChangePassword: Number(user.must_change_password) === 1,
    authSource: 'database',
  };
}

export async function authenticateInternalUser(
  username: string,
  password: string,
): Promise<InternalIdentity | null> {
  const normalized = normalizeUsername(username);

  try {
    const db = await getRuntimeDatabase();
    const row = await db.queryOne<any>(
      'SELECT id,password_hash,password_salt,password_algo,is_active ' +
        'FROM users WHERE lower(username)=?',
      [normalized],
    );
    if (row) {
      if (Number(row.is_active) !== 1) return null;
      if (!verifyPassword(password, String(row.password_salt), String(row.password_hash), String(row.password_algo))) {
        return null;
      }
      const now = new Date().toISOString();
      await db.run('UPDATE users SET last_login_at=?,updated_at=? WHERE id=?', [now, now, row.id]);
      return identityForUser(String(row.id));
    }
  } catch (error) {
    console.warn(
      'Database-backed internal authentication unavailable:',
      error instanceof Error ? error.message : String(error),
    );
  }

  if (validateAdminCredentials(username, password)) {
    return {
      sub: String(username).trim(),
      userId: null,
      roles: ['super_admin'],
      permissions: ['*'],
      mustChangePassword: false,
      authSource: 'legacy-env',
    };
  }
  return null;
}

async function audit(
  entityId: string,
  action: string,
  actor: string,
  before: unknown,
  after: unknown,
) {
  const db = await getRuntimeDatabase();
  await db.run(
    'INSERT INTO estimator_audit_logs ' +
      '(id,entity_type,entity_id,action,actor,before_json,after_json,created_at) ' +
      'VALUES (?,?,?,?,?,?,?,?)',
    [
      randomUUID(),
      'internal_user',
      entityId,
      action,
      actor,
      before == null ? null : JSON.stringify(before),
      after == null ? null : JSON.stringify(after),
      new Date().toISOString(),
    ],
  );
}

export async function listInternalAccess() {
  const db = await getRuntimeDatabase();
  const [users, roles, permissions] = await Promise.all([
    db.queryAll<any>(
      "SELECT u.id,u.username,u.display_name,u.email,u.must_change_password,u.is_active," +
        "u.created_by,u.last_login_at,u.created_at,u.updated_at,GROUP_CONCAT(r.code, ',') AS role_codes " +
        'FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id ' +
        'GROUP BY u.id ORDER BY u.display_name,u.username',
    ),
    db.queryAll<any>(
      "SELECT r.id,r.code,r.name,r.description,r.is_active,GROUP_CONCAT(p.code, ',') AS permission_codes " +
        'FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id ' +
        'LEFT JOIN permissions p ON p.id=rp.permission_id GROUP BY r.id ORDER BY r.name',
    ),
    db.queryAll<any>('SELECT id,code,name,description FROM permissions ORDER BY code'),
  ]);

  return {
    users: users.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email || '',
      mustChangePassword: Number(row.must_change_password) === 1,
      active: Number(row.is_active) === 1,
      roles: String(row.role_codes || '').split(',').filter(Boolean),
      createdBy: row.created_by || '',
      lastLoginAt: row.last_login_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    roles: roles.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || '',
      active: Number(row.is_active) === 1,
      permissions: String(row.permission_codes || '').split(',').filter(Boolean),
    })),
    permissions: permissions.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || '',
    })),
  };
}

function rolePlaceholders(roles: string[]) {
  return roles.map(() => '?').join(',');
}

export async function createInternalUser(params: {
  username: string;
  displayName: string;
  email?: string;
  initialPassword: string;
  roleCodes: string[];
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const username = normalizeUsername(params.username);
  const displayName = String(params.displayName || '').trim().slice(0, 180);
  const email = String(params.email || '').trim().toLowerCase().slice(0, 254);
  if (!username || !/^[a-z0-9._-]+$/.test(username)) {
    throw new Error('Username hanya boleh berisi huruf kecil, angka, titik, underscore, dan dash.');
  }
  if (!displayName) throw new Error('Display name wajib diisi.');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Format email tidak valid.');

  const roleCodes = Array.from(new Set((params.roleCodes || []).map(String))).slice(0, 12);
  if (!roleCodes.length) throw new Error('Minimal satu role wajib dipilih.');
  const roleRows = await db.queryAll<{ id: string; code: string }>(
    'SELECT id,code FROM roles WHERE code IN (' + rolePlaceholders(roleCodes) + ') AND is_active=1',
    roleCodes,
  );
  if (roleRows.length !== roleCodes.length) throw new Error('Satu atau lebih role tidak valid.');

  const existing = await db.queryOne<{ id: string }>(
    "SELECT id FROM users WHERE lower(username)=? OR (?<>'' AND lower(email)=?)",
    [username, email, email],
  );
  if (existing) throw new Error('Username atau email sudah digunakan.');

  const credential = hashInternalPassword(params.initialPassword);
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.batch([
    {
      sql:
        'INSERT INTO users ' +
        '(id,username,display_name,email,password_hash,password_salt,password_algo,' +
        'must_change_password,is_active,created_by,created_at,updated_at) ' +
        'VALUES (?,?,?,?,?,?,?,1,1,?,?,?)',
      params: [
        id,
        username,
        displayName,
        email || null,
        credential.hash,
        credential.salt,
        credential.algorithm,
        params.actor,
        now,
        now,
      ],
    },
    ...roleRows.map((role) => ({
      sql: 'INSERT INTO user_roles(user_id,role_id,assigned_by,assigned_at) VALUES (?,?,?,?)',
      params: [id, role.id, params.actor, now],
    })),
  ]);

  await audit(id, 'create', params.actor, null, {
    username,
    displayName,
    email: email || null,
    roles: roleCodes,
    mustChangePassword: true,
  });
  return id;
}

export async function updateInternalUser(params: {
  userId: string;
  displayName?: string;
  email?: string;
  active?: boolean;
  roleCodes?: string[];
  resetPassword?: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const before = await db.queryOne<any>(
    'SELECT id,username,display_name,email,must_change_password,is_active FROM users WHERE id=?',
    [params.userId],
  );
  if (!before) throw new Error('User tidak ditemukan.');

  const statements: Array<{ sql: string; params?: Array<string | number | bigint | null> }> = [];
  const sets: string[] = [];
  const values: Array<string | number | bigint | null> = [];

  if (params.displayName !== undefined) {
    const value = String(params.displayName).trim().slice(0, 180);
    if (!value) throw new Error('Display name wajib diisi.');
    sets.push('display_name=?');
    values.push(value);
  }
  if (params.email !== undefined) {
    const value = String(params.email).trim().toLowerCase().slice(0, 254);
    if (value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) throw new Error('Format email tidak valid.');
    sets.push('email=?');
    values.push(value || null);
  }
  if (params.active !== undefined) {
    sets.push('is_active=?');
    values.push(params.active ? 1 : 0);
  }
  if (params.resetPassword) {
    const credential = hashInternalPassword(params.resetPassword);
    sets.push('password_hash=?', 'password_salt=?', 'password_algo=?', 'must_change_password=1');
    values.push(credential.hash, credential.salt, credential.algorithm);
  }
  if (sets.length) {
    sets.push('updated_at=?');
    values.push(new Date().toISOString(), params.userId);
    statements.push({
      sql: 'UPDATE users SET ' + sets.join(',') + ' WHERE id=?',
      params: values,
    });
  }

  if (params.roleCodes) {
    const roleCodes = Array.from(new Set(params.roleCodes.map(String))).slice(0, 12);
    if (!roleCodes.length) throw new Error('Minimal satu role wajib dipilih.');
    const roleRows = await db.queryAll<{ id: string; code: string }>(
      'SELECT id,code FROM roles WHERE code IN (' + rolePlaceholders(roleCodes) + ') AND is_active=1',
      roleCodes,
    );
    if (roleRows.length !== roleCodes.length) throw new Error('Satu atau lebih role tidak valid.');
    statements.push({ sql: 'DELETE FROM user_roles WHERE user_id=?', params: [params.userId] });
    const now = new Date().toISOString();
    statements.push(
      ...roleRows.map((role) => ({
        sql: 'INSERT INTO user_roles(user_id,role_id,assigned_by,assigned_at) VALUES (?,?,?,?)',
        params: [params.userId, role.id, params.actor, now],
      })),
    );
  }

  if (!statements.length) throw new Error('Tidak ada perubahan user.');
  await db.batch(statements);
  await audit(params.userId, 'update', params.actor, before, {
    displayName: params.displayName,
    email: params.email,
    active: params.active,
    roles: params.roleCodes,
    passwordReset: Boolean(params.resetPassword),
  });
}

export async function changeOwnPassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  actor: string;
}) {
  const db = await getRuntimeDatabase();
  const row = await db.queryOne<any>(
    'SELECT id,password_hash,password_salt,password_algo FROM users WHERE id=? AND is_active=1',
    [params.userId],
  );
  if (!row) throw new Error('User tidak ditemukan.');
  if (!verifyPassword(params.currentPassword, row.password_salt, row.password_hash, row.password_algo)) {
    throw new Error('Password saat ini tidak valid.');
  }
  const credential = hashInternalPassword(params.newPassword);
  await db.run(
    'UPDATE users SET password_hash=?,password_salt=?,password_algo=?,must_change_password=0,updated_at=? WHERE id=?',
    [credential.hash, credential.salt, credential.algorithm, new Date().toISOString(), params.userId],
  );
  await audit(params.userId, 'password_change', params.actor, null, { mustChangePassword: false });
}
