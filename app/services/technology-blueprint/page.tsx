import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Technology Blueprint & Enterprise Master Plan',
  description: 'Build Technology With Direction. Enterprise architecture master plans and multi-year roadmaps by PT Riset Teknologi Indonesia.',
};

export default function TechBlueprintPage() {
  const service = SERVICES_CATALOG['technology-blueprint'];
  return <ServiceTemplate service={service} />;
}
