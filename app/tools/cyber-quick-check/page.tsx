'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { NIST_QUESTIONS, NistQuestion } from '@/lib/data/nist-questions';
import { LeadModal } from '@/components/tools/LeadModal';
import { useParameterOptions } from '@/components/parameters/useParameterOptions';
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Download,
  ArrowRight,
} from 'lucide-react';

export default function CyberQuickCheckPage() {
  const answerOptions = useParameterOptions('cyber_quick.answer_scale');
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'partial' | 'no'>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);

  const handleAnswer = (qId: string, val: 'yes' | 'partial' | 'no') => {
    setAnswers({ ...answers, [qId]: val });
  };

  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = answeredCount === NIST_QUESTIONS.length;

  // Calculate scores per function
  const functionScores: Record<string, { total: number; score: number }> = {
    Govern: { total: 0, score: 0 },
    Identify: { total: 0, score: 0 },
    Protect: { total: 0, score: 0 },
    Detect: { total: 0, score: 0 },
    Respond: { total: 0, score: 0 },
    Recover: { total: 0, score: 0 },
  };

  NIST_QUESTIONS.forEach((q) => {
    functionScores[q.func].total += 10;
    const ans = answers[q.id];
    if (ans === 'yes') functionScores[q.func].score += 10;
    else if (ans === 'partial') functionScores[q.func].score += 5;
  });

  const totalMax = NIST_QUESTIONS.length * 10;
  const totalScore = Object.values(functionScores).reduce((acc, curr) => acc + curr.score, 0);
  const percentage = Math.round((totalScore / totalMax) * 100);

  let riskLevel = 'Critical Exposure';
  let riskColor = 'text-rose-600 bg-rose-50 border-rose-200';
  if (percentage >= 80) {
    riskLevel = 'Resilient Posture';
    riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  } else if (percentage >= 55) {
    riskLevel = 'Moderate Risk';
    riskColor = 'text-gold-600 bg-gold-50 border-gold-200';
  } else if (percentage >= 35) {
    riskLevel = 'Elevated Risk';
    riskColor = 'text-orange-600 bg-orange-50 border-orange-200';
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              NIST CSF 2.0 &bull; 5-Minute Diagnostic
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Cyber Quick Check
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Rapidly identify exposure across Govern, Identify, Protect, Detect, Respond, and Recover functions.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {!submitted ? (
            <div className="bg-white rounded-2xl border border-line p-6 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Questions Answered: {answeredCount} of {NIST_QUESTIONS.length}
                </span>
                <span className="text-xs font-bold text-navy-900">
                  {Math.round((answeredCount / NIST_QUESTIONS.length) * 100)}%
                </span>
              </div>

              <div className="space-y-6">
                {NIST_QUESTIONS.map((q, idx) => {
                  const currentAns = answers[q.id];
                  return (
                    <div key={q.id} className="p-4 rounded-xl bg-grey-50 border border-line">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                          {q.func}
                        </span>
                        <span className="text-xs font-mono text-muted">#{idx + 1}</span>
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-navy-900 mb-3">
                        {q.prompt}
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        {answerOptions.map((option) => {
                          const Icon =
                            option.value === 'yes'
                              ? CheckCircle2
                              : option.value === 'partial'
                                ? AlertCircle
                                : XCircle;
                          const selectedClass =
                            option.value === 'yes'
                              ? 'bg-emerald-600 text-white shadow'
                              : option.value === 'partial'
                                ? 'bg-gold-500 text-navy-900 shadow'
                                : 'bg-rose-600 text-white shadow';
                          const hoverClass =
                            option.value === 'yes'
                              ? 'hover:bg-emerald-50'
                              : option.value === 'partial'
                                ? 'hover:bg-gold-50'
                                : 'hover:bg-rose-50';

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleAnswer(q.id, option.value as 'yes' | 'partial' | 'no')}
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                currentAns === option.value
                                  ? selectedClass
                                  : `bg-white border border-line text-navy-900 ${hoverClass}`
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-line flex justify-end">
                <button
                  disabled={!isAllAnswered}
                  onClick={() => setSubmitted(true)}
                  className="px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow disabled:opacity-40"
                >
                  Calculate Cyber Score &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* SCORE RESULTS */
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-line p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Overall Cyber Resilience Score
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl sm:text-5xl font-black text-navy-900">
                      {percentage}%
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${riskColor}`}>
                      {riskLevel}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAnswers({});
                      setSubmitted(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-line text-xs font-bold hover:bg-grey-50"
                  >
                    Retake
                  </button>
                  <button
                    onClick={() => setShowLeadModal(true)}
                    className="px-5 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs shadow flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF Report
                  </button>
                </div>
              </div>

              {/* Breakdown by NIST CSF 2.0 Function */}
              <div className="bg-white rounded-2xl border border-line p-6 sm:p-8 shadow-sm">
                <h3 className="font-extrabold text-base text-navy-900 mb-4">
                  Posture by NIST CSF 2.0 Core Function
                </h3>

                <div className="space-y-3">
                  {Object.entries(functionScores).map(([func, val]) => {
                    const funcPct = Math.round((val.score / val.total) * 100);
                    return (
                      <div key={func} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-navy-900">{func}</span>
                          <span className="text-muted">{funcPct}%</span>
                        </div>
                        <div className="w-full bg-grey-50 rounded-full h-2.5 border border-line overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              funcPct >= 75
                                ? 'bg-emerald-500'
                                : funcPct >= 40
                                ? 'bg-gold-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${funcPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Top Action Priorities */}
              <div className="bg-beige-50 border border-beige-200 rounded-2xl p-6 sm:p-8 space-y-4">
                <h3 className="font-extrabold text-base text-navy-900">
                  Recommended Immediate Remediations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-line">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                      Priority 01
                    </span>
                    <h4 className="font-bold text-xs text-navy-900 mb-1">
                      Independent VAPT
                    </h4>
                    <p className="text-[11px] text-muted">
                      Uncover exploitable OWASP flaws before adversaries discover them.
                    </p>
                    <Link
                      href="/services/cybersecurity/offensive"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-3"
                    >
                      Offensive Security &rarr;
                    </Link>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-line">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 block mb-1">
                      Priority 02
                    </span>
                    <h4 className="font-bold text-xs text-navy-900 mb-1">
                      24/7 Managed SOC Telemetry
                    </h4>
                    <p className="text-[11px] text-muted">
                      Centralize SIEM correlation to stop lateral attacker movement.
                    </p>
                    <Link
                      href="/services/cybersecurity/defensive"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-3"
                    >
                      Defensive SOC &rarr;
                    </Link>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-line">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                      Priority 03
                    </span>
                    <h4 className="font-bold text-xs text-navy-900 mb-1">
                      ISO 27001 & UU PDP Audit
                    </h4>
                    <p className="text-[11px] text-muted">
                      Formalize policies, RoPA, and third-party risk governance.
                    </p>
                    <Link
                      href="/services/iso-standards"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-3"
                    >
                      ISO Standards &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {showLeadModal && (
        <LeadModal
          toolSlug="cyber-quick-check"
          toolName="NIST Cyber Quick Check Report"
          summaryData={{ percentage, riskLevel, functionScores }}
          onClose={() => setShowLeadModal(false)}
          onSuccess={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
