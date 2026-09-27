'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Database,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';

type Catalog = {
  domains: any[];
  questions: any[];
  regulations: any[];
  industries: any[];
  scoringParameters: any[];
  maturityLevels: any[];
  evidenceTypes: any[];
  aiPrompts: any[];
  reportTemplates: any[];
};

type TabKey =
  | 'questions'
  | 'domains'
  | 'regulations'
  | 'industries'
  | 'scoringParameters'
  | 'maturityLevels'
  | 'evidenceTypes'
  | 'aiPrompts'
  | 'reportTemplates';

const TABS: Array<[TabKey, string, string]> = [
  ['questions', 'Assessment Questions', 'question'],
  ['domains', 'Assessment Domains', 'domain'],
  ['regulations', 'Regulation Library', 'regulation'],
  ['industries', 'Industry Parameters', 'industry'],
  ['scoringParameters', 'Scoring Parameters', 'scoringParameter'],
  ['maturityLevels', 'Maturity Levels', 'maturityLevel'],
  ['evidenceTypes', 'Evidence Types', 'evidenceType'],
  ['aiPrompts', 'AI Prompt Configuration', 'aiPrompt'],
  ['reportTemplates', 'Report Templates', 'reportTemplate'],
];

function keyFor(tab: TabKey, row: any) {
  if (tab === 'maturityLevels') return String(row.level);
  if (tab === 'scoringParameters') return String(row.key);
  if (tab === 'evidenceTypes' || tab === 'aiPrompts' || tab === 'reportTemplates') return String(row.code);
  return String(row.id);
}

function entityFor(tab: TabKey) {
  return TABS.find((item) => item[0] === tab)?.[2] || '';
}

function labelFor(tab: TabKey, row: any) {
  if (tab === 'questions') return row.code + ' — ' + row.questionText;
  if (tab === 'domains') return row.code + ' — ' + row.name;
  if (tab === 'regulations') return row.referenceCode + ' — ' + row.title;
  if (tab === 'industries') return row.label;
  if (tab === 'scoringParameters') return row.label;
  if (tab === 'maturityLevels') return 'Level ' + row.level + ' — ' + row.label;
  if (tab === 'evidenceTypes') return row.label;
  if (tab === 'aiPrompts') return row.label;
  return row.label;
}

export default function AdminPdpReadinessPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<TabKey>('questions');
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  const rows = useMemo(() => (catalog?.[tab] || []) as any[], [catalog, tab]);

  const selected = useMemo(
    () => rows.find((row) => keyFor(tab, row) === selectedKey) || rows[0] || null,
    [rows, selectedKey, tab],
  );

  useEffect(() => {
    if (selected && !createMode) setDraft({ ...selected });
  }, [selected, createMode]);

  const load = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/pdp-readiness', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Gagal memuat PDP configuration.');
      setCatalog(data.catalog);
      setSelectedKey('');
      setCreateMode(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat PDP configuration.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/pdp-readiness', {
        method: createMode ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: entityFor(tab), payload: draft }),
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) throw new Error(data?.error || 'Perubahan tidak dapat disimpan.');
      setMessage(createMode ? 'Konfigurasi baru berhasil dibuat.' : 'Perubahan berhasil disimpan.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Perubahan tidak dapat disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!selected) return;
    if (!window.confirm('Nonaktifkan item ini? Riwayat assessment lama tetap dipertahankan.')) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/pdp-readiness', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: entityFor(tab),
          id:
            tab === 'maturityLevels'
              ? selected.level
              : tab === 'scoringParameters'
                ? selected.key
                : ['evidenceTypes','aiPrompts','reportTemplates'].includes(tab)
                  ? selected.code
                  : selected.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) throw new Error(data?.error || 'Item tidak dapat dinonaktifkan.');
      setMessage('Item dinonaktifkan.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Item tidak dapat dinonaktifkan.');
    } finally {
      setBusy(false);
    }
  };

  const beginCreate = () => {
    const defaults: Record<TabKey, any> = {
      questions: {
        code: '',
        domainId: catalog?.domains?.[0]?.id || '',
        questionText: '',
        questionHelp: '',
        regulationReference: 'UU No. 27 Tahun 2022',
        articleReference: '',
        controlObjective: '',
        riskStatement: '',
        recommendedEvidence: '',
        weight: 1,
        criticality: 'Medium',
        answerOptionsJson: '["yes","partial","planned","unknown","no","na"]',
        profileRequirementsJson: '{}',
        isQuick: false,
        sortOrder: 10000,
        version: '1.0',
      },
      domains: { code: '', name: '', description: '', weight: 1, sortOrder: 1000, version: '1.0' },
      regulations: { title: '', referenceCode: '', version: '1.0', effectiveDate: '', sourceUrl: '', reviewedBy: 'RTI Admin' },
      industries: { code: '', label: '', description: '', configJson: '{}', sortOrder: 1000 },
      scoringParameters: {},
      maturityLevels: {},
      evidenceTypes: {},
      aiPrompts: {},
      reportTemplates: {},
    };
    if (!['questions','domains','regulations','industries'].includes(tab)) {
      setMessage('Untuk menjaga integritas engine, item baru pada grup ini dikelola melalui migration/versioned configuration. Item existing tetap dapat diedit oleh Admin.');
      return;
    }
    setDraft(defaults[tab]);
    setCreateMode(true);
  };

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin · UU PDP Readiness
              </div>
              <h1 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">
                PDP Diagnostic Configuration Center
              </h1>
              <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted">
                Kelola question bank, domain, regulatory knowledge base, industry pack, scoring,
                maturity, evidence types, AI prompt, dan report template tanpa mengubah frontend.
                Perubahan hanya berlaku pada konfigurasi aktif dan tetap mempertahankan versioning assessment lama.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/parameters" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50">
                Global Parameters
              </Link>
              <Link href="/tools/pdp-readiness" className="rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white">
                Open PDP Tool
              </Link>
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="sticky top-24 rounded-2xl border border-line bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between px-2 py-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Configuration</span>
                <button onClick={load} disabled={busy} className="rounded-lg border border-line p-2 text-navy-900 disabled:opacity-40">
                  <RefreshCw className={'h-3.5 w-3.5 ' + (busy ? 'animate-spin' : '')} />
                </button>
              </div>
              <div className="space-y-1">
                {TABS.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTab(key);
                      setSelectedKey('');
                      setCreateMode(false);
                      setMessage('');
                    }}
                    className={'w-full rounded-xl px-3 py-3 text-left text-xs font-bold transition ' + (
                      tab === key ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-grey-50'
                    )}
                  >
                    {label}
                    <span className={'ml-2 text-[10px] ' + (tab === key ? 'text-slate-300' : 'text-muted')}>
                      {catalog?.[key]?.length ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-4 lg:col-span-9">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-gold-600" />
                  <div>
                    <h2 className="text-lg font-extrabold text-navy-900">
                      {TABS.find((item) => item[0] === tab)?.[1]}
                    </h2>
                    <div className="text-[10px] text-muted">{rows.length} records</div>
                  </div>
                </div>
                <button onClick={beginCreate} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">
                  <Plus className="h-4 w-4" /> New
                </button>
              </div>
            </div>

            {!createMode && rows.length > 0 && (
              <div className="rounded-2xl border border-line bg-white p-3 shadow-sm">
                <select
                  value={selected ? keyFor(tab, selected) : ''}
                  onChange={(event) => setSelectedKey(event.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-3 text-xs font-bold text-navy-900"
                >
                  {rows.map((row) => (
                    <option key={keyFor(tab, row)} value={keyFor(tab, row)}>
                      {labelFor(tab, row).slice(0, 180)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {draft && (
              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                {tab === 'questions' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Question Code" value={draft.code || ''} onChange={(value) => setDraft({ ...draft, code: value })} disabled={!createMode} />
                    <label className="text-xs font-bold text-navy-900">
                      Domain
                      <select
                        value={draft.domainId || ''}
                        onChange={(event) => setDraft({ ...draft, domainId: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-xs font-normal"
                      >
                        {(catalog?.domains || []).map((domain) => (
                          <option key={domain.id} value={domain.id}>{domain.code} — {domain.name}</option>
                        ))}
                      </select>
                    </label>
                    <TextArea label="Question Text" value={draft.questionText || ''} onChange={(value) => setDraft({ ...draft, questionText: value })} wide />
                    <TextArea label="Question Help" value={draft.questionHelp || ''} onChange={(value) => setDraft({ ...draft, questionHelp: value })} wide />
                    <Field label="Regulation Reference" value={draft.regulationReference || ''} onChange={(value) => setDraft({ ...draft, regulationReference: value })} />
                    <Field label="Article Reference" value={draft.articleReference || ''} onChange={(value) => setDraft({ ...draft, articleReference: value })} />
                    <TextArea label="Control Objective" value={draft.controlObjective || ''} onChange={(value) => setDraft({ ...draft, controlObjective: value })} />
                    <TextArea label="Risk Statement" value={draft.riskStatement || ''} onChange={(value) => setDraft({ ...draft, riskStatement: value })} />
                    <TextArea label="Recommended Evidence" value={draft.recommendedEvidence || ''} onChange={(value) => setDraft({ ...draft, recommendedEvidence: value })} wide />
                    <NumberField label="Weight" value={draft.weight ?? 1} onChange={(value) => setDraft({ ...draft, weight: value })} />
                    <label className="text-xs font-bold text-navy-900">
                      Criticality
                      <select value={draft.criticality || 'Medium'} onChange={(event) => setDraft({ ...draft, criticality: event.target.value })} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-xs font-normal">
                        {['Low','Medium','High','Critical'].map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </label>
                    <TextArea label="Profile Requirements JSON" value={draft.profileRequirementsJson || '{}'} onChange={(value) => setDraft({ ...draft, profileRequirementsJson: value })} wide />
                    <NumberField label="Sort Order" value={draft.sortOrder ?? 0} onChange={(value) => setDraft({ ...draft, sortOrder: value })} />
                    <Field label="Version" value={draft.version || '1.0'} onChange={(value) => setDraft({ ...draft, version: value })} />
                    <label className="flex items-center gap-2 text-xs font-bold text-navy-900">
                      <input type="checkbox" checked={Boolean(draft.isQuick)} onChange={(event) => setDraft({ ...draft, isQuick: event.target.checked })} />
                      Include in Quick Readiness
                    </label>
                  </div>
                )}

                {tab === 'domains' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Code" value={draft.code || ''} onChange={(value) => setDraft({ ...draft, code: value })} disabled={!createMode} />
                    <Field label="Name" value={draft.name || ''} onChange={(value) => setDraft({ ...draft, name: value })} />
                    <TextArea label="Description" value={draft.description || ''} onChange={(value) => setDraft({ ...draft, description: value })} wide />
                    <NumberField label="Weight" value={draft.weight ?? 1} onChange={(value) => setDraft({ ...draft, weight: value })} />
                    <NumberField label="Sort Order" value={draft.sortOrder ?? 0} onChange={(value) => setDraft({ ...draft, sortOrder: value })} />
                    <Field label="Version" value={draft.version || '1.0'} onChange={(value) => setDraft({ ...draft, version: value })} />
                  </div>
                )}

                {tab === 'regulations' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Reference Code" value={draft.referenceCode || ''} onChange={(value) => setDraft({ ...draft, referenceCode: value })} />
                    <Field label="Title" value={draft.title || ''} onChange={(value) => setDraft({ ...draft, title: value })} />
                    <Field label="Version" value={draft.version || ''} onChange={(value) => setDraft({ ...draft, version: value })} />
                    <Field label="Effective Date" value={draft.effectiveDate || ''} onChange={(value) => setDraft({ ...draft, effectiveDate: value })} />
                    <Field label="Source URL" value={draft.sourceUrl || ''} onChange={(value) => setDraft({ ...draft, sourceUrl: value })} wide />
                    <Field label="Reviewed By" value={draft.reviewedBy || ''} onChange={(value) => setDraft({ ...draft, reviewedBy: value })} />
                  </div>
                )}

                {tab === 'industries' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Code" value={draft.code || ''} onChange={(value) => setDraft({ ...draft, code: value })} disabled={!createMode} />
                    <Field label="Label" value={draft.label || ''} onChange={(value) => setDraft({ ...draft, label: value })} />
                    <TextArea label="Description" value={draft.description || ''} onChange={(value) => setDraft({ ...draft, description: value })} wide />
                    <TextArea label="Configuration JSON" value={draft.configJson || '{}'} onChange={(value) => setDraft({ ...draft, configJson: value })} wide />
                    <NumberField label="Sort Order" value={draft.sortOrder ?? 0} onChange={(value) => setDraft({ ...draft, sortOrder: value })} />
                  </div>
                )}

                {tab === 'scoringParameters' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Key" value={draft.key || ''} onChange={() => {}} disabled />
                    <Field label="Label" value={draft.label || ''} onChange={(value) => setDraft({ ...draft, label: value })} />
                    <NumberField label="Numeric Value" value={draft.numericValue ?? 0} onChange={(value) => setDraft({ ...draft, numericValue: value })} />
                    <TextArea label="Description" value={draft.description || ''} onChange={(value) => setDraft({ ...draft, description: value })} wide />
                  </div>
                )}

                {tab === 'maturityLevels' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField label="Level" value={draft.level ?? 0} onChange={() => {}} disabled />
                    <Field label="Label" value={draft.label || ''} onChange={(value) => setDraft({ ...draft, label: value })} />
                    <NumberField label="Minimum Score" value={draft.minScore ?? 0} onChange={(value) => setDraft({ ...draft, minScore: value })} />
                    <NumberField label="Maximum Score" value={draft.maxScore ?? 100} onChange={(value) => setDraft({ ...draft, maxScore: value })} />
                    <TextArea label="Description" value={draft.description || ''} onChange={(value) => setDraft({ ...draft, description: value })} wide />
                  </div>
                )}

                {tab === 'evidenceTypes' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Code" value={draft.code || ''} onChange={() => {}} disabled />
                    <Field label="Label" value={draft.label || ''} onChange={(value) => setDraft({ ...draft, label: value })} />
                    <TextArea label="Extensions JSON" value={draft.extensionsJson || '[]'} onChange={(value) => setDraft({ ...draft, extensionsJson: value })} />
                    <TextArea label="MIME Types JSON" value={draft.mimeTypesJson || '[]'} onChange={(value) => setDraft({ ...draft, mimeTypesJson: value })} />
                    <NumberField label="Max Bytes" value={draft.maxBytes ?? 10485760} onChange={(value) => setDraft({ ...draft, maxBytes: value })} />
                  </div>
                )}

                {tab === 'aiPrompts' && (
                  <div className="grid gap-4">
                    <Field label="Code" value={draft.code || ''} onChange={() => {}} disabled />
                    <Field label="Label" value={draft.label || ''} onChange={(value) => setDraft({ ...draft, label: value })} />
                    <TextArea label="Prompt Text" value={draft.promptText || ''} onChange={(value) => setDraft({ ...draft, promptText: value })} wide rows={12} />
                    <Field label="Version" value={draft.version || '1.0'} onChange={(value) => setDraft({ ...draft, version: value })} />
                  </div>
                )}

                {tab === 'reportTemplates' && (
                  <div className="grid gap-4">
                    <Field label="Code" value={draft.code || ''} onChange={() => {}} disabled />
                    <Field label="Label" value={draft.label || ''} onChange={(value) => setDraft({ ...draft, label: value })} />
                    <TextArea label="Template Configuration JSON" value={draft.configJson || '{}'} onChange={(value) => setDraft({ ...draft, configJson: value })} wide rows={12} />
                    <Field label="Version" value={draft.version || '1.0'} onChange={(value) => setDraft({ ...draft, version: value })} />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <Database className="h-4 w-4" />
                    Changes are persisted in RTI_DB and audited through protected Admin access.
                  </div>
                  <div className="flex gap-2">
                    {!createMode && (
                      <button onClick={deactivate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-40">
                        <Trash2 className="h-4 w-4" /> Nonaktifkan
                      </button>
                    )}
                    <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-extrabold text-navy-900 disabled:opacity-40">
                      {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {createMode ? 'Create' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!draft && !busy && (
              <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
                <BookOpenCheck className="mx-auto h-8 w-8 text-gold-600" />
                <div className="mt-3 text-sm font-extrabold text-navy-900">No configuration selected</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={'text-xs font-bold text-navy-900 ' + (wide ? 'md:col-span-2' : '')}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-xs font-normal disabled:bg-grey-50 disabled:text-muted"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-xs font-bold text-navy-900">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-xs font-normal disabled:bg-grey-50 disabled:text-muted"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  wide = false,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  rows?: number;
}) {
  return (
    <label className={'text-xs font-bold text-navy-900 ' + (wide ? 'md:col-span-2' : '')}>
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-line px-3 py-3 font-mono text-[11px] font-normal leading-relaxed"
      />
    </label>
  );
}
