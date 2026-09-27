'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileCheck2,
  Gauge,
  Layers3,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
} from 'lucide-react';
import {
  ASSESSMENT_FRAMEWORKS,
  ASSESSMENT_VERSION,
  COMPREHENSIVE_ASSESSMENT_QUESTION_COUNT,
  MATURITY_DOMAINS,
  QUICK_ASSESSMENT_QUESTION_COUNT,
  type Question,
} from '@/lib/data/assessment-questions';
import {
  getApplicableDomains,
  type AssessmentMode,
  type AssessmentProfile,
  type AssessmentResult,
} from '@/lib/assessment/engine';
import { BRAND_CONFIG } from '@/lib/config/contact';

type Stage = 'landing' | 'profile' | 'questions' | 'results';

interface DraftState {
  stage: Stage;
  mode: AssessmentMode;
  profile: AssessmentProfile;
  currentIndex: number;
  answers: Record<string, number>;
  targets: Record<string, number>;
  evidence: Record<string, boolean>;
  evidenceNames: Record<string, string>;
  result: AssessmentResult | null;
  assessmentRef: string;
}

const STORAGE_KEY = 'rti_technology_cyber_maturity_v2026_09';

const initialProfile: AssessmentProfile = {
  companyName: '',
  industry: '',
  companySize: '',
  regulated: 'unsure',
  cloudAdoption: 'limited',
  aiAdoption: 'pilot',
};

const industryOptions = [
  'Bank / BPR / BPRS',
  'Multifinance',
  'Insurance',
  'Fintech / Payment',
  'Securities / Capital Market',
  'Government / Public Sector',
  'BUMN / BUMD',
  'Healthcare',
  'Manufacturing',
  'Retail / E-Commerce',
  'Education',
  'Technology / Digital Platform',
  'Other',
];

const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'txt', 'csv'];

function createAssessmentRef() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `RTI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
  return `RTI-${Date.now().toString(36).toUpperCase()}`;
}

function scoreBand(score: number) {
  if (score >= 4.25) return { label: 'Leading', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (score >= 3.5) return { label: 'Good', className: 'bg-blue-50 text-blue-800 border-blue-200' };
  if (score >= 2.5) return { label: 'Moderate Gap', className: 'bg-amber-50 text-amber-900 border-amber-200' };
  if (score >= 1.5) return { label: 'Major Gap', className: 'bg-orange-50 text-orange-900 border-orange-200' };
  return { label: 'Critical Gap', className: 'bg-rose-50 text-rose-800 border-rose-200' };
}

function priorityClass(priority: string) {
  if (priority === 'Critical') return 'bg-rose-50 text-rose-800 border-rose-200';
  if (priority === 'High') return 'bg-orange-50 text-orange-900 border-orange-200';
  if (priority === 'Medium') return 'bg-amber-50 text-amber-900 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function RadarChart({
  scores,
  targets,
}: {
  scores: Array<{ id: string; shortName: string; current: number; target: number }>;
  targets?: boolean;
}) {
  const selected = scores.slice(0, 10);
  const radius = 112;
  const center = 160;
  const point = (value: number, index: number) => {
    const angle = (Math.PI * 2 * index) / selected.length - Math.PI / 2;
    return {
      x: center + (value / 5) * radius * Math.cos(angle),
      y: center + (value / 5) * radius * Math.sin(angle),
    };
  };

  const currentPolygon = selected.map((item, index) => {
    const p = point(item.current, index);
    return `${p.x},${p.y}`;
  }).join(' ');

  const targetPolygon = selected.map((item, index) => {
    const p = point(item.target, index);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5 text-white shadow-sm">
      <div className="mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-300">
          Current vs Target
        </p>
        <h3 className="mt-1 text-sm font-extrabold">10-Domain Executive Radar</h3>
      </div>
      <svg viewBox="0 0 320 320" className="mx-auto h-auto w-full max-w-[320px]" role="img" aria-label="Radar chart current versus target maturity">
        {[1, 2, 3, 4, 5].map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 5) * radius}
            fill="none"
            stroke="#1B3E70"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}
        {selected.map((_, index) => {
          const p = point(5, index);
          return <line key={index} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#1B3E70" strokeWidth="1" />;
        })}
        {targets !== false && (
          <polygon points={targetPolygon} fill="rgba(228,161,27,.12)" stroke="#E4A11B" strokeWidth="2" />
        )}
        <polygon points={currentPolygon} fill="rgba(79,134,240,.28)" stroke="#4F86F0" strokeWidth="2.5" />
        {selected.map((item, index) => {
          const angle = (Math.PI * 2 * index) / selected.length - Math.PI / 2;
          const x = center + 138 * Math.cos(angle);
          const y = center + 138 * Math.sin(angle);
          return (
            <text key={item.id} x={x} y={y} textAnchor="middle" fill="#CBD5E1" fontSize="8.5" fontWeight="700">
              {item.shortName}
            </text>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-300">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />Current</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gold-500" />Target</span>
      </div>
    </div>
  );
}

export default function TechnologyCyberMaturityAssessmentPage() {
  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState<Stage>('landing');
  const [mode, setMode] = useState<AssessmentMode>('quick');
  const [profile, setProfile] = useState<AssessmentProfile>(initialProfile);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [evidence, setEvidence] = useState<Record<string, boolean>>({});
  const [evidenceNames, setEvidenceNames] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [assessmentRef, setAssessmentRef] = useState('');
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHelp, setAiHelp] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as Partial<DraftState>;
        if (draft.mode === 'quick' || draft.mode === 'comprehensive') setMode(draft.mode);
        if (draft.profile) setProfile({ ...initialProfile, ...draft.profile });
        if (draft.answers) setAnswers(draft.answers);
        if (draft.targets) setTargets(draft.targets);
        if (draft.evidence) setEvidence(draft.evidence);
        if (draft.evidenceNames) setEvidenceNames(draft.evidenceNames);
        if (typeof draft.currentIndex === 'number') setCurrentIndex(draft.currentIndex);
        if (draft.result) setResult(draft.result);
        if (draft.assessmentRef) setAssessmentRef(draft.assessmentRef);
        if (draft.stage && ['landing', 'profile', 'questions', 'results'].includes(draft.stage)) {
          setStage(draft.stage);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setAssessmentRef((current) => current || createAssessmentRef());
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !assessmentRef) return;
    const draft: DraftState = {
      stage,
      mode,
      profile,
      currentIndex,
      answers,
      targets,
      evidence,
      evidenceNames,
      result,
      assessmentRef,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [hydrated, stage, mode, profile, currentIndex, answers, targets, evidence, evidenceNames, result, assessmentRef]);

  const applicableDomains = useMemo(
    () => getApplicableDomains(mode, profile),
    [mode, profile],
  );

  const questions = useMemo(
    () => applicableDomains.flatMap((domain) => domain.questions),
    [applicableDomains],
  );

  const currentQuestion = questions[currentIndex];
  const currentDomain = currentQuestion
    ? applicableDomains.find((domain) => domain.id === currentQuestion.domainId)
    : undefined;

  const answeredCount = questions.filter((question) => Number.isFinite(answers[question.id])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  const startAssessment = (selectedMode: AssessmentMode) => {
    setMode(selectedMode);
    setStage('profile');
    setCurrentIndex(0);
    setResult(null);
    setScoreError('');
  };

  const resetAssessment = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStage('landing');
    setMode('quick');
    setProfile(initialProfile);
    setCurrentIndex(0);
    setAnswers({});
    setTargets({});
    setEvidence({});
    setEvidenceNames({});
    setResult(null);
    setScoreError('');
    setAiHelp('');
    setAssessmentRef(createAssessmentRef());
  };

  const handleProfileContinue = (event: React.FormEvent) => {
    event.preventDefault();
    setCurrentIndex(0);
    setStage('questions');
    setScoreError('');
  };

  const handleAnswer = (question: Question, level: number) => {
    setAnswers((current) => ({ ...current, [question.id]: level }));
    if (currentDomain && !Number.isFinite(targets[currentDomain.id])) {
      setTargets((current) => ({ ...current, [currentDomain.id]: currentDomain.defaultTarget }));
    }
  };

  const nextQuestion = () => {
    if (!currentQuestion || !Number.isFinite(answers[currentQuestion.id])) return;
    setAiHelp('');
    setFileError('');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
    }
  };

  const previousQuestion = () => {
    setAiHelp('');
    setFileError('');
    setCurrentIndex((value) => Math.max(0, value - 1));
  };

  const submitAssessment = async () => {
    if (answeredCount !== questions.length) {
      setScoreError('Lengkapi seluruh pertanyaan yang berlaku sebelum finalisasi assessment.');
      return;
    }

    setScoreLoading(true);
    setScoreError('');

    try {
      const response = await fetch('/api/assessment/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, profile, answers, targets, evidence }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.result) {
        throw new Error(data?.error || 'Scoring service unavailable');
      }

      setResult(data.result as AssessmentResult);
      setStage('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      setScoreError('Scoring server belum dapat menyelesaikan assessment. Jawaban Anda tetap tersimpan di perangkat ini.');
    } finally {
      setScoreLoading(false);
    }
  };

  const handleEvidenceFile = (question: Question, file?: File) => {
    setFileError('');
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!fileExtensions.includes(extension)) {
      setFileError('Format evidence belum didukung. Gunakan PDF, Office, image, TXT, atau CSV.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB untuk validasi lokal.');
      return;
    }

    setEvidence((current) => ({ ...current, [question.id]: true }));
    setEvidenceNames((current) => ({ ...current, [question.id]: file.name }));
  };

  const askAssessmentAi = async () => {
    if (!currentQuestion || !currentDomain || aiLoading) return;
    setAiLoading(true);
    setAiHelp('');

    const prompt = [
      'Saya sedang mengisi RTI Technology & Cyber Maturity Self-Assessment.',
      `Domain: ${currentDomain.name}.`,
      `Pertanyaan: ${currentQuestion.text}`,
      `Kapabilitas: ${currentQuestion.capability}.`,
      `Contoh evidence: ${currentQuestion.evidenceExamples.join(', ')}.`,
      'Jelaskan secara ringkas cara menilai kondisi aktual dan evidence apa yang relevan. Jangan menyatakan compliance final.',
    ].join(' ');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      if (!response.ok) throw new Error('AI helper unavailable');
      setAiHelp(await response.text());
    } catch {
      setAiHelp('RTI Assessment Intelligence sedang tidak tersedia. Gunakan help text dan contoh evidence pada pertanyaan ini; assessment tetap dapat dilanjutkan.');
    } finally {
      setAiLoading(false);
    }
  };

  const whatsappUrl = result
    ? `${BRAND_CONFIG.contact.whatsappUrl}?text=${encodeURIComponent(
        `Halo RTI, saya telah menyelesaikan Technology & Cyber Maturity Self-Assessment (Assessment ID: ${assessmentRef}) dan ingin mendiskusikan hasil serta roadmap perbaikannya.`,
      )}`
    : BRAND_CONFIG.contact.whatsappUrl;

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] bg-grey-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-navy-900">
          <span className="h-3 w-3 animate-pulse rounded-full bg-gold-500" />
          Menyiapkan RTI Assessment Engine...
        </div>
      </div>
    );
  }

  if (stage === 'landing') {
    return (
      <div className="w-full bg-white">
        <section className="relative overflow-hidden border-b border-navy-700 bg-navy-900 py-16 text-white sm:py-24">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#4F86F0_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-gold-300">
                <Gauge className="h-3.5 w-3.5" />
                RTI Digital Diagnostic Platform
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                How Mature Is Your Technology & Cybersecurity?
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Pahami tingkat kematangan saat ini, identifikasi gap kritikal, dan dapatkan prioritas transformation roadmap berbasis jawaban organisasi Anda.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => startAssessment('quick')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-7 py-4 text-sm font-extrabold text-navy-900 shadow-lg transition hover:bg-gold-300"
                >
                  Start Free Assessment
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={BRAND_CONFIG.contact.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-500 bg-navy-700/70 px-7 py-4 text-sm font-bold text-white transition hover:bg-navy-700"
                >
                  <Calendar className="h-4 w-4 text-gold-300" />
                  Talk to RTI Consultant
                </a>
                <a
                  href="#methodology"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-4 text-sm font-bold text-slate-200 hover:text-white"
                >
                  View Assessment Methodology
                </a>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['20', 'Maturity Domains'],
                  ['20', 'Quick Questions'],
                  ['120', 'Comprehensive Questions'],
                  ['0–5', 'Maturity Scale'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-navy-700 bg-navy-800/40 p-4">
                    <div className="text-xl font-black text-gold-300">{value}</div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-300">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-navy-600 bg-navy-800/70 p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-300">Diagnostic Preview</p>
                    <h2 className="mt-1 text-lg font-extrabold">From Assessment to Action</h2>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-gold-400" />
                </div>
                <div className="mt-6 space-y-3">
                  {[
                    ['01', 'Assess', 'Jawab kondisi aktual, bukan kondisi ideal.'],
                    ['02', 'Diagnose', 'Scoring, risk exposure, confidence, dan gap.'],
                    ['03', 'Prioritize', 'Temukan quick wins dan strategic initiatives.'],
                    ['04', 'Plan', 'Bangun roadmap 0–24 bulan.'],
                    ['05', 'Improve', 'Hubungkan gap dengan capability RTI yang relevan.'],
                  ].map(([number, title, desc]) => (
                    <div key={number} className="flex gap-3 rounded-xl border border-navy-700 bg-navy-900/50 p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-xs font-black text-navy-900">{number}</span>
                      <div>
                        <div className="text-xs font-extrabold text-white">{title}</div>
                        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <button
                onClick={() => startAssessment('quick')}
                className="group rounded-2xl border border-line bg-grey-50 p-7 text-left transition hover:border-gold-500 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Free · 5–10 minutes</span>
                    <h2 className="mt-4 text-2xl font-extrabold text-navy-900">Quick Assessment</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {QUICK_ASSESSMENT_QUESTION_COUNT} pertanyaan inti untuk mendapatkan indicative maturity, top risks, top gaps, dan rekomendasi prioritas.
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-navy-900 transition group-hover:translate-x-1" />
                </div>
              </button>

              <button
                onClick={() => startAssessment('comprehensive')}
                className="group rounded-2xl border border-navy-700 bg-navy-900 p-7 text-left text-white transition hover:border-gold-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300">Professional · Detailed</span>
                    <h2 className="mt-4 text-2xl font-extrabold">Comprehensive Assessment</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {COMPREHENSIVE_ASSESSMENT_QUESTION_COUNT} capability questions dengan adaptive scope, evidence confidence, framework mapping, findings, dan roadmap.
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-gold-300 transition group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            <div className="mt-12">
              <div className="text-center">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-700">What You'll Receive</p>
                <h2 className="mt-2 text-3xl font-extrabold text-navy-900">Decision-ready diagnostic output</h2>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [Gauge, 'Maturity Score', 'Current, target, risk-adjusted score, dan confidence.'],
                  [BarChart3, 'Risk Heatmap', 'Pemetaan gap dan exposure per domain.'],
                  [Target, 'Priority Recommendations', 'Top findings, quick wins, dan action priorities.'],
                  [TrendingUp, 'Transformation Roadmap', 'Roadmap 0–90 hari hingga 12–24 bulan.'],
                  [FileCheck2, 'Executive Report', 'Tampilan print-ready untuk disimpan sebagai PDF.'],
                  [MessageSquare, 'RTI Advisory Handoff', 'Diskusi hasil dengan consultant RTI tanpa hard-sell.'],
                ].map(([Icon, title, desc]) => {
                  const Component = Icon as React.ElementType;
                  return (
                    <div key={String(title)} className="rounded-2xl border border-line bg-white p-5">
                      <Component className="h-5 w-5 text-gold-600" />
                      <h3 className="mt-3 text-sm font-extrabold text-navy-900">{String(title)}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{String(desc)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="methodology" className="bg-beige-50 py-16 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-beige-200 bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-navy-700">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Assessment Methodology
                </div>
                <h2 className="mt-4 text-3xl font-extrabold text-navy-900">Transparent scoring, not an arbitrary number.</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Setiap jawaban dinilai pada skala 0–5. Domain score dihitung dari weighted capability responses, lalu digabungkan dengan domain weight. Risk exposure mempertimbangkan maturity dan criticality. Confidence memisahkan self-rating dari ketersediaan evidence.
                </p>
                <div className="mt-5 rounded-xl border border-line bg-white p-4 font-mono text-xs text-navy-900">
                  Question Score × Question Weight → Domain Score × Domain Weight → Overall Maturity
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Hasil ini bersifat indicative self-assessment dan bukan audit, sertifikasi, atau pernyataan kepatuhan final. Validasi independen tetap diperlukan untuk keputusan assurance formal.
                </p>
              </div>
              <div className="lg:col-span-7">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-navy-900">Framework Mapping Library</p>
                <div className="flex flex-wrap gap-2">
                  {ASSESSMENT_FRAMEWORKS.map((framework) => (
                    <span key={framework} className="rounded-full border border-line bg-white px-3 py-2 text-[11px] font-semibold text-navy-900">
                      {framework}
                    </span>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-line bg-white p-5">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-extrabold text-navy-900">Privacy-first free assessment</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Draft jawaban assessment gratis disimpan pada browser perangkat Anda untuk fungsi autosave/resume. Evidence file tidak diunggah oleh free assessment; hanya status ketersediaan evidence dan nama file lokal yang dicatat di draft browser.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-navy-900 py-14 text-white">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Built for Decision Makers</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">Technology · Cybersecurity · Risk · Compliance · Governance</p>
            <button
              onClick={() => startAssessment('quick')}
              className="mx-auto mt-8 flex w-full max-w-5xl items-center justify-center gap-2 rounded-[28px] bg-gold-500 px-6 py-7 text-lg font-extrabold text-navy-900 shadow-xl transition hover:bg-gold-300 sm:text-2xl"
            >
              Start Free Maturity Assessment
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (stage === 'profile') {
    return (
      <div className="min-h-screen bg-grey-50 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <button onClick={() => setStage('landing')} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-navy-900">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </button>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-10">
            <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Step 1 · Organization Profile
                </div>
                <h1 className="mt-3 text-2xl font-extrabold text-navy-900">Sesuaikan assessment dengan konteks organisasi</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
                  Data berikut digunakan untuk adaptive questioning. Hindari memasukkan data pribadi, kredensial, atau informasi rahasia.
                </p>
              </div>
              <span className="rounded-xl border border-line bg-grey-50 px-3 py-2 text-[10px] font-bold text-muted">
                Assessment ID: {assessmentRef}
              </span>
            </div>

            <form onSubmit={handleProfileContinue} className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-navy-900">Company / Organization Name</span>
                <input
                  required
                  value={profile.companyName || ''}
                  onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))}
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Nama organisasi"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold text-navy-900">Industry</span>
                <select
                  required
                  value={profile.industry || ''}
                  onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value }))}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Pilih industri</option>
                  {industryOptions.map((industry) => <option key={industry}>{industry}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold text-navy-900">Company Size</span>
                <select
                  required
                  value={profile.companySize || ''}
                  onChange={(event) => setProfile((current) => ({ ...current, companySize: event.target.value }))}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Pilih skala</option>
                  <option value="1-50">1–50 employees</option>
                  <option value="51-250">51–250 employees</option>
                  <option value="251-1000">251–1,000 employees</option>
                  <option value="1001-5000">1,001–5,000 employees</option>
                  <option value="5000+">5,000+ employees</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold text-navy-900">Regulated Environment</span>
                <select
                  value={profile.regulated}
                  onChange={(event) => setProfile((current) => ({ ...current, regulated: event.target.value as AssessmentProfile['regulated'] }))}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Not sure</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold text-navy-900">Cloud Adoption</span>
                <select
                  value={profile.cloudAdoption}
                  onChange={(event) => setProfile((current) => ({ ...current, cloudAdoption: event.target.value as AssessmentProfile['cloudAdoption'] }))}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="none">No cloud use</option>
                  <option value="limited">Limited / selected workloads</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="cloud-first">Cloud-first</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold text-navy-900">AI Adoption</span>
                <select
                  value={profile.aiAdoption}
                  onChange={(event) => setProfile((current) => ({ ...current, aiAdoption: event.target.value as AssessmentProfile['aiAdoption'] }))}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="none">No organizational AI use</option>
                  <option value="pilot">Pilot / experimentation</option>
                  <option value="production">Production use cases</option>
                  <option value="scaled">Scaled enterprise AI</option>
                </select>
              </label>

              <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
                <strong>Adaptive scope:</strong> Cloud Security akan dilewati jika Anda memilih “No cloud use”, dan AI Governance akan dilewati jika organisasi belum menggunakan AI.
              </div>

              <div className="sm:col-span-2 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setStage('landing')} className="rounded-xl border border-line px-5 py-3 text-xs font-bold text-navy-900 hover:bg-grey-50">
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300">
                  Continue to {mode === 'quick' ? 'Quick' : 'Comprehensive'} Assessment
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'questions' && currentQuestion && currentDomain) {
    const selectedTarget = targets[currentDomain.id] ?? currentDomain.defaultTarget;
    return (
      <div className="min-h-screen bg-grey-50 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                {mode === 'quick' ? 'Quick Assessment' : 'Comprehensive Assessment'} · Version {ASSESSMENT_VERSION}
              </div>
              <div className="mt-1 text-sm font-extrabold text-navy-900">{profile.companyName}</div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
              <Save className="h-3.5 w-3.5 text-emerald-600" />
              Autosaved on this device
              <span className="rounded-lg border border-line bg-white px-2 py-1 font-mono">{assessmentRef}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
            <div className="border-b border-line bg-navy-900 px-5 py-4 text-white sm:px-7">
              <div className="flex items-center justify-between gap-4 text-[11px] font-bold">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>{progress}% answered</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-700">
                <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${Math.max(2, progress)}%` }} />
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-line bg-grey-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-navy-700">
                    <Layers3 className="h-3.5 w-3.5" />
                    {currentDomain.name}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-xl font-extrabold leading-snug text-navy-900 sm:text-2xl">
                    {currentQuestion.text}
                  </h1>
                  <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">{currentQuestion.helpText}</p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${currentQuestion.criticality === 'critical' ? 'border-rose-200 bg-rose-50 text-rose-700' : currentQuestion.criticality === 'high' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-line bg-grey-50 text-muted'}`}>
                  {currentQuestion.criticality} criticality
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option.level;
                  return (
                    <button
                      key={option.level}
                      onClick={() => handleAnswer(currentQuestion, option.level)}
                      className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-gold-500 ${selected ? 'border-gold-500 bg-gold-500/10 shadow-sm' : 'border-line hover:border-gold-500/60 hover:bg-beige-50/40'}`}
                    >
                      <div className="flex gap-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${selected ? 'bg-gold-500 text-navy-900' : 'bg-grey-50 text-navy-900'}`}>
                          {option.level}
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-navy-900">{option.label}</div>
                          <div className="mt-1 text-xs leading-relaxed text-muted">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-4 border-t border-line pt-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-line bg-grey-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-navy-900">Target Maturity</div>
                      <div className="mt-0.5 text-[11px] text-muted">Set target untuk domain ini.</div>
                    </div>
                    <select
                      value={selectedTarget}
                      onChange={(event) => setTargets((current) => ({ ...current, [currentDomain.id]: Number(event.target.value) }))}
                      className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-navy-900"
                    >
                      {[3, 4, 5].map((level) => <option key={level} value={level}>Level {level}</option>)}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-grey-50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      id="evidence-ready"
                      type="checkbox"
                      checked={evidence[currentQuestion.id] === true}
                      onChange={(event) => setEvidence((current) => ({ ...current, [currentQuestion.id]: event.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-line text-gold-500 focus:ring-gold-500"
                    />
                    <div className="flex-1">
                      <label htmlFor="evidence-ready" className="text-xs font-extrabold text-navy-900">Supporting evidence is available</label>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">{currentQuestion.evidenceExamples.join(' · ')}</p>
                      {evidence[currentQuestion.id] && (
                        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-white px-3 py-2 text-[11px] font-semibold text-navy-900">
                          <UploadCloud className="h-4 w-4 text-blue-600" />
                          <span className="min-w-0 flex-1 truncate">{evidenceNames[currentQuestion.id] || 'Select local evidence file'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv"
                            onChange={(event) => handleEvidenceFile(currentQuestion, event.target.files?.[0])}
                          />
                        </label>
                      )}
                      <p className="mt-2 text-[10px] leading-relaxed text-muted">Free assessment does not upload file content. File selection only helps you track evidence readiness locally.</p>
                    </div>
                  </div>
                </div>
              </div>

              {fileError && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">{fileError}</div>}

              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
                      <BrainCircuit className="h-4 w-4" />
                      RTI Assessment Intelligence
                    </div>
                    <p className="mt-1 text-[11px] text-blue-900">Butuh bantuan memahami level atau evidence yang relevan?</p>
                  </div>
                  <button
                    onClick={askAssessmentAi}
                    disabled={aiLoading}
                    className="rounded-xl bg-navy-900 px-4 py-2.5 text-[11px] font-bold text-white hover:bg-navy-700 disabled:opacity-50"
                  >
                    {aiLoading ? 'Analyzing...' : 'Ask RTI AI'}
                  </button>
                </div>
                {aiHelp && <div className="mt-3 whitespace-pre-wrap rounded-xl border border-blue-200 bg-white p-3 text-xs leading-relaxed text-navy-900">{aiHelp}</div>}
              </div>

              <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-line pt-5 sm:flex-row">
                <button
                  onClick={previousQuestion}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-xs font-bold text-navy-900 hover:bg-grey-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={nextQuestion}
                    disabled={!Number.isFinite(answers[currentQuestion.id])}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save & Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={submitAssessment}
                    disabled={scoreLoading || !Number.isFinite(answers[currentQuestion.id])}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {scoreLoading ? 'Calculating...' : 'Generate Assessment Result'}
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}
              </div>

              {scoreError && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{scoreError}</div>}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-muted">
            <span>Frameworks: {currentQuestion.frameworks.join(' · ')}</span>
            <button onClick={resetAssessment} className="inline-flex items-center gap-1 font-bold hover:text-navy-900">
              <RotateCcw className="h-3 w-3" /> Reset assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'results' && result) {
    const topFindings = result.findings.slice(0, 5);
    const phases: Array<'0–90 Days' | '3–6 Months' | '6–12 Months' | '12–24 Months'> = ['0–90 Days', '3–6 Months', '6–12 Months', '12–24 Months'];

    return (
      <div className="min-h-screen bg-grey-50 print:bg-white">
        <section className="border-b border-navy-700 bg-navy-900 py-10 text-white print:bg-white print:text-navy-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-gold-300 print:text-navy-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Indicative Assessment Complete
                </div>
                <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Your Technology & Cyber Maturity</h1>
                <p className="mt-2 text-sm text-slate-300 print:text-muted">
                  {profile.companyName} · {profile.industry} · Assessment ID {assessmentRef} · Version {ASSESSMENT_VERSION}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300"
                >
                  <Download className="h-4 w-4" />
                  Download Executive Report
                </button>
                <button
                  onClick={() => setStage('questions')}
                  className="inline-flex items-center gap-2 rounded-xl border border-navy-500 bg-navy-700 px-4 py-3 text-xs font-bold text-white"
                >
                  Review Answers
                </button>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Overall Maturity', `${result.overallMaturity.toFixed(2)} / 5`, Gauge],
              ['Target', `${result.targetMaturity.toFixed(2)} / 5`, Target],
              ['Gap', result.overallGap.toFixed(2), TrendingUp],
              ['Risk Exposure', `${result.riskExposure}%`, AlertTriangle],
              ['Evidence Confidence', `${result.confidenceScore}% · ${result.confidenceLabel}`, FileCheck2],
            ].map(([label, value, Icon]) => {
              const Component = Icon as React.ElementType;
              return (
                <div key={String(label)} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <Component className="h-5 w-5 text-gold-600" />
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">{String(label)}</div>
                  <div className="mt-1 text-xl font-black text-navy-900">{String(value)}</div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <RadarChart scores={result.domainScores} />
            </div>
            <div className="lg:col-span-7 rounded-2xl border border-line bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Benchmark</p>
                  <h2 className="mt-1 text-lg font-extrabold text-navy-900">Industry Benchmark</h2>
                </div>
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">
                Industry benchmark is not yet available for this segment.
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                RTI tidak membuat benchmark palsu. Peer benchmark hanya akan ditampilkan setelah tersedia dataset agregat yang anonim dan memenuhi minimum sample yang ditetapkan.
              </p>

              <div className="mt-6">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-navy-900">Risk-adjusted maturity</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="text-3xl font-black text-navy-900">{result.riskAdjustedScore.toFixed(2)}</span>
                  <span className="pb-1 text-xs text-muted">/ 5 after exposure adjustment</span>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Maturity Heatmap</p>
              <h2 className="mt-1 text-xl font-extrabold text-navy-900">20-Domain Gap View</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.domainScores.map((domain) => {
                const band = scoreBand(domain.current);
                return (
                  <div key={domain.id} className={`rounded-xl border p-4 ${band.className}`}>
                    <div className="text-xs font-extrabold">{domain.name}</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="text-2xl font-black">{domain.current.toFixed(1)}</div>
                      <div className="text-[10px] font-bold">{band.label}</div>
                    </div>
                    <div className="mt-2 text-[10px]">Target {domain.target.toFixed(1)} · Gap {domain.gap.toFixed(1)} · Risk {domain.riskExposure}%</div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-8">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gold-600" />
                <h2 className="text-xl font-extrabold text-navy-900">Top 5 Findings</h2>
              </div>
              <div className="mt-5 space-y-4">
                {topFindings.map((finding, index) => (
                  <div key={finding.domainId} className="rounded-2xl border border-line bg-grey-50 p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Finding {index + 1} · {finding.domain}</div>
                        <h3 className="mt-1 text-sm font-extrabold text-navy-900">{finding.finding}</h3>
                      </div>
                      <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${priorityClass(finding.priority)}`}>{finding.priority}</span>
                    </div>
                    <div className="mt-3 grid gap-3 text-xs leading-relaxed text-muted sm:grid-cols-2">
                      <div><strong className="text-navy-900">Risk:</strong> {finding.risk}</div>
                      <div><strong className="text-navy-900">Business impact:</strong> {finding.businessImpact}</div>
                    </div>
                    <div className="mt-3 rounded-xl border border-line bg-white p-3 text-xs leading-relaxed text-navy-900">
                      <strong>Recommendation:</strong> {finding.recommendation}
                    </div>
                    <div className="mt-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <span className="text-[10px] text-muted">Mapped to: {finding.frameworks.join(' · ')}</span>
                      <Link href={finding.recommendedServiceUrl} className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800 print:hidden">
                        Recommended RTI Capability: {finding.recommendedService} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-extrabold text-navy-900">What You Are Doing Well</h2>
              </div>
              <div className="mt-5 space-y-3">
                {result.strengths.map((strength) => (
                  <div key={strength.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-extrabold text-emerald-900">{strength.name}</div>
                    <div className="mt-1 text-[11px] text-emerald-800">Current maturity {strength.current.toFixed(1)} / 5</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-extrabold text-amber-900">Evidence Confidence</div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                  Self-rating dan evidence confidence dipisahkan. Nilai maturity tinggi tanpa evidence tidak otomatis dianggap tervalidasi.
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Improvement Priority Matrix</p>
              <h2 className="mt-1 text-xl font-extrabold text-navy-900">Where to act first</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                ['Quick Wins', result.findings.filter((f) => f.priority === 'High' && f.gap < 2).slice(0, 3)],
                ['Strategic Initiatives', result.findings.filter((f) => f.priority === 'High' || f.priority === 'Critical').slice(0, 3)],
                ['Major Transformation', result.findings.filter((f) => f.priority === 'Critical' && f.gap >= 2).slice(0, 3)],
                ['Long-Term Improvement', result.findings.filter((f) => f.priority === 'Medium' || f.priority === 'Low').slice(0, 3)],
              ].map(([title, items]) => (
                <div key={String(title)} className="rounded-xl border border-line bg-grey-50 p-4">
                  <h3 className="text-xs font-extrabold text-navy-900">{String(title)}</h3>
                  <div className="mt-3 space-y-2">
                    {(items as typeof result.findings).length > 0 ? (items as typeof result.findings).map((item) => (
                      <div key={item.domainId} className="rounded-lg bg-white p-2.5 text-[11px] font-semibold text-muted">{item.domain}</div>
                    )) : <div className="text-[11px] text-muted">No item in this quadrant.</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Transformation Roadmap</p>
              <h2 className="mt-1 text-xl font-extrabold text-navy-900">0–24 month prioritized roadmap</h2>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              {phases.map((phase) => {
                const items = result.roadmap.filter((item) => item.phase === phase);
                return (
                  <div key={phase} className="rounded-2xl border border-line bg-grey-50 p-4">
                    <div className="text-xs font-black text-navy-900">{phase}</div>
                    <div className="mt-3 space-y-3">
                      {items.length ? items.map((item, index) => (
                        <div key={`${item.domain}-${index}`} className="rounded-xl border border-line bg-white p-3">
                          <div className="text-[11px] font-extrabold text-navy-900">{item.domain}</div>
                          <div className="mt-1 text-[10px] leading-relaxed text-muted">{item.objective}</div>
                          <div className="mt-2 text-[10px]"><strong>Owner:</strong> {item.ownerRecommendation}</div>
                          <div className="mt-1 text-[10px]"><strong>Effort:</strong> {item.indicativeEffort}</div>
                        </div>
                      )) : <div className="text-[11px] text-muted">No initiative assigned.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-navy-700 bg-navy-900 p-7 text-white print:border-line print:bg-white print:text-navy-900">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-300 print:text-gold-700">Next Step</p>
                <h2 className="mt-2 text-2xl font-extrabold">Your Assessment Is the Beginning, Not the End.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300 print:text-muted">
                  Turn assessment findings into a practical transformation roadmap with RTI. Pembahasan awal dapat difokuskan pada top gaps, evidence validation, dan prioritas implementasi.
                </p>
              </div>
              <div className="flex flex-col gap-2 lg:col-span-4 print:hidden">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300">
                  <MessageSquare className="h-4 w-4" />
                  Discuss My Assessment
                </a>
                <a href={BRAND_CONFIG.contact.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-500 bg-navy-700 px-5 py-3 text-xs font-bold text-white hover:bg-navy-600">
                  <Calendar className="h-4 w-4 text-gold-300" />
                  Request Advisory Session
                </a>
                <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-500 px-5 py-3 text-xs font-bold text-white">
                  <Download className="h-4 w-4" />
                  Download Executive Report
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 text-[11px] leading-relaxed text-muted">
            <strong className="text-navy-900">Assessment disclaimer:</strong> Hasil merupakan indicative self-assessment berdasarkan informasi yang diberikan pengguna. Hasil tidak merupakan audit, sertifikasi, opini hukum, atau pernyataan kepatuhan formal. Benchmark tidak ditampilkan tanpa dataset peer yang memadai. Evidence file pada free assessment tidak dikirim ke server.
          </section>

          <div className="flex justify-center pb-6 print:hidden">
            <button onClick={resetAssessment} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-xs font-bold text-navy-900 hover:bg-grey-50">
              <RotateCcw className="h-4 w-4" />
              Start New Assessment
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
