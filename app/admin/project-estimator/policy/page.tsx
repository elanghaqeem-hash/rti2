'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function EstimatorPolicyPage() {
  const [data, setData] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [segmentCode, setSegmentCode] = useState('STD');
  const [form, setForm] = useState({
    version: '2026.2',
    floorMargin: 0.20,
    premiumFactor: 1.25,
    rushFactor: 1.25,
    marketAdjustment: 1,
    minMarginAlert: 0.25,
    notes: 'KALIBRASI RTI — review impact simulation before activation.',
  });
  const [confirmation, setConfirmation] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/project-estimator/policy', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Policy data unavailable.');
      setData(body);
      const active = body.policies?.find((item: any) => item.status === 'active') || body.policies?.[0];
      if (active) {
        setForm((current) => ({
          ...current,
          floorMargin: active.floorMargin,
          premiumFactor: active.premiumFactor,
          rushFactor: active.rushFactor,
          marketAdjustment: active.marketAdjustment,
          minMarginAlert: active.minMarginAlert,
        }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Policy data unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const simulate = async () => {
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/project-estimator/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, segmentCode }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Simulation failed.');
      setSimulation(body.simulation);
      setMessage(`Simulation complete for ${body.simulation.sampleSize} recent costed estimates.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Simulation failed.');
    } finally {
      setWorking(false);
    }
  };

  const createDraft = async () => {
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/project-estimator/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_draft', policy: form }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Draft could not be created.');
      setData(body);
      setMessage('Policy draft created. It is not active until explicit RTI calibration approval.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Draft could not be created.');
    } finally {
      setWorking(false);
    }
  };

  const runRetention = async () => {
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/project-estimator/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: 90 }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Retention cleanup failed.');
      setMessage(`Retention completed: ${body.result.sessionsAnonymized} session(s) anonymized, ${body.result.storageDeleted} private object(s) removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Retention cleanup failed.');
    } finally {
      setWorking(false);
    }
  };

  const activate = async (policyId: string) => {
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/project-estimator/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', policyId, confirmation }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Policy activation failed.');
      setData(body);
      setConfirmation('');
      setMessage('Policy activated and previous active version retired.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Policy activation failed.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <main className="min-h-[70vh] bg-grey-50 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold-600" /></main>;
  }

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <Link href="/admin/project-estimator/configuration" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-navy-900"><ArrowLeft className="h-3.5 w-3.5" /> Estimator Configuration</Link>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gold-700">Commercial Policy Governance</div>
              <h1 className="mt-1 text-2xl font-extrabold text-navy-900">Pricing Policy Simulation & Activation</h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
                Simulasikan perubahan margin, market adjustment, premium factor dan segment multiplier terhadap hingga 20 estimate terakhir yang sudah memiliki BoQ internal. Simulasi tidak mengubah quotation atau policy aktif.
              </p>
            </div>
            <button onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-extrabold text-navy-900"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
        </header>

        {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">{message}</div>}

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900"><FlaskConical className="h-4 w-4 text-gold-600" /> Proposed Policy</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <TextInput label="Version" value={form.version} onChange={(v) => setForm({ ...form, version: v })} />
                <Select label="Simulation Segment" value={segmentCode} onChange={setSegmentCode} options={(data?.segments || []).map((s: any) => [s.code, `${s.code} · ${s.name}`])} />
                <NumberInput label="Floor Margin" value={form.floorMargin} step="0.01" onChange={(v) => setForm({ ...form, floorMargin: v })} />
                <NumberInput label="Premium Factor" value={form.premiumFactor} step="0.01" onChange={(v) => setForm({ ...form, premiumFactor: v })} />
                <NumberInput label="Rush Factor" value={form.rushFactor} step="0.01" onChange={(v) => setForm({ ...form, rushFactor: v })} />
                <NumberInput label="Market Adjustment" value={form.marketAdjustment} step="0.01" onChange={(v) => setForm({ ...form, marketAdjustment: v })} />
                <NumberInput label="Minimum Margin Alert" value={form.minMarginAlert} step="0.01" onChange={(v) => setForm({ ...form, minMarginAlert: v })} />
              </div>
              <label className="mt-3 block text-[10px] font-bold text-navy-900">Notes
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-xs" />
              </label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button disabled={working} onClick={() => void simulate()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><FlaskConical className="h-4 w-4" /> Simulate Impact</button>
                <button disabled={working} onClick={() => void createDraft()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-extrabold text-navy-900 disabled:opacity-50"><Save className="h-4 w-4" /> Save as Draft</button>
              </div>
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Seed rates and thresholds remain <strong>KALIBRASI RTI</strong> until approved by management. Saving a draft does not change live pricing.
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-navy-900">Policy Versions</h2>
              <div className="mt-3 space-y-3">
                {(data?.policies || []).map((policy: any) => (
                  <div key={policy.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] font-extrabold text-muted">{policy.version}</div>
                        <div className="mt-1 text-xs font-extrabold text-navy-900">Floor {Math.round(policy.floorMargin * 100)}% · Premium ×{policy.premiumFactor} · Market ×{policy.marketAdjustment}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${policy.status === 'active' ? 'bg-emerald-50 text-emerald-700' : policy.status === 'draft' ? 'bg-amber-50 text-amber-800' : 'bg-grey-50 text-muted'}`}>{policy.status}</span>
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted">{policy.notes || '-'}</p>
                    {policy.status === 'draft' && (
                      <div className="mt-3 rounded-xl bg-grey-50 p-3">
                        <label className="text-[9px] font-bold text-navy-900">Type exact approval phrase: <span className="font-mono">APPROVE RTI CALIBRATION</span>
                          <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[10px]" />
                        </label>
                        <button disabled={working || confirmation !== 'APPROVE RTI CALIBRATION'} onClick={() => void activate(policy.id)} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> Activate Approved Policy</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900"><ShieldCheck className="h-4 w-4 text-gold-600" /> Impact Simulation</div>
              {!simulation ? (
                <p className="mt-3 text-xs text-muted">Run a simulation to compare current and proposed policy against recent costed estimates.</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Metric label="Samples" value={String(simulation.sampleSize)} />
                    <Metric label="Current Standard Total" value={money(simulation.aggregate.currentStandardTotal)} />
                    <Metric label="Proposed Standard Total" value={money(simulation.aggregate.proposedStandardTotal)} />
                  </div>
                  <div className={`mt-3 rounded-xl p-3 text-xs font-extrabold ${simulation.aggregate.standardDelta >= 0 ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-900'}`}>
                    Aggregate Standard delta: {money(simulation.aggregate.standardDelta)} ({simulation.aggregate.standardDeltaPct > 0 ? '+' : ''}{simulation.aggregate.standardDeltaPct}%)
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                    <table className="w-full min-w-[760px] text-left text-[10px]">
                      <thead className="bg-grey-50 uppercase tracking-wider text-muted">
                        <tr><th className="px-3 py-2">Project</th><th className="px-3 py-2">Internal Cost</th><th className="px-3 py-2">Current Standard</th><th className="px-3 py-2">Proposed Standard</th><th className="px-3 py-2">Delta</th></tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {simulation.items.map((item: any) => (
                          <tr key={item.estimateId}>
                            <td className="px-3 py-3"><strong className="text-navy-900">{item.projectName}</strong><div className="mt-0.5 text-muted">{item.company} · {item.serviceName}</div></td>
                            <td className="px-3 py-3">{money(item.internalCost)}</td>
                            <td className="px-3 py-3">{money(item.current.standard)}</td>
                            <td className="px-3 py-3 font-bold text-navy-900">{money(item.proposed.standard)}</td>
                            <td className="px-3 py-3">{money(item.standardDelta)} ({item.standardDeltaPct > 0 ? '+' : ''}{item.standardDeltaPct}%)</td>
                          </tr>
                        ))}
                        {!simulation.items.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">No costed estimates available yet. Complete internal BoQ in Studio to build a simulation sample.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold text-navy-900">Privacy Retention</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">Anonymize abandoned public drafts older than 90 days and remove their private scoping documents when storage is reachable.</p>
                </div>
                <button disabled={working} onClick={() => void runRetention()} className="shrink-0 rounded-xl border border-line px-3 py-2 text-[10px] font-extrabold text-navy-900 disabled:opacity-50">Run 90-Day Cleanup</button>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-navy-900">Client Segment Multipliers</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(data?.segments || []).map((segment: any) => (
                  <div key={segment.code} className="rounded-xl bg-grey-50 p-3">
                    <div className="flex items-center justify-between gap-2"><strong className="text-[10px] text-navy-900">{segment.code}</strong><span className="text-xs font-extrabold text-gold-700">×{segment.multiplier}</span></div>
                    <div className="mt-1 text-[9px] leading-relaxed text-muted">{segment.name}</div>
                    {segment.needsCalibration && <div className="mt-1 text-[8px] font-extrabold uppercase text-amber-700">Calibration required</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="text-[10px] font-bold text-navy-900">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs" /></label>;
}
function NumberInput({ label, value, onChange, step='1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return <label className="text-[10px] font-bold text-navy-900">{label}<input type="number" min="0" step={step} value={value} onChange={(e) => onChange(Number(e.target.value || 0))} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs" /></label>;
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string,string]> }) {
  return <label className="text-[10px] font-bold text-navy-900">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs">{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-grey-50 p-3"><div className="text-[8px] font-extrabold uppercase tracking-wider text-muted">{label}</div><div className="mt-1 text-xs font-extrabold text-navy-900">{value}</div></div>;
}
