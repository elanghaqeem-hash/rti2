import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVICES_CATALOG } from '@/lib/data/services';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Services Ecosystem & Enterprise Capabilities',
  description:
    'Jelajahi 13 layanan terintegrasi PT Riset Teknologi Indonesia: Technology Advisory, Software Engineering, Operations Support, GRC, Cybersecurity, dan Workforce Development.',
};

export default function ServicesOverviewPage() {
  const servicesList = Object.values(SERVICES_CATALOG);

  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Layers className="w-3.5 h-3.5" />
              Integrated Technology Partner
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              A Unified Ecosystem of Technology Capabilities
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              We eliminate the overhead of managing fragmented software houses, cybersecurity contractors, and strategy consultants. Every discipline operates in harmony to move your business forward.
            </p>
          </div>
        </div>
      </section>

      {/* Grid of all 13 Services */}
      <section className="py-20 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesList.map((srv) => (
              <div
                key={srv.slug}
                className="bg-white p-6 rounded-2xl border border-line hover:border-gold-500/50 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {srv.pillar}
                    </span>
                    <Sparkles className="w-4 h-4 text-muted group-hover:text-gold-500 transition-colors" />
                  </div>
                  <h3 className="text-lg font-extrabold text-navy-900 group-hover:text-blue-600 transition-colors">
                    {srv.title}
                  </h3>
                  <p className="text-xs text-muted mt-2 line-clamp-3 leading-relaxed">
                    {srv.subheadline}
                  </p>
                  <div className="mt-4 pt-3 border-t border-line/60">
                    <span className="text-[11px] font-bold text-navy-900 block mb-1">
                      Key Outcomes:
                    </span>
                    <p className="text-[11px] text-muted italic">
                      &ldquo;{srv.outcomes[0]}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between">
                  <Link
                    href={`/services/${srv.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 group-hover:text-blue-600 transition"
                  >
                    <span>View Service Specifications</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gold-500 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
