'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { LeadModal } from '@/components/tools/LeadModal';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { useParameterGroups } from '@/components/parameters/useParameterOptions';
import { BRAND_CONFIG } from '@/lib/config/contact';
import type {
  NistAnswerRecord,
  NistAssessmentConfig,
  NistAssessmentRecord,
  NistAssessmentResult,
  NistEvidenceStatus,
} from '@/lib/nist/types';

type Screen = 'intro' | 'profile' | 'assessment' | 'analyzing' | 'results';

type ProfileState = {
  companyName: string;
  industry: string;
  companySize: string;
  employeeCount: string;
  itUserCount: string;
  country: string;
  region: string;
  locationCount: string;
  website: string;
  respondentName: string;
  respondentTitle: string;
  respondentDepartment: string;
  respondentEmail: string;
  respondentPhone: string;
  consent: boolean;
  technologyContext: Record<string, boolean>;
};

const INITIAL_PROFILE: ProfileState = {
  companyName: '',
  industry: '',
  companySize: '',
  employeeCount: '',
  itUserCount: '',
  country: 'Indonesia',
  region: '',
  locationCount: '',
  website: '',
  respondentName: '',
  respondentTitle: '',
  respondentDepartment: '',
  respondentEmail: '',
  respondentPhone: '',
  consent: false,
  technologyContext: {},
};

function asNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusClass(status: string) {
  if (status === 'Strong') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'Adequate') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (status === 'Needs Improvement') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'High Risk') return 'border-orange-200 bg-orange-50 text-orange-900';
  return 'border-rose-200 bg-rose-50 text-rose-900';
}

function priorityClass(priority: string) {
  if (priority === 'Critical') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (priority === 'High') return 'border-orange-200 bg-orange-50 text-orange-800';
  if (priority === 'Medium') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

function safePercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function getApplicableQuestions(
  config: NistAssessmentConfig,
  answers: Record<string, NistAnswerRecord>,
) {
  const applicable = new Set(
    config.questions.filter((question) => question.isCore).map((question) => question.id),
  );

  for (const rule of config.branchingRules || []) {
    const parentAnswer = answers[rule.parentQuestionId]?.answerValue;
    if (parentAnswer && rule.answerValues.includes(parentAnswer)) {
      applicable.add(rule.followUpQuestionId);
    }
  }

  return config.questions
    .filter((question) => applicable.has(question.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function FunctionRadar({ result }: { result: NistAssessmentResult }) {
  const values = result.functionScores.slice(0, 6);
  const size = 260;
  const center = size / 2;
  const radius = 92;

  const point = (index: number, magnitude: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(values.length, 1);
    const r = radius * (magnitude / 100);
    return [
      Math.round((center + Math.cos(angle) * r) * 10) / 10,
      Math.round((center + Math.sin(angle) * r) * 10) / 10,
    ];
  };

  const outline = values.map((_, index) => point(index, 100).join(',')).join(' ');
  const current = values.map((item, index) => point(index, item.score).join(',')).join(' ');
  const target = values.map((item, index) => point(index, item.targetScore).join(',')).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-64 w-64 max-w-full"
        role="img"
        aria-label="Radar chart comparing current and target scores across the six NIST CSF functions"
      >
        {[25, 50, 75, 100].map((level) => (
          <polygon
            key={level}
            points={values.map((_, index) => point(index, level).join(',')).join(' ')}
            fill="none"
            stroke="currentColor"
            className="text-slate-200"
            strokeWidth="1"
          />
        ))}
        {values.map((_, index) => {
          const outer = point(index, 100);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={outer[0]}
              y2={outer[1]}
              stroke="currentColor"
              className="text-slate-200"
              strokeWidth="1"
            />
          );
        })}
        <polygon points={outline} fill="none" stroke="currentColor" className="text-slate-300" />
        <polygon
          points={target}
          fill="rgba(202, 151, 29, .08)"
          stroke="#CA971D"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <polygon
          points={current}
          fill="rgba(37, 99, 235, .14)"
          stroke="#2563EB"
          strokeWidth="2.5"
        />
        {values.map((item, index) => {
          const labelPoint = point(index, 118);
          return (
            <text
              key={item.functionCode}
              x={labelPoint[0]}
              y={labelPoint[1]}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-700 text-[9px] font-bold"
            >
              {item.functionCode}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-5 rounded bg-blue-600" /> Current
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-5 rounded border border-gold-500" /> Target
        </span>
      </div>
    </div>
  );
}

function RiskMatrix({ result }: { result: NistAssessmentResult }) {
  const cellCounts = new Map<string, number>();
  for (const finding of result.findings) {
    const key = `${finding.likelihood}-${finding.impact}`;
    cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
  }

  const cellStyle = (likelihood: number, impact: number) => {
    const risk = likelihood * impact;
    if (risk >= 16) return 'bg-rose-100 border-rose-200 text-rose-900';
    if (risk >= 10) return 'bg-orange-100 border-orange-200 text-orange-900';
    if (risk >= 5) return 'bg-amber-50 border-amber-200 text-amber-900';
    return 'bg-emerald-50 border-emerald-200 text-emerald-900';
  };

  return (
    <div className="overflow-x-auto" aria-label="5 by 5 likelihood and impact risk matrix">
      <div className="min-w-[360px]">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Impact →
        </div>
        <div className="grid grid-cols-[52px_repeat(5,minmax(48px,1fr))] gap-1">
          <div />
          {[1, 2, 3, 4, 5].map((impact) => (
            <div key={impact} className="text-center text-[10px] font-bold text-muted">
              {impact}
            </div>
          ))}
          {[5, 4, 3, 2, 1].map((likelihood) => (
            <React.Fragment key={likelihood}>
              <div className="flex items-center text-[10px] font-bold text-muted">
                L{likelihood}
              </div>
              {[1, 2, 3, 4, 5].map((impact) => {
                const count = cellCounts.get(`${likelihood}-${impact}`) || 0;
                return (
                  <div
                    key={impact}
                    className={`flex h-11 items-center justify-center rounded-lg border text-xs font-extrabold ${cellStyle(likelihood, impact)}`}
                    title={`Likelihood ${likelihood}, Impact ${impact}: ${count} finding(s)`}
                  >
                    {count || '·'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CyberQuickCheckPage() {
  const parameterGroups = useParameterGroups([
    'assessment.industries',
    'assessment.company_sizes',
    'nist.technology_context',
    'nist.feature_flags',
  ]);
  const industries = parameterGroups['assessment.industries'] || [];
  const companySizes = parameterGroups['assessment.company_sizes'] || [];
  const technologyContextOptions = parameterGroups['nist.technology_context'] || [];
  const activeFeatures = new Set(
    (parameterGroups['nist.feature_flags'] || []).map((item) => item.value),
  );

  const [screen, setScreen] = useState<Screen>('intro');
  const [config, setConfig] = useState<NistAssessmentConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
  const [assessment, setAssessment] = useState<NistAssessmentRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, NistAnswerRecord>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<NistAssessmentResult | null>(null);
  const [advisorText, setAdvisorText] = useState('');
  const [advisorMeta, setAdvisorMeta] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const loadConfig = async () => {
    if (config) return config;
    setConfigError('');
    const response = await fetch('/api/nist-assessment/config', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.config) {
      const error = data?.error || 'NIST Cyber Quick Check configuration is unavailable.';
      setConfigError(error);
      throw new Error(error);
    }
    setConfig(data.config);
    return data.config as NistAssessmentConfig;
  };

  const beginProfile = async () => {
    setLoading(true);
    setMessage('');
    try {
      await loadConfig();
      setScreen('profile');
    } catch {
      // loadConfig already surfaces the configuration problem.
    } finally {
      setLoading(false);
    }
  };

  const continuePrevious = async () => {
    setLoading(true);
    setMessage('');
    try {
      const cfg = await loadConfig();
      const response = await fetch('/api/nist-assessment/session', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.assessment) {
        setMessage('No resumable NIST Cyber Quick Check was found on this device.');
        return;
      }

      setAssessment(data.assessment);
      const restored = Object.fromEntries(
        ((data.answers || []) as NistAnswerRecord[]).map((answer) => [
          answer.questionId,
          answer,
        ]),
      );
      setAnswers(restored);

      if (data.assessment.status === 'completed') {
        const resultResponse = await fetch(
          `/api/nist-assessment/${encodeURIComponent(data.assessment.id)}/results`,
          { cache: 'no-store' },
        );
        const resultData = await resultResponse.json().catch(() => null);
        if (!resultResponse.ok || !resultData?.result) {
          throw new Error(resultData?.error || 'Stored assessment result could not be loaded.');
        }
        setResult(resultData.result);
        setScreen('results');
        return;
      }

      const resumableQuestions = getApplicableQuestions(cfg, restored);
      const firstUnanswered = resumableQuestions.findIndex(
        (question) => !restored[question.id],
      );
      setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      setScreen('assessment');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resume the assessment.');
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async () => {
    setMessage('');
    if (!profile.companyName || !profile.industry || !profile.companySize) {
      setMessage('Complete the required organization profile fields.');
      return;
    }
    if (!profile.respondentName || !profile.respondentEmail) {
      setMessage('Complete the respondent name and corporate email.');
      return;
    }
    if (!profile.consent) {
      setMessage('Consent is required before starting the assessment.');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setMessage('Complete the security verification before starting.');
      return;
    }

    setLoading(true);
    try {
      const cfg = await loadConfig();
      const response = await fetch('/api/nist-assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentType: 'quick',
          consent: profile.consent,
          turnstileToken,
          organization: {
            companyName: profile.companyName,
            industry: profile.industry,
            companySize: profile.companySize,
            employeeCount: asNumber(profile.employeeCount),
            itUserCount: asNumber(profile.itUserCount),
            country: profile.country,
            region: profile.region,
            locationCount: asNumber(profile.locationCount),
            website: profile.website,
            technologyContext: profile.technologyContext,
          },
          respondent: {
            name: profile.respondentName,
            title: profile.respondentTitle,
            department: profile.respondentDepartment,
            email: profile.respondentEmail,
            phone: profile.respondentPhone,
          },
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.assessment) {
        throw new Error(data?.error || 'Unable to start the assessment.');
      }

      setAssessment(data.assessment);
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
      setScreen('assessment');
      if (cfg.questions.length === 0) {
        throw new Error('No active questions are configured.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start the assessment.');
    } finally {
      setLoading(false);
    }
  };

  const applicableQuestions = useMemo(
    () => (config ? getApplicableQuestions(config, answers) : []),
    [config, answers],
  );
  const currentQuestion = applicableQuestions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = applicableQuestions.filter(
    (question) => Boolean(answers[question.id]),
  ).length;
  const progress = applicableQuestions.length
    ? Math.round((answeredCount / applicableQuestions.length) * 100)
    : 0;
  const remainingMinutes = useMemo(() => {
    const remaining = applicableQuestions
      .slice(currentIndex)
      .reduce((sum, question) => sum + question.estimatedSeconds, 0);
    return Math.max(1, Math.ceil(remaining / 60));
  }, [applicableQuestions, currentIndex]);

  const saveAnswer = async (
    answerValue: string,
    evidenceStatus: NistEvidenceStatus,
  ) => {
    if (!assessment || !currentQuestion) return false;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/nist-assessment/${encodeURIComponent(assessment.id)}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            answerValue,
            evidenceStatus,
          }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.answer) {
        throw new Error(data?.error || 'The answer could not be saved.');
      }
      setAnswers((existing) => ({
        ...existing,
        [currentQuestion.id]: data.answer,
      }));
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The answer could not be saved.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const chooseAnswer = async (value: string) => {
    const evidence =
      currentAnswer?.evidenceStatus ||
      ('unspecified' as NistEvidenceStatus);
    await saveAnswer(value, evidence);
  };

  const chooseEvidence = async (value: string) => {
    if (!currentAnswer) return;
    await saveAnswer(
      currentAnswer.answerValue,
      value as NistEvidenceStatus,
    );
  };

  const completeAssessment = async () => {
    if (!assessment || !config) return;
    setScreen('analyzing');
    setMessage('');
    try {
      const response = await fetch(
        `/api/nist-assessment/${encodeURIComponent(assessment.id)}/complete`,
        { method: 'POST' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.result) {
        throw new Error(data?.error || 'Assessment scoring could not be completed.');
      }
      setResult(data.result);
      setAssessment((existing) =>
        existing
          ? { ...existing, status: 'completed', overallScore: data.result.overallScore }
          : existing,
      );
      window.setTimeout(() => setScreen('results'), 650);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment scoring failed.');
      setScreen('assessment');
    }
  };

  const nextQuestion = async () => {
    if (!config || !currentQuestion || !currentAnswer) return;
    if (currentIndex >= applicableQuestions.length - 1) {
      await completeAssessment();
      return;
    }
    setCurrentIndex((index) => Math.min(index + 1, applicableQuestions.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAdvisor = async () => {
    if (!assessment) return;
    setAdvisorLoading(true);
    setAdvisorText('');
    setAdvisorMeta('');
    try {
      const response = await fetch(
        `/api/nist-assessment/${encodeURIComponent(assessment.id)}/advisor`,
        { method: 'POST' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.text) {
        throw new Error(data?.error || 'RTI Cyber Advisor is unavailable.');
      }
      setAdvisorText(data.text);
      setAdvisorMeta(
        data.provider === 'deterministic-fallback'
          ? 'Deterministic fallback — AI provider unavailable'
          : `AI-assisted analysis via configured provider: ${data.provider}`,
      );
    } catch (error) {
      setAdvisorText(error instanceof Error ? error.message : 'RTI Cyber Advisor is unavailable.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const openWhatsapp = () => {
    if (!assessment) return;
    const messageText = encodeURIComponent(
      `Hello RTI, I have completed the NIST Cyber Quick Check and would like to discuss assessment ID ${assessment.id}.`,
    );
    window.open(`${BRAND_CONFIG.contact.whatsappUrl}?text=${messageText}`, '_blank', 'noopener,noreferrer');
  };

  const resetAssessment = () => {
    setAssessment(null);
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setAdvisorText('');
    setProfile(INITIAL_PROFILE);
    setScreen('intro');
    setMessage('');
  };

  const previousFunctionCode =
    currentIndex > 0 ? applicableQuestions[currentIndex - 1]?.functionCode : null;
  const beginsFunction =
    currentQuestion && currentQuestion.functionCode !== previousFunctionCode;
  const currentFunction = config?.functions.find(
    (item) => item.code === currentQuestion?.functionCode,
  );

  return (
    <main className="min-h-screen bg-grey-50">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
              <ShieldAlert className="h-3.5 w-3.5" />
              NIST CSF 2.0 · ± 5 Mins
            </div>
            <h1 className="text-3xl font-black tracking-tight text-navy-900 sm:text-4xl">
              RTI NIST Cyber Quick Check
            </h1>
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Know Your Cyber Posture in Minutes.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Rapid diagnostic of Govern, Identify, Protect, Detect, Respond, and Recover posture with an RTI Cyber Readiness Score, evidence confidence, prioritized risks, quick wins, and an implementation roadmap.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            {[
              ['6', 'Functions'],
              ['22', 'Categories'],
              ['0–100', 'RTI Score'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-gold-500/40 bg-beige-50 p-4 text-center">
                <div className="text-xl font-black text-navy-900">{value}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {screen === 'intro' && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-3xl border border-gold-500/50 bg-white p-6 shadow-sm sm:p-9">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-2xl font-black text-navy-900 sm:text-3xl">
                How Cyber Ready Is Your Organization?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Answer a short set of executive-friendly questions and receive an instant view of your organization&apos;s cybersecurity posture aligned with NIST CSF 2.0.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['5-Minute Assessment', Clock3],
                  ['Instant Cyber Score', Gauge],
                  ['NIST CSF 2.0 Alignment', ShieldCheck],
                  ['Priority Risk Areas', TriangleAlert],
                  ['Quick Wins', Sparkles],
                  ['Executive Report', FileCheck2],
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as React.ComponentType<{ className?: string }>;
                  return (
                    <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-line bg-grey-50 p-3">
                      <ItemIcon className="h-4 w-4 shrink-0 text-gold-700" />
                      <span className="text-xs font-bold text-navy-900">{String(label)}</span>
                    </div>
                  );
                })}
              </div>

              {message && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                  {message}
                </div>
              )}
              {configError && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-900">
                  {configError}
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={beginProfile}
                  disabled={loading}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-extrabold text-navy-900 shadow-sm transition hover:bg-gold-300 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Start Cyber Quick Check
                </button>
                <button
                  type="button"
                  onClick={continuePrevious}
                  disabled={loading}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-xs font-extrabold text-navy-900 hover:bg-grey-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Continue Previous Assessment
                </button>
              </div>
            </div>

            <aside className="rounded-3xl border border-line bg-navy-900 p-6 text-white shadow-sm sm:p-8">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-300">
                Methodology
              </div>
              <h3 className="mt-2 text-xl font-black">Independent RTI diagnostic</h3>
              <p className="mt-3 text-xs leading-5 text-slate-300">
                The RTI Cyber Readiness Score is an RTI diagnostic score—not an official NIST score. The Indicative CSF Tier is questionnaire-based and should not be interpreted as certification, accreditation, audit assurance, or NIST endorsement.
              </p>
              <a
                href="https://www.nist.gov/cyberframework"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold text-gold-300 hover:text-gold-200"
              >
                Learn About NIST CSF 2.0 <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </aside>
          </div>
        </section>
      )}

      {screen === 'profile' && (
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-9">
            <button
              type="button"
              onClick={() => setScreen('intro')}
              className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-navy-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="max-w-3xl">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
                Organization Profile
              </div>
              <h2 className="mt-2 text-2xl font-black text-navy-900">
                Give the assessment the right business context
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted">
                Profile information is used to frame the diagnostic and follow-up engagement. Sensitive assessment answers are stored separately from public URLs.
              </p>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-bold text-navy-900">
                Company Name *
                <input
                  value={profile.companyName}
                  onChange={(event) => setProfile({ ...profile, companyName: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                  maxLength={180}
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Industry *
                <select
                  value={profile.industry}
                  onChange={(event) => setProfile({ ...profile, industry: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Select industry</option>
                  {industries.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">
                Organization Size *
                <select
                  value={profile.companySize}
                  onChange={(event) => setProfile({ ...profile, companySize: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Select size</option>
                  {companySizes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">
                Number of Employees
                <input
                  type="number"
                  min="0"
                  value={profile.employeeCount}
                  onChange={(event) => setProfile({ ...profile, employeeCount: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Approximate IT Users
                <input
                  type="number"
                  min="0"
                  value={profile.itUserCount}
                  onChange={(event) => setProfile({ ...profile, itUserCount: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Number of Locations
                <input
                  type="number"
                  min="0"
                  value={profile.locationCount}
                  onChange={(event) => setProfile({ ...profile, locationCount: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Country
                <input
                  value={profile.country}
                  onChange={(event) => setProfile({ ...profile, country: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                  maxLength={100}
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Province / Region
                <input
                  value={profile.region}
                  onChange={(event) => setProfile({ ...profile, region: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                  maxLength={120}
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Website
                <input
                  type="url"
                  value={profile.website}
                  onChange={(event) => setProfile({ ...profile, website: event.target.value })}
                  placeholder="https://company.co.id"
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                  maxLength={300}
                />
              </label>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-extrabold text-navy-900">Technology Context</h3>
              <p className="mt-1 text-[11px] text-muted">Select all that apply.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {technologyContextOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-grey-50 px-3 py-2 text-xs font-semibold text-navy-900"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(profile.technologyContext[option.value])}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          technologyContext: {
                            ...profile.technologyContext,
                            [option.value]: event.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-line text-gold-500 focus:ring-gold-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-7">
              <h3 className="text-sm font-extrabold text-navy-900">Assessment Respondent</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-bold text-navy-900">
                  Name *
                  <input
                    value={profile.respondentName}
                    onChange={(event) => setProfile({ ...profile, respondentName: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                    maxLength={140}
                  />
                </label>
                <label className="text-xs font-bold text-navy-900">
                  Job Title
                  <input
                    value={profile.respondentTitle}
                    onChange={(event) => setProfile({ ...profile, respondentTitle: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                    maxLength={140}
                  />
                </label>
                <label className="text-xs font-bold text-navy-900">
                  Department
                  <input
                    value={profile.respondentDepartment}
                    onChange={(event) => setProfile({ ...profile, respondentDepartment: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                    maxLength={140}
                  />
                </label>
                <label className="text-xs font-bold text-navy-900">
                  Corporate Email *
                  <input
                    type="email"
                    value={profile.respondentEmail}
                    onChange={(event) => setProfile({ ...profile, respondentEmail: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                    maxLength={254}
                  />
                </label>
                <label className="text-xs font-bold text-navy-900">
                  Phone / WhatsApp
                  <input
                    type="tel"
                    value={profile.respondentPhone}
                    onChange={(event) => setProfile({ ...profile, respondentPhone: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal outline-none focus:ring-2 focus:ring-gold-500"
                    maxLength={50}
                  />
                </label>
              </div>
            </div>

            <label className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-grey-50 p-4 text-[11px] leading-5 text-muted">
              <input
                type="checkbox"
                checked={profile.consent}
                onChange={(event) => setProfile({ ...profile, consent: event.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-line text-gold-500 focus:ring-gold-500"
              />
              <span>
                I consent to PT Riset Teknologi Indonesia processing this profile and assessment data for diagnostic reporting and requested follow-up, subject to the{' '}
                <Link href="/privacy" className="font-bold text-blue-700 underline">
                  RTI Privacy Policy
                </Link>.
              </span>
            </label>

            <div className="mt-4">
              <TurnstileWidget onTokenChange={setTurnstileToken} />
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={startAssessment}
              disabled={loading || (turnstileRequired && !turnstileToken)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-extrabold text-navy-900 shadow-sm hover:bg-gold-300 disabled:opacity-50 sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Start Secure Assessment
            </button>
          </div>
        </section>
      )}

      {screen === 'assessment' && config && currentQuestion && assessment && (
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-grey-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
            <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-muted">
              <span>{answeredCount} of {applicableQuestions.length} applicable answered</span>
              <span>{progress}% · ≈ {remainingMinutes} min remaining</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gold-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {beginsFunction && currentFunction && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
                {currentFunction.code} · {currentFunction.name}
              </div>
              <p className="mt-1 text-xs leading-5 text-blue-900">{currentFunction.description}</p>
            </div>
          )}

          <div className="mt-5 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                {currentQuestion.categoryCode}
              </div>
              <div className="font-mono text-[10px] text-muted">
                Question {currentIndex + 1} / {applicableQuestions.length}
              </div>
            </div>

            <h2 className="mt-6 text-lg font-black leading-7 text-navy-900 sm:text-2xl">
              {currentQuestion.textEn}
            </h2>
            {currentQuestion.helpText && (
              <p className="mt-3 text-xs leading-5 text-muted">{currentQuestion.helpText}</p>
            )}

            <div className="mt-7 grid gap-2">
              {config.answerOptions.map((option) => {
                const selected = currentAnswer?.answerValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={saving}
                    onClick={() => chooseAnswer(option.value)}
                    className={`flex min-h-14 items-start justify-between gap-4 rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                      selected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-line bg-white hover:border-gold-500 hover:bg-beige-50'
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-extrabold text-navy-900">{option.label}</span>
                      <span className="mt-1 block text-[10px] leading-4 text-muted">{option.description}</span>
                    </span>
                    <span className="mt-0.5 shrink-0 rounded-lg bg-grey-50 px-2 py-1 font-mono text-[10px] font-bold text-muted">
                      {option.value === 'unsure' ? '?' : option.value}
                    </span>
                  </button>
                );
              })}
            </div>

            {currentAnswer && (
              <div className="mt-7 rounded-2xl border border-line bg-grey-50 p-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-gold-700" />
                  <h3 className="text-xs font-extrabold text-navy-900">Evidence confidence (optional)</h3>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-muted">
                  This does not change your reported readiness score. It changes the separate Assessment Confidence indicator.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {config.evidenceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={saving}
                      onClick={() => chooseEvidence(option.value)}
                      className={`rounded-lg border px-3 py-2 text-left text-[11px] font-bold ${
                        currentAnswer.evidenceStatus === option.value
                          ? 'border-gold-500 bg-beige-50 text-navy-900'
                          : 'border-line bg-white text-muted hover:border-gold-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {currentAnswer.notSure && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-900">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Verification Required — this answer is not treated as evidence of control effectiveness.
                  </div>
                )}
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
                {message}
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={currentIndex === 0 || saving}
                onClick={() => {
                  setCurrentIndex((index) => Math.max(0, index - 1));
                  setMessage('');
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-5 py-2.5 text-xs font-extrabold text-navy-900 hover:bg-grey-50 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/tools"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 py-2.5 text-xs font-bold text-muted hover:text-navy-900"
                >
                  Save & Exit
                </Link>
                <button
                  type="button"
                  disabled={!currentAnswer || saving}
                  onClick={nextQuestion}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-extrabold text-navy-900 hover:bg-gold-300 disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {currentIndex === applicableQuestions.length - 1
                    ? 'View My Cyber Posture'
                    : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'analyzing' && (
        <section className="mx-auto flex min-h-[520px] max-w-4xl items-center justify-center px-4 py-14">
          <div className="w-full rounded-3xl border border-line bg-white p-8 text-center shadow-sm sm:p-12">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold-600" />
            <h2 className="mt-5 text-2xl font-black text-navy-900">Analyzing your cybersecurity posture...</h2>
            <div className="mx-auto mt-6 max-w-lg space-y-2 text-xs text-muted">
              <p>Evaluating NIST CSF 2.0 Functions...</p>
              <p>Prioritizing cyber risks...</p>
              <p>Building quick wins...</p>
              <p>Preparing your improvement roadmap...</p>
            </div>
          </div>
        </section>
      )}

      {screen === 'results' && result && assessment && (
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gold-500/50 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
                  Your Cybersecurity Posture
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <span className="text-5xl font-black tracking-tight text-navy-900 sm:text-6xl">
                    {result.overallScore}
                  </span>
                  <span className="pb-1 text-sm font-bold text-muted">/ 100</span>
                  <span className={`mb-1 rounded-full border px-3 py-1 text-[10px] font-extrabold ${priorityClass(
                    result.riskRating === 'Critical Exposure'
                      ? 'Critical'
                      : result.riskRating === 'High Risk'
                        ? 'High'
                        : result.riskRating === 'Developing'
                          ? 'Medium'
                          : 'Low',
                  )}`}>
                    {result.riskRating}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-navy-900">RTI Cyber Readiness Score</div>
                <p className="mt-2 max-w-2xl text-[11px] leading-5 text-muted">
                  This is an RTI diagnostic score, not an official NIST score or certification result.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[520px]">
                {[
                  ['Indicative CSF Tier', `Tier ${result.indicativeTier.tier} — ${result.indicativeTier.label}`],
                  ['Assessment Confidence', `${result.confidenceScore}%`],
                  ['Critical Gaps', String(result.criticalGapCount)],
                  ['Highest Function', result.strongestFunction?.functionName || '—'],
                  ['Lowest Function', result.weakestFunction?.functionName || '—'],
                  ['Quick Wins', String(result.recommendations.filter((item) => ['0–30 Days', '31–60 Days', '61–90 Days'].includes(item.suggestedTimeline)).length)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-line bg-grey-50 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</div>
                    <div className="mt-1 text-xs font-extrabold text-navy-900">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:flex-wrap">
              {activeFeatures.has('pdf_report') && (
                <a
                  href={`/api/nist-assessment/${encodeURIComponent(assessment.id)}/report`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-extrabold text-navy-900 hover:bg-gold-300"
                >
                  <Download className="h-4 w-4" /> Download Executive Report
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowLeadModal(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-navy-700"
              >
                Discuss My Results
              </button>
              {activeFeatures.has('whatsapp_cta') && (
                <button
                  type="button"
                  onClick={openWhatsapp}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-extrabold text-navy-900 hover:bg-grey-50"
                >
                  Talk to Risetin
                </button>
              )}
              <button
                type="button"
                onClick={resetAssessment}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-bold text-muted hover:text-navy-900"
              >
                Start New Assessment
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                <h2 className="text-base font-black text-navy-900">NIST CSF 2.0 Function Posture</h2>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-[.8fr_1.2fr] sm:items-center">
                <FunctionRadar result={result} />
                <div className="space-y-4">
                  {result.functionScores.map((item) => (
                    <div key={item.functionCode}>
                      <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                        <span className="text-navy-900">{item.functionCode} · {item.functionName}</span>
                        <span className="text-muted">{item.score} / {item.targetScore}</span>
                      </div>
                      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-blue-600"
                          style={{ width: `${safePercent(item.score)}%` }}
                        />
                        <div
                          className="absolute inset-y-0 w-0.5 bg-gold-600"
                          style={{ left: `${safePercent(item.targetScore)}%` }}
                          title={`Target ${item.targetScore}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-gold-700" />
                <h2 className="text-base font-black text-navy-900">Current vs Target Profile</h2>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Target values come from the active RTI configuration for this version and are preserved with the assessment history.
              </p>
              <div className="mt-5 max-h-[410px] space-y-3 overflow-y-auto pr-1">
                {result.categoryScores.map((item) => (
                  <div key={item.categoryCode} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-extrabold text-blue-700">{item.categoryCode}</div>
                        <div className="text-[11px] font-bold text-navy-900">{item.categoryName}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-[10px] text-muted">
                      <span>Current <strong className="text-navy-900">{item.score}</strong></span>
                      <span>Target <strong className="text-navy-900">{item.targetScore}</strong></span>
                      <span>Gap <strong className="text-navy-900">{item.gap}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">22 Categories</div>
                <h2 className="mt-1 text-lg font-black text-navy-900">NIST CSF Category Heat Map</h2>
              </div>
              <div className="text-[10px] text-muted">Color + text labels are shown together for accessibility.</div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {result.categoryScores.map((item) => (
                <div key={item.categoryCode} className={`rounded-xl border p-3 ${statusClass(item.status)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black">{item.categoryCode}</span>
                    <span className="text-lg font-black">{item.score}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold leading-4">{item.categoryName}</div>
                  <div className="mt-2 text-[9px] font-semibold">{item.status} · Gap {item.gap}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-black text-navy-900">Prioritized Cyber Risk Exposure</h2>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Ratings are explained with likelihood, impact, and the underlying category gap rather than presented as unsupported labels.
              </p>
              <div className="mt-5 space-y-3">
                {result.findings.slice(0, 8).map((finding) => (
                  <div key={finding.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-navy-900">
                        {finding.categoryCode} · {finding.title}
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold ${priorityClass(finding.rating)}`}>
                        {finding.rating}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-muted">
                      Likelihood {finding.likelihood}/5 · Impact {finding.impact}/5
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-muted">{finding.reason}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-black text-navy-900">5×5 Risk Matrix</h2>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Cell values show the number of current findings at each likelihood-impact coordinate.
              </p>
              <div className="mt-5">
                <RiskMatrix result={result} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-black text-navy-900">Top 5 Strengths</h2>
              <div className="mt-4 space-y-2">
                {result.strengths.map((item, index) => (
                  <div key={item.categoryCode} className="flex items-center gap-3 rounded-xl border border-line bg-grey-50 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-extrabold text-blue-700">{index + 1}. {item.categoryCode}</div>
                      <div className="truncate text-[11px] font-bold text-navy-900">{item.categoryName}</div>
                    </div>
                    <div className="text-sm font-black text-navy-900">{item.score}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-black text-navy-900">Top 5 Cybersecurity Gaps</h2>
              <div className="mt-4 space-y-2">
                {result.gaps.map((item, index) => (
                  <div key={item.categoryCode} className="flex items-center gap-3 rounded-xl border border-line bg-grey-50 p-3">
                    <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-extrabold text-blue-700">{index + 1}. {item.categoryCode}</div>
                      <div className="truncate text-[11px] font-bold text-navy-900">{item.categoryName}</div>
                    </div>
                    <div className="text-sm font-black text-navy-900">Gap {item.gap}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold-700" />
              <h2 className="text-base font-black text-navy-900">Prioritized Quick Wins & RTI Solution Mapping</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {result.recommendations.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-2xl border border-line bg-grey-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[10px] font-extrabold text-blue-700">{item.categoryCode}</div>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold ${priorityClass(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xs font-black text-navy-900">{item.title}</h3>
                  <p className="mt-2 text-[10px] leading-4 text-muted">{item.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-bold text-muted">
                    <span className="rounded bg-white px-2 py-1">Effort {item.effort}</span>
                    <span className="rounded bg-white px-2 py-1">Impact {item.impact}</span>
                    <span className="rounded bg-white px-2 py-1">{item.suggestedTimeline}</span>
                  </div>
                  {item.serviceName && item.serviceUrl && (
                    <Link
                      href={item.serviceUrl}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 hover:underline"
                    >
                      {item.serviceName} <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-navy-900">30 / 60 / 90-Day & Strategic Roadmap</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {['0–30 Days', '31–60 Days', '61–90 Days', '3–6 Months', '6–12 Months', '12–24 Months'].map((phase) => {
                const items = result.roadmap.filter((item) => item.phase === phase);
                if (!items.length) return null;
                return (
                  <div key={phase} className="rounded-2xl border border-line bg-grey-50 p-4">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">{phase}</div>
                    <div className="mt-3 space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-line bg-white p-3">
                          <div className="text-[10px] font-extrabold text-blue-700">{item.categoryCode} · {item.priority}</div>
                          <p className="mt-1 text-[10px] font-bold leading-4 text-navy-900">{item.action}</p>
                          <p className="mt-2 text-[9px] leading-4 text-muted">Owner: {item.ownerSuggestion}</p>
                          <p className="mt-1 text-[9px] leading-4 text-muted">Outcome: {item.expectedOutcome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeFeatures.has('ai_analysis') && (
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <BrainCircuit className="mt-0.5 h-6 w-6 shrink-0 text-blue-700" />
                <div className="flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
                    RTI Cyber Advisor
                  </div>
                  <h2 className="mt-1 text-base font-black text-navy-900">AI-assisted executive interpretation</h2>
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    AI receives structured results only and cannot alter the deterministic assessment score. If providers fail, a deterministic fallback remains available.
                  </p>
                  {!advisorText && (
                    <button
                      type="button"
                      onClick={loadAdvisor}
                      disabled={advisorLoading}
                      className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      {advisorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                      Generate Executive Analysis
                    </button>
                  )}
                  {advisorText && (
                    <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
                      {advisorMeta && <div className="mb-3 text-[9px] font-bold uppercase tracking-wider text-muted">{advisorMeta}</div>}
                      <div className="whitespace-pre-wrap text-[11px] leading-5 text-slate-700">{advisorText}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-black text-navy-900">Industry Benchmark</h2>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Industry benchmark will become available when sufficient anonymized comparison data is available. RTI does not present synthetic benchmark values as actual industry data.
              </p>
            </div>
            <div className="rounded-3xl border border-gold-500/50 bg-beige-50 p-6 shadow-sm">
              <h2 className="text-base font-black text-navy-900">Turn insight into action</h2>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Continue from self-assessment to evidence validation, a detailed NIST CSF assessment, improvement planning, or an RTI proposal/RFQ.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-navy-700"
                >
                  Request Cybersecurity Consultation
                </button>
                {activeFeatures.has('detailed_assessment') && (
                  <button
                    type="button"
                    onClick={() => setShowLeadModal(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-extrabold text-navy-900"
                  >
                    Request Detailed NIST CSF Assessment / RFQ
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 text-[10px] leading-5 text-muted">
            <strong className="text-navy-900">Methodology disclaimer:</strong>{' '}
            {result.methodologyDisclaimer} The Indicative CSF Tier is based on questionnaire responses and evidence confidence and does not constitute a formal NIST assessment. A high RTI Cyber Readiness Score does not by itself establish legal, regulatory, ISO, PCI DSS, CIS, COBIT, or sector-specific compliance.
          </div>
        </section>
      )}

      {showLeadModal && assessment && result && (
        <LeadModal
          toolSlug="nist-cyber-quick-check"
          toolName="NIST Cyber Quick Check Follow-up"
          summaryData={{
            assessmentId: assessment.id,
            company: assessment.organization.companyName,
            industry: assessment.organization.industry,
            score: result.overallScore,
            riskRating: result.riskRating,
            confidenceScore: result.confidenceScore,
            indicativeTier: result.indicativeTier,
            criticalGapCount: result.criticalGapCount,
            topGaps: result.gaps.slice(0, 5).map((item) => ({
              categoryCode: item.categoryCode,
              gap: item.gap,
            })),
            recommendedServices: result.recommendations
              .filter((item) => item.serviceName)
              .slice(0, 6)
              .map((item) => item.serviceName),
          }}
          onClose={() => setShowLeadModal(false)}
          onSuccess={() => setShowLeadModal(false)}
        />
      )}
    </main>
  );
}
