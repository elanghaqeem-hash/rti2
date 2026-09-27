import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Landmark,
  Shield,
  Zap,
  Building2,
  Flame,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Industry Expertise & Regulated Sectors',
  description:
    'Solusi teknologi terarah untuk industri perbankan, asuransi, fintech, BUMN, pemerintahan, dan korporasi energi di Indonesia.',
};

export default function IndustriesPage() {
  const industries = [
    {
      id: 'banking',
      name: 'Banking & Financial Institutions',
      icon: Landmark,
      challenges: [
        'Mandatory compliance with POJK/SEOJK on IT Risk & Cyber Resilience',
        'Legacy core system integration with modern open banking APIs',
        'Strict high-availability (99.99%) uptime requirements',
      ],
      solutions: [
        'Enterprise IT Blueprint & Architecture',
        'Annual Mandatory VAPT & Red Teaming',
        '24/7 Managed SOC & Incident Response',
      ],
      link: '/contact?industry=banking',
    },
    {
      id: 'insurance',
      name: 'Insurance & Reinsurance',
      icon: Shield,
      challenges: [
        'Protection of high-volume policyholder personal data (UU PDP)',
        'Complex claims processing workflows and legacy core modernization',
        'Regulatory reporting automation',
      ],
      solutions: [
        'UU PDP Data Protection Impact Assessment (DPIA)',
        'Custom Cloud-Native Policy & Claims Platforms',
        'ISO/IEC 27001 ISMS Implementation',
      ],
      link: '/contact?industry=insurance',
    },
    {
      id: 'fintech',
      name: 'Fintech & Digital Payments',
      icon: Zap,
      challenges: [
        'PCI-DSS and Bank Indonesia payment system security standards',
        'Microservice scale for surge traffic and flash transactions',
        'Zero-trust API security and fraud defense',
      ],
      solutions: [
        'Secure API & Payment Gateway Engineering',
        'Payment Switch & Host-to-Host (H2H) Architecture',
        'Real-time automated code vulnerability scanning',
      ],
      link: '/contact?industry=fintech',
    },
    {
      id: 'government',
      name: 'Government & BUMN / BUMD',
      icon: Building2,
      challenges: [
        'Compliance with SPBE (Sistem Pemerintahan Berbasis Elektronik) & BSSN',
        'National critical infrastructure protection',
        'Transparent multi-stakeholder governance and audit trails',
      ],
      solutions: [
        'SPBE & IT Master Plan Formulation',
        'Critical Infrastructure Hardening & Penetration Testing',
        'Workforce Cybersecurity & Secure Coding Upskilling',
      ],
      link: '/contact?industry=government',
    },
    {
      id: 'energy',
      name: 'Energy, Natural Resources & Utilities',
      icon: Flame,
      challenges: [
        'Convergence of IT and Operational Technology (OT/SCADA)',
        'Remote field operations connectivity & distributed telemetry',
        'Supply chain and third-party vendor risk',
      ],
      solutions: [
        'OT / SCADA Security Architecture Reviews',
        'High-Reliability Cloud & Edge Data Pipelines',
        'Third-Party Vendor Cyber Risk Management (TPCRM)',
      ],
      link: '/contact?industry=energy',
    },
  ];

  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
              Sector Specialization
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Built for Highly Regulated & Mission-Critical Sectors
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              We understand that technology choices in banking, public institutions, and fintech cannot be treated like generic IT. We engineer solutions around real regulatory constraints, operational resilience, and zero-compromise security.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {industries.map((ind) => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.id}
                className="bg-white rounded-2xl border border-line p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-navy-900">
                        {ind.name}
                      </h3>
                      <p className="text-xs text-muted">Specialized Architecture & Regulatory Assurance</p>
                    </div>
                  </div>

                  <Link
                    href={ind.link}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 text-white font-bold text-xs hover:bg-navy-700 transition shrink-0"
                  >
                    <span>Discuss Sector Requirements</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-3">
                      Common Sector Pressures:
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm text-navy-900">
                      {ind.challenges.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3">
                      How Risetin Solves It:
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm text-navy-900">
                      {ind.solutions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
