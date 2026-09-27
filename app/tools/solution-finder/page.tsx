'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  CheckCircle2,
  ArrowRight,
  Layers,
  Sparkles,
  MessageSquare,
  FileCheck,
} from 'lucide-react';

export default function SolutionFinderPage() {
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState('banking_insurance');
  const [challenges, setChallenges] = useState<string[]>([]);
  const [scale, setScale] = useState('enterprise_large');
  const [urgency, setUrgency] = useState('immediate');
  const [completed, setCompleted] = useState(false);

  const toggleChallenge = (c: string) => {
    if (challenges.includes(c)) {
      setChallenges(challenges.filter((item) => item !== c));
    } else {
      setChallenges([...challenges, c]);
    }
  };

  const CHALLENGE_OPTIONS = [
    { id: 'app_modernization', label: 'Legacy Core Modernization & Slow Development Releases' },
    { id: 'audit_regulatory', label: 'Mandatory Regulatory Audit Pressure (OJK / BI / BSSN / UU PDP)' },
    { id: 'cyber_vulnerabilities', label: 'Recent Cyber Incidents or Unverified Attack Surface Exposure' },
    { id: 'system_instability', label: 'Frequent Infrastructure Downtime & High Incident Resolution Times' },
    { id: 'no_clear_roadmap', label: 'Absence of Multi-Year IT Master Plan & Architecture Direction' },
    { id: 'workforce_gap', label: 'Internal Developer Security Habits & Cyber Awareness Gaps' },
  ];

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Compass className="w-3.5 h-3.5" />
              Strategic Alignment Engine
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Enterprise Solution Finder
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Match your organizational sector, challenges, and timeline with the ideal engagement model and service package.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {!completed ? (
            <div className="bg-white rounded-2xl border border-line p-6 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Step 0{step} of 04
                </span>
                <span className="text-xs font-bold text-navy-900">
                  {Math.round((step / 4) * 100)}% Completed
                </span>
              </div>

              {/* STEP 1: SECTOR */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-navy-900">
                    Which sector describes your organization best?
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'banking_insurance', label: 'Banking & Financial Services' },
                      { id: 'fintech_payments', label: 'Fintech & Payment Gateway' },
                      { id: 'government_bumn', label: 'Government & BUMN / BUMD' },
                      { id: 'energy_resources', label: 'Energy, Natural Resources & Utilities' },
                      { id: 'enterprise_commercial', label: 'Diversified Conglomerate / Corporate' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSector(s.id)}
                        className={`p-4 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all ${
                          sector === s.id
                            ? 'bg-navy-900 text-white border-navy-900 shadow'
                            : 'bg-grey-50 border-line text-navy-900 hover:bg-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: CHALLENGES */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-navy-900">
                    What are your primary technology challenges right now? (Select all that apply)
                  </h3>
                  <div className="space-y-2.5">
                    {CHALLENGE_OPTIONS.map((c) => {
                      const isSelected = challenges.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleChallenge(c.id)}
                          className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-beige-50 border-gold-500 shadow-sm'
                              : 'bg-grey-50 border-line hover:bg-white'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 ${
                              isSelected
                                ? 'bg-gold-500 border-gold-500 text-navy-900'
                                : 'border-line bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-navy-900">
                            {c.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: SCALE */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-navy-900">
                    What is your approximate organizational size / user base?
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'scale_growing', label: 'Growing Tier (< 250 Employees / Regional)' },
                      { id: 'scale_mid', label: 'Mid-Market (250 – 1,000 Employees)' },
                      { id: 'scale_enterprise', label: 'Large Enterprise (1,000 – 5,000 Employees)' },
                      { id: 'scale_conglomerate', label: 'Mission-Critical / National Institution' },
                    ].map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setScale(sc.id)}
                        className={`p-4 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all ${
                          scale === sc.id
                            ? 'bg-navy-900 text-white border-navy-900 shadow'
                            : 'bg-grey-50 border-line text-navy-900 hover:bg-white'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: URGENCY */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-navy-900">
                    What is your execution horizon / urgency?
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'immediate', label: 'Immediate (< 30 Days)' },
                      { id: 'quarterly', label: 'This Quarter (1 – 3 Months)' },
                      { id: 'planning', label: 'Strategic Planning (3 – 6 Months)' },
                    ].map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id)}
                        className={`p-4 rounded-xl border text-left font-bold text-xs transition-all ${
                          urgency === u.id
                            ? 'bg-navy-900 text-white border-navy-900 shadow'
                            : 'bg-grey-50 border-line text-navy-900 hover:bg-white'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stepper Buttons */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="text-xs font-bold text-muted hover:text-navy-900"
                  >
                    &larr; Previous Step
                  </button>
                ) : <div />}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-700 transition"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCompleted(true)}
                    className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow"
                  >
                    View Tailored Solution Package &rarr;
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* RESULTS PACKAGE */
            <div className="bg-white rounded-2xl border border-line p-6 sm:p-10 shadow-sm space-y-8 animate-fade-in">
              <div className="pb-6 border-b border-line">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-600 block mb-1">
                  Tailored Capability Recommendations
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                  Recommended Architecture & Engagement Roadmap
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-beige-50 border border-beige-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                    Primary Service Disciplines
                  </span>
                  <h3 className="font-extrabold text-base text-navy-900 mb-2">
                    Integrated Transformation Package
                  </h3>
                  <ul className="space-y-2 text-xs text-navy-900">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Technology Blueprint & Target Architecture</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Offensive VAPT & Security-By-Design Code Review</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Policy, SOP & Regulatory Compliance Matrix (UU PDP)</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-grey-50 border border-line">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 block mb-1">
                    Optimal Engagement Model
                  </span>
                  <h3 className="font-extrabold text-base text-navy-900 mb-2">
                    Hybrid Advisory + Delivery Sprints
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Begins with an intensive 4-week architectural baseline sprint, followed by parallel software delivery and security hardening waves.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/contact"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow text-center"
                >
                  Request a Formal Proposal
                </Link>

                <button
                  onClick={() => {
                    setStep(1);
                    setCompleted(false);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-line text-xs font-bold text-navy-900 hover:bg-grey-50 text-center"
                >
                  Modify Parameters
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
