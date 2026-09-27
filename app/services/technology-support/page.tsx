import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Technology Operations & 24/7 Managed Support',
  description: 'Keeping Technology Running. Reliably. Managed cloud infrastructure and SLA-guaranteed support by PT Riset Teknologi Indonesia.',
};

export default function TechSupportPage() {
  const service = SERVICES_CATALOG['technology-support'];
  return <ServiceTemplate service={service} />;
}
