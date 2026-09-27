import React from 'react';
import Link from 'next/link';
import { ServiceDetail } from '@/lib/data/services';
import { ServiceVisualDispatcher } from '../diagrams/service-visuals';
import {
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Wrench,
  Sparkles,
} from 'lucide-react';

export const ServiceTemplate: React.FC<{ service: ServiceDetail }> = ({ service }) => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="w-full bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-navy-900 text-white py-16 sm:py-20 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
              Pillar: {service.pillar}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {service.headline}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              {service.subheadline}
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Visual Section */}
      <section className="py-12 bg-navy-900 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ServiceVisualDispatcher visualType={service.visualType} />
        </div>
      </section>

      {/* Capabilities Chips & Business Outcomes */}
      <section className="py-16 sm:py-20 border-b border-line bg-beige-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Capability Chips */}
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Core Capabilities
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
                Enterprise Sub-Services & Disciplines
              </h2>
              <p className="text-xs sm:text-sm text-muted">
                Each capability is executed under strict governance frameworks and documented against formal acceptance criteria.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {service.capabilities.map((cap, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-line text-xs font-bold text-navy-900 shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Business Outcomes */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Strategic Impact
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-navy-900">
                Measurable Business Outcomes
              </h3>
              <ul className="space-y-3 pt-2">
                {service.outcomes.map((outcome, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-navy-900 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>

              {service.relatedToolSlug && (
                <div className="pt-4 border-t border-line mt-6 flex items-center justify-between">
                  <div className="text-xs text-muted">
                    Test your readiness with our diagnostic tool:
                  </div>
                  <Link
                    href={`/tools/${service.relatedToolSlug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-400"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {service.relatedToolName} &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 sm:py-20 border-b border-line bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted mb-2">
              <HelpCircle className="w-4 h-4 text-gold-500" />
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
              Clear Answers on Engagement Scope & Delivery
            </h2>
          </div>

          <div className="space-y-4">
            {service.faq.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-grey-50 border border-line">
                <h4 className="font-bold text-sm sm:text-base text-navy-900 mb-2">
                  {item.question}
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contextual Micro-CTA */}
      <section className="bg-navy-900 text-white py-14 border-t border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Ready to Advance Your {service.title}?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Discuss your specific scope with our technology leads in an initial 30-minute session.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs sm:text-sm transition shadow flex items-center gap-2"
            >
              <span>{service.ctaText}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
