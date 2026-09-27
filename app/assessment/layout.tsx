import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology & Cyber Maturity Self-Assessment',
  description:
    'RTI Technology & Cyber Maturity Self-Assessment untuk mengukur maturity, gap, risk exposure, evidence confidence, dan transformation roadmap organisasi.',
  alternates: {
    canonical: '/assessment',
  },
};

export default function AssessmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
