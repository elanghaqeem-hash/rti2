'use client';

import { useEffect, useState } from 'react';
import {
  getDefaultParameterOptions,
  type ParameterOption,
} from '@/lib/parameters/catalog';

export function useParameterGroups(groupKeys: string[]) {
  const stableKey = groupKeys.join(',');
  const [groups, setGroups] = useState<Record<string, ParameterOption[]>>(() =>
    Object.fromEntries(
      groupKeys.map((key) => [key, getDefaultParameterOptions(key).filter((item) => item.active)]),
    ),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/parameters?groups=${encodeURIComponent(stableKey)}`,
          { cache: 'no-store' },
        );
        const data = await response.json().catch(() => null);
        if (!cancelled && response.ok && data?.groups) {
          setGroups(data.groups);
        }
      } catch {
        // Defaults are intentionally retained when remote configuration is unavailable.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [stableKey]);

  return groups;
}

export function useParameterOptions(groupKey: string): ParameterOption[] {
  const groups = useParameterGroups([groupKey]);
  return groups[groupKey] || [];
}
