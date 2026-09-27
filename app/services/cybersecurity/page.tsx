import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Enterprise Cybersecurity Hub | Offensive, Defensive & Governance',
  description: 'Secure Today. Resilient Tomorrow. Integrated enterprise cybersecurity consulting, VAPT, SOC, and governance by PT Riset Teknologi Indonesia.',
};

export default function CyberHubPage() {
  const service = SERVICES_CATALOG['cybersecurity'];
  return <ServiceTemplate service={service} />;
}
