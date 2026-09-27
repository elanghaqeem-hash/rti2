'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  LockKeyhole,
  RefreshCw,
  Route,
  Save,
  Scale,
  ShieldCheck,
  Upload,
  Trash2,
} from 'lucide-react';

type Mode = 'quick' | 'comprehensive';
type Step = 'intro' | 'profile' | 'questions' | 'result';

type Config = {
  metadata: {
    quickQuestions: number;
    comprehensiveQuestions: number;
    baselineRegulation: string;
    questionSetVersion: string;
    scoringModelVersion: string;
  };
  industries: Array<{ value: string; label: string; description?: string }>;
  answers: Array<{ value: string; label: string; score?: number }>;
  confidenceOptions: Array<{ value: string; label: string; factor: number }>;
  evidenceOptions: Array<{ value: string; label: string; factor: number }>;
  organizationSizes: Array<{ value: string; label: string }>;
  customerTypes: Array<{ value: string; label: string }>;
};

type Question = {
  id: string;
  code: string;
  domainId: string;
  domainCode: string;
  domainName: string;
  questionText: string;
  questionHelp?: string;
  regulationReference?: string;
  articleReference?: string;
  controlObjective?: string;
  riskStatement?: string;
  recommendedEvidence?: string;
  weight: number;
  domainWeight: number;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  answerOptions: string[];
  isQuick: boolean;
  sortOrder: number;
};

type ResponseRow = {
  questionId: string;
  answerValue?: string;
  confidence?: string;
  evidenceStatus?: string;
  textValue?: string;
};

type Profile = {
  companyName: string;
  industry: string;
  organizationSize: string;
  employeeCount?: number;
  dataSubjectCount?: number;
  customerTypes: string[];
  operatingRegions: string[];
  crossBorderOperations: boolean;
  internationalTransfer: boolean;
  childrenData: boolean;
  healthData: boolean;
  biometricData: boolean;
  geneticData: boolean;
  criminalData: boolean;
  financialData: boolean;
  locationData: boolean;
  profiling: boolean;
  behavioralAnalytics: boolean;
  automatedDecisionMaking: boolean;
  cctv: boolean;
  cookiesTracking: boolean;
  marketingDatabase: boolean;
  cloudSaas: boolean;
  thirdPartyProcessor: boolean;
  outsourcing: boolean;
  mobileApplication: boolean;
  website: boolean;
  employeeData: boolean;
  customerData: boolean;
  vendorData: boolean;
};

type Result = {
  overallScore: number;
  maturityLevel: number;
  maturityLabel: string;
  evidenceConfidence: number;
  completion: number;
  domainScores: Array<{
    domainId: string;
    code: string;
    name: string;
    score: number;
    answered: number;
    applicable: number;
    criticalGaps: number;
  }>;
  criticalFindings: Array<{
    code: string;
    domain: string;
    gap: string;
    risk: string;
    recommendedAction: string;
    priority: string;
    suggestedOwner: string;
    targetTimeline: string;
    regulatoryReference: string;
  }>;
  findings: Array<{
    code: string;
    domain: string;
    gap: string;
    risk: string;
    recommendedAction: string;
    priority: string;
    suggestedOwner: string;
    targetTimeline: string;
  }>;
  topRisks: Array<{
    id: string;
    domain: string;
    riskEvent: string;
    impact: number;
    likelihood: number;
    inherentRisk: number;
    priority: string;
    recommendedAction: string;
  }>;
  dpia: { status: string; reasons: string[] };
  dpo: { status: string; reasons: string[] };
  roadmap: Array<{
    phase: string;
    domain: string;
    action: string;
    owner: string;
    priority: string;
  }>;
  serviceRecommendations: Array<{ service: string; reason: string; url?: string }>;
  disclaimer: string;
};


const initialProfile: Profile = {
  companyName: '',
  industry: '',
  organizationSize: '',
  employeeCount: undefined,
  dataSubjectCount: undefined,
  customerTypes: [],
  operatingRegions: ['Indonesia'],
  crossBorderOperations: false,
  internationalTransfer: false,
  publicServiceProcessing: false,
  largeScaleProcessing: false,
  regularSystematicLargeScaleMonitoring: false,
  largeScaleSpecificDataProcessing: false,
  largeScaleCriminalDataProcessing: false,
  actsAsController: true,
  actsAsProcessor: false,
  organizationalComplexityHigh: false,
  childrenData: false,
  healthData: false,
  biometricData: false,
  geneticData: false,
  criminalData: false,
  financialData: false,
  locationData: false,
  profiling: false,
  behavioralAnalytics: false,
  automatedDecisionMaking: false,
  cctv: false,
  cookiesTracking: false,
  marketingDatabase: false,
  cloudSaas: false,
  thirdPartyProcessor: false,
  outsourcing: false,
  mobileApplication: false,
  website: true,
  employeeData: true,
  customerData: true,
  vendorData: true,
};

const PROFILE_FLAGS: Array<[keyof Profile, string, string]> = [
  ['crossBorderOperations', 'Operasi lintas negara', 'Organisasi memiliki kegiatan atau entitas di luar Indonesia.'],
  ['internationalTransfer', 'Transfer data internasional', 'Data pribadi ditransfer atau diakses dari luar Indonesia.'],
  ['publicServiceProcessing', 'Pemrosesan untuk pelayanan publik', 'Aktifkan bila kegiatan pemrosesan dilakukan untuk kepentingan pelayanan publik.'],
  ['largeScaleProcessing', 'Pemrosesan skala besar', 'Organisasi menilai aktivitas pemrosesan berlangsung dalam skala besar berdasarkan konteks, volume, cakupan, dan durasi.'],
  ['regularSystematicLargeScaleMonitoring', 'Monitoring reguler & sistematis skala besar', 'Aktifkan bila core activity melibatkan pemantauan individu secara reguler, sistematis, dan skala besar.'],
  ['largeScaleSpecificDataProcessing', 'Data pribadi spesifik skala besar', 'Aktifkan bila core activity melibatkan pemrosesan data pribadi spesifik dalam skala besar.'],
  ['largeScaleCriminalDataProcessing', 'Data terkait kejahatan skala besar', 'Aktifkan bila core activity melibatkan data terkait catatan kejahatan dalam skala besar.'],
  ['actsAsController', 'Berperan sebagai Pengendali Data Pribadi', 'Organisasi menentukan tujuan dan kendali pemrosesan untuk aktivitas yang dinilai.'],
  ['actsAsProcessor', 'Berperan sebagai Prosesor Data Pribadi', 'Organisasi memproses data atas instruksi pengendali untuk aktivitas yang dinilai.'],
  ['organizationalComplexityHigh', 'Kompleksitas organisasi tinggi', 'Banyak entitas, unit, sistem, negara, atau rantai vendor memengaruhi governance pemrosesan.'],
  ['childrenData', 'Data anak', 'Memproses data anak atau kelompok rentan.'],
  ['healthData', 'Data kesehatan', 'Memproses data kesehatan atau data medis.'],
  ['biometricData', 'Biometrik', 'Memproses sidik jari, wajah, voice biometrics, atau biometrik lain.'],
  ['geneticData', 'Genetik', 'Memproses data genetika.'],
  ['criminalData', 'Catatan kejahatan', 'Memproses data terkait catatan kejahatan.'],
  ['financialData', 'Data keuangan pribadi', 'Memproses informasi finansial pribadi.'],
  ['locationData', 'Data lokasi', 'Memproses geolocation atau location history.'],
  ['profiling', 'Profiling', 'Melakukan profiling terhadap individu.'],
  ['behavioralAnalytics', 'Behavioral analytics', 'Menganalisis perilaku individu secara sistematis.'],
  ['automatedDecisionMaking', 'AI / automated decision making', 'Keputusan atau scoring individu dibantu atau dibuat otomatis.'],
  ['cctv', 'CCTV / monitoring', 'Menggunakan CCTV atau pemantauan fisik/digital.'],
  ['cookiesTracking', 'Cookies / tracking', 'Menggunakan cookies analytics, advertising, atau tracker lain.'],
  ['marketingDatabase', 'Marketing database', 'Mengelola database marketing atau direct messaging.'],
  ['cloudSaas', 'Cloud / SaaS', 'Data pribadi diproses pada layanan cloud atau SaaS.'],
  ['thirdPartyProcessor', 'Third-party processor', 'Menggunakan vendor/prosesor untuk pemrosesan data.'],
  ['outsourcing', 'Outsourcing', 'Proses bisnis yang melibatkan data dialihdayakan.'],
  ['mobileApplication', 'Mobile application', 'Memiliki aplikasi mobile.'],
  ['website', 'Website', 'Memiliki website yang mengumpulkan atau memproses data.'],
  ['employeeData', 'Employee data', 'Memproses data employee atau applicant.'],
  ['customerData', 'Customer data', 'Memproses data customer/end user.'],
  ['vendorData', 'Vendor data', 'Memproses data contact person vendor/partner.'],
];

const STORAGE_KEY = 'rti-pdp-readiness-session-v1';

function pct(score: number) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function riskTone(priority: string) {
  if (priority === 'Critical') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (priority === 'High') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (priority === 'Medium') return 'border-blue-200 bg-blue-50 text-blue-900';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function statusTone(value: string) {
  if (/no high-risk trigger|trigger not evident/i.test(value)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (/further/i.test(value)) return 'border-blue-200 bg-blue-50 text-blue-900';
  if (/likely|required|trigger identified/i.test(value)) {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function Radar({ domains }: { domains: Result['domainScores'] }) {
  const items = domains.slice(0, 20);
  if (items.length < 3) return null;
  const size = 280;
  const center = size / 2;
  const radius = 105;
  const points = items.map((domain, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
    const r = radius * (pct(domain.score) / 100);
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r] as const;
  });
  const outer = items.map((_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
    return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius] as const;
  });

  return (
    <svg viewBox={'0 0 ' + size + ' ' + size} className="h-auto w-full max-w-[320px]" aria-label="Domain readiness radar">
      <polygon points={outer.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor" className="text-slate-200" />
      {outer.map((point, index) => (
        <line key={index} x1={center} y1={center} x2={point[0]} y2={point[1]} stroke="currentColor" className="text-slate-200" />
      ))}
      <polygon points={points.map((p) => p.join(',')).join(' ')} fill="rgba(212,175,55,0.18)" stroke="rgb(180,132,20)" strokeWidth="2" />
      <circle cx={center} cy={center} r="3" fill="rgb(15,35,61)" />
    </svg>
  );
}

export default function PdpReadinessClient() {
  const [config, setConfig] = useState<Config | null>(null);
  const [mode, setMode] = useState<Mode>('quick');
  const [step, setStep] = useState<Step>('intro');
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseRow>>({});
  const [assessmentId, setAssessmentId] = useState('');
  const [resumeToken, setResumeToken] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState('');

  useEffect(() => {
    fetch('/api/tools/pdp-readiness/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success) setConfig(data);
        else setMessage(data?.error || 'Konfigurasi assessment tidak tersedia.');
      })
      .catch(() => setMessage('Konfigurasi assessment tidak tersedia.'));

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setResumeAvailable(Boolean(raw));
    } catch {
      setResumeAvailable(false);
    }
  }, []);

  const completed = useMemo(
    () => Object.values(responses).filter((row) => Boolean(row.answerValue)).length,
    [responses],
  );
  const progress = questions.length ? Math.round((completed / questions.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];

  const setFlag = (key: keyof Profile, value: boolean) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const updateResponse = (questionId: string, patch: Partial<ResponseRow>) => {
    setResponses((current) => {
      const existing = current[questionId];
      return {
        ...current,
        [questionId]: {
          ...(existing || {}),
          questionId,
          confidence: existing?.confidence || 'unverified',
          evidenceStatus: existing?.evidenceStatus || 'not_available',
          ...patch,
        },
      };
    });
  };

  const persistSession = (id: string, token: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ assessmentId: id, resumeToken: token }));
      setResumeAvailable(true);
    } catch {
      // Storage may be disabled; the assessment still works in the current session.
    }
  };

  const startAssessment = async () => {
    if (!profile.industry || !profile.organizationSize) {
      setMessage('Pilih industri dan skala organisasi terlebih dahulu.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/tools/pdp-readiness/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, profile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Assessment tidak dapat dibuat.');
      setAssessmentId(data.assessmentId);
      setResumeToken(data.resumeToken);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setResponses({});
      setCurrentIndex(0);
      setResult(null);
      persistSession(data.assessmentId, data.resumeToken);
      setStep('questions');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
  };

  const resumeAssessment = async () => {
    setBusy(true);
    setMessage('');
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error('Tidak ada assessment tersimpan pada browser ini.');
      const saved = JSON.parse(raw) as { assessmentId?: string; resumeToken?: string };
      if (!saved.assessmentId || !saved.resumeToken) throw new Error('Resume data tidak valid.');

      const response = await fetch('/api/tools/pdp-readiness/assessment?id=' + encodeURIComponent(saved.assessmentId), {
        headers: { Authorization: 'Bearer ' + saved.resumeToken },
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Assessment tidak dapat dimuat.');

      const assessment = data.assessment;
      setAssessmentId(saved.assessmentId);
      setResumeToken(saved.resumeToken);
      setMode(assessment.mode);
      setProfile(assessment.profile);
      setQuestions(assessment.questions || []);
      const mapped: Record<string, ResponseRow> = {};
      (assessment.responses || []).forEach((row: ResponseRow) => {
        mapped[row.questionId] = row;
      });
      setResponses(mapped);
      setResult(assessment.result || null);
      setCurrentIndex(Math.min(Object.keys(mapped).length, Math.max((assessment.questions || []).length - 1, 0)));
      setStep(assessment.result ? 'result' : 'questions');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dimuat.');
    } finally {
      setBusy(false);
    }
  };

  const saveResponses = async () => {
    if (!assessmentId || !resumeToken) return;
    const rows = Object.values(responses);
    if (!rows.length) return;
    const response = await fetch('/api/tools/pdp-readiness/assessment', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + resumeToken,
      },
      body: JSON.stringify({ assessmentId, responses: rows }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'Gagal menyimpan assessment.');
  };

  const navigate = async (delta: number) => {
    try {
      setBusy(true);
      await saveResponses();
      setCurrentIndex((index) => Math.max(0, Math.min(questions.length - 1, index + delta)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan assessment.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setMessage('');
    try {
      await saveResponses();
      const response = await fetch('/api/tools/pdp-readiness/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + resumeToken,
        },
        body: JSON.stringify({ assessmentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Scoring gagal.');
      setResult(data.result);
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scoring gagal.');
    } finally {
      setBusy(false);
    }
  };

  const uploadEvidence = async (file: File) => {
    if (!assessmentId || !resumeToken || !currentQuestion) return;
    setEvidenceMessage('Uploading and validating evidence...');
    try {
      const form = new FormData();
      form.set('assessmentId', assessmentId);
      form.set('questionId', currentQuestion.id);
      form.set('file', file);
      const response = await fetch('/api/tools/pdp-readiness/evidence', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + resumeToken },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Evidence upload gagal.');
      updateResponse(currentQuestion.id, { evidenceStatus: data.evidence?.scanStatus === 'clean' ? 'verified' : 'available' });
      setEvidenceMessage('Evidence accepted: ' + data.evidence.fileName + ' (' + data.evidence.scanStatus + ').');
    } catch (error) {
      setEvidenceMessage(error instanceof Error ? error.message : 'Evidence upload gagal.');
    }
  };

  const runAi = async () => {
    setBusy(true);
    setAiAnalysis('');
    try {
      const response = await fetch('/api/tools/pdp-readiness/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + resumeToken,
        },
        body: JSON.stringify({ assessmentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'AI analysis tidak tersedia.');
      setAiAnalysis(data.analysis || '');
    } catch (error) {
      setAiAnalysis(error instanceof Error ? error.message : 'AI analysis tidak tersedia.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/tools/pdp-readiness/report?id=' + encodeURIComponent(assessmentId), {
        headers: { Authorization: 'Bearer ' + resumeToken },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'RTI-UU-PDP-Readiness-Executive-Report.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PDF report tidak dapat dihasilkan.');
    } finally {
      setBusy(false);
    }
  };

  const exportAssessment = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/tools/pdp-readiness/export?id=' + encodeURIComponent(assessmentId), {
        headers: { Authorization: 'Bearer ' + resumeToken },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'RTI-UU-PDP-Assessment-Export.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment export tidak dapat dihasilkan.');
    } finally {
      setBusy(false);
    }
  };

  const deleteAssessment = async () => {
    if (!window.confirm('Hapus assessment ini secara permanen beserta response dan evidence yang terkait?')) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/tools/pdp-readiness/assessment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + resumeToken,
        },
        body: JSON.stringify({ assessmentId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Assessment tidak dapat dihapus.');
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage may be disabled.
      }
      setAssessmentId('');
      setResumeToken('');
      setQuestions([]);
      setResponses({});
      setResult(null);
      setAiAnalysis('');
      setResumeAvailable(false);
      setStep('intro');
      setMessage('Assessment dan data terkait telah dihapus.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dihapus.');
    } finally {
      setBusy(false);
    }
  };

  const domainByCode = (code: string) =>
    result?.domainScores.find((domain) => domain.code === code)?.score ?? null;

  return (
    <main className="min-h-screen bg-grey-50">
      <section className="border-b border-navy-700 bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                UU No. 27/2022
              </div>
              <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl">
                UU PDP Data Protection Readiness
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Self-Assessment Kesiapan Pelindungan Data Pribadi untuk diagnosis governance, RoPA, lawful processing,
                hak subjek data, DPIA, DPO, vendor, breach response, security, dan cross-border transfer.
              </p>
            </div>
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                <div className="font-extrabold text-white">Privacy Diagnostic & Advisory Conversion Platform</div>
                <div className="mt-2">Database-driven · versioned · evidence-aware · executive reporting</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {message}
          </div>
        </div>
      )}

      {step === 'intro' && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <Scale className="mt-0.5 h-6 w-6 text-gold-600" />
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-900">Pilih mode assessment</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Quick Readiness untuk initial diagnostic. Comprehensive untuk kontrol yang lebih detail,
                      evidence, risk register, dan executive report yang lebih kaya.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    ['quick', 'Quick Readiness Check', '6–10 menit', config?.metadata.quickQuestions || 30, 'Initial diagnostic dan lead qualification.'],
                    ['comprehensive', 'Comprehensive PDP Assessment', '15–30+ menit', config?.metadata.comprehensiveQuestions || 100, 'Assessment detail dengan evidence dan branching.'],
                  ] as const).map(([value, label, time, count, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={'rounded-2xl border p-5 text-left transition ' + (
                        mode === value
                          ? 'border-gold-500 bg-beige-50 shadow-sm'
                          : 'border-line bg-white hover:border-gold-500/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-extrabold text-navy-900">{label}</div>
                        {mode === value && <CheckCircle2 className="h-5 w-5 text-gold-600" />}
                      </div>
                      <div className="mt-2 text-xs font-bold text-teal-700">{time} · sekitar {count} control questions</div>
                      <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-950">
                  <strong>Privacy notice singkat:</strong> tool hanya meminta informasi organisasi yang diperlukan untuk
                  menghasilkan readiness diagnostic. Jangan masukkan NIK, password, customer database, data nasabah,
                  atau data pribadi aktual yang tidak diperlukan.
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setStep('profile')}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300"
                  >
                    Start Assessment
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {resumeAvailable && (
                    <button
                      onClick={resumeAssessment}
                      disabled={busy}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-xs font-extrabold text-navy-900 hover:bg-grey-50 disabled:opacity-50"
                    >
                      <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} />
                      Resume Saved Assessment
                    </button>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              {[
                ['20 assessment domains', 'Governance sampai continuous assurance.'],
                ['Weighted scoring', 'Domain × control × evidence × criticality.'],
                ['DPIA & DPO screening', 'Trigger-based diagnostic, bukan legal conclusion.'],
                ['Executive PDF', 'Gap, risk, roadmap, dan RTI advisory opportunities.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                  <div className="text-sm font-extrabold text-navy-900">{title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted">{text}</div>
                </div>
              ))}
            </aside>
          </div>
        </section>
      )}

      {step === 'profile' && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <Building2 className="mt-0.5 h-6 w-6 text-gold-600" />
              <div>
                <h2 className="text-xl font-extrabold text-navy-900">Profil Organisasi & Processing Context</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Jawaban profil digunakan untuk conditional branching, DPIA/DPO screening, dan applicability control.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold text-navy-900">
                Nama perusahaan
                <input
                  value={profile.companyName}
                  onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))}
                  placeholder="Opsional untuk guest assessment"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Industri *
                <select
                  value={profile.industry}
                  onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-normal"
                >
                  <option value="">Pilih industri</option>
                  {(config?.industries || []).map((item) => (
                    <option key={item.value} value={item.label}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">
                Skala organisasi *
                <select
                  value={profile.organizationSize}
                  onChange={(event) => setProfile((current) => ({ ...current, organizationSize: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-normal"
                >
                  <option value="">Pilih skala</option>
                  {(config?.organizationSizes || []).map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">
                Jumlah karyawan
                <input
                  type="number"
                  min="0"
                  value={profile.employeeCount ?? ''}
                  onChange={(event) => setProfile((current) => ({ ...current, employeeCount: event.target.value ? Number(event.target.value) : undefined }))}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold text-navy-900">
                Estimasi jumlah subjek data
                <input
                  type="number"
                  min="0"
                  value={profile.dataSubjectCount ?? ''}
                  onChange={(event) => setProfile((current) => ({ ...current, dataSubjectCount: event.target.value ? Number(event.target.value) : undefined }))}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal"
                />
              </label>
              <div className="text-xs font-bold text-navy-900">
                Jenis pelanggan
                <div className="mt-2 flex flex-wrap gap-2">
                  {(config?.customerTypes || []).map((item) => {
                    const active = profile.customerTypes.includes(item.value);
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => setProfile((current) => ({
                          ...current,
                          customerTypes: active
                            ? current.customerTypes.filter((value) => value !== item.value)
                            : [...current.customerTypes, item.value],
                        }))}
                        className={'rounded-lg border px-3 py-2 text-xs ' + (active ? 'border-gold-500 bg-beige-50' : 'border-line bg-white')}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-sm font-extrabold text-navy-900">Processing indicators</div>
              <p className="mt-1 text-xs text-muted">Aktifkan hanya kondisi yang benar-benar berlaku.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PROFILE_FLAGS.map(([key, label, description]) => {
                  const active = Boolean(profile[key]);
                  return (
                    <button
                      type="button"
                      key={String(key)}
                      onClick={() => setFlag(key, !active)}
                      className={'rounded-xl border p-3 text-left transition ' + (active ? 'border-gold-500 bg-beige-50' : 'border-line hover:bg-grey-50')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-navy-900">{label}</span>
                        <span className={'h-5 w-9 rounded-full p-0.5 ' + (active ? 'bg-gold-500' : 'bg-slate-200')}>
                          <span className={'block h-4 w-4 rounded-full bg-white transition ' + (active ? 'translate-x-4' : '')} />
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">{description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
              <button onClick={() => setStep('intro')} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-bold text-navy-900">
                <ChevronLeft className="h-4 w-4" /> Kembali
              </button>
              <button onClick={startAssessment} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Generate Smart Questionnaire
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'questions' && currentQuestion && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-3">
              <div className="sticky top-24 space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Assessment progress</div>
                  <div className="mt-1 text-2xl font-black text-navy-900">{progress}%</div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-gold-500 transition-all" style={{ width: progress + '%' }} />
                  </div>
                  <div className="mt-2 text-[10px] text-muted">{completed}/{questions.length} answered · {mode}</div>
                </div>
                <div className="border-t border-line pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Current domain</div>
                  <div className="mt-1 text-sm font-extrabold text-navy-900">{currentQuestion.domainName}</div>
                  <div className="mt-1 text-[10px] text-muted">{currentQuestion.code} · {currentQuestion.criticality}</div>
                </div>
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await saveResponses();
                      setMessage('Progress berhasil disimpan. Resume token tetap tersimpan pada browser ini.');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan progress.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-bold text-navy-900"
                >
                  <Save className="h-4 w-4" /> Save Progress
                </button>
              </div>
            </aside>

            <div className="space-y-4 lg:col-span-9">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      {currentQuestion.domainName}
                    </div>
                    <div className="mt-1 text-xs font-bold text-muted">
                      Question {currentIndex + 1} of {questions.length}
                    </div>
                  </div>
                  <span className={'rounded-full border px-3 py-1 text-[10px] font-extrabold ' + riskTone(currentQuestion.criticality)}>
                    {currentQuestion.criticality}
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-extrabold leading-snug text-navy-900 sm:text-2xl">
                  {currentQuestion.questionText}
                </h2>
                {currentQuestion.questionHelp && (
                  <p className="mt-3 text-xs leading-relaxed text-muted">{currentQuestion.questionHelp}</p>
                )}

                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {(config?.answers || []).filter((option) => currentQuestion.answerOptions.includes(option.value)).map((option) => {
                    const active = responses[currentQuestion.id]?.answerValue === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => updateResponse(currentQuestion.id, { answerValue: option.value })}
                        className={'min-h-12 rounded-xl border px-4 py-3 text-left text-xs font-bold transition ' + (
                          active
                            ? 'border-gold-500 bg-beige-50 text-navy-900 shadow-sm'
                            : 'border-line bg-white text-navy-900 hover:border-gold-500/50'
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-4 border-t border-line pt-5 md:grid-cols-2">
                  <label className="text-xs font-bold text-navy-900">
                    Confidence level
                    <select
                      value={responses[currentQuestion.id]?.confidence || 'unverified'}
                      onChange={(event) => updateResponse(currentQuestion.id, { confidence: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-xs font-normal"
                    >
                      {(config?.confidenceOptions || []).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-navy-900">
                    Evidence status
                    <select
                      value={responses[currentQuestion.id]?.evidenceStatus || 'not_available'}
                      onChange={(event) => updateResponse(currentQuestion.id, { evidenceStatus: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-xs font-normal"
                    >
                      {(config?.evidenceOptions || []).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {currentQuestion.recommendedEvidence && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-950">
                    <strong>Suggested evidence:</strong> {currentQuestion.recommendedEvidence}
                  </div>
                )}

                {mode === 'comprehensive' && (
                  <div className="mt-4 rounded-xl border border-dashed border-line bg-grey-50 p-4">
                    <div className="flex items-start gap-3">
                      <Upload className="mt-0.5 h-4 w-4 text-gold-600" />
                      <div className="flex-1">
                        <div className="text-xs font-extrabold text-navy-900">Attach supporting evidence</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted">
                          PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG/JPG, TXT. Do not upload unnecessary personal or confidential information.
                          Redact personal data before upload.
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) uploadEvidence(file);
                            event.currentTarget.value = '';
                          }}
                          className="mt-3 block w-full text-[10px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white"
                        />
                        {evidenceMessage && <div className="mt-2 text-[10px] text-muted">{evidenceMessage}</div>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                  <button
                    disabled={currentIndex === 0 || busy}
                    onClick={() => navigate(-1)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-3 text-xs font-bold text-navy-900 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <div className="flex gap-2">
                    {currentIndex < questions.length - 1 ? (
                      <button
                        disabled={busy}
                        onClick={() => navigate(1)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={finish}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 disabled:opacity-50"
                      >
                        {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                        Analyze Readiness
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white p-4 text-[11px] leading-relaxed text-muted">
                <strong className="text-navy-900">Regulatory traceability:</strong>{' '}
                {currentQuestion.regulationReference || 'UU No. 27 Tahun 2022'}
                {currentQuestion.articleReference ? ' · ' + currentQuestion.articleReference : ''}.
                Assessment output is a diagnostic indicator and requires context/evidence validation.
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 'result' && result && (
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Overall PDP Readiness', result.overallScore + '%', ShieldCheck],
              ['Maturity', 'Level ' + result.maturityLevel + ' · ' + result.maturityLabel, Activity],
              ['Evidence Confidence', result.evidenceConfidence + '%', Database],
              ['Completion', result.completion + '%', CheckCircle2],
            ].map(([label, value, Icon]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={String(label)} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <I className="h-5 w-5 text-gold-600" />
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">{String(label)}</div>
                  <div className="mt-1 text-xl font-black text-navy-900">{String(value)}</div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm lg:col-span-5">
              <div className="text-sm font-extrabold text-navy-900">Domain Readiness Radar</div>
              <div className="mt-4 flex justify-center"><Radar domains={result.domainScores} /></div>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm lg:col-span-7">
              <div className="text-sm font-extrabold text-navy-900">Domain Heatmap</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {result.domainScores.map((domain) => (
                  <div key={domain.domainId} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-navy-900">{domain.name}</span>
                      <span className="font-black text-navy-900">{domain.score}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-gold-500" style={{ width: pct(domain.score) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {[
              ['RoPA Readiness', domainByCode('ROPA')],
              ['DSAR Readiness', domainByCode('RIGHTS')],
              ['Breach Response', domainByCode('BREACH')],
              ['Cross-Border', domainByCode('XFER')],
              ['Third-Party', domainByCode('TPRM')],
              ['Security', domainByCode('SEC')],
              ['Privacy by Design', domainByCode('PBD')],
              ['Assurance', domainByCode('AUDIT')],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-line bg-white p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
                <div className="mt-1 text-lg font-black text-navy-900">{value === null ? 'N/A' : String(value) + '%'}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={'rounded-2xl border p-5 ' + statusTone(result.dpia.status)}>
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Scale className="h-5 w-5" /> DPIA Screening
              </div>
              <div className="mt-2 text-lg font-black">{result.dpia.status}</div>
              <ul className="mt-3 space-y-1 text-xs">
                {(result.dpia.reasons.length ? result.dpia.reasons : ['No high-risk trigger recorded from current profile.']).map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
            <div className={'rounded-2xl border p-5 ' + statusTone(result.dpo.status)}>
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <LockKeyhole className="h-5 w-5" /> DPO / Privacy Function Screening
              </div>
              <div className="mt-2 text-lg font-black">{result.dpo.status}</div>
              <ul className="mt-3 space-y-1 text-xs">
                {(result.dpo.reasons.length ? result.dpo.reasons : ['No explicit trigger recorded from current profile.']).map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-navy-900">Critical Findings</div>
                <p className="mt-1 text-xs text-muted">Ditampilkan terpisah agar gap regulasi kritikal tidak tertutup oleh overall score.</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div className="mt-4 space-y-3">
              {(result.criticalFindings.length ? result.criticalFindings : result.findings.slice(0, 5)).map((finding) => (
                <div key={finding.code} className={'rounded-xl border p-4 ' + riskTone(finding.priority)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold">{finding.domain}</div>
                    <div className="text-[10px] font-black uppercase">{finding.priority}</div>
                  </div>
                  <div className="mt-2 text-xs font-semibold">{finding.gap}</div>
                  <div className="mt-2 text-[11px] leading-relaxed">{finding.recommendedAction}</div>
                  <div className="mt-2 text-[10px] opacity-80">Owner: {finding.suggestedOwner} · Target: {finding.targetTimeline}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-gold-600" />
              <div className="text-sm font-extrabold text-navy-900">Data Flow Visualization</div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold">
              {['Data Subject','Collection Channel','Business Process','Application/System','Internal Recipient','Third Party / Processor','Storage / Cross-Border','Retention / Deletion'].map((node, index, all) => (
                <React.Fragment key={node}>
                  <span className={'rounded-lg border px-3 py-2 ' + (
                    (node.includes('Third Party') && profile.thirdPartyProcessor) ||
                    (node.includes('Cross-Border') && profile.internationalTransfer)
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-line bg-grey-50 text-navy-900'
                  )}>{node}</span>
                  {index < all.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-gold-600" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm lg:col-span-7">
              <div className="text-sm font-extrabold text-navy-900">30 / 90 / 180+ Day Roadmap</div>
              <div className="mt-4 space-y-3">
                {result.roadmap.slice(0, 12).map((item, index) => (
                  <div key={index} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-gold-700">{item.phase}</span>
                      <span className="text-[10px] font-bold text-muted">{item.owner}</span>
                    </div>
                    <div className="mt-1 text-xs font-extrabold text-navy-900">{item.domain}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.action}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-gold-600" />
                  <div className="text-sm font-extrabold text-navy-900">AI Privacy Advisor</div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  AI hanya menerima profile dan hasil assessment terstruktur, bukan isi evidence file.
                  Regulatory conclusion dibatasi pada context yang diberikan.
                </p>
                <button onClick={runAi} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">
                  <BrainCircuit className="h-4 w-4" /> Generate Executive Analysis
                </button>
                {aiAnalysis && (
                  <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-line bg-grey-50 p-4 text-[11px] leading-relaxed text-navy-900">
                    {aiAnalysis}
                  </pre>
                )}
              </div>

              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <div className="text-sm font-extrabold text-navy-900">RTI Advisory Opportunities</div>
                <div className="mt-3 space-y-3">
                  {result.serviceRecommendations.map((item) => (
                    <div key={item.service} className="rounded-xl border border-line p-3">
                      <div className="text-xs font-extrabold text-navy-900">{item.service}</div>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-navy-800 bg-navy-900 p-6 text-white sm:p-8">
            <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="text-xl font-extrabold">Discuss Your PDP Readiness with RTI</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Bawa gap, risk register, dan roadmap hasil assessment ke sesi konsultasi untuk validasi scope dan prioritas implementasi.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
                <button onClick={downloadPdf} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-3 text-xs font-extrabold text-navy-900 disabled:opacity-50">
                  <Download className="h-4 w-4" /> Download Executive Report
                </button>
                <button onClick={exportAssessment} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-extrabold text-white hover:bg-white/10 disabled:opacity-50">
                  <FileText className="h-4 w-4" /> Export Assessment Data
                </button>
                <Link href="/consultation" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-extrabold text-white hover:bg-white/10">
                  Request Consultation <ArrowRight className="h-4 w-4" />
                </Link>
                <button onClick={deleteAssessment} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/50 px-4 py-3 text-xs font-extrabold text-rose-100 hover:bg-rose-500/10 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> Delete Assessment
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-950">
            <strong>Disclaimer:</strong> {result.disclaimer}
          </div>
        </section>
      )}
    </main>
  );
}
