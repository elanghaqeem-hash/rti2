import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'ISO & Standards Consulting (ISO/IEC 27001)',
  description: 'From Readiness to Certification. ISO/IEC 27001, 27701, and 20000 readiness and implementation consulting by PT Riset Teknologi Indonesia.',
};

export default function IsoStandardsPage() {
  const service = SERVICES_CATALOG['iso-standards'];
  return <ServiceTemplate service={service} />;
}
