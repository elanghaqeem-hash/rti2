'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MATURITY_DOMAINS, Domain } from '@/lib/data/assessment-questions';
import { LeadModal } from '@/components/tools/LeadModal';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Download,
  Share2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function MaturityAssessmentPage() {
  const [currentDomainIdx, setCurrentDomainIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Restore from sessionStorage on load
  useEffect(() => {
    const savedScores = sessionStorage.getItem('rti_maturity_scores');
    const savedTargets = sessionStorage.getItem('rti_maturity_targets');
    if (savedScores) setScores(JSON.parse(savedScores));
    if (savedTargets) setTargets(JSON.parse(savedTargets));
  }, []);

  const currentDomain = MATURITY_DOMAINS[currentDomainIdx];

  const handleSelectScore = (domainId: string, level: number) => {
    const nextScores = { ...scores, [domainId]: level };
    setScores(nextScores);
    sessionStorage.setItem('rti_maturity_scores', JSON.stringify(nextScores));

    // Default target if not set
    if (!targets[domainId]) {
      const nextTargets = { ...targets, [domainId]: currentDomain.defaultTarget };
      setTargets(nextTargets);
      sessionStorage.setItem('rti_maturity_targets', JSON.stringify(nextTargets));
    }

    if (currentDomainIdx < MATURITY_DOMAINS.length - 1) {
      setCurrentDomainIdx(currentDomainIdx + 1);
    } else {
      setCompleted(true);
    }
  };

  const calculateRadarCoordinates = (val: number, index: number, total: number, radius: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const x = 160 + (val / 5) * radius * Math.cos(angle);
    const y = 160 + (val / 5) * radius * Math.sin(angle);
    return { x, y };
  };

  const domainCount = MATURITY_DOMAINS.length;
  const currentPolygon = MATURITY_DOMAINS.map((d, i) => {
    const score = scores[d.id] || 2;
    const { x, y } = calculateRadarCoordinates(score, i, domainCount, 110);
    return `${x},${y}`;
  }).join(' ');

  const targetPolygon = MATURITY_DOMAINS.map((d, i) => {
    const target = targets[d.id] || d.defaultTarget;
    const { x, y } = calculateRadarCoordinates(target, i, domainCount, 110);
    return `${x},${y}`;
  }).join(' ');

  // Compute gaps
  const gapAnalysis = MATURITY_DOMAINS.map((d) => {
    const current = scores[d.id] || 2;
    const target = targets[d.id] || d.defaultTarget;
    const gap = Math.max(0, target - current);
    return { ...d, current, target, gap };
  }).sort((a, b) => b.gap - a.gap);

  return (
    <div className="w-full bg-white min-h-screen">
      {/* Header */}
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-3">
              <BarChart3 className="w-3.5 h-3.5" />
              10-Domain Diagnostic Tool
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Technology & Cyber Maturity Self-Assessment
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Benchmark your current operational and security baseline against target enterprise standards. Instant visual radar analysis with zero login required.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!completed ? (
            /* WIZARD QUESTION STEPS */
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-line p-6 sm:p-10 shadow-sm">
              {/* Progress Stepper */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Domain {currentDomainIdx + 1} of {MATURITY_DOMAINS.length}: {currentDomain.name}
                </span>
                <span className="text-xs font-bold text-navy-900">
                  {Math.round(((currentDomainIdx + 1) / MATURITY_DOMAINS.length) * 100)}% Completed
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-navy-900 mb-2">
                    {currentDomain.questions[0].text}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Select the statement that most accurately reflects your organization&apos;s active operational reality today:
                  </p>
                </div>

                {/* Option Level Choices */}
                <div className="space-y-3">
                  {currentDomain.questions[0].options.map((opt) => (
                    <button
                      key={opt.level}
                      onClick={() => handleSelectScore(currentDomain.id, opt.level)}
                      className="w-full text-left p-4 rounded-xl border border-line hover:border-gold-500/80 hover:bg-beige-50/50 hover:shadow-sm transition-all group flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      <span className="w-8 h-8 rounded-lg bg-grey-50 text-navy-900 font-extrabold text-sm flex items-center justify-center shrink-0 border border-line group-hover:bg-gold-500 group-hover:text-navy-900 transition-colors">
                        L{opt.level}
                      </span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-navy-900 mb-0.5">
                          {opt.label}
                        </div>
                        <div className="text-xs text-muted leading-relaxed">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Target Score Selector */}
                <div className="pt-4 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-muted">Target Maturity Desire for this Domain:</span>
                  <select
                    value={targets[currentDomain.id] || currentDomain.defaultTarget}
                    onChange={(e) =>
                      setTargets({ ...targets, [currentDomain.id]: Number(e.target.value) })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-line font-bold text-navy-900 bg-white"
                  >
                    <option value={3}>Level 3 (Defined)</option>
                    <option value={4}>Level 4 (Managed - Recommended)</option>
                    <option value={5}>Level 5 (Optimized / Elite)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* RESULTS DASHBOARD */
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white rounded-2xl border border-line p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Assessment Evaluation Complete
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                    Your Technology Maturity Benchmark
                  </h2>
                  <p className="text-xs sm:text-sm text-muted mt-1">
                    Comparative radar scorecard: <strong className="text-blue-600">Current Baseline</strong> vs. <strong className="text-gold-600">Target Standard</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('rti_maturity_scores');
                      setScores({});
                      setCompleted(false);
                      setCurrentDomainIdx(0);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-navy-900 hover:bg-grey-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-muted" />
                    Reset
                  </button>

                  <button
                    onClick={() => setShowLeadModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Executive PDF Report
                  </button>
                </div>
              </div>

              {/* Radar Chart & Heatmap Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Visual SVG Radar */}
                <div className="lg:col-span-5 bg-navy-900 text-white p-6 rounded-2xl border border-navy-700 shadow-md flex flex-col items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gold-300 mb-4">
                    Current vs. Target Maturity Polygon
                  </h3>

                  <svg viewBox="0 0 320 320" className="w-full max-w-[280px] h-auto">
                    {/* Concentric Guide Circles */}
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <circle
                        key={lvl}
                        cx="160"
                        cy="160"
                        r={(lvl / 5) * 110}
                        stroke="#1B3E70"
                        strokeWidth="1"
                        fill="none"
                        strokeDasharray="2 4"
                      />
                    ))}

                    {/* Target Polygon (Gold) */}
                    <polygon
                      points={targetPolygon}
                      stroke="#E4A11B"
                      strokeWidth="2"
                      fill="rgba(228, 161, 27, 0.15)"
                    />

                    {/* Current Polygon (Blue) */}
                    <polygon
                      points={currentPolygon}
                      stroke="#4F86F0"
                      strokeWidth="2.5"
                      fill="rgba(79, 134, 240, 0.35)"
                    />

                    {/* Labels */}
                    {MATURITY_DOMAINS.map((d, i) => {
                      const { x, y } = calculateRadarCoordinates(5.6, i, domainCount, 110);
                      return (
                        <text
                          key={d.id}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {d.shortName}
                        </text>
                      );
                    })}
                  </svg>

                  <div className="flex items-center gap-6 mt-6 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Current Level</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gold-500" />
                      <span>Target Level</span>
                    </div>
                  </div>
                </div>

                {/* Top Priority Gaps & Actionable Quick Wins */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                    <h3 className="text-base font-extrabold text-navy-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gold-500" />
                      Top Priority Capability Gaps & Recommended Services
                    </h3>

                    <div className="space-y-3">
                      {gapAnalysis.slice(0, 4).map((g) => (
                        <div
                          key={g.id}
                          className="p-4 rounded-xl bg-grey-50 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-xs text-navy-900">{g.name}</div>
                            <div className="text-[11px] text-muted mt-0.5">
                              Current: <strong>L{g.current}</strong> &rarr; Target: <strong>L{g.target}</strong> (Gap: {g.gap} Level)
                            </div>
                          </div>

                          <Link
                            href={g.recommendedServiceUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 text-white font-bold text-[11px] hover:bg-navy-700 transition shrink-0"
                          >
                            <span>{g.recommendedService}</span>
                            <ArrowRight className="w-3 h-3 text-gold-400" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consultation Banner */}
                  <div className="bg-beige-50 border border-beige-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-navy-900">
                        Review These Findings with a Principal Architect
                      </h4>
                      <p className="text-xs text-muted mt-1">
                        Book a complimentary 30-minute deep-dive to review roadmaps and remediation efforts.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLeadModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-700 transition shrink-0"
                    >
                      Receive Full Assessment Package
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <LeadModal
          toolSlug="maturity-assessment"
          toolName="10-Domain Technology Maturity Assessment"
          summaryData={{ scores, targets, topGap: gapAnalysis[0]?.name }}
          onClose={() => setShowLeadModal(false)}
          onSuccess={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
