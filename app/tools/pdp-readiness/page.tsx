import type { Metadata } from 'next';
import { PdpReadinessAssessment } from '@/components/tools/PdpReadinessAssessment';

export const metadata: Metadata = {
  title: 'UU PDP Data Protection Readiness',
  description:
    'Assessment kesiapan Pelindungan Data Pribadi berdasarkan UU No. 27 Tahun 2022 dengan evidence maturity, readiness gates, gap register, dan remediation roadmap.',
};

export default function PdpReadinessPage() {
  return <PdpReadinessAssessment />;
}
