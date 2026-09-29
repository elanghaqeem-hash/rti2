import { NextResponse } from 'next/server';
import { adminSessionFromRequest, adminSessionHasPermission } from '@/lib/admin/auth';
import { enforceSameOriginMutation } from '@/lib/security/request-protection';
import {
  PARAMETER_GROUP_MAP,
  PARAMETER_GROUPS,
  getDefaultParameterOptions,
  type ParameterOption,
} from '@/lib/parameters/catalog';
import {
  deactivateParameterOption,
  listParameterOverrides,
  upsertParameterOption
} from '@/lib/parameters/repository';

export const runtime = 'nodejs';

function unauthorized(status=401, error='Admin authentication required.') {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function requirePermission(req: Request, permission: string) {
  const session=adminSessionFromRequest(req);
  if(!session) return {session:null as any,response:unauthorized()};
  if(!adminSessionHasPermission(session,permission)){
    return {session,response:unauthorized(403,session.mustChangePassword?'Password change required.':'Insufficient permission.')};
  }
  return {session,response:null};
}

function validateOption(value: unknown): ParameterOption {
  if (!value || typeof value !== 'object') throw new Error('invalid');
  const item = value as Record<string, unknown>;
  const group = String(item.group || '').trim();
  const optionValue = String(item.value || '').trim();
  const label = String(item.label || '').trim();
  const description = String(item.description || '').trim();
  const sortOrder = Number(item.sortOrder ?? 0);
  const active = item.active !== false;

  if (!PARAMETER_GROUP_MAP[group] || !optionValue || !label) throw new Error('invalid');
  if (!Number.isFinite(sortOrder)) throw new Error('invalid');

  const defaultItem = getDefaultParameterOptions(group).find(
    (entry) => entry.value === optionValue,
  );

  return {
    group,
    value: optionValue.slice(0, 160),
    label: label.slice(0, 240),
    description: description ? description.slice(0, 1000) : undefined,
    sortOrder: Math.max(-10000, Math.min(10000, Math.trunc(sortOrder))),
    active,
    system: Boolean(defaultItem),
  };
}

export async function GET(req: Request) {
  const gate=requirePermission(req,'parameters:read');
  if(gate.response) return gate.response;

  const groupKeys = PARAMETER_GROUPS.map((group) => group.key);
  let overrides: ParameterOption[] = [];

  try {
    overrides = await listParameterOverrides(groupKeys);
  } catch {
    return NextResponse.json(
      {
        success: false,
        groups: PARAMETER_GROUPS,
        database: { connected: false },
        error: 'Database server RTI belum tersedia atau migration parameter belum diterapkan.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const overrideMap = new Map(
    overrides.map((item) => [`${item.group}::${item.value}`, item]),
  );

  const groups = PARAMETER_GROUPS.map((group) => ({
    ...group,
    options: [
      ...getDefaultParameterOptions(group.key).map(
        (item) => overrideMap.get(`${group.key}::${item.value}`) || item,
      ),
      ...overrides.filter(
        (item) =>
          item.group === group.key &&
          !getDefaultParameterOptions(group.key).some(
            (defaultItem) => defaultItem.value === item.value,
          ),
      ),
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
  }));

  return NextResponse.json(
    { success: true, groups, database: { connected: true } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PUT(req: Request) {
  const gate=requirePermission(req,'parameters:write');
  if(gate.response) return gate.response;
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed) return unauthorized(403,origin.reason||'Cross-origin request denied.');

  const body = await req.json().catch(() => null);
  let option: ParameterOption;

  try {
    option = validateOption(body?.option);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Parameter tidak valid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    await upsertParameterOption(option);
    return NextResponse.json(
      { success: true, option },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Database server RTI belum tersedia atau migration parameter belum diterapkan.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function DELETE(req: Request) {
  const gate=requirePermission(req,'parameters:write');
  if(gate.response) return gate.response;
  const origin=enforceSameOriginMutation(req);
  if(!origin.allowed) return unauthorized(403,origin.reason||'Cross-origin request denied.');

  const body = await req.json().catch(() => null);
  const group = String(body?.group || '').trim();
  const value = String(body?.value || '').trim();

  if (!PARAMETER_GROUP_MAP[group] || !value) {
    return NextResponse.json(
      { success: false, error: 'Parameter tidak valid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    await deactivateParameterOption(group, value);
    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Database server RTI belum tersedia atau migration parameter belum diterapkan.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
