import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Technology Advisory & Strategy Roadmaps',
  description: 'Turning Strategy Into Technology Roadmaps. PT Riset Teknologi Indonesia helps enterprises build pragmatic 3-year digital blueprints.',
};

export default function TechAdvisoryPage() {
  const service = SERVICES_CATALOG['technology-advisory'];
  return <ServiceTemplate service={service} />;
}
