'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function EstimatorStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [studio, setStudio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [segmentCode, setSegmentCode] = useState('STD');
  const [priceOption, setPriceOption] = useState<'floor'|'standard'|'premium'|'custom'>('standard');
  const [discountPct, setDiscountPct] = useState(0);
  const [customPrice, setCustomPrice] = useState(0);
  const [overrideReason, setOverrideReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/project-estimator/studio/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Studio session unavailable.');
      setStudio(data.studio);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Studio session unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const patch = async (payload: Record<string, unknown>, success: string) => {
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch(`/api/v1/admin/project-estimator/studio/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Studio update failed.');
      setStudio(data.studio);
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Studio update failed.');
      return false;
    } finally {
      setWorking(false);
    }
  };

  const internalCost = useMemo(() => {
    const b = studio?.boq;
    if (!b) return 0;
    return Number(b.aResourceCost || 0) + Number(b.bCommissionReferral || 0) +
      Number(b.cDocumentMaterial || 0) + Number(b.dThirdParty || 0) +
      Number(b.eTravelAccommodation || 0);
  }, [studio?.boq]);

  const updateBoq = (key: string, value: number | string) => {
    setStudio((current: any) => current ? { ...current, boq: { ...current.boq, [key]: value } } : current);
  };

  if (loading) {
    return <main className="min-h-[70vh] bg-grey-50 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold-600" /></main>;
  }
  if (!studio) {
    return <main className="min-h-[70vh] bg-grey-50 p-8"><div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-800">{message || 'Studio session unavailable.'}</div></main>;
  }

  return (
    <main className="min-h-screen bg-grey-50 py-6">
      <div className="mx-auto max-w-[1500px] space-y-5 px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Link href="/admin/project-estimator" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted hover:text-navy-900"><ArrowLeft className="h-3.5 w-3.5" /> Project Estimator Admin</Link>
              <div className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-700">Internal Scoping Studio</div>
              <h1 className="mt-1 text-xl font-extrabold text-navy-900 sm:text-2xl">{studio.session.projectName}</h1>
              <p className="mt-1 text-xs text-muted">{studio.session.company} · {studio.session.serviceName} · {studio.session.serviceCode || 'service profile pending'}</p>
            </div>
            <button onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-extrabold text-navy-900">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </header>

        {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">{message}</div>}

        <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_1fr]">
          <div className="space-y-4">
            <Card title="Scope & Estimate">
              <KeyValue label="Company" value={studio.session.company} />
              <KeyValue label="Industry" value={studio.session.industry || '-'} />
              <KeyValue label="Service" value={studio.session.serviceName} />
              <KeyValue label="Status" value={studio.session.status} />
              {studio.estimate ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniMetric label="Effort" value={`${studio.estimate.effortDays} MD`} />
                  <MiniMetric label="Duration" value={`${studio.estimate.durationMinWeeks}–${studio.estimate.durationMaxWeeks} wk`} />
                  <MiniMetric label="Size" value={studio.estimate.projectSize} />
                  <MiniMetric label="Readiness" value={`${studio.estimate.readinessScore}%`} />
                </div>
              ) : <p className="mt-3 text-xs text-muted">No estimate run yet.</p>}
            </Card>

            <Card title="Provenance & Evidence">
              <div className="space-y-2">
                {studio.provenance?.slice(0, 12).map((item: any) => (
                  <div key={item.key} className="rounded-xl bg-grey-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-navy-900">{item.key}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-muted">{item.source} · {Math.round(item.confidence * 100)}%</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted">{item.status}</div>
                  </div>
                ))}
                {!studio.provenance?.length && <p className="text-xs text-muted">No provenance records yet.</p>}
              </div>
            </Card>

            <Card title="Documents">
              <div className="space-y-2">
                {studio.documents?.map((doc: any) => (
                  <div key={doc.id} className="rounded-xl border border-line p-3">
                    <div className="truncate text-[11px] font-extrabold text-navy-900">{doc.fileName}</div>
                    <div className="mt-1 text-[9px] text-muted">{doc.parseStatus} · {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ))}
                {!studio.documents?.length && <p className="text-xs text-muted">No scoping documents uploaded.</p>}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Risk Register">
              <div className="space-y-2">
                {studio.riskFlags?.filter((f: any) => f.status === 'open').map((flag: any) => (
                  <div key={`${flag.code}:${flag.createdAt}`} className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-navy-900">{flag.code}</span>
                      <span className="text-[9px] font-extrabold uppercase text-rose-700">{flag.severity}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted">{flag.message}</p>
                  </div>
                ))}
                {!studio.riskFlags?.some((f: any) => f.status === 'open') && <p className="text-xs text-muted">No open risk flags.</p>}
              </div>
            </Card>

            <Card title="Internal BoQ A–E">
              {studio.boq && studio.estimate ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MoneyInput label="A · SDM / Resources" value={studio.boq.aResourceCost} onChange={(v) => updateBoq('aResourceCost', v)} />
                    <MoneyInput label="B · Commission / Referral" value={studio.boq.bCommissionReferral} onChange={(v) => updateBoq('bCommissionReferral', v)} />
                    <MoneyInput label="C · Documents / Materials" value={studio.boq.cDocumentMaterial} onChange={(v) => updateBoq('cDocumentMaterial', v)} />
                    <MoneyInput label="D · Third Party / License / Cloud" value={studio.boq.dThirdParty} onChange={(v) => updateBoq('dThirdParty', v)} />
                    <MoneyInput label="E · Travel / Accommodation" value={studio.boq.eTravelAccommodation} onChange={(v) => updateBoq('eTravelAccommodation', v)} />
                  </div>
                  <label className="mt-3 block text-[10px] font-bold text-navy-900">Internal note
                    <textarea value={studio.boq.note || ''} onChange={(e) => updateBoq('note', e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-xs" />
                  </label>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-navy-900 px-4 py-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Internal Cost</span>
                    <span className="text-sm font-extrabold">{money(internalCost)}</span>
                  </div>
                  <button
                    disabled={working}
                    onClick={() => void patch({ action: 'boq', estimateId: studio.estimate.id, boq: studio.boq }, 'Internal BoQ saved.')}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" /> Save BoQ
                  </button>
                </>
              ) : <p className="text-xs text-muted">Estimate is required before BoQ.</p>}
            </Card>

            <Card title="AI Audit">
              <div className="space-y-2">
                {studio.aiAudit?.slice(0, 8).map((item: any, index: number) => (
                  <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-grey-50 p-3 text-[10px]">
                    <div><strong className="text-navy-900">{item.model}</strong><div className="mt-0.5 text-muted">{item.status} · {item.toolIterations} tool steps</div></div>
                    <div className="text-right text-muted">{item.latencyMs} ms<br />blocked {item.blockedNumbersCount}</div>
                  </div>
                ))}
                {!studio.aiAudit?.length && <p className="text-xs text-muted">No Copilot audit records.</p>}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Pricing & Quotation">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="Client Segment" value={segmentCode} onChange={setSegmentCode} options={[
                  ['STD','Standard'],['ENT','Enterprise'],['SME','SME'],['GOV','Government'],['INTL','International'],['EDU-NP','Education / Non-profit'],
                ]} />
                <SelectField label="Price Option" value={priceOption} onChange={(v) => setPriceOption(v as any)} options={[
                  ['floor','Floor'],['standard','Standard'],['premium','Premium'],['custom','Custom'],
                ]} />
                <NumberInput label="Discount %" value={discountPct} onChange={setDiscountPct} step="0.1" />
                {priceOption === 'custom' && <MoneyInput label="Custom Price" value={customPrice} onChange={setCustomPrice} />}
              </div>
              {segmentCode !== 'STD' && (
                <label className="mt-3 block text-[10px] font-bold text-navy-900">Segment override reason
                  <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-xs" />
                </label>
              )}
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">
                Rate card, margin, segment multiplier and approval thresholds remain subject to <strong>KALIBRASI RTI</strong> until management activation.
              </div>
              <button
                disabled={working || !studio.estimate || internalCost <= 0}
                onClick={() => void patch({
                  action: 'quotation',
                  estimateId: studio.estimate.id,
                  segmentCode,
                  priceOption,
                  customPrice,
                  discountPct,
                  segmentOverrideReason: overrideReason,
                }, 'Quotation created and routed for approval.')}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900 disabled:opacity-40"
              >
                <FileText className="h-4 w-4" /> Create Quotation
              </button>
            </Card>

            <Card title="Quotation Approval">
              <div className="space-y-3">
                {studio.quotations?.map((quote: any) => (
                  <div key={quote.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] font-extrabold text-muted">{quote.docNumber}</div>
                        <div className="mt-1 text-base font-extrabold text-navy-900">{money(quote.finalPrice)}</div>
                        <div className="mt-1 text-[9px] text-muted">{quote.segmentCode} · {quote.priceOption} · discount {quote.discountPct}%</div>
                      </div>
                      <span className="rounded-full bg-grey-50 px-2 py-1 text-[9px] font-extrabold uppercase text-navy-900">{quote.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                      <MiniMetric label="Floor" value={money(quote.floorPrice)} compact />
                      <MiniMetric label="Standard" value={money(quote.standardPrice)} compact />
                      <MiniMetric label="Premium" value={money(quote.premiumPrice)} compact />
                    </div>
                    <div className="mt-2 text-[9px] text-muted">Approval: {quote.approvalLevelRequired} · Valid until {new Date(quote.validUntil).toLocaleDateString('id-ID')}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quote.status === 'pending_approval' && (
                        <>
                          <button disabled={working} onClick={() => void patch({ action: 'approve_quotation', quotationId: quote.id, decision: 'approved' }, 'Quotation approved.')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-extrabold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                          <button disabled={working} onClick={() => void patch({ action: 'approve_quotation', quotationId: quote.id, decision: 'rejected' }, 'Quotation rejected.')} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-extrabold text-rose-700">Reject</button>
                        </>
                      )}
                      {quote.status === 'approved' && (
                        <button disabled={working} onClick={() => void patch({ action: 'send_quotation', quotationId: quote.id }, 'Quotation marked as sent.')} className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-2 text-[10px] font-extrabold text-white"><Send className="h-3.5 w-3.5" /> Mark Sent</button>
                      )}
                      <a href={`/api/v1/project-estimator/quotation/${quote.id}/pdf`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-[10px] font-extrabold text-navy-900"><FileText className="h-3.5 w-3.5" /> PDF</a>
                    </div>
                  </div>
                ))}
                {!studio.quotations?.length && <p className="text-xs text-muted">No quotations yet.</p>}
              </div>
            </Card>

            <Card title="Estimate vs Actual">
              {studio.estimate ? (
                <ActualEditor
                  initial={studio.actual}
                  estimatedMd={studio.estimate.effortDays}
                  onSave={(actual) => patch({ action: 'actual', estimateId: studio.estimate.id, actual }, 'Actual delivery data saved.')}
                  working={working}
                />
              ) : <p className="text-xs text-muted">Estimate required.</p>}
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-4 text-sm font-extrabold text-navy-900">{title}</h2>{children}</section>;
}
function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-line py-2 text-[11px] last:border-0"><span className="text-muted">{label}</span><strong className="text-right text-navy-900">{value}</strong></div>;
}
function MiniMetric({ label, value, compact=false }: { label: string; value: string; compact?: boolean }) {
  return <div className="rounded-xl bg-grey-50 p-2.5"><div className="text-[8px] font-extrabold uppercase tracking-wider text-muted">{label}</div><div className={`mt-1 font-extrabold text-navy-900 ${compact ? 'text-[9px]' : 'text-xs'}`}>{value}</div></div>;
}
function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-[10px] font-bold text-navy-900">{label}<input type="number" min="0" value={value || 0} onChange={(e) => onChange(Number(e.target.value || 0))} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs" /></label>;
}
function NumberInput({ label, value, onChange, step='1' }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="block text-[10px] font-bold text-navy-900">{label}<input type="number" min="0" step={step} value={value || 0} onChange={(e) => onChange(Number(e.target.value || 0))} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs" /></label>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string,string]> }) {
  return <label className="block text-[10px] font-bold text-navy-900">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs">{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}

function ActualEditor({ initial, estimatedMd, onSave, working }: { initial: any; estimatedMd: number; onSave: (actual: any) => void; working: boolean }) {
  const [actualMd, setActualMd] = useState<number>(Number(initial?.actualMd || 0));
  const [actualCost, setActualCost] = useState<number>(Number(initial?.actualCost || 0));
  const [completedAt, setCompletedAt] = useState<string>(initial?.completedAt ? String(initial.completedAt).slice(0,10) : '');
  const [note, setNote] = useState<string>(initial?.note || '');
  const variance = estimatedMd > 0 && actualMd > 0 ? Math.round(((actualMd - estimatedMd) / estimatedMd) * 1000) / 10 : null;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberInput label="Actual MD" value={actualMd} onChange={setActualMd} step="0.5" />
        <MoneyInput label="Actual Cost" value={actualCost} onChange={setActualCost} />
        <label className="text-[10px] font-bold text-navy-900">Completed at<input type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs" /></label>
      </div>
      {variance != null && <div className={`mt-3 rounded-xl p-3 text-[10px] font-bold ${Math.abs(variance) <= 10 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>Estimate variance: {variance > 0 ? '+' : ''}{variance}% · target ≤ 10%</div>}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Delivery note" className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-xs" />
      <button disabled={working} onClick={() => void onSave({ actualMd, actualCost, completedAt: completedAt || null, note })} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-extrabold text-navy-900 disabled:opacity-50"><Save className="h-4 w-4" /> Save Actual</button>
    </div>
  );
}
