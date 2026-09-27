import { NextResponse } from 'next/server';
import { PARAMETER_GROUP_MAP } from '@/lib/parameters/catalog';
import {
  resolveParameterGroups,
  ParameterDatabaseUnavailableError,
} from '@/lib/parameters/repository';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = (url.searchParams.get('groups') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const groupKeys = requested.length
    ? requested.filter((key) => Boolean(PARAMETER_GROUP_MAP[key]))
    : Object.keys(PARAMETER_GROUP_MAP);

  try {
    const groups = await resolveParameterGroups(groupKeys);
    return NextResponse.json(
      { success: true, groups },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (!(error instanceof ParameterDatabaseUnavailableError)) {
      console.error(
        'Parameter API failed:',
        error instanceof Error ? error.message : String(error),
      );
    }

    const groups = Object.fromEntries(
      groupKeys.map((key) => [
        key,
        (PARAMETER_GROUP_MAP[key]?.options || [])
          .map((item) => ({ ...item, group: key, system: true }))
          .filter((item) => item.active),
      ]),
    );

    return NextResponse.json(
      { success: true, groups, database: { connected: false } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
