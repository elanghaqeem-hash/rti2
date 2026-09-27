'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileQuestion,
  History,
  Network,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

type AdminConfig = {
  questions: any[];
  options: any[];
  services: any[];
  mappings: any[];
  weights: any[];
  aiPrompts: any[];
  auditLogs: any[];
};

type Analytics = {
  assessments: number;
  completed: number;
  completionRate: number;
  industries: Array<{ key: string; count: number }>;
  recommendedServices: Array<{
    key: string;
    name: string;
    count: number;
    avg_score: number;
  }>;
  events: Array<{ key: string; count: number }>;
};

const TABS = [
  ['overview', 'Overview'],
  ['questions', 'Question Builder'],
  ['services', 'Service Library'],
  ['mappings', 'Matching Rules'],
  ['scoring', 'Scoring'],
  ['ai', 'AI Prompt'],
  ['audit', 'Audit Log'],
] as const;

const QUESTION_TYPES = ['single', 'multi', 'number', 'text', 'slider', 'matrix'];
const DIMENSION_TYPES = [
  'industry',
  'scale',
  'pressure',
  'capability',
  'objective',
  'timeline',
  'delivery',
  'regulated',
];
const COMPLEXITIES = ['Low', 'Moderate', 'High', 'Enterprise'];

function Field({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
}) {
  return (
    <label className={`block text-[10px] font-bold uppercase tracking-wider text-muted ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-10 w-full rounded-lg border border-line px-3 text-xs font-medium normal-case tracking-normal text-navy-900 outline-none focus:ring-2 focus:ring-gold-500"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-navy-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export default function AdminSolutionFinderPage() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('overview');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');

  const [newQuestion, setNewQuestion] = useState({
    question_key: '',
    step: 1,
    category: 'organization',
    question_type: 'single',
    label_id: '',
    label_en: '',
    description_id: '',
    description_en: '',
    required: 0,
    condition_json: '',
    weight: 1,
    sort_order: 100,
    is_active: 1,
  });

  const [newOption, setNewOption] = useState({
    value: '',
    label_id: '',
    label_en: '',
    description_id: '',
    description_en: '',
    metadata_json: '{}',
    score: 0,
    sort_order: 100,
    is_active: 1,
  });

  const [newService, setNewService] = useState({
    service_key: '',
    category: 'Technology',
    name_id: '',
    name_en: '',
    description_id: '',
    description_en: '',
    url: '/services',
    delivery_model: 'Advisory',
    typical_duration: '4–8 weeks',
    complexity: 'Moderate',
    priority_weight: 10,
    diagnostic_tool_slug: '',
    outcomes_json: '[]',
    is_active: 1,
  });

  const [newMapping, setNewMapping] = useState({
    service_key: '',
    dimension_type: 'pressure',
    dimension_value: '',
    weight: 10,
    rationale_id: '',
    rationale_en: '',
    is_active: 1,
  });

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const [configResponse, analyticsResponse] = await Promise.all([
        fetch('/api/admin/enterprise-finder/config', { cache: 'no-store' }),
        fetch('/api/admin/enterprise-finder/analytics', { cache: 'no-store' }),
      ]);
      const configData = await configResponse.json().catch(() => null);
      const analyticsData = await analyticsResponse.json().catch(() => null);

      if (!configResponse.ok || !configData?.config) {
        throw new Error(
          configData?.error ||
            'Konfigurasi Enterprise Solution Finder belum tersedia.',
        );
      }

      setConfig(configData.config as AdminConfig);
      setAnalytics(
        analyticsResponse.ok && analyticsData?.analytics
          ? (analyticsData.analytics as Analytics)
          : null,
      );

      if (!selectedQuestion && configData.config.questions?.[0]?.question_key) {
        setSelectedQuestion(configData.config.questions[0].question_key);
      }
    } catch (error) {
      setConfig(null);
      setAnalytics(null);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Enterprise Solution Finder admin data gagal dimuat.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (
    collection: keyof AdminConfig,
    index: number,
    patch: Record<string, unknown>,
  ) => {
    setConfig((current) => {
      if (!current) return current;
      const rows = [...(current[collection] as any[])];
      rows[index] = { ...rows[index], ...patch };
      return { ...current, [collection]: rows };
    });
  };

  const saveEntity = async (
    entityType: string,
    payload: Record<string, unknown>,
    key: string,
  ) => {
    setSavingKey(key);
    setMessage('');
    try {
      const response = await fetch('/api/admin/enterprise-finder/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, payload }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Konfigurasi gagal disimpan.');
      }
      setMessage(`Konfigurasi ${key} berhasil disimpan dan dicatat pada audit log.`);
      await load();
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Konfigurasi gagal disimpan.',
      );
      return false;
    } finally {
      setSavingKey('');
    }
  };

  const questionOptions = useMemo(
    () =>
      (config?.options || []).filter(
        (item) => item.question_key === selectedQuestion,
      ),
    [config, selectedQuestion],
  );

  if (loading && !config) {
    return (
      <main className="min-h-screen bg-grey-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-gold-600" />
          <p className="mt-3 text-sm font-bold text-navy-900">
            Memuat Enterprise Solution Finder Admin...
          </p>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="min-h-screen bg-grey-50 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
            <h1 className="mt-3 text-2xl font-extrabold text-navy-900">
              Enterprise Solution Finder Admin
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {message ||
                'Database Enterprise Solution Finder belum tersedia. Jalankan pending migration melalui RTI System Setup.'}
            </p>
            <Link
              href="/admin/system"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-navy-900 px-4 text-xs font-extrabold text-white"
            >
              Open System Setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300">
                <Settings2 className="h-3.5 w-3.5" />
                Admin Only · Parameterized Diagnostic
              </div>
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
                Enterprise Solution Finder Control Center
              </h1>
              <p className="mt-1 max-w-4xl text-xs leading-relaxed text-muted">
                Kelola questionnaire, answer options, service library, matching
                rules, scoring weights, AI prompt, analytics, dan audit trail tanpa
                mengubah source code. Perubahan versioned dan tercatat per admin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/tools/solution-finder"
                className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-xs font-bold text-navy-900 hover:bg-grey-50"
              >
                Open Customer Tool
              </Link>
              <Link
                href="/admin/system"
                className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-xs font-bold text-navy-900 hover:bg-grey-50"
              >
                System Setup
              </Link>
              <button
                type="button"
                onClick={load}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-extrabold text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
            {message}
          </div>
        )}

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-sm">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold transition ${
                tab === key
                  ? 'bg-navy-900 text-white'
                  : 'text-navy-900 hover:bg-grey-50'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['Assessments', analytics?.assessments ?? 0, Database],
                ['Completed', analytics?.completed ?? 0, CheckCircle2],
                ['Completion Rate', `${analytics?.completionRate ?? 0}%`, BarChart3],
                ['Questions', config.questions.length, FileQuestion],
                ['Services', config.services.length, BookOpen],
              ].map(([label, value, Icon]) => {
                const Component = Icon as React.ElementType;
                return (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-line bg-white p-5 shadow-sm"
                  >
                    <Component className="h-5 w-5 text-gold-600" />
                    <div className="mt-3 text-2xl font-extrabold text-navy-900">
                      {String(value)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {String(label)}
                    </div>
                  </div>
                );
              })}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-navy-900">
                  Market Demand Intelligence · Industries
                </h2>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Hanya berasal dari assessment yang benar-benar tercatat pada
                  database. Tidak ada synthetic/demo records.
                </p>
                <div className="mt-5 space-y-3">
                  {(analytics?.industries || []).length ? (
                    analytics!.industries.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-xl border border-line p-3"
                      >
                        <span className="text-xs font-bold text-navy-900">
                          {item.key}
                        </span>
                        <span className="rounded-full bg-grey-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-600">
                          {item.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-grey-50 p-4 text-xs text-muted">
                      No data available
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-navy-900">
                  Most Recommended RTI Services
                </h2>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Rekomendasi engine dipisahkan dari customer-requested service.
                </p>
                <div className="mt-5 space-y-3">
                  {(analytics?.recommendedServices || []).length ? (
                    analytics!.recommendedServices.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-xl border border-line p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-extrabold text-navy-900">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600">
                            {item.count} matches
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted">
                          Average Match Score: {Math.round(item.avg_score || 0)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-grey-50 p-4 text-xs text-muted">
                      No data available
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-navy-900">
                Conversion Events
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(analytics?.events || []).length ? (
                  analytics!.events.map((event) => (
                    <div
                      key={event.key}
                      className="rounded-xl border border-line bg-grey-50 p-3"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        {event.key.replaceAll('_', ' ')}
                      </div>
                      <div className="mt-1 text-xl font-extrabold text-navy-900">
                        {event.count}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-grey-50 p-4 text-xs text-muted">
                    No data available
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'questions' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-4">
              <div className="sticky top-24 rounded-2xl border border-line bg-white p-3 shadow-sm">
                <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Questions · {config.questions.length}
                </div>
                <div className="max-h-[65vh] space-y-1 overflow-auto">
                  {config.questions.map((item) => (
                    <button
                      key={item.question_key}
                      type="button"
                      onClick={() => setSelectedQuestion(item.question_key)}
                      className={`w-full rounded-xl px-3 py-3 text-left ${
                        selectedQuestion === item.question_key
                          ? 'bg-navy-900 text-white'
                          : 'text-navy-900 hover:bg-grey-50'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                        Step {item.step} · {item.category}
                      </div>
                      <div className="mt-1 text-xs font-extrabold">
                        {item.label_id}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="space-y-5 lg:col-span-8">
              {config.questions
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.question_key === selectedQuestion)
                .map(({ item, index }) => (
                  <div
                    key={item.question_key}
                    className="rounded-2xl border border-line bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                          Question Key · {item.question_key}
                        </div>
                        <h2 className="mt-1 text-lg font-extrabold text-navy-900">
                          Edit Question
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          saveEntity(
                            'question',
                            item,
                            `question:${item.question_key}`,
                          )
                        }
                        disabled={savingKey === `question:${item.question_key}`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-navy-900 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      <Field
                        label="Label ID"
                        value={item.label_id}
                        onChange={(value) =>
                          updateRow('questions', index, { label_id: value })
                        }
                        className="sm:col-span-6"
                      />
                      <Field
                        label="Label EN"
                        value={item.label_en}
                        onChange={(value) =>
                          updateRow('questions', index, { label_en: value })
                        }
                        className="sm:col-span-6"
                      />
                      <Field
                        label="Description ID"
                        value={item.description_id || ''}
                        onChange={(value) =>
                          updateRow('questions', index, { description_id: value })
                        }
                        className="sm:col-span-6"
                      />
                      <Field
                        label="Description EN"
                        value={item.description_en || ''}
                        onChange={(value) =>
                          updateRow('questions', index, { description_en: value })
                        }
                        className="sm:col-span-6"
                      />
                      <Field
                        label="Step"
                        type="number"
                        value={item.step}
                        onChange={(value) =>
                          updateRow('questions', index, { step: Number(value) })
                        }
                        className="sm:col-span-2"
                      />
                      <Field
                        label="Category"
                        value={item.category}
                        onChange={(value) =>
                          updateRow('questions', index, { category: value })
                        }
                        className="sm:col-span-4"
                      />
                      <Field
                        label="Weight"
                        type="number"
                        value={item.weight}
                        onChange={(value) =>
                          updateRow('questions', index, { weight: Number(value) })
                        }
                        className="sm:col-span-2"
                      />
                      <Field
                        label="Sort"
                        type="number"
                        value={item.sort_order}
                        onChange={(value) =>
                          updateRow('questions', index, {
                            sort_order: Number(value),
                          })
                        }
                        className="sm:col-span-2"
                      />
                      <div className="sm:col-span-2">
                        <Toggle
                          label="Active"
                          checked={Boolean(item.is_active)}
                          onChange={(value) =>
                            updateRow('questions', index, {
                              is_active: value ? 1 : 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                        Question Type
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {QUESTION_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              updateRow('questions', index, {
                                question_type: type,
                              })
                            }
                            className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${
                              item.question_type === type
                                ? 'border-navy-900 bg-navy-900 text-white'
                                : 'border-line text-navy-900'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Conditional Rule JSON"
                        value={item.condition_json || ''}
                        onChange={(value) =>
                          updateRow('questions', index, {
                            condition_json: value,
                          })
                        }
                      />
                      <div className="pt-5">
                        <Toggle
                          label="Required"
                          checked={Boolean(item.required)}
                          onChange={(value) =>
                            updateRow('questions', index, {
                              required: value ? 1 : 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <h2 className="text-lg font-extrabold text-navy-900">
                  Answer Options · {selectedQuestion}
                </h2>
                <div className="mt-4 space-y-3">
                  {questionOptions.map((option) => {
                    const optionIndex = config.options.findIndex(
                      (candidate) =>
                        candidate.question_key === option.question_key &&
                        candidate.value === option.value,
                    );
                    return (
                      <div
                        key={`${option.question_key}:${option.value}`}
                        className="rounded-xl border border-line bg-grey-50 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-12">
                          <Field
                            label="Value / Key"
                            value={option.value}
                            onChange={() => undefined}
                            className="sm:col-span-3"
                          />
                          <Field
                            label="Label ID"
                            value={option.label_id}
                            onChange={(value) =>
                              updateRow('options', optionIndex, {
                                label_id: value,
                              })
                            }
                            className="sm:col-span-4"
                          />
                          <Field
                            label="Label EN"
                            value={option.label_en}
                            onChange={(value) =>
                              updateRow('options', optionIndex, {
                                label_en: value,
                              })
                            }
                            className="sm:col-span-4"
                          />
                          <div className="sm:col-span-1">
                            <Toggle
                              label="On"
                              checked={Boolean(option.is_active)}
                              onChange={(value) =>
                                updateRow('options', optionIndex, {
                                  is_active: value ? 1 : 0,
                                })
                              }
                            />
                          </div>
                          <Field
                            label="Metadata JSON"
                            value={option.metadata_json || '{}'}
                            onChange={(value) =>
                              updateRow('options', optionIndex, {
                                metadata_json: value,
                              })
                            }
                            className="sm:col-span-6"
                          />
                          <Field
                            label="Score"
                            type="number"
                            value={option.score}
                            onChange={(value) =>
                              updateRow('options', optionIndex, {
                                score: Number(value),
                              })
                            }
                            className="sm:col-span-2"
                          />
                          <Field
                            label="Sort"
                            type="number"
                            value={option.sort_order}
                            onChange={(value) =>
                              updateRow('options', optionIndex, {
                                sort_order: Number(value),
                              })
                            }
                            className="sm:col-span-2"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              saveEntity(
                                'option',
                                config.options[optionIndex],
                                `option:${option.question_key}:${option.value}`,
                              )
                            }
                            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-navy-900 px-3 text-[10px] font-extrabold text-white sm:col-span-2"
                          >
                            <Save className="h-3.5 w-3.5 text-gold-300" />
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedQuestion && (
                  <div className="mt-5 rounded-xl border border-dashed border-gold-500 bg-gold-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
                      <Plus className="h-4 w-4 text-gold-700" />
                      Add Answer Option
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-12">
                      <Field
                        label="Value Key"
                        value={newOption.value}
                        onChange={(value) =>
                          setNewOption((current) => ({
                            ...current,
                            value,
                          }))
                        }
                        className="sm:col-span-3"
                      />
                      <Field
                        label="Label ID"
                        value={newOption.label_id}
                        onChange={(value) =>
                          setNewOption((current) => ({
                            ...current,
                            label_id: value,
                          }))
                        }
                        className="sm:col-span-4"
                      />
                      <Field
                        label="Label EN"
                        value={newOption.label_en}
                        onChange={(value) =>
                          setNewOption((current) => ({
                            ...current,
                            label_en: value,
                          }))
                        }
                        className="sm:col-span-4"
                      />
                      <Field
                        label="Sort"
                        type="number"
                        value={newOption.sort_order}
                        onChange={(value) =>
                          setNewOption((current) => ({
                            ...current,
                            sort_order: Number(value),
                          }))
                        }
                        className="sm:col-span-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newOption.value || !newOption.label_id || !newOption.label_en) {
                          setMessage('Value, Label ID dan Label EN wajib diisi.');
                          return;
                        }
                        const ok = await saveEntity(
                          'option',
                          {
                            ...newOption,
                            question_key: selectedQuestion,
                          },
                          `new-option:${selectedQuestion}:${newOption.value}`,
                        );
                        if (ok) {
                          setNewOption({
                            value: '',
                            label_id: '',
                            label_en: '',
                            description_id: '',
                            description_en: '',
                            metadata_json: '{}',
                            score: 0,
                            sort_order: 100,
                            is_active: 1,
                          });
                        }
                      }}
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-navy-900"
                    >
                      <Plus className="h-4 w-4" />
                      Add Option
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-5">
                <h2 className="text-lg font-extrabold text-navy-900">
                  Create New Question
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-12">
                  <Field
                    label="Question Key"
                    value={newQuestion.question_key}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        question_key: value,
                      }))
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Label ID"
                    value={newQuestion.label_id}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        label_id: value,
                      }))
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Label EN"
                    value={newQuestion.label_en}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        label_en: value,
                      }))
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Category"
                    value={newQuestion.category}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        category: value,
                      }))
                    }
                    className="sm:col-span-5"
                  />
                  <Field
                    label="Step"
                    type="number"
                    value={newQuestion.step}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        step: Number(value),
                      }))
                    }
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Sort"
                    type="number"
                    value={newQuestion.sort_order}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        sort_order: Number(value),
                      }))
                    }
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Weight"
                    type="number"
                    value={newQuestion.weight}
                    onChange={(value) =>
                      setNewQuestion((current) => ({
                        ...current,
                        weight: Number(value),
                      }))
                    }
                    className="sm:col-span-3"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setNewQuestion((current) => ({
                          ...current,
                          question_type: type,
                        }))
                      }
                      className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${
                        newQuestion.question_type === type
                          ? 'border-navy-900 bg-navy-900 text-white'
                          : 'border-blue-200 bg-white text-navy-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !newQuestion.question_key ||
                      !newQuestion.label_id ||
                      !newQuestion.label_en
                    ) {
                      setMessage('Question key, Label ID dan Label EN wajib diisi.');
                      return;
                    }
                    const ok = await saveEntity(
                      'question',
                      newQuestion,
                      `new-question:${newQuestion.question_key}`,
                    );
                    if (ok) {
                      setSelectedQuestion(newQuestion.question_key);
                    }
                  }}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-extrabold text-white"
                >
                  <Plus className="h-4 w-4 text-gold-300" />
                  Create Question
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === 'services' && (
          <div className="space-y-4">
            {config.services.map((service, index) => (
              <section
                key={service.service_key}
                className="rounded-2xl border border-line bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 lg:flex-row">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-blue-600">
                      {service.service_key} · Version {service.version}
                    </div>
                    <h2 className="mt-1 text-lg font-extrabold text-navy-900">
                      {service.name_id}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      label="Active"
                      checked={Boolean(service.is_active)}
                      onChange={(value) =>
                        updateRow('services', index, {
                          is_active: value ? 1 : 0,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        saveEntity(
                          'service',
                          config.services[index],
                          `service:${service.service_key}`,
                        )
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-navy-900"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-12">
                  <Field
                    label="Name ID"
                    value={service.name_id}
                    onChange={(value) =>
                      updateRow('services', index, { name_id: value })
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Name EN"
                    value={service.name_en}
                    onChange={(value) =>
                      updateRow('services', index, { name_en: value })
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Category"
                    value={service.category}
                    onChange={(value) =>
                      updateRow('services', index, { category: value })
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Description ID"
                    value={service.description_id}
                    onChange={(value) =>
                      updateRow('services', index, {
                        description_id: value,
                      })
                    }
                    className="sm:col-span-6"
                  />
                  <Field
                    label="Description EN"
                    value={service.description_en}
                    onChange={(value) =>
                      updateRow('services', index, {
                        description_en: value,
                      })
                    }
                    className="sm:col-span-6"
                  />
                  <Field
                    label="URL"
                    value={service.url}
                    onChange={(value) =>
                      updateRow('services', index, { url: value })
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Delivery Model"
                    value={service.delivery_model}
                    onChange={(value) =>
                      updateRow('services', index, {
                        delivery_model: value,
                      })
                    }
                    className="sm:col-span-3"
                  />
                  <Field
                    label="Typical Duration"
                    value={service.typical_duration}
                    onChange={(value) =>
                      updateRow('services', index, {
                        typical_duration: value,
                      })
                    }
                    className="sm:col-span-3"
                  />
                  <Field
                    label="Priority Weight"
                    type="number"
                    value={service.priority_weight}
                    onChange={(value) =>
                      updateRow('services', index, {
                        priority_weight: Number(value),
                      })
                    }
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Diagnostic Tool Slug"
                    value={service.diagnostic_tool_slug || ''}
                    onChange={(value) =>
                      updateRow('services', index, {
                        diagnostic_tool_slug: value,
                      })
                    }
                    className="sm:col-span-4"
                  />
                  <Field
                    label="Outcomes JSON"
                    value={service.outcomes_json}
                    onChange={(value) =>
                      updateRow('services', index, {
                        outcomes_json: value,
                      })
                    }
                    className="sm:col-span-8"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {COMPLEXITIES.map((complexity) => (
                    <button
                      key={complexity}
                      type="button"
                      onClick={() =>
                        updateRow('services', index, { complexity })
                      }
                      className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${
                        service.complexity === complexity
                          ? 'border-navy-900 bg-navy-900 text-white'
                          : 'border-line text-navy-900'
                      }`}
                    >
                      {complexity}
                    </button>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-dashed border-gold-500 bg-gold-500/5 p-5">
              <h2 className="text-lg font-extrabold text-navy-900">
                Add RTI Service
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-12">
                <Field
                  label="Service Key"
                  value={newService.service_key}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      service_key: value,
                    }))
                  }
                  className="sm:col-span-3"
                />
                <Field
                  label="Name ID"
                  value={newService.name_id}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      name_id: value,
                    }))
                  }
                  className="sm:col-span-3"
                />
                <Field
                  label="Name EN"
                  value={newService.name_en}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      name_en: value,
                    }))
                  }
                  className="sm:col-span-3"
                />
                <Field
                  label="Category"
                  value={newService.category}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      category: value,
                    }))
                  }
                  className="sm:col-span-3"
                />
                <Field
                  label="Description ID"
                  value={newService.description_id}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      description_id: value,
                    }))
                  }
                  className="sm:col-span-6"
                />
                <Field
                  label="Description EN"
                  value={newService.description_en}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      description_en: value,
                    }))
                  }
                  className="sm:col-span-6"
                />
                <Field
                  label="URL"
                  value={newService.url}
                  onChange={(value) =>
                    setNewService((current) => ({ ...current, url: value }))
                  }
                  className="sm:col-span-4"
                />
                <Field
                  label="Delivery Model"
                  value={newService.delivery_model}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      delivery_model: value,
                    }))
                  }
                  className="sm:col-span-4"
                />
                <Field
                  label="Duration"
                  value={newService.typical_duration}
                  onChange={(value) =>
                    setNewService((current) => ({
                      ...current,
                      typical_duration: value,
                    }))
                  }
                  className="sm:col-span-4"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {COMPLEXITIES.map((complexity) => (
                  <button
                    key={complexity}
                    type="button"
                    onClick={() =>
                      setNewService((current) => ({
                        ...current,
                        complexity,
                      }))
                    }
                    className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${
                      newService.complexity === complexity
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-line bg-white text-navy-900'
                    }`}
                  >
                    {complexity}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  saveEntity(
                    'service',
                    newService,
                    `new-service:${newService.service_key}`,
                  )
                }
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-navy-900"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </button>
            </section>
          </div>
        )}

        {tab === 'mappings' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-extrabold text-navy-900">
                  Explainable Service Mapping Rules
                </h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Rule menghubungkan industry, pressure, capability gap, objective,
                timeline, delivery preference, atau regulated status ke service
                dengan weight dan rationale yang dapat dijelaskan ke customer.
              </p>
            </section>

            {config.mappings.map((mapping, index) => (
              <section
                key={mapping.id}
                className="rounded-2xl border border-line bg-white p-4 shadow-sm"
              >
                <div className="grid gap-3 sm:grid-cols-12">
                  <Field
                    label="Service Key"
                    value={mapping.service_key}
                    onChange={(value) =>
                      updateRow('mappings', index, {
                        service_key: value,
                      })
                    }
                    className="sm:col-span-3"
                  />
                  <Field
                    label="Dimension Value"
                    value={mapping.dimension_value}
                    onChange={(value) =>
                      updateRow('mappings', index, {
                        dimension_value: value,
                      })
                    }
                    className="sm:col-span-3"
                  />
                  <Field
                    label="Weight"
                    type="number"
                    value={mapping.weight}
                    onChange={(value) =>
                      updateRow('mappings', index, {
                        weight: Number(value),
                      })
                    }
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Rationale ID"
                    value={mapping.rationale_id || ''}
                    onChange={(value) =>
                      updateRow('mappings', index, {
                        rationale_id: value,
                      })
                    }
                    className="sm:col-span-4"
                  />
                  <div className="sm:col-span-8">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                      Dimension Type
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DIMENSION_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            updateRow('mappings', index, {
                              dimension_type: type,
                            })
                          }
                          className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-bold ${
                            mapping.dimension_type === type
                              ? 'border-navy-900 bg-navy-900 text-white'
                              : 'border-line text-navy-900'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end justify-end gap-3 sm:col-span-4">
                    <Toggle
                      label="Active"
                      checked={Boolean(mapping.is_active)}
                      onChange={(value) =>
                        updateRow('mappings', index, {
                          is_active: value ? 1 : 0,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        saveEntity(
                          'mapping',
                          config.mappings[index],
                          `mapping:${mapping.id}`,
                        )
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-extrabold text-white"
                    >
                      <Save className="h-4 w-4 text-gold-300" />
                      Save
                    </button>
                  </div>
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-dashed border-gold-500 bg-gold-500/5 p-5">
              <h2 className="text-lg font-extrabold text-navy-900">
                Add Matching Rule
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-12">
                <Field
                  label="Service Key"
                  value={newMapping.service_key}
                  onChange={(value) =>
                    setNewMapping((current) => ({
                      ...current,
                      service_key: value,
                    }))
                  }
                  className="sm:col-span-4"
                />
                <Field
                  label="Dimension Value"
                  value={newMapping.dimension_value}
                  onChange={(value) =>
                    setNewMapping((current) => ({
                      ...current,
                      dimension_value: value,
                    }))
                  }
                  className="sm:col-span-4"
                />
                <Field
                  label="Weight"
                  type="number"
                  value={newMapping.weight}
                  onChange={(value) =>
                    setNewMapping((current) => ({
                      ...current,
                      weight: Number(value),
                    }))
                  }
                  className="sm:col-span-4"
                />
                <Field
                  label="Rationale ID"
                  value={newMapping.rationale_id}
                  onChange={(value) =>
                    setNewMapping((current) => ({
                      ...current,
                      rationale_id: value,
                    }))
                  }
                  className="sm:col-span-6"
                />
                <Field
                  label="Rationale EN"
                  value={newMapping.rationale_en}
                  onChange={(value) =>
                    setNewMapping((current) => ({
                      ...current,
                      rationale_en: value,
                    }))
                  }
                  className="sm:col-span-6"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DIMENSION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setNewMapping((current) => ({
                        ...current,
                        dimension_type: type,
                      }))
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-bold ${
                      newMapping.dimension_type === type
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-line bg-white text-navy-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  saveEntity(
                    'mapping',
                    newMapping,
                    `new-mapping:${newMapping.service_key}`,
                  )
                }
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-navy-900"
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </button>
            </section>
          </div>
        )}

        {tab === 'scoring' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-gold-600" />
                <h2 className="text-lg font-extrabold text-navy-900">
                  Scoring Weights
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted">
                Semua perubahan weight menaikkan configuration version sehingga
                assessment lama tetap menyimpan version yang digunakan.
              </p>
            </section>

            <div className="grid gap-3 md:grid-cols-2">
              {config.weights.map((weight, index) => (
                <div
                  key={weight.weight_key}
                  className="rounded-2xl border border-line bg-white p-5 shadow-sm"
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                    {weight.weight_key}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    {weight.description}
                  </p>
                  <div className="mt-4 flex items-end gap-3">
                    <Field
                      label="Weight Value"
                      type="number"
                      value={weight.weight_value}
                      onChange={(value) =>
                        updateRow('weights', index, {
                          weight_value: Number(value),
                        })
                      }
                      className="flex-1"
                    />
                    <Toggle
                      label="Active"
                      checked={Boolean(weight.is_active)}
                      onChange={(value) =>
                        updateRow('weights', index, {
                          is_active: value ? 1 : 0,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        saveEntity(
                          'weight',
                          config.weights[index],
                          `weight:${weight.weight_key}`,
                        )
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-extrabold text-white"
                    >
                      <Save className="h-4 w-4 text-gold-300" />
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            {config.aiPrompts.map((prompt, index) => (
              <section
                key={prompt.prompt_key}
                className="rounded-2xl border border-line bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
                      {prompt.prompt_key} · Version {prompt.version}
                    </div>
                    <h2 className="text-lg font-extrabold text-navy-900">
                      AI Advisory Guardrail Prompt
                    </h2>
                  </div>
                </div>
                <textarea
                  value={prompt.prompt_text}
                  onChange={(event) =>
                    updateRow('aiPrompts', index, {
                      prompt_text: event.target.value,
                    })
                  }
                  rows={14}
                  className="mt-5 w-full rounded-xl border border-line p-4 text-xs leading-relaxed text-navy-900 outline-none focus:ring-2 focus:ring-gold-500"
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Toggle
                    label="Active"
                    checked={Boolean(prompt.is_active)}
                    onChange={(value) =>
                      updateRow('aiPrompts', index, {
                        is_active: value ? 1 : 0,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      saveEntity(
                        'prompt',
                        config.aiPrompts[index],
                        `prompt:${prompt.prompt_key}`,
                      )
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-navy-900"
                  >
                    <Sparkles className="h-4 w-4" />
                    Save Prompt
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'audit' && (
          <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-extrabold text-navy-900">
                Latest Configuration Audit Log
              </h2>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-line bg-grey-50 text-[9px] font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Actor</th>
                    <th className="px-3 py-3">Action</th>
                    <th className="px-3 py-3">Entity</th>
                    <th className="px-3 py-3">Key</th>
                    <th className="px-3 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {config.auditLogs.length ? (
                    config.auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 py-3 font-mono text-[10px] text-muted">
                          {log.created_at}
                        </td>
                        <td className="px-3 py-3 font-bold text-navy-900">
                          {log.actor}
                        </td>
                        <td className="px-3 py-3">{log.action}</td>
                        <td className="px-3 py-3">{log.entity_type}</td>
                        <td className="px-3 py-3 font-mono text-[10px]">
                          {log.entity_key}
                        </td>
                        <td className="px-3 py-3 font-mono text-[10px] text-muted">
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
