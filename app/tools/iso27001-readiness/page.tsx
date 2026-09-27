'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeadModal } from '@/components/tools/LeadModal';
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Shield,
  Download,
} from 'lucide-react';

interface ClauseItem {
  id: string;
  clause: string;
  title: string;
  desc: string;
}

const CLAUSES: ClauseItem[] = [
  { id: 'c4', clause: 'Clause 4', title: 'Context of the Organization', desc: 'Internal/external issues and stakeholder expectations determined and documented.' },
  { id: 'c5', clause: 'Clause 5', title: 'Leadership & Commitment', desc: 'Executive information security policy approved and roles/responsibilities assigned.' },
  { id: 'c6', clause: 'Clause 6', title: 'Planning & Risk Assessment', desc: 'Formal risk assessment methodology and Statement of Applicability (SoA) formulated.' },
  { id: 'c7', clause: 'Clause 7', title: 'Support & Resource Allocation', desc: 'Competence, awareness training programs, and documented information controls active.' },
  { id: 'c8', clause: 'Clause 8', title: 'Operation & Control Implementation', desc: 'Security risk treatment plans executed according to defined criteria.' },
  { id: 'c9', clause: 'Clause 9', title: 'Performance Evaluation & Internal Audit', desc: 'Documented internal audit program and formal Management Review Meeting completed.' },
  { id: 'c10', clause: 'Clause 10', title: 'Continual Improvement', desc: 'Non-conformity remediation and corrective action logs actively maintained.' },
];

export default function IsoReadinessPage() {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [showLeadModal, setShowLeadModal] = useState(false);

  const toggleClause = (id: string) => {
    setCompletedMap({ ...completedMap, [id]: !completedMap[id] });
  };

  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const percentage = Math.round((completedCount / CLAUSES.length) * 100);

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <FileCheck className="w-3.5 h-3.5" />
              ISO/IEC 27001:2022 Diagnostic
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              ISO/IEC 27001 Readiness Checklist
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Evaluate your management system readiness across Clauses 4–10 before formal Stage 1 and Stage 2 certification audits.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Progress Header */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Readiness Scorecard
              </span>
              <div className="text-2xl sm:text-3xl font-black text-navy-900 mt-0.5">
                {percentage}% Completed ({completedCount}/{CLAUSES.length} Clauses)
              </div>
            </div>

            <button
              onClick={() => setShowLeadModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Readiness Report
            </button>
          </div>

          {/* Checklist Items */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-3">
            {CLAUSES.map((c) => {
              const isChecked = Boolean(completedMap[c.id]);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClause(c.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-4 ${
                    isChecked
                      ? 'bg-beige-50 border-gold-500 shadow-sm'
                      : 'bg-grey-50 border-line hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 ${
                      isChecked
                        ? 'bg-gold-500 border-gold-500 text-navy-900'
                        : 'border-line bg-white'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {c.clause}
                      </span>
                      <strong className="text-xs sm:text-sm text-navy-900">{c.title}</strong>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{c.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legal Disclaimer Box */}
          <div className="p-4 bg-beige-50 border border-beige-200 rounded-xl text-xs text-navy-900 flex items-start gap-3">
            <Shield className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Catatan Kepatuhan:</strong> Sertifikasi ISO/IEC 27001 resmi diterbitkan oleh Badan Sertifikasi terakreditasi independen. PT Riset Teknologi Indonesia bertindak sebagai mitra konsultan pendamping implementasi, penyusunan ISMS, dan internal auditor untuk memastikan organisasi Anda siap lulus audit.
            </div>
          </div>
        </div>
      </section>

      {showLeadModal && (
        <LeadModal
          toolSlug="iso27001-readiness"
          toolName="ISO 27001 Readiness Diagnostic"
          summaryData={{ percentage, completedCount }}
          onClose={() => setShowLeadModal(false)}
          onSuccess={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
