import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Enterprise Software Development & Engineering',
  description: 'We Build Technology Around Your Business. High-throughput, secure web, mobile, and API systems by PT Riset Teknologi Indonesia.',
};

export default function SoftwareDevPage() {
  const service = SERVICES_CATALOG['software-development'];
  return <ServiceTemplate service={service} />;
}
