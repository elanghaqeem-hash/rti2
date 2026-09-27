'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Compass,
  ExternalLink,
  FileText,
  Gauge,
  Languages,
  MessageSquare,
  Network,
  Printer,
  RefreshCw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { LeadModal } from '@/components/tools/LeadModal';
import type {
  CapabilityStatus,
  FinderAssessmentInput,
  FinderConfig,
  FinderDiagnosticResult,
  FinderPressureRating,
  FinderQuestion,
  FinderQuestionOption,
} from '@/lib/enterprise-finder/types';

type SessionState = {
  id: string;
  token: string;
};

const STORAGE_KEY = 'rti.enterprise-solution-finder.session.v1';

const DEFAULT_RATING = {
  severity: 3,
  urgency: 3,
  businessImpact: 3,
  regulatoryImpact: 3,
  cyberRisk: 3,
  operationalImpact: 3,
};

const UI = {
  id: {
    loading: 'Memuat konfigurasi diagnostic...',
    start: 'Mulai Analisis',
    continue: 'Lanjutkan Assessment',
    save: 'Simpan Progress',
    saving: 'Menyimpan...',
    previous: 'Sebelumnya',
    next: 'Berikutnya',
    diagnose: 'Bangun Solution Blueprint',
    restart: 'Mulai Assessment Baru',
    step: 'LANGKAH',
    completed: 'selesai',
    optional: 'opsional',
    result: 'Enterprise Solution Blueprint',
    primary: 'Primary Solutions',
    supporting: 'Supporting Solutions',
    pressures: 'Enterprise Pressure Map',
    roadmap: 'Implementation Roadmap',
    quickWins: 'Quick Wins',
    initiatives: 'Strategic Initiatives',
    tools: 'Recommended RTI Diagnostic Tools',
    executive: 'Executive Diagnostic Summary',
    delivery: 'Recommended Delivery Model',
    print: 'Download / Print Executive Report',
    proposal: 'Request Proposal',
    consult: 'Discuss With RTI Consultant',
    rfq: 'Build My RFQ',
    why: 'Why this solution',
    outcome: 'Expected outcomes',
    noData: 'No data available',
  },
  en: {
    loading: 'Loading diagnostic configuration...',
    start: 'Start Analysis',
    continue: 'Continue Assessment',
    save: 'Save Progress',
    saving: 'Saving...',
    previous: 'Previous',
    next: 'Next',
    diagnose: 'Build Solution Blueprint',
    restart: 'Start New Assessment',
    step: 'STEP',
    completed: 'completed',
    optional: 'optional',
    result: 'Enterprise Solution Blueprint',
    primary: 'Primary Solutions',
    supporting: 'Supporting Solutions',
    pressures: 'Enterprise Pressure Map',
    roadmap: 'Implementation Roadmap',
    quickWins: 'Quick Wins',
    initiatives: 'Strategic Initiatives',
    tools: 'Recommended RTI Diagnostic Tools',
    executive: 'Executive Diagnostic Summary',
    delivery: 'Recommended Delivery Model',
    print: 'Download / Print Executive Report',
    proposal: 'Request Proposal',
    consult: 'Discuss With RTI Consultant',
    rfq: 'Build My RFQ',
    why: 'Why this solution',
    outcome: 'Expected outcomes',
    noData: 'No data available',
  },
} as const;

function MultiCard({
  option,
  selected,
  onClick,
}: {
  option: FinderQuestionOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-xl border p-3 text-left text-xs font-bold transition-all ${
        selected
          ? 'border-gold-500 bg-beige-50 text-navy-900 shadow-sm'
          : 'border-line bg-white text-navy-900 hover:border-blue-400 hover:bg-grey-50'
      }`}
    >
      <span className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            selected
              ? 'border-gold-500 bg-gold-500'
              : 'border-line bg-white'
          }`}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
        </span>
        <span>
          {option.label}
          {option.description && (
            <span className="mt-1 block text-[10px] font-medium leading-relaxed text-muted">
              {option.description}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function SingleCards({
  options,
  value,
  onChange,
  columns = 'sm:grid-cols-2 lg:grid-cols-3',
}: {
  options: FinderQuestionOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-2.5 ${columns}`}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-xs font-bold transition-all ${
              selected
                ? 'border-navy-900 bg-navy-900 text-white shadow'
                : 'border-line bg-white text-navy-900 hover:border-blue-400 hover:bg-grey-50'
            }`}
          >
            {option.label}
            {option.description && (
              <span
                className={`mt-1 block text-[10px] font-medium leading-relaxed ${
                  selected ? 'text-slate-300' : 'text-muted'
                }`}
              >
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-navy-900">{label}</span>
        <span className="font-extrabold text-blue-600">{Math.round(normalized)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-grey-50">
        <div
          className="h-full rounded-full bg-navy-900"
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function RatingControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-line bg-white p-3">
      <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
        <strong className="text-sm text-navy-900">{value}</strong>
      </span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[#E4A11B]"
        aria-label={label}
      />
      <span className="mt-1 flex justify-between text-[9px] text-muted">
        <span>1</span><span>5</span>
      </span>
    </label>
  );
}

export default function SolutionFinderPage() {
  const [locale, setLocale] = useState<'id' | 'en'>('id');
  const [config, setConfig] = useState<FinderConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [started, setStarted] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState<FinderDiagnosticResult | null>(null);
  const [showLead, setShowLead] = useState(false);
  const [leadIntent, setLeadIntent] = useState<'consultation' | 'proposal'>(
    'consultation',
  );

  const [organization, setOrganization] = useState<FinderAssessmentInput['organization']>({
    companyName: '',
    industry: '',
    regulatedStatus: '',
    organizationScale: '',
  });
  const [technology, setTechnology] = useState<FinderAssessmentInput['technology']>({
    infrastructure: [],
    digitalDependency: '',
    itTeamSize: '',
    cyberTeam: '',
    capabilities: {},
  });
  const [pressures, setPressures] = useState<FinderPressureRating[]>([]);
  const [triggerAnswers, setTriggerAnswers] = useState<Record<string, string[]>>({});
  const [objectives, setObjectives] = useState<string[]>([]);
  const [targetTimeline, setTargetTimeline] = useState('');
  const [deliveryPreference, setDeliveryPreference] = useState('');

  const t = UI[locale];

  const question = (key: string): FinderQuestion | undefined =>
    config?.questions.find((item) => item.key === key);

  const loadConfig = async (nextLocale: 'id' | 'en') => {
    setConfigLoading(true);
    setConfigError('');
    try {
      const response = await fetch(
        `/api/enterprise-finder/config?locale=${nextLocale}`,
        { cache: 'no-store' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.config) {
        throw new Error(
          data?.error ||
            'Enterprise Solution Finder configuration is unavailable.',
        );
      }
      setConfig(data.config as FinderConfig);
    } catch (error) {
      setConfig(null);
      setConfigError(
        error instanceof Error
          ? error.message
          : 'Enterprise Solution Finder configuration is unavailable.',
      );
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadConfig(locale);
  }, [locale]);

  useEffect(() => {
    if (!config || resumeChecked) return;

    const resume = async () => {
      setResumeChecked(true);
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as SessionState;
        if (!saved?.id || !saved?.token) return;

        const response = await fetch(
          `/api/enterprise-finder/session?id=${encodeURIComponent(saved.id)}`,
          {
            cache: 'no-store',
            headers: { 'x-assessment-token': saved.token },
          },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.draft) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }

        setSession(saved);
        setResumeAvailable(data.draft.status === 'draft');
        const input = data.draft.input as Partial<FinderAssessmentInput>;
        if (input.organization) setOrganization(input.organization);
        if (input.technology) setTechnology(input.technology);
        if (Array.isArray(input.pressures)) setPressures(input.pressures);
        if (input.triggerAnswers) setTriggerAnswers(input.triggerAnswers);
        if (Array.isArray(input.objectives)) setObjectives(input.objectives);
        if (typeof input.targetTimeline === 'string') {
          setTargetTimeline(input.targetTimeline);
        }
        if (typeof input.deliveryPreference === 'string') {
          setDeliveryPreference(input.deliveryPreference);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    };

    resume();
  }, [config, resumeChecked]);

  useEffect(() => {
    if (!config) return;
    const capabilityOptions = question('capabilities')?.options || [];
    if (capabilityOptions.length === 0) return;

    setTechnology((current) => {
      if (Object.keys(current.capabilities).length > 0) return current;
      return {
        ...current,
        capabilities: Object.fromEntries(
          capabilityOptions.map((option) => [option.value, 'unknown']),
        ),
      };
    });
  }, [config]);

  const pressureGroups = useMemo(() => {
    const groups: Record<string, FinderQuestionOption[]> = {};
    for (const option of question('pressures')?.options || []) {
      const category = String(option.metadata?.category || 'Other');
      if (!groups[category]) groups[category] = [];
      groups[category].push(option);
    }
    return groups;
  }, [config]);

  const capabilityGroups = useMemo(() => {
    const groups: Record<string, FinderQuestionOption[]> = {};
    for (const option of question('capabilities')?.options || []) {
      const category = String(option.metadata?.category || 'Other');
      if (!groups[category]) groups[category] = [];
      groups[category].push(option);
    }
    return groups;
  }, [config]);

  const buildInput = (): FinderAssessmentInput => ({
    locale,
    organization,
    technology,
    pressures,
    triggerAnswers,
    objectives,
    targetTimeline,
    deliveryPreference,
  });

  const startNewSession = async () => {
    if (!config) return;
    setMessage('');
    setSaving(true);
    try {
      const response = await fetch('/api/enterprise-finder/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.session) {
        throw new Error(data?.error || 'Assessment session could not be created.');
      }
      const nextSession = {
        id: String(data.session.id),
        token: String(data.session.resumeToken),
      };
      setSession(nextSession);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setResumeAvailable(false);
      setStarted(true);
      setResult(null);
      setStep(1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Assessment session could not be created.',
      );
    } finally {
      setSaving(false);
    }
  };

  const resumeSession = () => {
    if (!session) return;
    setStarted(true);
    setResult(null);
  };

  const saveProgress = async (showMessage = true) => {
    if (!session) return false;
    setSaving(true);
    if (showMessage) setMessage('');
    try {
      const response = await fetch('/api/enterprise-finder/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-assessment-token': session.token,
        },
        body: JSON.stringify({
          assessmentId: session.id,
          input: buildInput(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Progress could not be saved.');
      }
      if (showMessage) {
        setMessage(
          locale === 'id'
            ? 'Progress assessment tersimpan dengan aman.'
            : 'Assessment progress saved securely.',
        );
      }
      return true;
    } catch (error) {
      if (showMessage) {
        setMessage(
          error instanceof Error ? error.message : 'Progress could not be saved.',
        );
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const stepIsValid = () => {
    if (step === 1) {
      return Boolean(
        organization.industry &&
          organization.organizationScale &&
          organization.regulatedStatus,
      );
    }
    if (step === 2) {
      return Boolean(
        technology.infrastructure.length > 0 &&
          technology.digitalDependency &&
          technology.itTeamSize &&
          technology.cyberTeam,
      );
    }
    if (step === 3) return pressures.length > 0;
    return Boolean(
      objectives.length > 0 && targetTimeline && deliveryPreference,
    );
  };

  const nextStep = async () => {
    setMessage('');
    if (!stepIsValid()) {
      setMessage(
        locale === 'id'
          ? 'Lengkapi field wajib pada langkah ini sebelum melanjutkan.'
          : 'Complete the required fields in this step before continuing.',
      );
      return;
    }
    await saveProgress(false);
    setStep((current) => Math.min(4, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleInfrastructure = (value: string) => {
    setTechnology((current) => ({
      ...current,
      infrastructure: current.infrastructure.includes(value)
        ? current.infrastructure.filter((item) => item !== value)
        : [...current.infrastructure, value],
    }));
  };

  const togglePressure = (value: string) => {
    setPressures((current) => {
      const exists = current.some((item) => item.key === value);
      if (exists) return current.filter((item) => item.key !== value);
      return [...current, { key: value, ...DEFAULT_RATING }];
    });
  };

  const updatePressure = (
    key: string,
    field: keyof Omit<FinderPressureRating, 'key'>,
    value: number,
  ) => {
    setPressures((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  };

  const toggleObjective = (value: string) => {
    setObjectives((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const toggleTrigger = (key: string, value: string) => {
    setTriggerAnswers((current) => {
      const existing = current[key] || [];
      return {
        ...current,
        [key]: existing.includes(value)
          ? existing.filter((item) => item !== value)
          : [...existing, value],
      };
    });
  };

  const diagnose = async () => {
    if (!session || !stepIsValid()) {
      setMessage(
        locale === 'id'
          ? 'Lengkapi seluruh field wajib sebelum membuat blueprint.'
          : 'Complete all required fields before generating the blueprint.',
      );
      return;
    }

    setDiagnosing(true);
    setMessage('');
    try {
      const response = await fetch('/api/enterprise-finder/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assessment-token': session.token,
        },
        body: JSON.stringify({
          assessmentId: session.id,
          locale,
          input: buildInput(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.result) {
        throw new Error(data?.error || 'Diagnosis could not be completed.');
      }
      setResult(data.result as FinderDiagnosticResult);
      setResumeAvailable(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Diagnosis could not be completed.',
      );
    } finally {
      setDiagnosing(false);
    }
  };

  const trackEvent = async (
    eventType: string,
    payload?: Record<string, unknown>,
  ) => {
    if (!session) return;
    fetch('/api/enterprise-finder/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-assessment-token': session.token,
      },
      body: JSON.stringify({
        assessmentId: session.id,
        eventType,
        payload,
      }),
    }).catch(() => null);
  };

  const printReport = () => {
    trackEvent('print_report');
    window.print();
  };

  const buildRfq = () => {
    if (!result) return;
    const handoff = {
      source: 'enterprise-solution-finder',
      assessmentId: result.assessmentId,
      organization: {
        industry: organization.industry,
        organizationScale: organization.organizationScale,
      },
      priorities: result.topPriorities.slice(0, 5),
      solutions: result.primarySolutions.map((item) => ({
        serviceKey: item.serviceKey,
        name: item.name,
        matchScore: item.matchScore,
        priority: item.priority,
      })),
      complexity: result.engagementComplexity,
      expectedDuration: result.expectedDuration,
      roadmap: result.roadmap,
    };
    window.sessionStorage.setItem(
      'rti.enterprise-solution-finder.rfq-handoff.v1',
      JSON.stringify(handoff),
    );
    trackEvent('build_rfq', {
      primaryServices: result.primarySolutions.map((item) => item.serviceKey),
    });
    window.location.href = '/tools/project-estimator?source=solution-finder';
  };

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setStarted(false);
    setResumeAvailable(false);
    setResult(null);
    setStep(1);
    setMessage('');
    setOrganization({
      companyName: '',
      industry: '',
      regulatedStatus: '',
      organizationScale: '',
    });
    setTechnology({
      infrastructure: [],
      digitalDependency: '',
      itTeamSize: '',
      cyberTeam: '',
      capabilities: Object.fromEntries(
        (question('capabilities')?.options || []).map((option) => [
          option.value,
          'unknown',
        ]),
      ),
    });
    setPressures([]);
    setTriggerAnswers({});
    setObjectives([]);
    setTargetTimeline('');
    setDeliveryPreference('');
  };

  if (configLoading) {
    return (
      <main className="min-h-screen bg-grey-50">
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-gold-600" />
            <p className="mt-3 text-sm font-bold text-navy-900">{t.loading}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!config || configError) {
    return (
      <main className="min-h-screen bg-grey-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <h1 className="mt-3 text-2xl font-extrabold text-navy-900">
              Enterprise Solution Finder
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {configError ||
                'Enterprise Solution Finder configuration is unavailable.'}
            </p>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              {locale === 'id'
                ? 'Tidak ada fallback, dummy questionnaire, atau rekomendasi palsu yang ditampilkan. Admin RTI perlu memastikan migration Enterprise Solution Finder telah diterapkan pada database production.'
                : 'No fallback, dummy questionnaire, or fabricated recommendations are displayed. An RTI administrator must ensure the Enterprise Solution Finder migration has been applied to the production database.'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!started && !result) {
    return (
      <main className="min-h-screen bg-white finder-no-print">
        <section className="border-b border-navy-700 bg-navy-900 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                <Compass className="h-3.5 w-3.5" />
                Strategic Matchmaking
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                Find the Right Enterprise Solution
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                {locale === 'id'
                  ? 'Jelaskan profil organisasi, landscape teknologi, dan business pressure Anda. RTI akan membangun preliminary diagnostic, capability gap, solution match, delivery model, dan implementation blueprint secara terstruktur.'
                  : 'Describe your organization, technology landscape, and business pressures. RTI will build a structured preliminary diagnostic, capability-gap view, solution match, delivery model, and implementation blueprint.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-gold-300" />
                  3–5 Minutes
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gold-300" />
                  {locale === 'id' ? 'Tanpa login' : 'No login required'}
                </span>
                <span className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-gold-300" />
                  {locale === 'id'
                    ? 'Explainable recommendation'
                    : 'Explainable recommendation'}
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {resumeAvailable && session ? (
                  <button
                    type="button"
                    onClick={resumeSession}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-sm font-extrabold text-navy-900 hover:bg-gold-300"
                  >
                    {t.continue}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startNewSession}
                    disabled={saving}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-sm font-extrabold text-navy-900 hover:bg-gold-300 disabled:opacity-50"
                  >
                    {saving ? t.saving : t.start}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setResumeChecked(true);
                    setLocale((current) => (current === 'id' ? 'en' : 'id'));
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white hover:bg-white/5"
                >
                  <Languages className="h-4 w-4" />
                  {locale === 'id' ? 'English' : 'Bahasa Indonesia'}
                </button>
              </div>

              {message && (
                <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
                  {message}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-grey-50 py-14">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              {
                icon: Building2,
                title: locale === 'id' ? 'Describe' : 'Describe',
                desc:
                  locale === 'id'
                    ? 'Profil organisasi, industri, skala dan regulatory context.'
                    : 'Organization, industry, scale and regulatory context.',
              },
              {
                icon: Network,
                title: locale === 'id' ? 'Diagnose' : 'Diagnose',
                desc:
                  locale === 'id'
                    ? 'Technology landscape, capability dan business pressure.'
                    : 'Technology landscape, capabilities and business pressures.',
              },
              {
                icon: Sparkles,
                title: locale === 'id' ? 'Match' : 'Match',
                desc:
                  locale === 'id'
                    ? 'Explainable matching ke kombinasi layanan RTI.'
                    : 'Explainable matching to combinations of RTI services.',
              },
              {
                icon: Route,
                title: locale === 'id' ? 'Blueprint' : 'Blueprint',
                desc:
                  locale === 'id'
                    ? 'Roadmap, quick wins, delivery model dan next action.'
                    : 'Roadmap, quick wins, delivery model and next action.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-line bg-white p-5 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-gold-600" />
                  <h2 className="mt-3 text-sm font-extrabold text-navy-900">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (result) {
    const summaryItems = [
      ['Current Situation', result.executiveSummary.currentSituation],
      ['Key Enterprise Pressures', result.executiveSummary.keyPressures],
      ['Capability Gaps', result.executiveSummary.capabilityGaps],
      ['Risk Implication', result.executiveSummary.riskImplication],
      ['Immediate Priorities', result.executiveSummary.immediatePriorities],
      ['Recommended RTI Solutions', result.executiveSummary.recommendedSolutions],
      ['Suggested Delivery Model', result.executiveSummary.suggestedDeliveryModel],
      ['Proposed Roadmap', result.executiveSummary.proposedRoadmap],
      ['Next Action', result.executiveSummary.nextAction],
    ];

    return (
      <main className="min-h-screen bg-grey-50">
        <style jsx global>{`
          @media print {
            @page { size: A4; margin: 12mm; }
            .finder-no-print { display: none !important; }
            .finder-report { background: white !important; }
            .finder-report-card {
              break-inside: avoid;
              box-shadow: none !important;
            }
            header, footer { display: none !important; }
          }
        `}</style>

        <section className="finder-no-print border-b border-navy-700 bg-navy-900 py-8 text-white">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gold-300">
                Enterprise Solution Finder
              </div>
              <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                {t.result}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={printReport}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold hover:bg-white/5"
              >
                <Printer className="h-4 w-4 text-gold-300" />
                {t.print}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-extrabold text-navy-900 hover:bg-gold-300"
              >
                <RefreshCw className="h-4 w-4" />
                {t.restart}
              </button>
            </div>
          </div>
        </section>

        <div className="finder-report mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="finder-report-card overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                  <Gauge className="h-3.5 w-3.5" />
                  Enterprise Diagnostic Snapshot
                </div>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900">
                  {organization.companyName || result.diagnosticSnapshot.industry}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  {result.executiveSummary.currentSituation}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Industry', result.diagnosticSnapshot.industry],
                    ['Scale', result.diagnosticSnapshot.organizationScale],
                    ['Dependency', result.diagnosticSnapshot.digitalDependency],
                    ['Complexity', result.engagementComplexity],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-line bg-grey-50 p-3"
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
                        {label}
                      </div>
                      <div className="mt-1 text-xs font-extrabold text-navy-900">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-navy-900 p-6 text-white">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
                  Enterprise Pressure Score
                </div>
                <div className="mt-2 text-6xl font-extrabold">
                  {result.enterprisePressureScore}
                  <span className="text-xl text-slate-400">/100</span>
                </div>
                <div className="mt-5 space-y-3 text-xs">
                  <div className="flex justify-between border-t border-slate-700 pt-3">
                    <span className="text-slate-300">Expected Duration</span>
                    <strong>{result.expectedDuration}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-3">
                    <span className="text-slate-300">Delivery</span>
                    <strong className="text-right">
                      {result.deliveryRecommendation.model}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-navy-900">{t.pressures}</h2>
              <div className="mt-5 space-y-4">
                {Object.entries(result.pressureMap).map(([label, value]) => (
                  <ScoreBar key={label} label={label} value={value} />
                ))}
              </div>
            </section>

            <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-navy-900">
                Top Priorities
              </h2>
              <div className="mt-4 space-y-3">
                {result.topPriorities.length ? (
                  result.topPriorities.slice(0, 5).map((item, index) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-line bg-grey-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                            Priority #{index + 1} · {item.category}
                          </span>
                          <h3 className="mt-1 text-sm font-extrabold text-navy-900">
                            {item.label}
                          </h3>
                        </div>
                        <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[9px] font-extrabold text-white">
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">
                        {item.reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted">{t.noData}</p>
                )}
              </div>
            </section>
          </div>

          <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                  Solution Matching Engine
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-navy-900">
                  {t.primary}
                </h2>
              </div>
              <p className="max-w-xl text-[11px] leading-relaxed text-muted">
                {locale === 'id'
                  ? 'Match Score berasal dari parameter service mapping, pressure, capability gap, industry context, urgency dan delivery preference. Skor bukan assurance atau quotation.'
                  : 'Match Score is derived from service mappings, pressures, capability gaps, industry context, urgency and delivery preference. It is not an assurance statement or quotation.'}
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {result.primarySolutions.map((item) => (
                <article
                  key={item.serviceKey}
                  className="rounded-2xl border border-line bg-grey-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                        {item.category} · {item.priority}
                      </span>
                      <h3 className="mt-1 text-base font-extrabold text-navy-900">
                        {item.name}
                      </h3>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                      <div className="text-xl font-extrabold text-navy-900">
                        {item.matchScore}%
                      </div>
                      <div className="text-[8px] font-bold uppercase text-muted">
                        {item.matchLabel}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {item.description}
                  </p>
                  <div className="mt-4 rounded-xl border border-beige-200 bg-beige-50 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gold-700">
                      {t.why}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-navy-900">
                      {item.reason}
                    </p>
                  </div>
                  {item.expectedOutcomes.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
                        {t.outcome}
                      </div>
                      <ul className="mt-2 space-y-1.5 text-[11px] text-navy-900">
                        {item.expectedOutcomes.slice(0, 3).map((outcome) => (
                          <li key={outcome} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="finder-no-print mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-[10px] font-semibold text-muted">
                      {item.deliveryModel} · {item.typicalDuration}
                    </span>
                    <Link
                      href={item.url}
                      onClick={() =>
                        trackEvent('view_service', { serviceKey: item.serviceKey })
                      }
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 hover:underline"
                    >
                      Explore Solution
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {result.supportingSolutions.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="text-sm font-extrabold text-navy-900">
                  {t.supporting}
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {result.supportingSolutions.map((item) => (
                    <div
                      key={item.serviceKey}
                      className="rounded-xl border border-line p-3"
                    >
                      <div className="text-[9px] font-bold uppercase text-muted">
                        {item.category} · {item.matchScore}%
                      </div>
                      <div className="mt-1 text-xs font-extrabold text-navy-900">
                        {item.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-extrabold text-navy-900">{t.roadmap}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {['0–30 Days', '1–3 Months', '3–6 Months', '6–18 Months'].map(
                  (phase) => {
                    const phaseItems = result.roadmap.filter(
                      (item) => item.phase === phase,
                    );
                    return (
                      <div
                        key={phase}
                        className="rounded-xl border border-line bg-grey-50 p-4"
                      >
                        <div className="text-xs font-extrabold text-blue-600">
                          {phase}
                        </div>
                        <div className="mt-3 space-y-3">
                          {phaseItems.length ? (
                            phaseItems.map((item) => (
                              <div key={`${phase}-${item.title}`}>
                                <div className="text-xs font-bold text-navy-900">
                                  {item.title}
                                </div>
                                <div className="mt-0.5 text-[10px] leading-relaxed text-muted">
                                  {item.objective}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-muted">
                              {locale === 'id'
                                ? 'Tidak ada initiative utama pada fase ini.'
                                : 'No primary initiative in this phase.'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            <section className="finder-report-card rounded-2xl border border-line bg-navy-900 p-6 text-white shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
                {t.delivery}
              </div>
              <h2 className="mt-2 text-xl font-extrabold">
                {result.deliveryRecommendation.model}
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {result.deliveryRecommendation.reason}
              </p>
              <div className="mt-5 border-t border-slate-700 pt-4">
                <div className="text-[10px] uppercase text-slate-400">
                  Engagement Complexity
                </div>
                <div className="mt-1 text-sm font-extrabold">
                  {result.engagementComplexity}
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-navy-900">
                {t.quickWins}
              </h2>
              <div className="mt-4 space-y-2.5">
                {result.quickWins.map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-xl border border-line bg-grey-50 p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500 text-[10px] font-extrabold text-navy-900">
                      {index + 1}
                    </span>
                    <p className="text-xs leading-relaxed text-navy-900">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-navy-900">
                {t.initiatives}
              </h2>
              <div className="mt-4 space-y-2.5">
                {result.strategicInitiatives.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-line p-3"
                  >
                    <Route className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <p className="text-xs font-semibold leading-relaxed text-navy-900">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-navy-900">{t.executive}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {summaryItems.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line p-4">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                    {label}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-navy-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {result.aiNarrative?.text && (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                  <Sparkles className="h-4 w-4" />
                  Optional AI Advisory Narrative
                </div>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-navy-900">
                  {result.aiNarrative.text}
                </p>
                <div className="mt-3 text-[9px] text-muted">
                  Provider: {result.aiNarrative.provider}
                </div>
              </div>
            )}
          </section>

          {result.recommendedTools.length > 0 && (
            <section className="finder-report-card rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-navy-900">{t.tools}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {result.recommendedTools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={tool.url}
                    onClick={() =>
                      trackEvent('open_specialized_tool', { slug: tool.slug })
                    }
                    className="finder-no-print rounded-xl border border-line bg-grey-50 p-4 transition hover:border-gold-500 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold text-navy-900">
                          {tool.name}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          {tool.reason}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gold-600" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="finder-report-card rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] leading-relaxed text-amber-900">
              {result.disclaimer}
            </p>
          </section>

          <section className="finder-no-print rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  trackEvent('request_consultation');
                  setLeadIntent('consultation');
                  setShowLead(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs font-extrabold text-white hover:bg-navy-700"
              >
                <MessageSquare className="h-4 w-4 text-gold-300" />
                {t.consult}
              </button>
              <button
                type="button"
                onClick={buildRfq}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300"
              >
                <Calculator className="h-4 w-4" />
                {t.rfq}
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent('request_proposal');
                  setLeadIntent('proposal');
                  setShowLead(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-extrabold text-navy-900 hover:bg-grey-50"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                {t.proposal}
              </button>
              <button
                type="button"
                onClick={printReport}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-extrabold text-navy-900 hover:bg-grey-50"
              >
                <Printer className="h-4 w-4 text-blue-600" />
                {t.print}
              </button>
            </div>
          </section>
        </div>

        {showLead && (
          <LeadModal
            toolSlug="solution-finder"
            toolName="Enterprise Solution Finder Blueprint"
            summaryData={{
              assessmentId: result.assessmentId,
              enterprisePressureScore: result.enterprisePressureScore,
              complexity: result.engagementComplexity,
              primarySolutions: result.primarySolutions.map((item) => ({
                serviceKey: item.serviceKey,
                matchScore: item.matchScore,
                priority: item.priority,
              })),
              topPriorities: result.topPriorities.slice(0, 5),
              leadSignals: {
                urgency:
                  Math.max(
                    0,
                    ...result.pressureScores.map((item) => item.urgency * 20),
                  ),
                severity:
                  Math.max(
                    0,
                    ...result.pressureScores.map((item) => item.severity * 20),
                  ),
                identifiedGaps: result.capabilityGaps.length,
                timeline: targetTimeline,
                regulated: organization.regulatedStatus === 'yes',
                requestProposal: leadIntent === 'proposal',
                requestConsultation: leadIntent === 'consultation',
              },
            }}
            onClose={() => setShowLead(false)}
            onSuccess={() => trackEvent('email_results')}
          />
        )}
      </main>
    );
  }

  const stepTitles = [
    locale === 'id' ? 'Organization & Industry' : 'Organization & Industry',
    locale === 'id' ? 'Technology Landscape' : 'Technology Landscape',
    locale === 'id' ? 'Business Pressures' : 'Business Pressures',
    locale === 'id' ? 'Priority & Engagement' : 'Priority & Engagement',
  ];

  const dataBreachSelected = pressures.some((item) => item.key === 'data_breach');
  const isoSelected = pressures.some((item) => item.key === 'iso_27001');
  const socSelected = pressures.some(
    (item) =>
      item.key === 'soc_requirement' || item.key === 'siem_requirement',
  );

  return (
    <main className="min-h-screen bg-grey-50 finder-no-print">
      <section className="border-b border-navy-700 bg-navy-900 py-8 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
                Enterprise Solution Finder
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">
                {stepTitles[step - 1]}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setLocale((current) => (current === 'id' ? 'en' : 'id'))}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold hover:bg-white/5"
            >
              <Languages className="h-4 w-4 text-gold-300" />
              {locale === 'id' ? 'English' : 'Bahasa Indonesia'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((value) => (
              <div key={value}>
                <div
                  className={`h-1.5 rounded-full ${
                    value <= step ? 'bg-gold-500' : 'bg-slate-700'
                  }`}
                />
                <div className="mt-1 text-[9px] font-bold uppercase text-slate-400">
                  {t.step} {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
          {step === 1 && (
            <div className="space-y-7">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Building2 className="h-5 w-5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    Tell Us About Your Organization
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-navy-900">
                  {locale === 'id'
                    ? 'Bangun konteks organisasi terlebih dahulu'
                    : 'Start with the organizational context'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {locale === 'id'
                    ? 'Identitas perusahaan bersifat opsional. Industry, scale dan regulatory context digunakan oleh matching engine.'
                    : 'Company identity is optional. Industry, scale and regulatory context are used by the matching engine.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-navy-900">
                  {locale === 'id' ? 'Nama Organisasi (opsional)' : 'Organization Name (optional)'}
                  <input
                    type="text"
                    value={organization.companyName || ''}
                    onChange={(event) =>
                      setOrganization((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }))
                    }
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-line px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="PT / Institution"
                  />
                </label>
                <label className="text-xs font-bold text-navy-900">
                  {locale === 'id' ? 'Lokasi Utama (opsional)' : 'Primary Location (optional)'}
                  <input
                    type="text"
                    value={organization.location || ''}
                    onChange={(event) =>
                      setOrganization((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-line px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Jakarta / Indonesia"
                  />
                </label>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('industry')?.label}
                </h3>
                <SingleCards
                  options={question('industry')?.options || []}
                  value={organization.industry}
                  onChange={(value) =>
                    setOrganization((current) => ({
                      ...current,
                      industry: value,
                    }))
                  }
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('organization_scale')?.label}
                </h3>
                <SingleCards
                  options={question('organization_scale')?.options || []}
                  value={organization.organizationScale}
                  onChange={(value) =>
                    setOrganization((current) => ({
                      ...current,
                      organizationScale: value,
                    }))
                  }
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('regulated_status')?.label}
                </h3>
                <SingleCards
                  options={question('regulated_status')?.options || []}
                  value={organization.regulatedStatus}
                  onChange={(value) =>
                    setOrganization((current) => ({
                      ...current,
                      regulatedStatus: value,
                    }))
                  }
                  columns="sm:grid-cols-3"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['employeeCount', locale === 'id' ? 'Employees' : 'Employees'],
                  ['branchCount', locale === 'id' ? 'Branches / Locations' : 'Branches / Locations'],
                  ['itUsers', locale === 'id' ? 'IT / Digital Users' : 'IT / Digital Users'],
                  ['endpointCount', locale === 'id' ? 'Endpoints' : 'Endpoints'],
                ].map(([field, label]) => (
                  <label key={field} className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {label} ({t.optional})
                    <input
                      type="number"
                      min={0}
                      value={(organization as any)[field] ?? ''}
                      onChange={(event) =>
                        setOrganization((current) => ({
                          ...current,
                          [field]:
                            event.target.value === ''
                              ? undefined
                              : Number(event.target.value),
                        }))
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-line px-3 text-xs font-semibold text-navy-900 outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Network className="h-5 w-5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    Understand Your Environment
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-navy-900">
                  {locale === 'id'
                    ? 'Technology landscape & current capability'
                    : 'Technology landscape & current capability'}
                </h2>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('infrastructure')?.label}
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {(question('infrastructure')?.options || []).map((option) => (
                    <MultiCard
                      key={option.value}
                      option={option}
                      selected={technology.infrastructure.includes(option.value)}
                      onClick={() => toggleInfrastructure(option.value)}
                    />
                  ))}
                </div>
              </div>

              {[
                ['digital_dependency', technology.digitalDependency, 'digitalDependency'],
                ['it_team_size', technology.itTeamSize, 'itTeamSize'],
                ['cyber_team', technology.cyberTeam, 'cyberTeam'],
              ].map(([key, value, field]) => (
                <div key={key}>
                  <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                    {question(key)?.label}
                  </h3>
                  <SingleCards
                    options={question(key)?.options || []}
                    value={String(value)}
                    onChange={(next) =>
                      setTechnology((current) => ({
                        ...current,
                        [field]: next,
                      }))
                    }
                  />
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-5">
                {[
                  ['applications', 'Applications'],
                  ['servers', 'Servers'],
                  ['databases', 'Databases'],
                  ['thirdParties', 'Third Parties'],
                  ['criticalApplications', 'Critical Apps'],
                ].map(([field, label]) => (
                  <label key={field} className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {label} ({t.optional})
                    <input
                      type="number"
                      min={0}
                      value={(technology as any)[field] ?? ''}
                      onChange={(event) =>
                        setTechnology((current) => ({
                          ...current,
                          [field]:
                            event.target.value === ''
                              ? undefined
                              : Number(event.target.value),
                        }))
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-line px-3 text-xs font-semibold text-navy-900 outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </label>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-navy-900">
                  {question('capabilities')?.label}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {question('capabilities')?.description}
                </p>

                <div className="mt-4 space-y-3">
                  {Object.entries(capabilityGroups).map(([group, options]) => (
                    <details
                      key={group}
                      open={['Cybersecurity', 'Governance'].includes(group)}
                      className="rounded-xl border border-line bg-grey-50 p-4"
                    >
                      <summary className="cursor-pointer text-xs font-extrabold text-navy-900">
                        {group} · {options.length}
                      </summary>
                      <div className="mt-4 space-y-3">
                        {options.map((option) => (
                          <div
                            key={option.value}
                            className="rounded-xl border border-line bg-white p-3"
                          >
                            <div className="text-xs font-bold text-navy-900">
                              {option.label}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {config.capabilityStatuses.map((status) => {
                                const active =
                                  technology.capabilities[option.value] ===
                                  status.value;
                                return (
                                  <button
                                    key={status.value}
                                    type="button"
                                    onClick={() =>
                                      setTechnology((current) => ({
                                        ...current,
                                        capabilities: {
                                          ...current.capabilities,
                                          [option.value]: status.value,
                                        },
                                      }))
                                    }
                                    className={`min-h-9 rounded-lg border px-2.5 py-1.5 text-[9px] font-bold transition ${
                                      active
                                        ? 'border-navy-900 bg-navy-900 text-white'
                                        : 'border-line bg-white text-muted hover:bg-grey-50'
                                    }`}
                                  >
                                    {status.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-7">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Gauge className="h-5 w-5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    What Is Driving Change?
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-navy-900">
                  {locale === 'id'
                    ? 'Pilih business pressure paling material'
                    : 'Select the most material business pressures'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {locale === 'id'
                    ? 'Satu kebutuhan dapat memetakan beberapa layanan RTI. Pilih seluruh pressure yang relevan lalu beri rating 1–5.'
                    : 'One need may map to multiple RTI services. Select all relevant pressures, then rate each from 1–5.'}
                </p>
              </div>

              <div className="space-y-5">
                {Object.entries(pressureGroups).map(([group, options]) => (
                  <div key={group}>
                    <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-navy-900">
                      {group}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {options.map((option) => (
                        <MultiCard
                          key={option.value}
                          option={option}
                          selected={pressures.some(
                            (item) => item.key === option.value,
                          )}
                          onClick={() => togglePressure(option.value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {pressures.length > 0 && (
                <div className="border-t border-line pt-6">
                  <h3 className="text-sm font-extrabold text-navy-900">
                    {question('pressure_rating')?.label}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted">
                    {question('pressure_rating')?.description}
                  </p>
                  <div className="mt-4 space-y-4">
                    {pressures.map((pressure) => {
                      const label =
                        question('pressures')?.options.find(
                          (option) => option.value === pressure.key,
                        )?.label || pressure.key;
                      return (
                        <div
                          key={pressure.key}
                          className="rounded-2xl border border-line bg-grey-50 p-4"
                        >
                          <h4 className="text-sm font-extrabold text-navy-900">
                            {label}
                          </h4>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <RatingControl
                              label="Severity"
                              value={pressure.severity}
                              onChange={(value) =>
                                updatePressure(pressure.key, 'severity', value)
                              }
                            />
                            <RatingControl
                              label="Urgency"
                              value={pressure.urgency}
                              onChange={(value) =>
                                updatePressure(pressure.key, 'urgency', value)
                              }
                            />
                            <RatingControl
                              label="Business Impact"
                              value={pressure.businessImpact}
                              onChange={(value) =>
                                updatePressure(
                                  pressure.key,
                                  'businessImpact',
                                  value,
                                )
                              }
                            />
                            <RatingControl
                              label="Regulatory Impact"
                              value={pressure.regulatoryImpact}
                              onChange={(value) =>
                                updatePressure(
                                  pressure.key,
                                  'regulatoryImpact',
                                  value,
                                )
                              }
                            />
                            <RatingControl
                              label="Cyber Risk"
                              value={pressure.cyberRisk}
                              onChange={(value) =>
                                updatePressure(pressure.key, 'cyberRisk', value)
                              }
                            />
                            <RatingControl
                              label="Operational Impact"
                              value={pressure.operationalImpact}
                              onChange={(value) =>
                                updatePressure(
                                  pressure.key,
                                  'operationalImpact',
                                  value,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {[
                ['data_breach_trigger', dataBreachSelected],
                ['iso27001_trigger', isoSelected],
                ['soc_trigger', socSelected],
              ].map(([key, visible]) => {
                if (!visible) return null;
                const trigger = question(String(key));
                if (!trigger) return null;
                return (
                  <div
                    key={String(key)}
                    className="rounded-2xl border border-blue-200 bg-blue-50 p-5"
                  >
                    <h3 className="text-sm font-extrabold text-navy-900">
                      {trigger.label}
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      {trigger.description}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {trigger.options.map((option) => (
                        <MultiCard
                          key={option.value}
                          option={option}
                          selected={(triggerAnswers[String(key)] || []).includes(
                            option.value,
                          )}
                          onClick={() =>
                            toggleTrigger(String(key), option.value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-7">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Route className="h-5 w-5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    What Outcome Are You Looking For?
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-navy-900">
                  {locale === 'id'
                    ? 'Tentukan outcome, timeline dan delivery preference'
                    : 'Define outcomes, timeline and delivery preference'}
                </h2>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('objective')?.label}
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {(question('objective')?.options || []).map((option) => (
                    <MultiCard
                      key={option.value}
                      option={option}
                      selected={objectives.includes(option.value)}
                      onClick={() => toggleObjective(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('target_timeline')?.label}
                </h3>
                <SingleCards
                  options={question('target_timeline')?.options || []}
                  value={targetTimeline}
                  onChange={setTargetTimeline}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold text-navy-900">
                  {question('delivery_preference')?.label}
                </h3>
                <SingleCards
                  options={question('delivery_preference')?.options || []}
                  value={deliveryPreference}
                  onChange={setDeliveryPreference}
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[10px] leading-relaxed text-amber-900">
                {locale === 'id'
                  ? 'Output bersifat preliminary diagnostic. Tool tidak memberikan sertifikasi, opini hukum, formal assurance, ataupun quotation final.'
                  : 'The output is a preliminary diagnostic. The tool does not provide certification, legal opinion, formal assurance, or a final quotation.'}
              </div>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              {message}
            </div>
          )}

          <div className="mt-7 flex flex-col justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t.previous}
                </button>
              )}
              <button
                type="button"
                onClick={() => saveProgress(true)}
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4 text-blue-600" />
                {saving ? t.saving : t.save}
              </button>
            </div>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-xs font-extrabold text-white hover:bg-navy-700"
              >
                {t.next}
                <ArrowRight className="h-4 w-4 text-gold-300" />
              </button>
            ) : (
              <button
                type="button"
                onClick={diagnose}
                disabled={diagnosing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300 disabled:opacity-50"
              >
                {diagnosing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {diagnosing
                  ? locale === 'id'
                    ? 'Menganalisis...'
                    : 'Analyzing...'
                  : t.diagnose}
              </button>
            )}
          </div>
        </section>

        <div className="mt-4 text-center text-[10px] leading-relaxed text-muted">
          {locale === 'id'
            ? 'Assessment ID disimpan sebagai session identifier. Secure resume token tidak ditempatkan di URL.'
            : 'The assessment ID is stored as a session identifier. The secure resume token is never placed in the URL.'}
        </div>
      </div>
    </main>
  );
}
