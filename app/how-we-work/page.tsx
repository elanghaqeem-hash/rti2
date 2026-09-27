import React from 'react';
import type { Metadata } from 'next';
import { LifecycleSeven } from '@/components/diagrams/LifecycleSeven';
import {
  Compass,
  Briefcase,
  Headphones,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How We Work | 7-Step Delivery Model & Engagement Framework',
  description:
    'Metodologi 7 langkah dan 4 model kemitraan PT Riset Teknologi Indonesia: Advisory, Project-Based, Managed Service, dan Capability Development.',
};

export default function HowWeWorkPage() {
  const models = [
    {
      title: 'Advisory & Architecture',
      tag: 'Strategic Guidance',
      desc: 'High-impact consultations, technology blueprints, maturity assessments, and CISO/CTO advisory to set clear executive direction.',
      icon: Compass,
      bestFor: 'Organizations planning large transitions or needing regulatory clarity.',
    },
    {
      title: 'Project-Based Delivery',
      tag: 'Turnkey Execution',
      desc: 'Full-lifecycle software engineering, VAPT engagements, or ISO readiness projects delivered under fixed scope and milestones.',
      icon: Briefcase,
      bestFor: 'Defined software builds, penetration tests, and compliance certifications.',
    },
    {
      title: 'Managed Service & SLA',
      tag: 'Continuous Operations',
      desc: '24/7 dedicated technology support, SOC monitoring, and Site Reliability Engineering with guaranteed uptime SLAs.',
      icon: Headphones,
      bestFor: 'Enterprises requiring reliable 24/7 operations without expanding internal headcount.',
    },
    {
      title: 'Capability Development',
      tag: 'Talent Empowerment',
      desc: 'Custom developer bootcamps, secure coding training, and employee cybersecurity awareness programs.',
      icon: GraduationCap,
      bestFor: 'Companies seeking to build self-sufficient internal technical culture.',
    },
  ];

  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              Engagement Models
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Flexible Engagement. Defined Outcomes.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              We structure our collaboration to fit your organizational maturity, internal resources, and delivery urgency.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Engagement Model Cards */}
      <section className="py-20 bg-grey-50 border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Partnership Options
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight mt-1">
              Four Tailored Engagement Models
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {models.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-line hover:border-gold-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 block mb-1">
                      {m.tag}
                    </span>
                    <h3 className="text-lg font-extrabold text-navy-900 mb-2">
                      {m.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">
                      {m.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-line/60">
                    <span className="text-[11px] font-bold text-navy-900 block">Best Suited For:</span>
                    <p className="text-[11px] text-muted mt-0.5">{m.bestFor}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Flow Banner */}
          <div className="mt-12 bg-beige-50 rounded-2xl p-6 border border-beige-200 text-center">
            <div className="text-xs font-extrabold uppercase tracking-widest text-navy-700 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              <span>YOUR STRATEGIC NEED</span>
              <span>&rarr;</span>
              <span className="text-blue-600">RISETIN ENGAGEMENT</span>
              <span>&rarr;</span>
              <span>DISCIPLINED DELIVERY</span>
              <span>&rarr;</span>
              <span className="text-emerald-600">MEASURABLE BUSINESS OUTCOME</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7-Step Lifecycle */}
      <LifecycleSeven />
    </div>
  );
}
