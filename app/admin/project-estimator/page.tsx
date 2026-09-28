'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calculator,
  Database,
  FileCheck2,
  RefreshCw,
  Save,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';

type Dashboard = {
  metrics: {
    sessions: number;
    completedEstimates: number;
    rfqs: number;
    submittedRfqs: number;
    opportunities: number;
    pipelineMin: number;
    pipelineMax: number;
  };
  analytics: {
    funnel: {
      started: number;
      estimated: number;
      rfqGenerated: number;
      submitted: number;
      estimateConversionPct: number;
      rfqConversionPct: number;
      submitConversionPct: number;
    };
    topServices: Array<{ name: string; count: number }>;
    topIndustries: Array<{ name: string; count: number }>;
    averageIndicativeMin: number;
    averageIndicativeMax: number;
  };
  rfqs: Array<{
    id: string;
    sessionId: string;
    rfqNumber: string;
    projectName: string;
    company: string;
    service: string;
    complexityLevel: string;
    projectSize: string;
    priceMin: number;
    priceMax: number;
    readinessScore: number;
    commercial: {
      resourceCost: number;
      thirdPartyCost: number;
      licenseCost: number;
      travelCost: number;
      contingencyPct: number;
      marginPct: number;
      discountAmount: number;
      taxPct: number;
      totalBeforeTax: number;
      taxAmount: number;
      totalQuotation: number;
    };
    status: string;
    stage: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  services: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    slug: string;
    name: string;
    description: string;
    baseEffortDays: number;
    basePriceMin: number;
    basePriceMax: number;
    durationMinWeeks: number;
    durationMaxWeeks: number;
    active: boolean;
  }>;
  pricing: Array<{
    key: string;
    label: string;
    value: number;
    minValue: number | null;
    maxValue: number | null;
  }>;
  questions: Array<{
    id: string;
    serviceId: string | null;
    serviceName: string;
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    dimension: string | null;
    weight: number;
    quickMode: boolean;
    detailedMode: boolean;
    active: boolean;
  }>;
};

const stages = [
  'New RFQ',
  'Initial Review',
  'Qualification',
  'Clarification',
  'Proposal Preparation',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
];

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProjectEstimatorAdminPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<'pipeline' | 'commercial' | 'services' | 'pricing' | 'questions'>('pipeline');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/project-estimator', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Gagal memuat Project Estimator.');
      setDashboard(data.dashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat Project Estimator.');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (payload: Record<string, unknown>, success: string) => {
    setMessage('');
    const response = await fetch('/api/v1/admin/project-estimator', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error || 'Perubahan tidak dapat disimpan.');
      return false;
    }
    setDashboard(data.dashboard);
    setMessage(success);
    return true;
  };

  const filteredRfqs = useMemo(() => {
    const list = dashboard?.rfqs || [];
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((item) =>
      [item.rfqNumber, item.projectName, item.company, item.service, item.stage || '']
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [dashboard, search]);

  const updateServiceLocal = (id: string, patchValue: Partial<Dashboard['services'][number]>) => {
    setDashboard((current) =>
      current
        ? { ...current, services: current.services.map((item) => item.id === id ? { ...item, ...patchValue } : item) }
        : current,
    );
  };

  const updateQuestionLocal = (id: string, patchValue: Partial<Dashboard['questions'][number]>) => {
    setDashboard((current) =>
      current
        ? { ...current, questions: current.questions.map((item) => item.id === id ? { ...item, ...patchValue } : item) }
        : current,
    );
  };

  const updateCommercialLocal = (
    rfqId: string,
    patchValue: Partial<Dashboard['rfqs'][number]['commercial']>,
  ) => {
    setDashboard((current) =>
      current
        ? {
            ...current,
            rfqs: current.rfqs.map((item) =>
              item.id === rfqId
                ? { ...item, commercial: { ...item.commercial, ...patchValue } }
                : item,
            ),
          }
        : current,
    );
  };

  const updatePricingLocal = (key: string, value: number) => {
    setDashboard((current) =>
      current
        ? { ...current, pricing: current.pricing.map((item) => item.key === key ? { ...item, value } : item) }
        : current,
    );
  };

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-300">
                <Calculator className="h-3.5 w-3.5" /> Admin · Project Estimator
              </div>
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">RFQ, Pipeline & Estimation Configuration</h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
                Kelola pipeline RFQ, baseline effort, indicative pricing, delivery window, serta question/scoring configuration tanpa mengubah source code.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/project-estimator/configuration" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50">Estimator Configuration</Link>
              <Link href="/admin/system" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50">System Setup</Link>
              <Link href="/admin/parameters" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50">Global Parameters</Link>
              <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
        </header>

        {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">{message}</div>}

        {dashboard && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Metric label="Sessions" value={String(dashboard.metrics.sessions)} />
              <Metric label="Estimates" value={String(dashboard.metrics.completedEstimates)} />
              <Metric label="RFQs" value={String(dashboard.metrics.rfqs)} />
              <Metric label="Submitted" value={String(dashboard.metrics.submittedRfqs)} />
              <Metric label="Opportunities" value={String(dashboard.metrics.opportunities)} />
              <Metric label="Pipeline Range" value={`${money(dashboard.metrics.pipelineMin)} – ${money(dashboard.metrics.pipelineMax)}`} compact />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gold-600" />
                  <h2 className="text-sm font-extrabold text-navy-900">Estimator Conversion Funnel</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <FunnelMetric label="Started" value={dashboard.analytics.funnel.started} sub="100% baseline" />
                  <FunnelMetric label="Estimated" value={dashboard.analytics.funnel.estimated} sub={`${dashboard.analytics.funnel.estimateConversionPct}% of starts`} />
                  <FunnelMetric label="RFQ Generated" value={dashboard.analytics.funnel.rfqGenerated} sub={`${dashboard.analytics.funnel.rfqConversionPct}% of estimates`} />
                  <FunnelMetric label="Submitted" value={dashboard.analytics.funnel.submitted} sub={`${dashboard.analytics.funnel.submitConversionPct}% of RFQs`} />
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Average Indicative Project Value</div>
                <div className="mt-2 text-sm font-extrabold leading-relaxed text-navy-900">
                  {dashboard.analytics.averageIndicativeMax > 0
                    ? `${money(dashboard.analytics.averageIndicativeMin)} – ${money(dashboard.analytics.averageIndicativeMax)}`
                    : 'Not calibrated yet'}
                </div>
                <p className="mt-2 text-[11px] text-muted">Only estimates with configured commercial baselines contribute to this metric.</p>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <RankPanel title="Top Requested Services" items={dashboard.analytics.topServices} />
              <RankPanel title="Top Industries" items={dashboard.analytics.topIndustries} />
            </section>

            <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-sm">
              {[
                ['pipeline', 'RFQ & Pipeline', FileCheck2],
                ['commercial', 'Commercial Review', SlidersHorizontal],
                ['services', 'Services & Baselines', Database],
                ['pricing', 'Pricing Parameters', SlidersHorizontal],
                ['questions', 'Question Engine', Settings2],
              ].map(([value, label, Icon]) => (
                <button
                  key={String(value)}
                  onClick={() => setTab(value as typeof tab)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${tab === value ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-grey-50'}`}
                >
                  <Icon className="h-4 w-4" /> {String(label)}
                </button>
              ))}
            </nav>

            {tab === 'pipeline' && (
              <section className="rounded-2xl border border-line bg-white shadow-sm">
                <div className="border-b border-line p-4">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search RFQ, project, company, service, stage..."
                    className="w-full max-w-lg rounded-xl border border-line px-3 py-2.5 text-xs"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-xs">
                    <thead className="bg-grey-50 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3">RFQ</th>
                        <th className="px-4 py-3">Project / Company</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Estimate</th>
                        <th className="px-4 py-3">Readiness</th>
                        <th className="px-4 py-3">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredRfqs.map((item) => (
                        <tr key={item.id} className="hover:bg-grey-50/60">
                          <td className="px-4 py-4">
                            <div className="font-mono font-bold text-navy-900">{item.rfqNumber}</div>
                            <div className="mt-1 text-[10px] text-muted">{item.status}</div>
                            <Link href={`/studio/${item.sessionId}`} className="mt-2 inline-flex rounded-lg border border-line px-2.5 py-1.5 text-[9px] font-extrabold text-navy-900 hover:border-gold-500">
                              Open Studio
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-navy-900">{item.projectName}</div>
                            <div className="text-muted">{item.company}</div>
                          </td>
                          <td className="px-4 py-4 text-navy-900">{item.service}<div className="mt-1 text-[10px] text-muted">{item.complexityLevel} · {item.projectSize}</div></td>
                          <td className="px-4 py-4 font-semibold text-navy-900">{money(item.priceMin)}<br />– {money(item.priceMax)}</td>
                          <td className="px-4 py-4"><span className="rounded-full bg-gold-500/15 px-2.5 py-1 font-extrabold text-gold-700">{item.readinessScore}%</span></td>
                          <td className="px-4 py-4">
                            {item.stage ? (
                              <select
                                value={item.stage}
                                onChange={(event) => patch({ action: 'opportunity_stage', rfqId: item.id, stage: event.target.value }, `Stage ${item.rfqNumber} diperbarui.`)}
                                className="rounded-lg border border-line px-2 py-2 text-xs font-bold text-navy-900"
                              >
                                {stages.map((stage) => <option key={stage}>{stage}</option>)}
                              </select>
                            ) : <span className="text-muted">Draft / not submitted</span>}
                          </td>
                        </tr>
                      ))}
                      {!filteredRfqs.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No RFQ data found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === 'commercial' && (
              <section className="space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
                  Internal-only commercial model. Resource cost, third-party cost, license, travel, margin, discount, tax and quotation totals are never returned by public estimator APIs.
                </div>
                {dashboard.rfqs.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-mono text-[10px] font-bold text-muted">{item.rfqNumber}</div>
                        <div className="mt-1 text-sm font-extrabold text-navy-900">{item.projectName}</div>
                        <div className="mt-1 text-xs text-muted">{item.company} · {item.service}</div>
                      </div>
                      <div className="text-left lg:text-right">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Calculated quotation</div>
                        <div className="mt-1 text-lg font-extrabold text-navy-900">{money(item.commercial.totalQuotation)}</div>
                        <div className="text-[10px] text-muted">Before tax {money(item.commercial.totalBeforeTax)} · Tax {money(item.commercial.taxAmount)}</div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <NumberField label="Resource cost" value={item.commercial.resourceCost} onChange={(value) => updateCommercialLocal(item.id, { resourceCost: value })} />
                      <NumberField label="Third-party cost" value={item.commercial.thirdPartyCost} onChange={(value) => updateCommercialLocal(item.id, { thirdPartyCost: value })} />
                      <NumberField label="License cost" value={item.commercial.licenseCost} onChange={(value) => updateCommercialLocal(item.id, { licenseCost: value })} />
                      <NumberField label="Travel cost" value={item.commercial.travelCost} onChange={(value) => updateCommercialLocal(item.id, { travelCost: value })} />
                      <NumberField label="Contingency %" value={item.commercial.contingencyPct} step="0.1" onChange={(value) => updateCommercialLocal(item.id, { contingencyPct: value })} />
                      <NumberField label="Margin / markup %" value={item.commercial.marginPct} step="0.1" onChange={(value) => updateCommercialLocal(item.id, { marginPct: value })} />
                      <NumberField label="Discount amount" value={item.commercial.discountAmount} onChange={(value) => updateCommercialLocal(item.id, { discountAmount: value })} />
                      <NumberField label="Tax %" value={item.commercial.taxPct} step="0.1" onChange={(value) => updateCommercialLocal(item.id, { taxPct: value })} />
                    </div>
                    <button
                      onClick={() => patch(
                        { action: 'commercial', rfqId: item.id, commercial: item.commercial },
                        `Commercial model ${item.rfqNumber} diperbarui.`,
                      )}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white"
                    >
                      <Save className="h-4 w-4" /> Recalculate & Save Commercial
                    </button>
                  </div>
                ))}
                {!dashboard.rfqs.length && (
                  <div className="rounded-2xl border border-line bg-white p-8 text-center text-xs text-muted">No RFQ records yet.</div>
                )}
              </section>
            )}

            {tab === 'services' && (
              <section className="space-y-4">
                {dashboard.services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{service.categoryName} · {service.slug}</div>
                        <input value={service.name} onChange={(e) => updateServiceLocal(service.id, { name: e.target.value })} className="mt-1 w-full max-w-xl border-0 p-0 text-lg font-extrabold text-navy-900 outline-none" />
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-navy-900">
                        <input type="checkbox" checked={service.active} onChange={(e) => updateServiceLocal(service.id, { active: e.target.checked })} /> Active
                      </label>
                    </div>
                    <textarea value={service.description} onChange={(e) => updateServiceLocal(service.id, { description: e.target.value })} className="mb-4 min-h-20 w-full rounded-xl border border-line p-3 text-xs" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <NumberField label="Base effort (days)" value={service.baseEffortDays} onChange={(value) => updateServiceLocal(service.id, { baseEffortDays: value })} />
                      <NumberField label="Base price min" value={service.basePriceMin} onChange={(value) => updateServiceLocal(service.id, { basePriceMin: value })} />
                      <NumberField label="Base price max" value={service.basePriceMax} onChange={(value) => updateServiceLocal(service.id, { basePriceMax: value })} />
                      <NumberField label="Duration min (weeks)" value={service.durationMinWeeks} onChange={(value) => updateServiceLocal(service.id, { durationMinWeeks: value })} />
                      <NumberField label="Duration max (weeks)" value={service.durationMaxWeeks} onChange={(value) => updateServiceLocal(service.id, { durationMaxWeeks: value })} />
                    </div>
                    <button onClick={() => patch({ action: 'service', service }, `Service ${service.name} berhasil diperbarui.`)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900">
                      <Save className="h-4 w-4" /> Save Service Baseline
                    </button>
                  </div>
                ))}
              </section>
            )}

            {tab === 'pricing' && (
              <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-extrabold text-navy-900">Internal Pricing Parameters</h2>
                  <p className="mt-1 text-xs text-muted">Parameter ini digunakan server-side. Nilai internal tidak dikirim ke halaman customer sebagai calculation trace.</p>
                </div>
                <div className="space-y-3">
                  {dashboard.pricing.map((item) => (
                    <div key={item.key} className="grid items-end gap-3 rounded-xl border border-line p-4 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <div className="text-xs font-extrabold text-navy-900">{item.label}</div>
                        <div className="mt-1 font-mono text-[10px] text-muted">{item.key}</div>
                      </div>
                      <div className="sm:col-span-3">
                        <NumberField label={`Value${item.minValue != null || item.maxValue != null ? ` (${item.minValue ?? '–'}–${item.maxValue ?? '–'})` : ''}`} value={item.value} step="0.01" onChange={(value) => updatePricingLocal(item.key, value)} />
                      </div>
                      <button onClick={() => patch({ action: 'pricing', key: item.key, value: item.value }, `Pricing parameter ${item.label} diperbarui.`)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-navy-900 px-3 py-2 text-xs font-extrabold text-white sm:col-span-3">
                        <Save className="h-4 w-4" /> Save
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === 'questions' && (
              <section className="space-y-3">
                {dashboard.questions.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{question.serviceName} · {question.key} · {question.fieldType}</div>
                        <input value={question.label} onChange={(e) => updateQuestionLocal(question.id, { label: e.target.value })} className="mt-2 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-bold text-navy-900" />
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] font-bold text-navy-900">
                        <Toggle label="Required" checked={question.required} onChange={(value) => updateQuestionLocal(question.id, { required: value })} />
                        <Toggle label="Quick" checked={question.quickMode} onChange={(value) => updateQuestionLocal(question.id, { quickMode: value })} />
                        <Toggle label="Detailed" checked={question.detailedMode} onChange={(value) => updateQuestionLocal(question.id, { detailedMode: value })} />
                        <Toggle label="Active" checked={question.active} onChange={(value) => updateQuestionLocal(question.id, { active: value })} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      <div className="w-40"><NumberField label={`Weight · ${question.dimension || 'non-scoring'}`} value={question.weight} step="0.1" onChange={(value) => updateQuestionLocal(question.id, { weight: value })} /></div>
                      <button onClick={() => patch({ action: 'question', question }, `Question ${question.key} diperbarui.`)} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900">
                        <Save className="h-4 w-4" /> Save Question
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {!dashboard && !loading && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-base font-extrabold text-amber-900">Estimator database is not initialized</h2>
            <p className="mt-1 text-xs text-amber-800">Apply pending migrations from Admin → System Setup. No dummy or fallback pipeline data is shown.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function FunnelMetric({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl bg-grey-50 p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-1 text-[10px] text-muted">{sub}</div>
    </div>
  );
}

function RankPanel({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-navy-900">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length ? items.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-grey-50 px-3 py-2 text-xs">
            <span className="min-w-0 truncate font-semibold text-navy-900">{index + 1}. {item.name}</span>
            <span className="shrink-0 rounded-full bg-white px-2 py-1 font-extrabold text-navy-900">{item.count}</span>
          </div>
        )) : <div className="text-xs text-muted">No operational data yet.</div>}
      </div>
    </div>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-extrabold text-navy-900 ${compact ? 'text-xs leading-relaxed' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">
      {label}
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs font-semibold text-navy-900" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}
