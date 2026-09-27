import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'IT Policy, SOP & Enterprise Governance',
  description: 'From Governance Principles to Operational Practice. IT controls and standard operating procedures by PT Riset Teknologi Indonesia.',
};

export default function PolicySopPage() {
  const service = SERVICES_CATALOG['policy-sop-governance'];
  return <ServiceTemplate service={service} />;
}
