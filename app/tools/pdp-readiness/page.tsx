import type { Metadata } from 'next';
import { PdpReadinessClient } from '@/components/tools/pdp/PdpReadinessClient';

export const metadata: Metadata = {
  title: 'UU PDP Data Protection Readiness | Risetin',
  description:
    'Self-assessment kesiapan Pelindungan Data Pribadi berdasarkan UU No. 27 Tahun 2022: governance, RoPA, lawful processing, hak subjek data, DPIA, DPO, vendor, breach response, security, dan cross-border transfer.',
};

export default function PdpReadinessPage() {
  return <PdpReadinessClient />;
}
