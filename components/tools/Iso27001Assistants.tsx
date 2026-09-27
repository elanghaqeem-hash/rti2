'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';

type SoaItem = {
  controlId: string;
  controlRef: string;
  domain: string;
  title: string;
  applicable: number | boolean;
  justification?: string | null;
  riskReference?: string | null;
  owner?: string | null;
  implementationStatus?: number | null;
  evidenceStatus?: string | null;
  evidenceNote?: string | null;
};

type RiskRow = {
  id: string;
  assetProcess: string;
  threat?: string | null;
  vulnerability?: string | null;
  impact?: number | null;
  likelihood?: number | null;
  inherentRisk?: number | null;
  controls?: string | null;
  residualRisk?: number | null;
  riskOwner?: string | null;
  treatment?: string | null;
};

const emptyRisk = {
  assetProcess: '',
  threat: '',
  vulnerability: '',
  impact: 3,
  likelihood: 3,
  controls: '',
  residualRisk: 4,
  riskOwner: '',
  treatment: '',
};

export function Iso27001Assistants(props: {
  assessmentId: string;
  accessToken: string;
}) {
  const [panel, setPanel] = React.useState<'soa' | 'risk' | null>(null);
  const [soa, setSoa] = React.useState<SoaItem[]>([]);
  const [applicabilityOptions, setApplicabilityOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  const [risks, setRisks] = React.useState<RiskRow[]>([]);
  const [riskDraft, setRiskDraft] = React.useState({ ...emptyRisk });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function loadSoa() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/assessments/' + encodeURIComponent(props.assessmentId) + '/soa', {
        headers: { 'x-assessment-token': props.accessToken },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Draft SoA register unavailable.');
      setSoa(data.items || []);
      setApplicabilityOptions(data.options || []);
      setPanel('soa');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Draft SoA register unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSoa(item: SoaItem) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/assessments/' + encodeURIComponent(props.assessmentId) + '/soa', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-assessment-token': props.accessToken,
        },
        body: JSON.stringify({
          controlId: item.controlId,
          applicable: Boolean(item.applicable),
          justification: item.justification || '',
          riskReference: item.riskReference || '',
          owner: item.owner || '',
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'SoA item could not be saved.');
      setMessage(item.controlRef + ' saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'SoA item could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  function patchSoa(index: number, patch: Partial<SoaItem>) {
    setSoa((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function loadRisks() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/assessments/' + encodeURIComponent(props.assessmentId) + '/risks', {
        headers: { 'x-assessment-token': props.accessToken },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Risk register unavailable.');
      setRisks(data.risks || []);
      setPanel('risk');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Risk register unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function saveRisk() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/assessments/' + encodeURIComponent(props.assessmentId) + '/risks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assessment-token': props.accessToken,
        },
        body: JSON.stringify(riskDraft),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Risk could not be saved.');
      setRiskDraft({ ...emptyRisk });
      setMessage('Risk record saved.');
      await loadRisks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Risk could not be saved.');
      setBusy(false);
    }
  }

  async function deleteRisk(id: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/assessments/' + encodeURIComponent(props.assessmentId) + '/risks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-assessment-token': props.accessToken,
        },
        body: JSON.stringify({ riskId: id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Risk deletion failed.');
      setRisks((current) => current.filter((item) => item.id !== id));
      setMessage('Risk record deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Risk deletion failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-gold-700">Optional Readiness Assistants</div>
          <h2 className="mt-1 text-base font-extrabold text-navy-900">SoA & Risk Assessment Workspace</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Build a draft Statement of Applicability readiness register and supporting information-security risk register. These are working artifacts and require organizational validation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadSoa} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 py-2 text-[11px] font-extrabold text-navy-900 disabled:opacity-50">
            <ShieldCheck className="h-4 w-4 text-blue-600" /> SoA Readiness Assistant
          </button>
          <button onClick={loadRisks} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 py-2 text-[11px] font-extrabold text-navy-900 disabled:opacity-50">
            <ClipboardList className="h-4 w-4 text-gold-700" /> Risk Assessment Assistant
          </button>
        </div>
      </div>

      {message && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900">{message}</div>}
      {busy && <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</div>}

      {panel === 'soa' && (
        <div className="mt-5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-950">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> This is a Draft SoA Readiness Register, not an official SoA until validated and approved by the organization.
          </div>
          {soa.map((item, index) => (
            <div key={item.controlId} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="text-xs font-extrabold text-navy-900">{item.controlRef} · {item.domain}</div><div className="mt-1 text-[11px] text-muted">{item.title}</div></div>
                <select
                  value={Boolean(item.applicable) ? 'applicable' : 'not_applicable'}
                  onChange={(e) => patchSoa(index, { applicable: e.target.value === 'applicable' })}
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-bold"
                >
                  {applicabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="text-[10px] font-bold text-navy-900 md:col-span-3">Justification
                  <textarea rows={2} value={item.justification || ''} onChange={(e) => patchSoa(index, { justification: e.target.value })} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" />
                </label>
                <label className="text-[10px] font-bold text-navy-900">Risk reference
                  <input value={item.riskReference || ''} onChange={(e) => patchSoa(index, { riskReference: e.target.value })} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" />
                </label>
                <label className="text-[10px] font-bold text-navy-900">Owner
                  <input value={item.owner || ''} onChange={(e) => patchSoa(index, { owner: e.target.value })} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" />
                </label>
                <div className="rounded-lg bg-grey-50 p-2 text-[10px] text-muted">
                  Implementation: {item.implementationStatus == null ? 'Not assessed' : String(item.implementationStatus) + '/5'}<br />
                  Evidence: {item.evidenceStatus || 'No Evidence'}
                </div>
              </div>
              <button onClick={() => saveSoa(item)} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save SoA Item</button>
            </div>
          ))}
        </div>
      )}

      {panel === 'risk' && (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-line bg-grey-50 p-4">
            <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-blue-600" /><h3 className="text-xs font-extrabold text-navy-900">Add Information Security Risk</h3></div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                ['assetProcess','Asset / process'],
                ['threat','Threat'],
                ['vulnerability','Vulnerability'],
                ['controls','Existing controls'],
                ['riskOwner','Risk owner'],
                ['treatment','Treatment'],
              ].map(([key, label]) => (
                <label key={key} className="text-[10px] font-bold text-navy-900">{label}
                  <textarea rows={2} value={String((riskDraft as Record<string, unknown>)[key] || '')} onChange={(e) => setRiskDraft((current) => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-line bg-white p-2 text-xs font-normal" />
                </label>
              ))}
              {[
                ['impact','Impact (1–5)'],
                ['likelihood','Likelihood (1–5)'],
                ['residualRisk','Residual risk (1–25)'],
              ].map(([key, label]) => (
                <label key={key} className="text-[10px] font-bold text-navy-900">{label}
                  <input type="number" min="1" max={key === 'residualRisk' ? 25 : 5} value={Number((riskDraft as Record<string, unknown>)[key] || 1)} onChange={(e) => setRiskDraft((current) => ({ ...current, [key]: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-line bg-white p-2 text-xs font-normal" />
                </label>
              ))}
            </div>
            <button onClick={saveRisk} disabled={busy || !riskDraft.assetProcess.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-3 py-2 text-[10px] font-extrabold text-navy-900 disabled:opacity-40"><Save className="h-3.5 w-3.5" /> Save Risk</button>
          </div>

          <div className="space-y-2">
            {risks.length === 0 ? <p className="text-xs text-muted">No risk records have been entered.</p> : risks.map((risk) => (
              <div key={risk.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="text-xs font-extrabold text-navy-900">{risk.assetProcess}</div><div className="mt-1 text-[11px] text-muted">Threat: {risk.threat || '—'} · Vulnerability: {risk.vulnerability || '—'}</div></div>
                  <button onClick={() => deleteRisk(risk.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[10px] font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-800">Inherent: {risk.inherentRisk ?? '—'}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">Residual: {risk.residualRisk ?? '—'}</span>
                  <span className="rounded-full bg-grey-50 px-2 py-1 font-bold text-muted">Owner: {risk.riskOwner || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
