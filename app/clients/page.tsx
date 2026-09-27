import React from 'react';
import type { Metadata } from 'next';
import { ClientsSection } from '@/components/layout/ClientsSection';
import { ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';
import { BRAND_CONFIG } from '@/lib/config/contact';

export const metadata: Metadata = {
  title: 'Selected Clients & Case Evidence Policy',
  description:
    'Organisasi dan institusi yang bermitra dengan PT Riset Teknologi Indonesia di sektor perbankan, BUMN, fintech, dan pemerintahan.',
};

export default function ClientsPage() {
  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              Institutional Track Record
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Selected Clients & Engagements
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              We partner with prominent commercial banks, sovereign bodies, payment gateways, and national enterprises.
            </p>
          </div>
        </div>
      </section>

      {/* Main Filterable Clients Roster */}
      <ClientsSection />

      {/* Client Evidence & NDA Transparency Statement */}
      <section className="py-16 sm:py-20 bg-beige-50 border-b border-beige-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-line shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-navy-900">
                Client Evidence & Confidentiality Protocol
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-navy-900 leading-relaxed">
              {BRAND_CONFIG.legalName} upholds strict Non-Disclosure Agreements (NDAs). Due to the sensitive nature of cybersecurity engagements (such as offensive penetration testing, vulnerability discoveries, and incident response retainers), detailed findings, architectural diagrams, and project deliverables are strictly classified and protected under client privilege.
            </p>
            <div className="pt-2 border-t border-line text-xs text-muted space-y-2">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Client logos and wordmarks are displayed solely under documented permission.</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Anonymized reference case studies and credential letters are available upon qualified executive request.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
