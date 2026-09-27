import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Cybersecurity Governance & Compliance',
  description: 'Security Starts With Governance. Align security programs with NIST CSF, POJK/SEOJK, and ISO 27001 by PT Riset Teknologi Indonesia.',
};

export default function CyberGovernancePage() {
  const service = SERVICES_CATALOG['cybersecurity-governance'];
  return <ServiceTemplate service={service} />;
}
