import React from 'react';
import type { Metadata } from 'next';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ServiceTemplate } from '@/components/layout/ServiceTemplate';

export const metadata: Metadata = {
  title: 'Technology & Cyber Maturity Assessment Consulting',
  description: 'Know Where You Are. Define Where You Need to Be. Comprehensive 10-domain maturity benchmarking by PT Riset Teknologi Indonesia.',
};

export default function MaturityAssessmentServicePage() {
  const service = SERVICES_CATALOG['maturity-assessment'];
  return <ServiceTemplate service={service} />;
}
