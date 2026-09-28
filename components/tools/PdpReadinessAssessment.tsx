'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  Globe2,
  Loader2,
  LockKeyhole,
  Network,
  RotateCcw,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { LeadModal } from '@/components/tools/LeadModal';
import { useParameterOptions } from '@/components/parameters/useParameterOptions';
import type {
  PdpAnswerRecord,
  PdpAssessmentRecord,
  PdpConfig,
  PdpQuestion,
} from '@/lib/pdp/types';

type Stage = 'intro' | 'profile' | 'assessment' | 'results';

type ProfileState = {
  companyName: string;
  industry: string;
  companySize: string;
  employeeCount: string;
  country: string;
  locationCount: string;
  processesPersonalData: boolean;
  processesSpecificData: boolean;
  publicServiceProcessing: boolean;
  largeScaleMonitoring: boolean;
  crossBorderTransfer: boolean;
  usesProcessors: boolean;
  automatedDecisioning: boolean;
  respondentName: string;
  respondentTitle: string;
  respondentEmail: string;
  respondentPhone: string;
};

type DraftAnswer = {
  answerValue: string;
  evidenceStatus: string;
  applicabilityJustification: string;
  evidenceNote: string;
  comment: string;
};

type PdpResult = {
  assessmentId: string;
  implementationScore: number;
  evidenceScore: number;
  overallScore: number;
  readinessLevel: string;
  completion: { answered: number; total: number; percentage: number };
  gates: {
    completed: number;
    total: number;
    items: Array<{
      key: string;
      label: string;
      complete: boolean;
      answerScore: number | null;
      evidenceStatus: string | null;
    }>;
  };
  domainScores: Array<{
    domainCode: string;
    domainName: string;
    implementationScore: number;
    evidenceScore: number;
    overallScore: number;
    gap: number;
    status: string;
  }>;
  findings: Array<{
    id: string;
    questionId: string;
    domainCode: string;
    questionCode: string;
    title: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    currentCondition: string;
    risk: string;
    recommendation: string;
    legalReference: string | null;
  }>;
  roadmap: Array<{
    id: string;
    phase: string;
    domainCode: string;
    action: string;
    reason: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    ownerSuggestion: string;
    dependencies: string | null;
    expectedOutcome: string;
  }>;
  services: Array<{
    id: string;
    domainCode: string;
    serviceName: string;
    serviceUrlParameter: string;
    reasonTemplate: string;
    priorityOrder: number;
  }>;
  parameters: Record<string, string>;
};

const initialProfile: ProfileState = {
  companyName: '',
  industry: '',
  companySize: '',
  employeeCount: '',
  country: 'Indonesia',
  locationCount: '',
  processesPersonalData: true,
  processesSpecificData: false,
  publicServiceProcessing: false,
  largeScaleMonitoring: false,
  crossBorderTransfer: false,
  usesProcessors: false,
  automatedDecisioning: false,
  respondentName: '',
  respondentTitle: '',
  respondentEmail: '',
  respondentPhone: '',
};

const initialDraft: DraftAnswer = {
  answerValue: '',
  evidenceStatus: 'none',
  applicabilityJustification: '',
  evidenceNote: '',
  comment: '',
};

const domainIcons: Record<string, React.ElementType> = {
  GOV: ShieldCheck,
  INV: Database,
  LGL: Scale,
  RGT: UserCheck,
  RSK: Target,
  TPR: Network,
  SEC: LockKeyhole,
};

function readinessTone(score: number) {
  if (score >= 90) return 'text-emerald-700';
  if (score >= 75) return 'text-blue-700';
  if (score >= 60) return 'text-amber-700';
  return 'text-rose-700';
}

function severityStyle(severity: string) {
  if (severity === 'Critical') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (severity === 'High') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (severity === 'Medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function answerFromRecord(record?: PdpAnswerRecord | null): DraftAnswer {
  if (!record) return { ...initialDraft };
  return {
    answerValue: record.answerValue,
    evidenceStatus: record.evidenceStatus || 'none',
    applicabilityJustification: record.applicabilityJustification || '',
    evidenceNote: record.evidenceNote || '',
    comment: record.comment || '',
  };
}

export function PdpReadinessAssessment() {
  const [stage, setStage] = React.useState<Stage>('intro');
  const [assessmentType, setAssessmentType] = React.useState<'quick' | 'detailed'>('quick');
  const [config, setConfig] = React.useState<PdpConfig | null>(null);
  const [profile, setProfile] = React.useState<ProfileState>(initialProfile);
  const [consent, setConsent] = React.useState(false);
  const [evidenceConsent, setEvidenceConsent] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState('');
  const [assessment, setAssessment] = React.useState<PdpAssessmentRecord | null>(null);
  const [resumeAssessment, setResumeAssessment] = React.useState<PdpAssessmentRecord | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, PdpAnswerRecord>>({});
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<DraftAnswer>(initialDraft);
  const [evidenceFile, setEvidenceFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<PdpResult | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [leadModal, setLeadModal] = React.useState(false);

  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const industryOptions = useParameterOptions('assessment.industries');
  const companySizeOptions = useParameterOptions('assessment.company_sizes');

  const questions = React.useMemo(() => {
    if (!config) return [] as PdpQuestion[];
    return config.questions
      .filter((question) => assessmentType === 'detailed' || question.isCore)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [config, assessmentType]);

  const currentQuestion = questions[currentIndex];

  React.useEffect(() => {
    async function initialize() {
      setBusy(true);
      setMessage('');
      try {
        const [configResponse, sessionResponse] = await Promise.all([
          fetch('/api/pdp-assessment/config', { cache: 'no-store' }),
          fetch('/api/pdp-assessment/session', { cache: 'no-store' }),
        ]);

        const configData = await configResponse.json().catch(() => null);
        if (!configResponse.ok || !configData?.success) {
          throw new Error(configData?.error || 'Framework UU PDP belum tersedia.');
        }
        setConfig(configData.config);

        const sessionData = await sessionResponse.json().catch(() => null);
        if (sessionResponse.ok && sessionData?.success && sessionData.assessment) {
          const existing = sessionData.assessment as PdpAssessmentRecord;
          setResumeAssessment(existing);
          const mapped: Record<string, PdpAnswerRecord> = {};
          for (const item of sessionData.answers || []) {
            mapped[String(item.questionId)] = item as PdpAnswerRecord;
          }
          if (existing.status === 'completed') {
            setAnswers(mapped);
          }
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Tool belum dapat dimuat.');
      } finally {
        setBusy(false);
      }
    }
    initialize();
  }, []);

  React.useEffect(() => {
    if (!currentQuestion) return;
    setDraft(answerFromRecord(answers[currentQuestion.id]));
    setEvidenceFile(null);
  }, [currentQuestion?.id, answers]);

  async function loadExisting(existing: PdpAssessmentRecord) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(
        '/api/pdp-assessment/' + encodeURIComponent(existing.id),
        { cache: 'no-store' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Assessment tidak dapat dilanjutkan.');

      const mapped: Record<string, PdpAnswerRecord> = {};
      for (const item of data.answers || []) {
        mapped[String(item.questionId)] = item as PdpAnswerRecord;
      }
      setAnswers(mapped);
      setAssessment(data.assessment);
      setAssessmentType(data.assessment.assessmentType === 'detailed' ? 'detailed' : 'quick');

      const saved = data.profile || {};
      setProfile({
        companyName: String(saved.companyName || existing.companyName || ''),
        industry: String(saved.industry || existing.industry || ''),
        companySize: String(saved.companySize || existing.companySize || ''),
        employeeCount: saved.employeeCount == null ? '' : String(saved.employeeCount),
        country: String(saved.country || 'Indonesia'),
        locationCount: saved.locationCount == null ? '' : String(saved.locationCount),
        processesPersonalData: Number(saved.processesPersonalData) !== 0,
        processesSpecificData: Number(saved.processesSpecificData) === 1,
        publicServiceProcessing: Number(saved.publicServiceProcessing) === 1,
        largeScaleMonitoring: Number(saved.largeScaleMonitoring) === 1,
        crossBorderTransfer: Number(saved.crossBorderTransfer) === 1,
        usesProcessors: Number(saved.usesProcessors) === 1,
        automatedDecisioning: Number(saved.automatedDecisioning) === 1,
        respondentName: String(saved.respondentName || ''),
        respondentTitle: String(saved.respondentTitle || ''),
        respondentEmail: String(saved.respondentEmail || ''),
        respondentPhone: String(saved.respondentPhone || ''),
      });
      setEvidenceConsent(Number(saved.evidenceProcessingConsent) === 1);

      if (data.assessment.status === 'completed') {
        const resultsResponse = await fetch(
          '/api/pdp-assessment/' + encodeURIComponent(existing.id) + '/results',
          { cache: 'no-store' },
        );
        const resultsData = await resultsResponse.json().catch(() => null);
        if (!resultsResponse.ok || !resultsData?.success) {
          throw new Error(resultsData?.error || 'Hasil assessment tidak dapat dimuat.');
        }
        setResult(resultsData.result);
        setStage('results');
      } else {
        const resumedQuestions = (config?.questions || [])
          .filter((question) =>
            data.assessment.assessmentType === 'detailed' || question.isCore,
          )
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const firstUnanswered = resumedQuestions.findIndex(
          (question) => !mapped[question.id],
        );
        setCurrentIndex(
          firstUnanswered >= 0
            ? firstUnanswered
            : Math.max(0, resumedQuestions.length - 1),
        );
        setStage('assessment');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dilanjutkan.');
    } finally {
      setBusy(false);
    }
  }

  async function startAssessment() {
    if (!profile.companyName.trim() || !profile.industry.trim() || !profile.companySize.trim()) {
      setMessage('Nama organisasi, industri, dan ukuran organisasi wajib diisi.');
      return;
    }
    if (!profile.respondentName.trim() || !profile.respondentEmail.trim()) {
      setMessage('Nama dan email responden wajib diisi.');
      return;
    }
    if (!consent) {
      setMessage('Persetujuan pemrosesan data assessment wajib diberikan.');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setMessage('Selesaikan verifikasi keamanan sebelum memulai assessment.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/pdp-assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentType,
          organization: {
            companyName: profile.companyName,
            industry: profile.industry,
            companySize: profile.companySize,
            employeeCount: profile.employeeCount ? Number(profile.employeeCount) : null,
            country: profile.country,
            locationCount: profile.locationCount ? Number(profile.locationCount) : null,
            processesPersonalData: profile.processesPersonalData,
            processesSpecificData: profile.processesSpecificData,
            publicServiceProcessing: profile.publicServiceProcessing,
            largeScaleMonitoring: profile.largeScaleMonitoring,
            crossBorderTransfer: profile.crossBorderTransfer,
            usesProcessors: profile.usesProcessors,
            automatedDecisioning: profile.automatedDecisioning,
          },
          respondent: {
            name: profile.respondentName,
            title: profile.respondentTitle,
            email: profile.respondentEmail,
            phone: profile.respondentPhone,
          },
          consent,
          evidenceProcessingConsent: evidenceConsent,
          turnstileToken,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Assessment tidak dapat dibuat.');

      setAssessment(data.assessment);
      setResumeAssessment(data.assessment);
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
      setStage('assessment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadEvidence(questionId: string) {
    if (!evidenceFile || !assessment) return;
    const form = new FormData();
    form.append('file', evidenceFile);
    form.append('questionId', questionId);
    form.append('classification', 'Confidential');

    const response = await fetch(
      '/api/pdp-assessment/' + encodeURIComponent(assessment.id) + '/evidence',
      { method: 'POST', body: form },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Evidence tidak dapat diunggah.');
  }

  async function persistDraft() {
    if (!assessment || !currentQuestion) return false;
    if (!draft.answerValue) {
      setMessage('Pilih status implementasi sebelum melanjutkan.');
      return false;
    }
    if (draft.answerValue === 'na' && draft.applicabilityJustification.trim().length < 8) {
      setMessage('Tidak Berlaku wajib disertai justifikasi yang memadai.');
      return false;
    }

    const response = await fetch(
      '/api/pdp-assessment/' + encodeURIComponent(assessment.id) + '/answer',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerValue: draft.answerValue,
          evidenceStatus: draft.evidenceStatus,
          applicabilityJustification: draft.applicabilityJustification,
          evidenceNote: draft.evidenceNote,
          comment: draft.comment,
        }),
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Jawaban tidak dapat disimpan.');

    if (evidenceFile) {
      if (!evidenceConsent) throw new Error('Aktifkan persetujuan penyimpanan evidence sebelum mengunggah file.');
      await uploadEvidence(currentQuestion.id);
      data.answer.evidenceStatus = 'uploaded';
    }

    setAnswers((existing) => ({
      ...existing,
      [currentQuestion.id]: data.answer as PdpAnswerRecord,
    }));
    setEvidenceFile(null);
    return true;
  }

  async function saveAndNext() {
    setBusy(true);
    setMessage('');
    try {
      const saved = await persistDraft();
      if (!saved) return;
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((value) => value + 1);
        setMessage('Jawaban tersimpan.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Jawaban tidak dapat disimpan.');
    } finally {
      setBusy(false);
    }
  }

  async function completeAssessment() {
    if (!assessment) return;
    setBusy(true);
    setMessage('');
    try {
      const saved = await persistDraft();
      if (!saved) return;

      const response = await fetch(
        '/api/pdp-assessment/' + encodeURIComponent(assessment.id) + '/complete',
        { method: 'POST' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Assessment belum dapat diselesaikan.');

      setResult(data.result);
      setAssessment((current) =>
        current
          ? {
              ...current,
              status: 'completed',
              overallScore: data.result.overallScore,
              implementationScore: data.result.implementationScore,
              evidenceScore: data.result.evidenceScore,
              readinessLevel: data.result.readinessLevel,
              gatesCompleted: data.result.gates.completed,
            }
          : current,
      );
      setStage('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment belum dapat diselesaikan.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadReport() {
    if (!assessment) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(
        '/api/pdp-assessment/' + encodeURIComponent(assessment.id) + '/report',
        { cache: 'no-store' },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Laporan belum dapat dibuat.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'RTI-UU-PDP-Readiness-Report.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Laporan belum dapat dibuat.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAssessment() {
    if (!assessment) return;
    if (!window.confirm('Hapus assessment dan seluruh evidence yang diunggah? Tindakan ini tidak dapat dibatalkan.')) return;

    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(
        '/api/pdp-assessment/' + encodeURIComponent(assessment.id),
        { method: 'DELETE' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Assessment tidak dapat dihapus.');

      setAssessment(null);
      setResumeAssessment(null);
      setAnswers({});
      setResult(null);
      setProfile(initialProfile);
      setConsent(false);
      setEvidenceConsent(false);
      setCurrentIndex(0);
      setStage('intro');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dihapus.');
    } finally {
      setBusy(false);
    }
  }

  if (busy && !config) {
    return (
      <main className="min-h-screen bg-grey-50 py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-bold text-navy-900">Memuat UU PDP Readiness Check…</p>
        </div>
      </main>
    );
  }

  if (stage === 'intro' && config) {
    const quickDuration = config.parameters.PDP_QUICK_DURATION || '7–10 menit';
    const detailedDuration = config.parameters.PDP_DETAILED_DURATION || '20–35 menit';
    const legalBaseline =
      config.parameters.PDP_LEGAL_BASELINE ||
      'UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.';

    return (
      <main className="min-h-screen bg-white">
        <section className="relative overflow-hidden border-b border-navy-700 bg-navy-900 text-white">
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-10">
            <div className="absolute right-[-12rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full border border-blue-300" />
            <div className="absolute right-[-5rem] top-[-6rem] h-[25rem] w-[25rem] rounded-full border border-gold-300" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
            <div className="mb-7 flex items-center gap-2 text-[11px] text-slate-300">
              <Link href="/" className="hover:text-white">Beranda</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/tools" className="hover:text-white">Tools</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-bold text-white">UU PDP Readiness Check</span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-teal-300">
                  <ShieldCheck className="h-4 w-4" />
                  UU No. 27/2022 · Diagnostic Readiness
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                  UU PDP Readiness Check
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-lg">
                  Evaluasi kesiapan tata kelola, proses, evidence, third-party governance, hak Subjek Data,
                  DPIA, keamanan, dan breach readiness organisasi terhadap UU Pelindungan Data Pribadi.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    [Clock3, quickDuration, 'Quick Scan'],
                    [Target, '7 domain utama', '42 diagnostic checks'],
                    [Gauge, 'Hasil instan', 'Gap & roadmap prioritas'],
                  ].map(([Icon, title, subtitle], index) => {
                    const ToolIcon = Icon as React.ElementType;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400 text-gold-300">
                          <ToolIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-white">{String(title)}</div>
                          <div className="text-[11px] text-slate-400">{String(subtitle)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold">Tentang alat ini</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      Tool diagnostik RTI untuk membantu organisasi mengidentifikasi readiness, evidence gap,
                      area perhatian, dan tindakan prioritas. Bukan pengganti opini hukum atau keputusan regulator.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/15 bg-black/10 p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gold-300">
                    Legal baseline
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{legalBaseline}</p>
                </div>
                <div className="mt-5 border-t border-white/20 pt-4">
                  <Link href="/privacy" className="inline-flex items-center gap-2 text-xs font-extrabold text-gold-300 hover:text-gold-200">
                    Lihat kebijakan privasi <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-grey-50 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {resumeAssessment && (
              <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Assessment tersimpan</div>
                  <div className="mt-1 text-sm font-black text-navy-900">
                    {resumeAssessment.companyName} · {resumeAssessment.assessmentType === 'detailed' ? 'Detailed Assessment' : 'Quick Scan'}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Status: {resumeAssessment.status === 'completed' ? 'Selesai' : 'Masih berlangsung'}
                  </p>
                </div>
                <button
                  onClick={() => loadExisting(resumeAssessment)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  {resumeAssessment.status === 'completed' ? 'Buka Hasil' : 'Lanjutkan Assessment'}
                </button>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <button
                onClick={() => {
                  setAssessmentType('quick');
                  setStage('profile');
                  setMessage('');
                }}
                className="group rounded-2xl border border-line bg-white p-6 text-left shadow-sm transition hover:border-gold-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-gold-700">
                    <Gauge className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                    Executive Quick Scan
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-navy-900">14 pertanyaan · {quickDuration}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Screening cepat untuk tujuh domain kunci: governance, inventory/RoPA, legal basis,
                  rights, DPIA, third party/transfer, serta security & breach readiness.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-navy-900">
                  Mulai Quick Scan <ArrowRight className="h-4 w-4 text-gold-600 transition group-hover:translate-x-1" />
                </div>
              </button>

              <button
                onClick={() => {
                  setAssessmentType('detailed');
                  setStage('profile');
                  setMessage('');
                }}
                className="group rounded-2xl border border-line bg-white p-6 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                    Detailed Assessment
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-navy-900">42 pertanyaan · {detailedDuration}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Diagnostic mendalam dengan legal reference, expected evidence, criticality,
                  evidence maturity, readiness gates, gap register, dan 30/60/90-day roadmap.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-navy-900">
                  Mulai Detailed Assessment <ArrowRight className="h-4 w-4 text-blue-600 transition group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                [Database, 'Processing Inventory', 'RoPA, data flow, lifecycle, retention'],
                [Scale, 'Legal & Rights', 'Legal basis, notice, consent, data-subject rights'],
                [Network, 'Third Party & Transfer', 'Processor, vendor, domestic & cross-border transfer'],
                [LockKeyhole, 'Security & Breach', 'Security controls, incident response, 3x24-hour readiness'],
              ].map(([Icon, title, textValue], index) => {
                const ToolIcon = Icon as React.ElementType;
                return (
                  <div key={index} className="rounded-2xl border border-line bg-white p-5">
                    <ToolIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="mt-3 text-sm font-extrabold text-navy-900">{String(title)}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{String(textValue)}</p>
                  </div>
                );
              })}
            </div>

            {message && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {message}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (stage === 'profile' && config) {
    const contextFlags: Array<[keyof ProfileState, string, string, React.ElementType]> = [
      ['processesSpecificData', 'Memproses Data Pribadi spesifik', 'Kesehatan, biometrik, genetika, anak, keuangan pribadi, dan kategori spesifik lain yang relevan.', Fingerprint],
      ['publicServiceProcessing', 'Pemrosesan untuk pelayanan publik', 'Relevan untuk penilaian kondisi fungsi PDP/DPO.', Globe2],
      ['largeScaleMonitoring', 'Pemantauan teratur/sistematis skala besar', 'Contoh: monitoring pelanggan, pekerja, lokasi, perilaku, atau aktivitas dalam skala besar.', Users],
      ['crossBorderTransfer', 'Transfer data ke luar Indonesia', 'Termasuk cloud/SaaS atau processor dengan lokasi pemrosesan luar negeri.', Globe2],
      ['usesProcessors', 'Menggunakan processor/vendor', 'Cloud, outsourcing, payroll, marketing, analytics, call center, dan pihak ketiga lain.', Network],
      ['automatedDecisioning', 'Automated decision / profiling', 'Keputusan otomatis yang dapat berdampak signifikan terhadap individu.', Sparkles],
    ];

    return (
      <main className="min-h-screen bg-grey-50 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setStage('intro')}
            className="inline-flex items-center gap-2 text-xs font-bold text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">
                  {assessmentType === 'quick' ? 'Quick Scan' : 'Detailed Assessment'} · Organization Profile
                </div>
                <h1 className="mt-2 text-2xl font-black text-navy-900 sm:text-3xl">
                  Context matters before scoring readiness
                </h1>
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
                  Profil membantu RTI menampilkan konteks pemrosesan yang relevan. Tidak ada score,
                  finding, atau status readiness yang diisi secara otomatis sebelum jawaban diberikan.
                </p>
              </div>
              <LockKeyhole className="h-7 w-7 text-blue-600" />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Informasi Organisasi</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold text-navy-900">
                Nama organisasi *
                <input
                  value={profile.companyName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, companyName: event.target.value }))
                  }
                  placeholder="PT Contoh Indonesia"
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal outline-none focus:border-blue-400"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Industri *
                <select
                  value={profile.industry}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, industry: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-400"
                >
                  <option value="">Pilih industri</option>
                  {industryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">
                Ukuran organisasi *
                <select
                  value={profile.companySize}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, companySize: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-400"
                >
                  <option value="">Pilih skala organisasi</option>
                  {companySizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">
                Negara
                <input
                  value={profile.country}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, country: event.target.value }))
                  }
                  placeholder="Indonesia"
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal outline-none focus:border-blue-400"
                />
              </label>

              <label className="text-xs font-bold text-navy-900">
                Jumlah karyawan
                <input
                  type="number"
                  min="0"
                  value={profile.employeeCount}
                  onChange={(event) => setProfile((current) => ({ ...current, employeeCount: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal outline-none focus:border-blue-400"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Jumlah lokasi
                <input
                  type="number"
                  min="0"
                  value={profile.locationCount}
                  onChange={(event) => setProfile((current) => ({ ...current, locationCount: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal outline-none focus:border-blue-400"
                />
              </label>
            </div>

            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-900">
                <CheckCircle2 className="h-4 w-4" />
                Memproses data pribadi
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-800">
                Tool ini ditujukan untuk organisasi yang bertindak sebagai Pengendali dan/atau Prosesor Data Pribadi.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Processing Context</h2>
            <p className="mt-1 text-xs text-muted">
              Pilih kondisi yang relevan. Informasi ini membantu interpretasi, tetapi tidak otomatis menyatakan kewajiban hukum tertentu.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {contextFlags.map(([key, title, description, Icon]) => (
                <label
                  key={String(key)}
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ' +
                    (profile[key]
                      ? 'border-gold-400 bg-amber-50'
                      : 'border-line bg-grey-50 hover:bg-white')
                  }
                >
                  <input
                    type="checkbox"
                    checked={Boolean(profile[key])}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    className="mt-1"
                  />
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span>
                    <span className="block text-xs font-extrabold text-navy-900">{title}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Responden Assessment</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold text-navy-900">
                Nama *
                <input
                  value={profile.respondentName}
                  onChange={(event) => setProfile((current) => ({ ...current, respondentName: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Jabatan
                <input
                  value={profile.respondentTitle}
                  onChange={(event) => setProfile((current) => ({ ...current, respondentTitle: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Email profesional *
                <input
                  type="email"
                  value={profile.respondentEmail}
                  onChange={(event) => setProfile((current) => ({ ...current, respondentEmail: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Telepon / WhatsApp
                <input
                  value={profile.respondentPhone}
                  onChange={(event) => setProfile((current) => ({ ...current, respondentPhone: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
            </div>

            <div className="mt-6 space-y-3 border-t border-line pt-5">
              <label className="flex items-start gap-3 text-xs leading-relaxed text-navy-900">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <strong>Wajib:</strong> Saya menyetujui pemrosesan informasi yang saya masukkan
                  untuk menjalankan UU PDP Readiness Check dan memahami bahwa hasilnya bersifat diagnostik indikatif.
                </span>
              </label>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-navy-900">
                <input
                  type="checkbox"
                  checked={evidenceConsent}
                  onChange={(event) => setEvidenceConsent(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Saya menyetujui penyimpanan evidence yang saya unggah pada private server storage RTI
                  untuk assessment ini. Evidence upload tetap opsional.
                </span>
              </label>
              <TurnstileWidget onTokenChange={setTurnstileToken} />
            </div>
          </section>

          {message && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {message}
            </div>
          )}

          <button
            onClick={startAssessment}
            disabled={busy}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50 sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Mulai {assessmentType === 'quick' ? 'Quick Scan' : 'Detailed Assessment'}
          </button>
        </div>
      </main>
    );
  }

  if (stage === 'assessment' && config && assessment && currentQuestion) {
    const answered = Object.keys(answers).length;
    const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
    const currentDomain = config.domains.find((domain) => domain.code === currentQuestion.domainCode);
    const DomainIcon = domainIcons[currentQuestion.domainCode] || FileCheck2;
    const selected = config.answerOptions.find((option) => option.value === draft.answerValue);
    const domainProgress = config.domains.map((domain) => {
      const domainQuestions = questions.filter((question) => question.domainCode === domain.code);
      const count = domainQuestions.filter((question) => answers[question.id]).length;
      return {
        ...domain,
        count,
        total: domainQuestions.length,
      };
    });

    return (
      <main className="min-h-screen bg-grey-50 py-5 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
          <div className="sticky top-2 z-20 rounded-2xl border border-line bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">
                  {assessment.assessmentType === 'detailed' ? 'Detailed Assessment' : 'Quick Scan'} · {assessment.frameworkVersion}
                </div>
                <div className="mt-1 text-sm font-black text-navy-900">
                  Pertanyaan {currentIndex + 1} dari {questions.length} · {progress}% tersimpan
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
                {assessment.status === 'completed' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Read-only review · assessment telah diselesaikan
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-blue-600" />
                    Save & Continue Later aktif pada perangkat ini
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: progress + '%' }} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-28 rounded-2xl border border-line bg-white p-3 shadow-sm">
                <div className="px-2 py-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  7 Readiness Domains
                </div>
                <div className="space-y-1">
                  {domainProgress.map((domain) => {
                    const Icon = domainIcons[domain.code] || FileCheck2;
                    const active = domain.code === currentQuestion.domainCode;
                    return (
                      <button
                        key={domain.code}
                        onClick={() => {
                          const target = questions.findIndex((question) => question.domainCode === domain.code);
                          if (target >= 0) setCurrentIndex(target);
                        }}
                        className={
                          'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ' +
                          (active ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-grey-50')
                        }
                      >
                        <Icon className={'h-4 w-4 shrink-0 ' + (active ? 'text-gold-300' : 'text-blue-600')} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-extrabold">{domain.name}</span>
                          <span className={'mt-0.5 block text-[10px] ' + (active ? 'text-slate-300' : 'text-muted')}>
                            {domain.count}/{domain.total} terisi
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                  <DomainIcon className="h-3.5 w-3.5" />
                  {currentDomain?.name || currentQuestion.domainCode}
                </span>
                <span className="rounded-full bg-grey-50 px-3 py-1 text-[10px] font-bold text-muted">
                  {currentQuestion.questionCode}
                </span>
                <span className={'rounded-full border px-3 py-1 text-[10px] font-extrabold ' + severityStyle(currentQuestion.criticality)}>
                  {currentQuestion.criticality}
                </span>
              </div>

              <h1 className="mt-5 text-xl font-black leading-snug text-navy-900 sm:text-2xl">
                {currentQuestion.questionText}
              </h1>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {currentQuestion.legalReference && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Legal reference</div>
                    <div className="mt-1 text-xs font-bold text-navy-900">{currentQuestion.legalReference}</div>
                  </div>
                )}
                {currentQuestion.helpText && (
                  <div className="rounded-xl border border-line bg-grey-50 p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Assessment guidance</div>
                    <div className="mt-1 text-xs leading-relaxed text-navy-900">{currentQuestion.helpText}</div>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                {config.answerOptions.map((option) => {
                  const active = draft.answerValue === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (assessment.status !== 'completed') {
                          setDraft((current) => ({ ...current, answerValue: option.value }));
                        }
                      }}
                      disabled={assessment.status === 'completed'}
                      className={
                        'rounded-xl border p-4 text-left transition ' +
                        (active
                          ? 'border-gold-400 bg-amber-50 shadow-sm'
                          : 'border-line bg-white hover:bg-grey-50')
                      }
                    >
                      <div className="flex items-start gap-3">
                        {active ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
                        ) : (
                          <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-line" />
                        )}
                        <div>
                          <div className="text-sm font-extrabold text-navy-900">{option.label}</div>
                          <div className="mt-1 text-xs leading-relaxed text-muted">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected?.isNa && (
                <label className="mt-5 block text-xs font-bold text-navy-900">
                  Applicability Justification <span className="text-rose-600">*</span>
                  <textarea
                    rows={3}
                    value={draft.applicabilityJustification}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        applicabilityJustification: event.target.value,
                      }))
                    }
                    placeholder="Jelaskan mengapa area ini tidak relevan terhadap konteks pemrosesan organisasi."
                    className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                  />
                </label>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold text-navy-900">
                  Evidence maturity
                  <select
                    value={draft.evidenceStatus}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, evidenceStatus: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-normal"
                  >
                    {config.evidenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-bold text-navy-900">
                  Upload evidence
                  <div className="mt-1.5 flex min-h-12 items-center gap-2 rounded-xl border border-line bg-grey-50 px-3">
                    <Upload className="h-4 w-4 shrink-0 text-blue-600" />
                    <input
                      type="file"
                      disabled={!evidenceConsent || assessment.status === 'completed'}
                      onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                      className="w-full text-xs disabled:opacity-40"
                    />
                  </div>
                  {!evidenceConsent && (
                    <span className="mt-1 block text-[10px] font-normal text-muted">
                      Evidence upload nonaktif karena persetujuan penyimpanan evidence belum diberikan.
                    </span>
                  )}
                </label>
              </div>

              <label className="mt-4 block text-xs font-bold text-navy-900">
                Evidence note
                <textarea
                  rows={2}
                  value={draft.evidenceNote}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, evidenceNote: event.target.value }))
                  }
                  placeholder={currentQuestion.expectedEvidence || 'Jelaskan evidence yang tersedia.'}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>

              <label className="mt-4 block text-xs font-bold text-navy-900">
                Current condition / comment
                <textarea
                  rows={3}
                  value={draft.comment}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, comment: event.target.value }))
                  }
                  placeholder="Catat kondisi saat ini, pengecualian, issue, owner, atau konteks lain."
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {currentQuestion.expectedEvidence && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-950">
                    <strong>Expected evidence:</strong> {currentQuestion.expectedEvidence}
                  </div>
                )}
                {currentQuestion.riskIfMissing && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
                    <strong>Risk if missing:</strong> {currentQuestion.riskIfMissing}
                  </div>
                )}
              </div>
            </section>
          </div>

          {message && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              {message}
            </div>
          )}

          <div className="sticky bottom-2 z-20 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
            <button
              onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              disabled={currentIndex === 0 || busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-extrabold text-navy-900 disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Sebelumnya
            </button>

            {assessment.status === 'completed' ? (
              <button
                onClick={() => setStage('results')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-5 py-2 text-xs font-extrabold text-white"
              >
                Kembali ke Hasil <ArrowRight className="h-4 w-4" />
              </button>
            ) : currentIndex < questions.length - 1 ? (
              <button
                onClick={saveAndNext}
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-5 py-2 text-xs font-extrabold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan & Lanjut <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={completeAssessment}
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-5 py-2 text-xs font-extrabold text-navy-900 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Selesaikan Assessment
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (stage === 'results' && result && assessment) {
    const critical = result.findings.filter((finding) => finding.severity === 'Critical').length;
    const high = result.findings.filter((finding) => finding.severity === 'High').length;
    const consultationUrl = result.parameters.PDP_CONSULTATION_URL || '/consultation';
    const disclaimer =
      result.parameters.PDP_DISCLAIMER ||
      'Hasil ini merupakan indikator kesiapan internal dan bukan opini hukum atau pernyataan kepatuhan resmi.';

    const phases = result.roadmap.reduce<Record<string, typeof result.roadmap>>((acc, item) => {
      if (!acc[item.phase]) acc[item.phase] = [];
      acc[item.phase].push(item);
      return acc;
    }, {});

    return (
      <main className="min-h-screen bg-grey-50 py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">
                  UU PDP Readiness Dashboard
                </div>
                <h1 className="mt-2 text-2xl font-black text-navy-900 sm:text-3xl">
                  {assessment.companyName}
                </h1>
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
                  Hasil dihitung oleh deterministic rule engine berdasarkan jawaban implementasi,
                  evidence maturity, weight per area, dan tujuh readiness gates.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadReport}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-xs font-extrabold text-navy-900 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF Report
                </button>
                <button
                  onClick={() => setLeadModal(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-extrabold text-navy-900"
                >
                  Konsultasi RTI <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ['Overall Readiness', result.overallScore.toFixed(1) + '%'],
              ['Readiness Level', result.readinessLevel],
              ['Implementation', result.implementationScore.toFixed(1) + '%'],
              ['Evidence Readiness', result.evidenceScore.toFixed(1) + '%'],
              ['Readiness Gates', result.gates.completed + ' / ' + result.gates.total],
              ['Critical / High Gaps', critical + ' / ' + high],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
                <div
                  className={
                    'mt-2 text-2xl font-black ' +
                    (label === 'Overall Readiness'
                      ? readinessTone(result.overallScore)
                      : 'text-navy-900')
                  }
                >
                  {value}
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-navy-900">Readiness by Domain</h2>
              <div className="mt-5 space-y-4">
                {result.domainScores.map((domain) => {
                  const Icon = domainIcons[domain.domainCode] || FileCheck2;
                  return (
                    <div key={domain.domainCode}>
                      <div className="mb-1.5 flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                          <span className="truncate text-xs font-bold text-navy-900">{domain.domainName}</span>
                        </div>
                        <span className="text-xs font-extrabold text-navy-900">{domain.overallScore.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: domain.overallScore + '%' }} />
                      </div>
                      <div className="mt-1 flex gap-3 text-[10px] text-muted">
                        <span>Implementation {domain.implementationScore.toFixed(0)}%</span>
                        <span>Evidence {domain.evidenceScore.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-navy-900">7 Readiness Gates</h2>
              <p className="mt-1 text-xs text-muted">
                Gate memerlukan implementasi minimum dan evidence yang memadai; bukan sekadar average score.
              </p>
              <div className="mt-4 grid gap-2">
                {result.gates.items.map((gate) => (
                  <div key={gate.key} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <div className="flex items-center gap-3">
                      {gate.complete ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <span className="text-xs font-bold text-navy-900">{gate.label}</span>
                    </div>
                    <span className={gate.complete ? 'text-[10px] font-extrabold text-emerald-700' : 'text-[10px] font-extrabold text-amber-700'}>
                      {gate.complete ? 'TERPENUHI' : 'PERLU TINDAKAN'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-extrabold text-navy-900">Priority Gap Register</h2>
                <p className="mt-1 text-xs text-muted">
                  Prioritas ditentukan dari criticality, implementation gap, dan evidence maturity.
                </p>
              </div>
              <div className="text-xs font-bold text-muted">{result.findings.length} gap teridentifikasi</div>
            </div>

            {result.findings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                Tidak ada gap yang dihasilkan dari jawaban dan status evidence yang diberikan.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {result.findings.slice(0, 18).map((finding) => (
                  <details key={finding.id} className="group rounded-xl border border-line bg-white">
                    <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                      <span className={'shrink-0 rounded-full border px-2 py-1 text-[10px] font-extrabold ' + severityStyle(finding.severity)}>
                        {finding.severity}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold text-navy-900">
                          {finding.questionCode} · {finding.title}
                        </span>
                        {finding.legalReference && (
                          <span className="mt-1 block text-[10px] font-bold text-blue-700">{finding.legalReference}</span>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-3 border-t border-line p-4 md:grid-cols-3">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Current condition</div>
                        <p className="mt-1 text-xs leading-relaxed text-navy-900">{finding.currentCondition}</p>
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Risk</div>
                        <p className="mt-1 text-xs leading-relaxed text-navy-900">{finding.risk}</p>
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Recommended action</div>
                        <p className="mt-1 text-xs leading-relaxed text-navy-900">{finding.recommendation}</p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Remediation Roadmap</h2>
            <p className="mt-1 text-xs text-muted">Roadmap otomatis berbasis severity dan gap assessment.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Object.entries(phases).map(([phase, items]) => (
                <div key={phase} className="rounded-xl border border-line bg-grey-50 p-4">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">{phase}</div>
                  <div className="mt-3 space-y-3">
                    {items.slice(0, 7).map((item) => (
                      <div key={item.id} className="rounded-lg bg-white p-3">
                        <div className="text-[10px] font-bold text-blue-700">{item.domainCode} · {item.ownerSuggestion}</div>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-navy-900">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {result.services.length > 0 && (
            <section className="rounded-2xl border border-navy-800 bg-navy-900 p-6 text-white shadow-sm sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-gold-300">
                    RTI Advisory Conversion
                  </div>
                  <h2 className="mt-2 text-2xl font-black">Prioritize remediation with the right workstream.</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                    Rekomendasi layanan di bawah dihasilkan dari domain yang masih memiliki readiness gap.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.services.map((service) => (
                      <span key={service.id} className="rounded-full border border-slate-600 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-200">
                        {service.serviceName}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={consultationUrl}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900"
                  >
                    Discuss Your PDP Readiness <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setLeadModal(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-xs font-bold text-white"
                  >
                    Request RTI Gap Assessment
                  </button>
                </div>
              </div>
            </section>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            <strong>Disclaimer:</strong> {disclaimer}
          </div>

          {message && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              {message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setStage('assessment');
                setCurrentIndex(0);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-navy-900"
            >
              <ArrowLeft className="h-4 w-4" /> Review Answers
            </button>
            <button
              onClick={deleteAssessment}
              disabled={busy}
              className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Hapus assessment & evidence
            </button>
          </div>

          {leadModal && (
            <LeadModal
              toolSlug="pdp-readiness"
              toolName="UU PDP Data Protection Readiness"
              summaryData={{
                overallScore: result.overallScore,
                readinessLevel: result.readinessLevel,
                implementationScore: result.implementationScore,
                evidenceScore: result.evidenceScore,
                gatesCompleted: result.gates.completed,
                gatesTotal: result.gates.total,
                criticalGaps: critical,
                highGaps: high,
                topDomains: result.domainScores
                  .slice()
                  .sort((a, b) => a.overallScore - b.overallScore)
                  .slice(0, 3)
                  .map((domain) => ({
                    code: domain.domainCode,
                    name: domain.domainName,
                    score: domain.overallScore,
                  })),
              }}
              onClose={() => setLeadModal(false)}
              onSuccess={() => setLeadModal(false)}
            />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grey-50 py-20">
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-7 w-7 text-amber-600" />
        <p className="mt-3 text-sm font-bold text-navy-900">
          UU PDP Readiness Check belum dapat ditampilkan.
        </p>
        {message && <p className="mt-2 text-xs text-muted">{message}</p>}
      </div>
    </main>
  );
}
