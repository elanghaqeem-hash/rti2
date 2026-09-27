'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Database,
  FileQuestion,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import type { NistAssessmentConfig } from '@/lib/nist/types';

type Dashboard = {
  config: NistAssessmentConfig;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    averageScore: number | null;
    elevated: number;
  };
  assessments: Array<Record<string, any>>;
  topGaps: Array<Record<string, any>>;
  auditLogs: Array<Record<string, any>>;
};

async function jsonRequest(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Request failed.');
  }
  return data;
}

function QuestionEditor({
  question,
  onSaved,
}: {
  question: NistAssessmentConfig['questions'][number];
  onSaved: (dashboard: Dashboard) => void;
}) {
  const [draft, setDraft] = useState({
    questionTextEn: question.textEn,
    questionTextId: question.textId,
    helpText: question.helpText,
    weight: question.weight,
    estimatedSeconds: question.estimatedSeconds,
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const data = await jsonRequest('/api/admin/nist', {
        method: 'PATCH',
        body: JSON.stringify({
          entity: 'question',
          key: question.id,
          changes: draft,
        }),
      });
      onSaved(data.dashboard);
      setMessage('Saved');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
            {question.questionCode} · {question.categoryCode} · {question.functionCode}
          </div>
          <div className="mt-1 font-mono text-[9px] text-muted">{question.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-muted">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
            Active
          </label>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-[10px] font-extrabold text-navy-900 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="text-[10px] font-bold text-navy-900">
          Question (English)
          <textarea
            value={draft.questionTextEn}
            onChange={(event) => setDraft({ ...draft, questionTextEn: event.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs font-normal"
          />
        </label>
        <label className="text-[10px] font-bold text-navy-900">
          Pertanyaan (Indonesia)
          <textarea
            value={draft.questionTextId}
            onChange={(event) => setDraft({ ...draft, questionTextId: event.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs font-normal"
          />
        </label>
        <label className="text-[10px] font-bold text-navy-900">
          Help Text
          <textarea
            value={draft.helpText}
            onChange={(event) => setDraft({ ...draft, helpText: event.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs font-normal"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-navy-900">
            Weight
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={draft.weight}
              onChange={(event) => setDraft({ ...draft, weight: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs font-normal"
            />
          </label>
          <label className="text-[10px] font-bold text-navy-900">
            Estimated Seconds
            <input
              type="number"
              min="5"
              value={draft.estimatedSeconds}
              onChange={(event) => setDraft({ ...draft, estimatedSeconds: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs font-normal"
            />
          </label>
        </div>
      </div>
      {message && <div className="mt-2 text-[10px] font-bold text-muted">{message}</div>}
    </div>
  );
}

export default function NistAdminPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await jsonRequest('/api/admin/nist');
      setDashboard(data);
    } catch (error) {
      setDashboard(null);
      setMessage(error instanceof Error ? error.message : 'NIST admin dashboard is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (entity: string, key: string, changes: Record<string, unknown>) => {
    setMessage('');
    try {
      const data = await jsonRequest('/api/admin/nist', {
        method: 'PATCH',
        body: JSON.stringify({ entity, key, changes }),
      });
      setDashboard(data.dashboard);
      setMessage('Configuration saved and audit log recorded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed.');
    }
  };

  const completionRate = useMemo(() => {
    if (!dashboard?.stats.total) return 0;
    return Math.round((dashboard.stats.completed / dashboard.stats.total) * 100);
  }, [dashboard]);

  if (loading && !dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-grey-50">
        <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="min-h-screen bg-grey-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6">
          <h1 className="text-xl font-black text-navy-900">NIST Cyber Quick Check Admin</h1>
          <p className="mt-3 text-xs text-rose-800">{message}</p>
          <Link href="/admin/system" className="mt-5 inline-flex rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white">
            Open System Setup
          </Link>
        </div>
      </main>
    );
  }

  const { config, stats } = dashboard;

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Only
              </div>
              <h1 className="mt-3 text-2xl font-black text-navy-900 sm:text-3xl">
                NIST Cyber Quick Check Admin
              </h1>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-muted">
                Database-driven framework, question bank, scoring, target profile, service mapping, assessments, analytics, and audit controls for {config.frameworkVersion}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/parameters" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">
                <Settings2 className="h-4 w-4" /> Parameters
              </Link>
              <Link href="/admin/leads" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">
                <Database className="h-4 w-4" /> Leads
              </Link>
              <Link href="/admin/system" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white">
                <Gauge className="h-4 w-4" /> System
              </Link>
            </div>
          </div>
          {message && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              {message}
            </div>
          )}
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Assessments Started', stats.total, Activity],
            ['Completed', stats.completed, BookOpenCheck],
            ['Completion Rate', `${completionRate}%`, BarChart3],
            ['Average RTI Score', stats.averageScore ?? '—', Gauge],
            ['High/Critical Results', stats.elevated, ShieldCheck],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as React.ComponentType<{ className?: string }>;
            return (
              <div key={String(label)} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <MetricIcon className="h-4 w-4 text-gold-700" />
                <div className="mt-3 text-2xl font-black text-navy-900">{String(value)}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">{String(label)}</div>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Framework Manager</div>
              <h2 className="mt-1 text-lg font-black text-navy-900">Functions & Weights</h2>
            </div>
            <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[10px] font-bold text-navy-900">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.functions.map((fn) => (
              <div key={fn.code} className="rounded-2xl border border-line bg-grey-50 p-4">
                <div className="text-[10px] font-extrabold text-blue-700">{fn.code}</div>
                <div className="mt-1 text-sm font-black text-navy-900">{fn.name}</div>
                <p className="mt-2 min-h-12 text-[10px] leading-4 text-muted">{fn.description}</p>
                <label className="mt-3 block text-[10px] font-bold text-navy-900">
                  Function Weight
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    defaultValue={fn.weight}
                    onBlur={(event) =>
                      patch('function', `${config.frameworkVersion}::${fn.code}`, {
                        weight: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs font-normal"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-gold-700" />
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Category & Target Profile Manager</div>
              <h2 className="text-lg font-black text-navy-900">22 NIST CSF 2.0 Categories</h2>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[9px] font-extrabold uppercase tracking-wider text-muted">
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Function</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Weight</th>
                  <th className="px-2 py-2">Target Score</th>
                  <th className="px-2 py-2">Save</th>
                </tr>
              </thead>
              <tbody>
                {config.categories.map((category) => (
                  <CategoryRow
                    key={category.code}
                    frameworkVersion={config.frameworkVersion}
                    category={category}
                    onSave={patch}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-blue-700" />
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Question Bank</div>
              <h2 className="text-lg font-black text-navy-900">
                {config.questions.length} active Quick Check questions
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {config.questions.map((question) => (
              <QuestionEditor
                key={question.id}
                question={question}
                onSaved={setDashboard}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Answer Scale</div>
            <h2 className="mt-1 text-lg font-black text-navy-900">Reported Control Maturity</h2>
            <div className="mt-4 space-y-3">
              {config.answerOptions.map((option) => (
                <AnswerOptionRow key={option.value} option={option} onSave={patch} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Scoring Engine</div>
            <h2 className="mt-1 text-lg font-black text-navy-900">Readiness Thresholds</h2>
            <div className="mt-4 space-y-3">
              {config.scoringThresholds.map((threshold) => (
                <ThresholdRow key={threshold.key} threshold={threshold} onSave={patch} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Indicative CSF Tier Rules</div>
          <h2 className="mt-1 text-lg font-black text-navy-900">Rule-based Tier Indicator</h2>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Tier is not calculated by a simple linear score conversion. These rules require minimum overall readiness, Govern posture, and evidence confidence.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {config.tierRules.map((tier) => (
              <TierRow key={tier.tier} tier={tier} onSave={patch} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-700" />
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">RTI Service Mapping</div>
              <h2 className="text-lg font-black text-navy-900">Transparent Recommendation Rules</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {config.serviceMappings.map((mapping) => (
              <ServiceMappingRow key={mapping.id} mapping={mapping} onSave={patch} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-navy-900">Most Common / Largest Gaps</h2>
            <div className="mt-4 space-y-2">
              {dashboard.topGaps.length === 0 && (
                <p className="text-[11px] text-muted">No completed production assessments yet.</p>
              )}
              {dashboard.topGaps.map((gap) => (
                <div key={String(gap.category_code)} className="rounded-xl border border-line bg-grey-50 p-3">
                  <div className="text-[10px] font-extrabold text-blue-700">{String(gap.category_code)}</div>
                  <div className="mt-1 text-[11px] font-bold text-navy-900">{String(gap.category_name)}</div>
                  <div className="mt-1 text-[9px] text-muted">
                    Avg gap {String(gap.average_gap)} · {String(gap.assessments)} assessment(s)
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-navy-900">Recent Assessments</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line text-[9px] font-extrabold uppercase tracking-wider text-muted">
                    <th className="px-2 py-2">Organization</th>
                    <th className="px-2 py-2">Industry</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Score</th>
                    <th className="px-2 py-2">Risk</th>
                    <th className="px-2 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.assessments.map((item) => (
                    <tr key={String(item.id)} className="border-b border-line text-[10px] text-navy-900">
                      <td className="px-2 py-2 font-bold">{String(item.company_name)}</td>
                      <td className="px-2 py-2">{String(item.industry)}</td>
                      <td className="px-2 py-2">{String(item.status)}</td>
                      <td className="px-2 py-2">{item.overall_score == null ? '—' : String(item.overall_score)}</td>
                      <td className="px-2 py-2">{item.risk_rating == null ? '—' : String(item.risk_rating)}</td>
                      <td className="px-2 py-2">{String(item.completed_at || item.started_at).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-base font-black text-navy-900">Admin Modules & Operational Controls</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Industry Profiles & Feature Flags', '/admin/parameters', 'Central parameter registry'],
              ['AI Provider Priority', '/admin/parameters', 'Primary/fallback order; keys remain server secrets'],
              ['Lead Management', '/admin/leads', 'Consultation and RFQ conversion'],
              ['Database & Migrations', '/admin/system', 'Protected schema initialization'],
            ].map(([title, href, desc]) => (
              <Link key={title} href={href} className="rounded-2xl border border-line bg-grey-50 p-4 hover:border-gold-500">
                <div className="text-xs font-extrabold text-navy-900">{title}</div>
                <div className="mt-2 text-[10px] leading-4 text-muted">{desc}</div>
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-[10px] leading-5 text-blue-900">
            API keys are intentionally not returned to the browser or stored in the public parameter registry. Configure provider API keys through the protected production secret manager; admins can control provider priority/fallback order from Parameter Manager.
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-base font-black text-navy-900">Audit Logs</h2>
          <div className="mt-4 max-h-[420px] overflow-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-[9px] font-extrabold uppercase tracking-wider text-muted">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Resource</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.auditLogs.map((log) => (
                  <tr key={String(log.id)} className="border-b border-line text-[10px] text-navy-900">
                    <td className="px-2 py-2">{String(log.created_at)}</td>
                    <td className="px-2 py-2">{String(log.actor)}</td>
                    <td className="px-2 py-2 font-bold">{String(log.action)}</td>
                    <td className="px-2 py-2">{String(log.resource_type)} {log.resource_id ? `· ${String(log.resource_id)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function CategoryRow({
  frameworkVersion,
  category,
  onSave,
}: {
  frameworkVersion: string;
  category: NistAssessmentConfig['categories'][number];
  onSave: (entity: string, key: string, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [weight, setWeight] = useState(category.weight);
  const [targetScore, setTargetScore] = useState(category.targetScore);

  return (
    <tr className="border-b border-line text-[10px] text-navy-900">
      <td className="px-2 py-2 font-extrabold text-blue-700">{category.code}</td>
      <td className="px-2 py-2">{category.functionCode}</td>
      <td className="px-2 py-2 font-bold">{category.name}</td>
      <td className="px-2 py-2">
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={weight}
          onChange={(event) => setWeight(Number(event.target.value))}
          className="w-20 rounded-lg border border-line px-2 py-1.5"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          max="100"
          value={targetScore}
          onChange={(event) => setTargetScore(Number(event.target.value))}
          className="w-20 rounded-lg border border-line px-2 py-1.5"
        />
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={() =>
            onSave('category', `${frameworkVersion}::${category.code}`, {
              weight,
              targetScore,
            })
          }
          className="rounded-lg bg-gold-500 p-2 text-navy-900"
          aria-label={`Save ${category.code}`}
        >
          <Save className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function AnswerOptionRow({
  option,
  onSave,
}: {
  option: NistAssessmentConfig['answerOptions'][number];
  onSave: (entity: string, key: string, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [label, setLabel] = useState(option.label);
  const [description, setDescription] = useState(option.description);
  const [score, setScore] = useState(option.score);

  return (
    <div className="rounded-xl border border-line bg-grey-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[80px_1fr_90px_40px] sm:items-center">
        <div className="font-mono text-[10px] font-bold text-blue-700">{option.value}</div>
        <div className="space-y-2">
          <input value={label} onChange={(event) => setLabel(event.target.value)} className="w-full rounded-lg border border-line px-2 py-1.5 text-[10px] font-bold" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-line px-2 py-1.5 text-[10px]" />
        </div>
        <input type="number" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} className="w-full rounded-lg border border-line px-2 py-1.5 text-[10px]" />
        <button type="button" onClick={() => onSave('answer-option', option.value, { label, description, score })} className="rounded-lg bg-gold-500 p-2 text-navy-900" aria-label={`Save ${option.label}`}>
          <Save className="h-3.5 w-3.5" />
        </button>
      </div>
      {option.verificationRequired && <div className="mt-2 text-[9px] font-bold text-amber-700">Verification Required option</div>}
    </div>
  );
}

function ThresholdRow({
  threshold,
  onSave,
}: {
  threshold: NistAssessmentConfig['scoringThresholds'][number];
  onSave: (entity: string, key: string, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [label, setLabel] = useState(threshold.label);
  const [minScore, setMinScore] = useState(threshold.minScore);
  const [maxScore, setMaxScore] = useState(threshold.maxScore);

  return (
    <div className="grid gap-2 rounded-xl border border-line bg-grey-50 p-3 sm:grid-cols-[1fr_80px_80px_40px] sm:items-center">
      <input value={label} onChange={(event) => setLabel(event.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-[10px] font-bold" />
      <input type="number" min="0" max="100" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} className="rounded-lg border border-line px-2 py-1.5 text-[10px]" />
      <input type="number" min="0" max="100" value={maxScore} onChange={(event) => setMaxScore(Number(event.target.value))} className="rounded-lg border border-line px-2 py-1.5 text-[10px]" />
      <button type="button" onClick={() => onSave('threshold', threshold.key, { label, minScore, maxScore })} className="rounded-lg bg-gold-500 p-2 text-navy-900" aria-label={`Save ${threshold.label}`}>
        <Save className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TierRow({
  tier,
  onSave,
}: {
  tier: NistAssessmentConfig['tierRules'][number];
  onSave: (entity: string, key: string, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [label, setLabel] = useState(tier.label);
  const [minOverall, setMinOverall] = useState(tier.minOverall);
  const [minGovern, setMinGovern] = useState(tier.minGovern);
  const [minConfidence, setMinConfidence] = useState(tier.minConfidence);

  return (
    <div className="rounded-2xl border border-line bg-grey-50 p-4">
      <div className="text-[10px] font-extrabold text-blue-700">Tier {tier.tier}</div>
      <input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-2 w-full rounded-lg border border-line px-2 py-1.5 text-[10px] font-bold" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-[8px] font-bold text-muted">Overall<input type="number" min="0" max="100" value={minOverall} onChange={(event) => setMinOverall(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[10px] text-navy-900" /></label>
        <label className="text-[8px] font-bold text-muted">Govern<input type="number" min="0" max="100" value={minGovern} onChange={(event) => setMinGovern(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[10px] text-navy-900" /></label>
        <label className="text-[8px] font-bold text-muted">Confidence<input type="number" min="0" max="100" value={minConfidence} onChange={(event) => setMinConfidence(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[10px] text-navy-900" /></label>
      </div>
      <button type="button" onClick={() => onSave('tier', String(tier.tier), { label, minOverall, minGovern, minConfidence })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-[10px] font-extrabold text-navy-900">
        <Save className="h-3.5 w-3.5" /> Save Tier
      </button>
    </div>
  );
}

function ServiceMappingRow({
  mapping,
  onSave,
}: {
  mapping: NistAssessmentConfig['serviceMappings'][number];
  onSave: (entity: string, key: string, changes: Record<string, unknown>) => Promise<void>;
}) {
  const [serviceName, setServiceName] = useState(mapping.serviceName);
  const [serviceUrl, setServiceUrl] = useState(mapping.serviceUrl);
  const [reasonTemplate, setReasonTemplate] = useState(mapping.reasonTemplate);

  return (
    <div className="rounded-2xl border border-line bg-grey-50 p-4">
      <div className="text-[10px] font-extrabold text-blue-700">{mapping.categoryCode} · {mapping.serviceCode}</div>
      <input value={serviceName} onChange={(event) => setServiceName(event.target.value)} className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-[10px] font-bold" />
      <input value={serviceUrl} onChange={(event) => setServiceUrl(event.target.value)} className="mt-2 w-full rounded-lg border border-line px-3 py-2 font-mono text-[9px]" />
      <textarea value={reasonTemplate} onChange={(event) => setReasonTemplate(event.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-[10px]" />
      <button type="button" onClick={() => onSave('service', mapping.id, { serviceName, serviceUrl, reasonTemplate })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-[10px] font-extrabold text-navy-900">
        <Save className="h-3.5 w-3.5" /> Save Mapping
      </button>
    </div>
  );
}
