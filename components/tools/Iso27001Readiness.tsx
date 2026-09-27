'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileUp,
  Gauge,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  Target,
} from 'lucide-react';

type Mode = 'quick' | 'full';

type Item = {
  id: string;
  questionCode?: string;
  controlRef?: string;
  clauseRef?: string;
  domain: string;
  questionText: string;
  purpose?: string | null;
  expectedEvidence?: string | null;
  riskIfMissing?: string | null;
  recommendation?: string | null;
  criticality: string;
  weight: number;
  applicabilityRule?: string | null;
  kind?: 'question' | 'control';
};

type TemplatePayload = {
  success: boolean;
  template: { name: string; standardVersion: string; frameworkVersion: string; mode: Mode };
  questions: Item[];
  annexControls: Item[];
  responseOptions: Array<{ value: string; label: string; description?: string | null; score?: number | null; isNA: number }>;
  evidenceStatuses: Array<{ value: string; label: string; scorePercent: number }>;
  settings: Record<string, string>;
  copyright: string;
};

type SavedResponse = {
  targetRef: string;
  responseValue: number | null;
  isNA: boolean;
  applicabilityJustification: string;
  evidenceStatus: string;
  evidenceNote: string;
  comment: string;
};

type ResultPayload = {
  calculatedAt: string;
  frameworkVersion: string;
  mode: Mode;
  completion: { answered: number; total: number; percentage: number };
  overallScore: number;
  readinessLevel: string;
  dimensions: {
    requirementReadiness: number;
    controlReadiness: number;
    evidenceReadiness: number;
    governanceReadiness: number;
    auditReadiness: number;
  };
  gates: { completed: number; total: number; items: Array<{ key: string; label: string; complete: boolean }> };
  gaps: { total: number; counts: Record<string, number> };
  disclaimer: string;
};

type DetailPayload = {
  gaps: Array<Record<string, unknown>>;
  roadmap: Array<Record<string, unknown>>;
  settings: Record<string, string>;
};

const STORAGE_KEY = 'rti_iso27001_session_v1';

const initialProfile = {
  name: '',
  industry: '',
  subIndustry: '',
  country: 'Indonesia',
  employeeCount: '',
  locationCount: '',
  businessUnitCount: '',
  itUserCount: '',
  cloudStatus: '',
  cloudProvider: '',
  dataCenter: '',
  criticalThirdParties: '',
  regulatoryEnvironment: '',
  targetCertification: '',
  targetCertificationDate: '',
  remoteWorking: false,
  outsourcedIt: false,
  processesPersonalData: false,
  hasSoc: false,
  hasIncidentResponseTeam: false,
  hasBcpDrp: false,
  iso27001Certified: false,
};

const initialScope = {
  organization: '',
  location: '',
  businessUnit: '',
  productService: '',
  application: '',
  infrastructure: '',
  people: '',
  process: '',
  thirdParty: '',
  cloudEnvironment: '',
};

function applies(item: Item, profile: typeof initialProfile) {
  if (!item.applicabilityRule) return true;
  try {
    const rule = JSON.parse(item.applicabilityRule) as { field?: keyof typeof initialProfile; equals?: unknown; notEquals?: unknown; notEmpty?: boolean };
    if (!rule.field) return true;
    const value = profile[rule.field];
    if (rule.notEmpty) return String(value || '').trim().length > 0;
    if (Object.prototype.hasOwnProperty.call(rule, 'equals')) return value === rule.equals;
    if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) return value !== rule.notEquals;
    return true;
  } catch {
    return true;
  }
}

function metricBar(label: string, value: number) {
  return (
    <div key={label}>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-bold text-navy-900">{label}</span>
        <span className="font-extrabold text-navy-900">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
      </div>
    </div>
  );
}

export function Iso27001Readiness() {
  const [stage, setStage] = React.useState<'intro' | 'profile' | 'assessment' | 'results'>('intro');
  const [mode, setMode] = React.useState<Mode>('quick');
  const [profile, setProfile] = React.useState(initialProfile);
  const [scope, setScope] = React.useState(initialScope);
  const [assessmentConsent, setAssessmentConsent] = React.useState(false);
  const [evidenceConsent, setEvidenceConsent] = React.useState(false);
  const [aiConsent, setAiConsent] = React.useState(false);
  const [template, setTemplate] = React.useState<TemplatePayload | null>(null);
  const [assessmentId, setAssessmentId] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');
  const [responses, setResponses] = React.useState<Record<string, SavedResponse>>({});
  const [index, setIndex] = React.useState(0);
  const [result, setResult] = React.useState<ResultPayload | null>(null);
  const [detail, setDetail] = React.useState<DetailPayload | null>(null);
  const [draft, setDraft] = React.useState<SavedResponse>({
    targetRef: '',
    responseValue: null,
    isNA: false,
    applicabilityJustification: '',
    evidenceStatus: 'no_evidence',
    evidenceNote: '',
    comment: '',
  });
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [resumeAvailable, setResumeAvailable] = React.useState(false);

  React.useEffect(() => {
    try {
      setResumeAvailable(Boolean(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      setResumeAvailable(false);
    }
  }, []);

  const items = React.useMemo(() => {
    if (!template) return [] as Item[];
    const questions = template.questions.filter((item) => applies(item, profile)).map((item) => ({ ...item, kind: 'question' as const }));
    const controls = template.annexControls.map((item) => ({ ...item, kind: 'control' as const, clauseRef: 'Annex A' }));
    return [...questions, ...controls];
  }, [template, profile]);

  const current = items[index];

  React.useEffect(() => {
    if (!current) return;
    const saved = responses[current.id];
    setDraft(saved || {
      targetRef: current.id,
      responseValue: null,
      isNA: false,
      applicabilityJustification: '',
      evidenceStatus: 'no_evidence',
      evidenceNote: '',
      comment: '',
    });
    setFile(null);
  }, [current?.id, responses]);

  async function loadTemplate(nextMode: Mode) {
    const response = await fetch('/api/assessments/iso27001/template?mode=' + nextMode, { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Framework assessment belum tersedia.');
    setTemplate(data);
    return data as TemplatePayload;
  }

  async function start() {
    if (!profile.name.trim()) return setMessage('Nama organisasi wajib diisi.');
    if (!assessmentConsent) return setMessage('Persetujuan assessment wajib diberikan.');
    setBusy(true);
    setMessage('');
    try {
      await loadTemplate(mode);
      const response = await fetch('/api/assessments/iso27001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          profile: {
            ...profile,
            employeeCount: profile.employeeCount ? Number(profile.employeeCount) : null,
            locationCount: profile.locationCount ? Number(profile.locationCount) : null,
            businessUnitCount: profile.businessUnitCount ? Number(profile.businessUnitCount) : null,
            itUserCount: profile.itUserCount ? Number(profile.itUserCount) : null,
          },
          scope,
          assessmentConsent,
          evidenceProcessingConsent: evidenceConsent,
          aiProcessingConsent: aiConsent,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Assessment tidak dapat dibuat.');
      const id = String(data.assessment.id);
      const token = String(data.assessment.accessToken);
      setAssessmentId(id);
      setAccessToken(token);
      setResponses({});
      setIndex(0);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, token, mode }));
      setResumeAvailable(true);
      setStage('assessment');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assessment tidak dapat dimulai.');
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    setMessage('');
    try {
      const session = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as { id?: string; token?: string; mode?: Mode } | null;
      if (!session?.id || !session?.token) throw new Error('Sesi tersimpan tidak ditemukan.');
      const nextMode: Mode = session.mode === 'full' ? 'full' : 'quick';
      await loadTemplate(nextMode);
      const response = await fetch('/api/assessments/' + encodeURIComponent(session.id), {
        headers: { 'x-assessment-token': session.token },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Sesi tidak dapat dilanjutkan.');
      const mapped: Record<string, SavedResponse> = {};
      for (const row of data.responses || []) {
        mapped[String(row.targetRef)] = {
          targetRef: String(row.targetRef),
          responseValue: row.responseValue == null ? null : Number(row.responseValue),
          isNA: Boolean(row.isNA),
          applicabilityJustification: String(row.applicabilityJustification || ''),
          evidenceStatus: String(row.evidenceStatus || 'no_evidence'),
          evidenceNote: String(row.evidenceNote || ''),
          comment: String(row.comment || ''),
        };
      }
      setMode(nextMode);
      setAssessmentId(session.id);
      setAccessToken(session.token);
      setResponses(mapped);
      setIndex(0);
      setStage('assessment');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sesi tidak dapat dilanjutkan.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadEvidence(targetRef: string) {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('targetRef', targetRef);
    form.append('classification', 'Confidential');
    const response = await fetch('/api/assessments/' + encodeURIComponent(assessmentId) + '/evidence', {
      method: 'POST',
      headers: { 'x-assessment-token': accessToken },
      body: form,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.error || 'Evidence tidak dapat diunggah.');
  }

  async function save(goNext: boolean) {
    if (!current) return false;
    if (!draft.isNA && draft.responseValue == null) {
      setMessage('Pilih status implementasi 0–5 atau Not Applicable.');
      return false;
    }
    if (draft.isNA && draft.applicabilityJustification.trim().length < 8) {
      setMessage('Not Applicable wajib disertai applicability justification.');
      return false;
    }
    setBusy(true);
    setMessage('');
    try {
      const payload = { ...draft, targetRef: current.id };
      const response = await fetch('/api/assessments/' + encodeURIComponent(assessmentId) + '/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-assessment-token': accessToken },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Jawaban gagal disimpan.');
      if (file) await uploadEvidence(current.id);
      setResponses((existing) => ({ ...existing, [current.id]: payload }));
      if (goNext && index < items.length - 1) setIndex((value) => value + 1);
      setMessage('Saved.');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Jawaban gagal disimpan.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function calculate() {
    setBusy(true);
    setMessage('');
    try {
      if (current) {
        const ok = await save(false);
        if (!ok) return;
      }
      const response = await fetch('/api/assessments/' + encodeURIComponent(assessmentId) + '/calculate', {
        method: 'POST',
        headers: { 'x-assessment-token': accessToken },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Scoring tidak dapat diproses.');

      const detailsResponse = await fetch('/api/assessments/' + encodeURIComponent(assessmentId) + '/results', {
        headers: { 'x-assessment-token': accessToken },
        cache: 'no-store',
      });
      const detailsData = await detailsResponse.json().catch(() => null);
      if (!detailsResponse.ok || !detailsData?.success) throw new Error(detailsData?.error || 'Hasil tidak dapat dimuat.');
      setResult(data.result);
      setDetail(detailsData.result);
      setStage('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scoring tidak dapat diproses.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadReport() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/assessments/' + encodeURIComponent(assessmentId) + '/report', {
        headers: { 'x-assessment-token': accessToken },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Report PDF tidak dapat dibuat.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'RTI-ISO27001-Readiness-Report.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Report PDF tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setAssessmentId('');
    setAccessToken('');
    setResponses({});
    setResult(null);
    setDetail(null);
    setTemplate(null);
    setIndex(0);
    setResumeAvailable(false);
    setMessage('');
    setStage('intro');
  }

  if (stage === 'intro') {
    return (
      <main className="min-h-screen bg-white">
        <section className="border-b border-navy-700 bg-navy-900 py-14 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-gold-300">
                <FileCheck2 className="h-4 w-4" /> ISMS Certification Preparation
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">ISO/IEC 27001 Readiness Checklist</h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-lg">
                Diagnostic readiness assessment for ISO/IEC 27001:2022, Amendment 1:2024, Clauses 4–10 and Annex A control themes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => setStage('profile')} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-extrabold text-navy-900">
                  Start Assessment <ArrowRight className="h-4 w-4" />
                </button>
                {resumeAvailable && (
                  <button onClick={resume} disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Continue Saved Assessment
                  </button>
                )}
              </div>
              {message && <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">{message}</div>}
            </div>
          </div>
        </section>

        <section className="bg-grey-50 py-14">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 md:grid-cols-2 sm:px-6 lg:px-8">
            <button onClick={() => { setMode('quick'); setStage('profile'); }} className="rounded-2xl border border-line bg-white p-6 text-left shadow-sm hover:border-gold-500/60 hover:shadow-md">
              <div className="flex items-center gap-3"><Gauge className="h-6 w-6 text-gold-600" /><div><div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">Quick Readiness Scan</div><h2 className="mt-1 text-xl font-black text-navy-900">Executive diagnostic · ±7–10 mins</h2></div></div>
              <p className="mt-4 text-sm leading-relaxed text-muted">39 focused diagnostic questions across Clauses 4–10 and Annex A control themes.</p>
            </button>
            <button onClick={() => { setMode('full'); setStage('profile'); }} className="rounded-2xl border border-line bg-white p-6 text-left shadow-sm hover:border-blue-400 hover:shadow-md">
              <div className="flex items-center gap-3"><Target className="h-6 w-6 text-blue-600" /><div><div className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Detailed Assessment</div><h2 className="mt-1 text-xl font-black text-navy-900">Clauses 4–10 + 93 Annex A controls</h2></div></div>
              <p className="mt-4 text-sm leading-relaxed text-muted">Evidence-oriented assessment with control applicability, gap generation and remediation roadmap.</p>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (stage === 'profile') {
    const fields: Array<[keyof typeof initialProfile, string, string]> = [
      ['name', 'Nama perusahaan', 'PT Contoh Indonesia'],
      ['industry', 'Industri', 'Banking, Technology, Manufacturing, ...'],
      ['subIndustry', 'Sub-industri', 'Opsional'],
      ['country', 'Negara', 'Indonesia'],
      ['cloudStatus', 'Cloud environment', 'None / limited / hybrid / cloud-first'],
      ['cloudProvider', 'Cloud provider', 'AWS / Azure / GCP / private cloud / lainnya'],
      ['dataCenter', 'Data center / hosting', 'Lokasi atau model hosting'],
      ['criticalThirdParties', 'Critical third parties', 'Vendor atau penyedia penting'],
      ['regulatoryEnvironment', 'Regulatory environment', 'OJK, BI, BSSN, contractual obligations, dll.'],
      ['targetCertification', 'Target certification', 'First certification / recertification / improvement'],
      ['targetCertificationDate', 'Target certification date', 'YYYY-MM-DD atau target periode'],
    ];
    const countFields: Array<[keyof typeof initialProfile, string]> = [
      ['employeeCount', 'Jumlah karyawan'],
      ['locationCount', 'Jumlah lokasi'],
      ['businessUnitCount', 'Jumlah business unit'],
      ['itUserCount', 'Jumlah pengguna IT'],
    ];
    const flags: Array<[keyof typeof initialProfile, string]> = [
      ['remoteWorking', 'Remote working'],
      ['outsourcedIt', 'Outsourced IT'],
      ['processesPersonalData', 'Processes personal data'],
      ['hasSoc', 'SOC available'],
      ['hasIncidentResponseTeam', 'Incident response team'],
      ['hasBcpDrp', 'BCP / DRP available'],
      ['iso27001Certified', 'Existing ISO 27001 certification'],
    ];

    return (
      <main className="min-h-screen bg-grey-50 py-10">
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setStage('intro')} className="inline-flex items-center gap-2 text-xs font-bold text-navy-900"><ArrowLeft className="h-4 w-4" /> Back</button>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">Organization Profile · {mode === 'quick' ? 'Quick Scan' : 'Detailed Assessment'}</div><h1 className="mt-1 text-2xl font-black text-navy-900">Define the organization and proposed ISMS scope</h1><p className="mt-2 text-xs leading-relaxed text-muted">No readiness score is pre-populated. Results are generated only from persisted responses.</p></div><LockKeyhole className="h-7 w-7 text-blue-600" /></div>
          </div>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Organization Information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {fields.map(([key, label, placeholder]) => (
                <label key={key} className="text-xs font-bold text-navy-900">{label}
                  <input value={String(profile[key] || '')} onChange={(event) => setProfile((currentProfile) => ({ ...currentProfile, [key]: event.target.value }))} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal outline-none focus:border-blue-400" />
                </label>
              ))}
              {countFields.map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-navy-900">{label}
                  <input type="number" min="0" value={String(profile[key] || '')} onChange={(event) => setProfile((currentProfile) => ({ ...currentProfile, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal outline-none focus:border-blue-400" />
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {flags.map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-line bg-grey-50 p-3 text-xs font-bold text-navy-900">
                  <input type="checkbox" checked={Boolean(profile[key])} onChange={(event) => setProfile((currentProfile) => ({ ...currentProfile, [key]: event.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Proposed ISMS Scope</h2>
            <p className="mt-1 text-xs text-muted">Editable indicative scope; final scope remains subject to organizational validation and certification planning.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Object.entries(scope).map(([key, value]) => (
                <label key={key} className="text-xs font-bold capitalize text-navy-900">{key.replace(/([A-Z])/g, ' $1')}
                  <textarea rows={2} value={value} onChange={(event) => setScope((currentScope) => ({ ...currentScope, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal" />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Consent & Processing</h2>
            <div className="mt-4 space-y-3 text-xs leading-relaxed text-navy-900">
              <label className="flex items-start gap-3"><input type="checkbox" checked={assessmentConsent} onChange={(e) => setAssessmentConsent(e.target.checked)} className="mt-0.5" /><span><strong>Required:</strong> I consent to RTI processing the information entered for this diagnostic assessment.</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={evidenceConsent} onChange={(e) => setEvidenceConsent(e.target.checked)} className="mt-0.5" /><span>I consent to evidence files being stored in private RTI server storage for this assessment.</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={aiConsent} onChange={(e) => setAiConsent(e.target.checked)} className="mt-0.5" /><span>I consent to optional external AI processing only when I explicitly request AI assistance.</span></label>
            </div>
          </section>

          {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">{message}</div>}
          <button onClick={start} disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Begin {mode === 'quick' ? 'Quick Scan' : 'Detailed Assessment'}
          </button>
        </div>
      </main>
    );
  }

  if (stage === 'assessment' && template && current) {
    const progress = items.length ? Math.round((Object.keys(responses).length / items.length) * 100) : 0;
    const selected = draft.isNA ? 'NA' : draft.responseValue == null ? '' : String(draft.responseValue);
    return (
      <main className="min-h-screen bg-grey-50 py-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
          <div className="sticky top-2 z-20 rounded-2xl border border-line bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">{template.template.frameworkVersion} · {mode === 'quick' ? 'Quick Scan' : 'Detailed Assessment'}</div><div className="mt-1 text-sm font-black text-navy-900">{index + 1} / {items.length} · {progress}% saved</div></div><div className="flex items-center gap-2 text-[11px] font-bold text-muted"><Save className="h-4 w-4 text-blue-600" /> Save & Continue Later enabled</div></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold-500" style={{ width: progress + '%' }} /></div>
          </div>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">{current.clauseRef || current.domain}</span>
              <span className="rounded-full bg-grey-50 px-2.5 py-1 text-[10px] font-bold text-muted">{current.controlRef || current.questionCode || current.id}</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">{current.criticality}</span>
            </div>
            <h1 className="mt-5 text-xl font-black leading-snug text-navy-900 sm:text-2xl">{current.questionText}</h1>
            {current.purpose && <p className="mt-3 text-xs leading-relaxed text-muted"><strong className="text-navy-900">Purpose:</strong> {current.purpose}</p>}

            <div className="mt-6 grid gap-3">
              {template.responseOptions.map((option) => {
                const active = selected === option.value;
                return (
                  <button key={option.value} onClick={() => setDraft((existing) => ({ ...existing, targetRef: current.id, isNA: Boolean(option.isNA), responseValue: option.isNA ? null : Number(option.value) }))} className={active ? 'rounded-xl border border-gold-500 bg-amber-50 p-4 text-left shadow-sm' : 'rounded-xl border border-line bg-white p-4 text-left hover:bg-grey-50'}>
                    <div className="flex items-start gap-3">{active ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" /> : <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-line" />}<div><div className="text-sm font-extrabold text-navy-900">{option.label}</div>{option.description && <div className="mt-1 text-xs leading-relaxed text-muted">{option.description}</div>}</div></div>
                  </button>
                );
              })}
            </div>

            {draft.isNA && <label className="mt-5 block text-xs font-bold text-navy-900">Applicability Justification <span className="text-rose-600">*</span><textarea value={draft.applicabilityJustification} onChange={(e) => setDraft((x) => ({ ...x, applicabilityJustification: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal" placeholder="Explain the risk, obligation and business rationale for Not Applicable." /></label>}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold text-navy-900">Evidence maturity
                <select value={draft.evidenceStatus} onChange={(e) => setDraft((x) => ({ ...x, evidenceStatus: e.target.value }))} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-normal">
                  {template.evidenceStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-navy-900">Evidence file
                <div className="mt-1 flex min-h-12 items-center gap-2 rounded-xl border border-line bg-grey-50 px-3"><FileUp className="h-4 w-4 shrink-0 text-blue-600" /><input type="file" disabled={!evidenceConsent} onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs disabled:opacity-40" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" /></div>
              </label>
            </div>

            <label className="mt-4 block text-xs font-bold text-navy-900">Evidence note<textarea rows={2} value={draft.evidenceNote} onChange={(e) => setDraft((x) => ({ ...x, evidenceNote: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal" placeholder={current.expectedEvidence || 'Describe available evidence.'} /></label>
            <label className="mt-4 block text-xs font-bold text-navy-900">Comment / current condition<textarea rows={3} value={draft.comment} onChange={(e) => setDraft((x) => ({ ...x, comment: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-sm font-normal" /></label>
            {current.riskIfMissing && <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Risk if missing:</strong> {current.riskIfMissing}</div></div>}
          </section>

          {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">{message}</div>}
          <div className="sticky bottom-2 z-20 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
            <button onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0 || busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-extrabold text-navy-900 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Previous</button>
            {index < items.length - 1 ? (
              <button onClick={() => save(true)} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-5 py-2 text-xs font-extrabold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save & Next <ChevronRight className="h-4 w-4" /></button>
            ) : (
              <button onClick={calculate} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-5 py-2 text-xs font-extrabold text-navy-900 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Calculate Results</button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (stage === 'results' && result && detail) {
    const critical = Number(result.gaps.counts.Critical || 0);
    const high = Number(result.gaps.counts.High || 0);
    const consultationUrl = detail.settings.ISO27001_CONSULTATION_URL || '/consultation';
    const whatsapp = String(detail.settings.CONTACT_WHATSAPP || '').replace(/\D/g, '');
    const phases = detail.roadmap.reduce<Record<string, Array<Record<string, unknown>>>>((acc, item) => {
      const phase = String(item.phase || 'Roadmap');
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(item);
      return acc;
    }, {});

    return (
      <main className="min-h-screen bg-grey-50 py-8">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div><div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">Executive Readiness Dashboard</div><h1 className="mt-1 text-2xl font-black text-navy-900 sm:text-3xl">ISO/IEC 27001 Readiness Result</h1><p className="mt-2 text-xs leading-relaxed text-muted">Deterministic rule-engine result based on persisted responses and evidence maturity.</p></div><div className="flex flex-wrap gap-2"><button onClick={downloadReport} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF Report</button><button onClick={() => setStage('assessment')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-bold text-navy-900"><ArrowLeft className="h-4 w-4" /> Review Answers</button></div></div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ['Overall Readiness', result.overallScore.toFixed(1) + '%'],
              ['Readiness Level', result.readinessLevel],
              ['Certification Gates', result.gates.completed + ' / ' + result.gates.total],
              ['Critical Gaps', String(critical)],
              ['High Gaps', String(high)],
              ['Evidence Coverage', result.dimensions.evidenceReadiness.toFixed(1) + '%'],
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-line bg-white p-4 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div><div className="mt-2 text-2xl font-black text-navy-900">{value}</div></div>)}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm"><h2 className="text-base font-extrabold text-navy-900">Readiness Dimensions</h2><div className="mt-5 space-y-4">{metricBar('Requirements', result.dimensions.requirementReadiness)}{metricBar('Annex A / Controls', result.dimensions.controlReadiness)}{metricBar('Evidence', result.dimensions.evidenceReadiness)}{metricBar('Governance', result.dimensions.governanceReadiness)}{metricBar('Audit', result.dimensions.auditReadiness)}</div></div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm"><h2 className="text-base font-extrabold text-navy-900">Certification Readiness Gates</h2><div className="mt-4 grid gap-2">{result.gates.items.map((gate) => <div key={gate.key} className="flex items-center gap-3 rounded-xl border border-line p-3">{gate.complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}<span className="text-xs font-bold text-navy-900">{gate.label}</span></div>)}</div></div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Priority Gap Register</h2>
            {detail.gaps.length === 0 ? <p className="mt-3 text-xs text-muted">No generated gap records are available.</p> : <div className="mt-4 space-y-3">{detail.gaps.slice(0, 20).map((gap) => <div key={String(gap.id)} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-700">{String(gap.severity)}</span><span className="text-xs font-extrabold text-navy-900">{String(gap.clauseControl)}</span></div><p className="mt-2 text-xs leading-relaxed text-muted">{String(gap.finding)}</p>{gap.recommendation && <p className="mt-2 text-xs leading-relaxed text-navy-900"><strong>Recommendation:</strong> {String(gap.recommendation)}</p>}</div>)}</div>}
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-navy-900">Remediation Roadmap</h2>
            {Object.keys(phases).length === 0 ? <p className="mt-3 text-xs text-muted">No roadmap items are available.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(phases).map(([phase, rows]) => <div key={phase} className="rounded-xl border border-line bg-grey-50 p-4"><div className="text-xs font-extrabold uppercase tracking-wider text-gold-700">{phase}</div><div className="mt-3 space-y-2">{rows.slice(0, 8).map((row) => <div key={String(row.id)} className="flex items-start gap-2 text-xs leading-relaxed text-navy-900"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" /><span>{String(row.actionText)}</span></div>)}</div></div>)}</div>}
          </section>

          <section className="rounded-2xl border border-navy-800 bg-navy-900 p-6 text-white shadow-sm sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="text-xs font-extrabold uppercase tracking-wider text-gold-300">Engage RTI</div><h2 className="mt-2 text-2xl font-black">Turn the diagnostic into an evidence-based certification preparation plan.</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Discuss gap assessment, ISMS implementation, internal audit readiness, awareness, risk treatment or technical control validation with RTI.</p></div><div className="flex flex-col gap-2"><Link href={consultationUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900">Discuss Your Readiness <ArrowRight className="h-4 w-4" /></Link>{whatsapp && <a href={'https://wa.me/' + whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-600 px-5 py-3 text-xs font-bold text-white">Talk to RTI Consultant</a>}</div></div>
          </section>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><ShieldCheck className="mr-2 inline h-4 w-4" />{result.disclaimer}</div>
          {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">{message}</div>}
          <button onClick={reset} className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-navy-900"><RotateCcw className="h-4 w-4" /> Start a new assessment</button>
        </div>
      </main>
    );
  }

  return <main className="min-h-screen bg-grey-50 py-20"><div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-sm"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /><p className="mt-3 text-sm font-bold text-navy-900">Loading ISO/IEC 27001 readiness assessment…</p></div></main>;
}
