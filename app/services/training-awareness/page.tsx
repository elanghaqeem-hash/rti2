import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Corporate Training & Capability Development',
  description: 'Technology Works Better When People Understand It. Corporate cybersecurity awareness and engineering bootcamps by PT Riset Teknologi Indonesia.',
};

export default function TrainingAwarenessServicePage() {
  const service = SERVICES_CATALOG['training-awareness'];
  return <ServiceTemplate service={service} />;
}
