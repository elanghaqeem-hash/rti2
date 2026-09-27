import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Offensive Security & Penetration Testing (VAPT)',
  description: 'Find Weaknesses Before Attackers Do. Ethical penetration testing, red teaming, and code reviews by PT Riset Teknologi Indonesia.',
};

export default function CyberOffensivePage() {
  const service = SERVICES_CATALOG['cybersecurity-offensive'];
  return <ServiceTemplate service={service} />;
}
