import type { Metadata } from 'next';
import { Iso27001Readiness } from '@/components/tools/Iso27001Readiness';

export const metadata: Metadata = {
  title: 'ISO/IEC 27001 Readiness Checklist | RTI',
  description:
    'RTI ISO/IEC 27001:2022 readiness diagnostic for Clauses 4–10, Annex A controls, evidence, gap analysis and certification preparation roadmap.',
};

export default function Iso27001ReadinessPage() {
  return <Iso27001Readiness />;
}
