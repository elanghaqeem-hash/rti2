import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Defensive Security & Managed SOC Operations',
  description: 'Detect. Defend. Respond. Managed detection and response (MDR) and 24/7 security monitoring by PT Riset Teknologi Indonesia.',
};

export default function CyberDefensivePage() {
  const service = SERVICES_CATALOG['cybersecurity-defensive'];
  return <ServiceTemplate service={service} />;
}
