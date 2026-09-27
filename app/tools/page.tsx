import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  ShieldAlert,
  Compass,
  Lock,
  Calculator,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Clock,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Interactive B2B Tools & Diagnostic Engines',
  description:
    'Alat diagnostik teknologi, kematangan keamanan siber, dan kesiapan regulasi (UU PDP, ISO 27001, NIST CSF) tanpa login oleh PT Riset Teknologi Indonesia.',
};

export default function ToolsHubPage() {
  const tools = [
    {
      title: 'Technology & Cyber Maturity Assessment',
      slug: 'maturity-assessment',
      tag: 'Comprehensive Benchmark',
      time: '5–10 Mins',
      desc: '20-domain technology and cyber diagnostic with a 20-question quick path, 120-question comprehensive path, evidence confidence, gap analysis, and transformation roadmap.',
      icon: BarChart3,
      badgeColor: 'bg-gold-500/20 text-gold-700',
    },
    {
      title: 'NIST Cyber Quick Check',
      slug: 'cyber-quick-check',
      tag: 'NIST CSF 2.0',
      time: '5 Mins',
      desc: 'Rapid diagnostic of Govern, Identify, Protect, Detect, Respond, and Recover posture with instant risk score and quick wins.',
      icon: ShieldAlert,
      badgeColor: 'bg-rose-50 text-rose-600',
    },
    {
      title: 'Enterprise Solution Finder',
      slug: 'solution-finder',
      tag: 'Strategic Matchmaking',
      time: '3 Mins',
      desc: 'Interactive 4-step wizard matching your sector, organizational scale, and core pressures to optimal delivery models and service blueprints.',
      icon: Compass,
      badgeColor: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Passive Website Security Headers Check',
      slug: 'security-headers-check',
      tag: 'Instant Passive Analysis',
      time: 'Instant',
      desc: 'Test your public domain for modern HTTP security headers (CSP, HSTS, X-Frame-Options) and TLS certificates with strict anti-SSRF protection.',
      icon: Lock,
      badgeColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Project Estimator & RFQ Builder',
      slug: 'project-estimator',
      tag: 'Effort & Timeline Sizing',
      time: '4 Mins',
      desc: 'Calculate indicative T-shirt sizing and development timelines for custom software applications and VAPT penetration testing scopes.',
      icon: Calculator,
      badgeColor: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'ISO/IEC 27001 Readiness Checklist',
      slug: 'iso27001-readiness',
      tag: 'ISMS Certification Prep',
      time: '7 Mins',
      desc: 'Self-evaluate against Clauses 4–10 and Annex A control themes (Organizational, People, Physical, Technological) before formal stage audits.',
      icon: FileCheck,
      badgeColor: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'UU PDP Data Protection Readiness',
      slug: 'pdp-readiness',
      tag: 'UU No. 27/2022',
      time: '6 Mins',
      desc: 'Evaluate RoPA readiness, DPO appointment, DPIA execution, consent mechanisms, and cross-border transfer compliance under Indonesian law.',
      icon: ShieldCheck,
      badgeColor: 'bg-teal-50 text-teal-700',
    },
  ];

  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              Diagnostic Suite
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Interactive B2B Tools & Readiness Checkers
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Explore self-service maturity benchmarks, estimators, and compliance checkers. Receive immediate gap insights with zero login required.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.slug}
                  className="bg-white rounded-2xl p-6 border border-line hover:border-gold-500/50 hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-grey-50 border border-line flex items-center justify-center text-navy-900 group-hover:text-blue-600 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${t.badgeColor}`}>
                        {t.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-navy-900 group-hover:text-blue-600 transition-colors mb-2">
                      {t.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {t.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gold-500" />
                      {t.time}
                    </span>

                    <Link
                      href={`/tools/${t.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-navy-900 group-hover:text-blue-600 transition"
                    >
                      <span>Launch Tool</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gold-500 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
