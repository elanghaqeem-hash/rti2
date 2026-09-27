'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileJson,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Upload,
} from 'lucide-react';

type Row = Record<string, unknown> & { id?: string };
type Snapshot = Record<string, unknown> & {
  selectedVersion: Row;
  versions: Row[];
  statistics: { questions: number; annexControls: number; quickQuestions: number; assessments: number };
  sections: Row[];
  questions: Row[];
  controls: Row[];
  responseOptions: Row[];
  scoringRules: Row[];
  maturityLevels: Row[];
  gates: Row[];
  evidenceStatuses: Row[];
  gapRules: Row[];
  roadmapRules: Row[];
  recommendationRules: Row[];
  serviceMappings: Row[];
  reportTemplates: Row[];
  aiProviders: Row[];
  auditLogs: Row[];
};

type ConfigTab = {
  key: string;
  label: string;
  collection?: keyof Snapshot;
  entity?: string;
  description: string;
};

const tabs: ConfigTab[] = [
  { key: 'overview', label: 'Overview', description: 'Framework health, counts, version status, and operational links.' },
  { key: 'questions', label: 'Question Bank', collection: 'questions', entity: 'question', description: 'Diagnostic questions, evidence expectations, criticality, weights, branching, and Quick Scan inclusion.' },
  { key: 'clauses', label: 'Clauses', collection: 'sections', entity: 'section', description: 'Clause and assessment section labels, ordering, and Quick Scan availability.' },
  { key: 'controls', label: 'Annex Controls', collection: 'controls', entity: 'control', description: '93 Annex A control references and RTI paraphrased diagnostic prompts.' },
  { key: 'scoring', label: 'Scoring', collection: 'scoringRules', entity: 'scoring_rule', description: 'Deterministic scoring dimensions used by the ISO readiness rule engine.' },
  { key: 'weights', label: 'Weights', collection: 'scoringRules', entity: 'scoring_rule', description: 'Configurable weights for overall readiness and Stage 1 / Stage 2 preparation indicators.' },
  { key: 'maturity', label: 'Maturity Levels', collection: 'maturityLevels', entity: 'maturity_level', description: 'Readiness labels and score thresholds.' },
  { key: 'gates', label: 'Certification Gates', collection: 'gates', entity: 'gate', description: 'Ten readiness gates, minimum responses, evidence requirements, and order.' },
  { key: 'gap', label: 'Gap Rules', collection: 'gapRules', entity: 'gap_rule', description: 'Configurable mapping from criticality and implementation gap to severity.' },
  { key: 'evidence', label: 'Evidence Requirements', collection: 'evidenceStatuses', entity: 'evidence_status', description: 'Evidence maturity statuses and evidence-readiness score percentages.' },
  { key: 'recommendations', label: 'Recommendation Rules', collection: 'recommendationRules', entity: 'recommendation_rule', description: 'Advisory remediation recommendations generated from assessment gaps.' },
  { key: 'services', label: 'Service Mapping', collection: 'serviceMappings', entity: 'service_mapping', description: 'RTI service recommendations and parameterized CTA mappings.' },
  { key: 'report', label: 'Report Template', collection: 'reportTemplates', entity: 'report_template', description: 'Management report branding and disclaimer content.' },
  { key: 'lead', label: 'Lead Settings', description: 'Parameterized RTI consultation URL, WhatsApp, email, duration labels, and lead-conversion settings.' },
  { key: 'ai', label: 'AI Settings', collection: 'aiProviders', entity: 'ai_provider', description: 'Provider model, priority, and enablement metadata. API keys remain server-side secrets.' },
  { key: 'version', label: 'Version Management', description: 'Clone, review, publish, and archive immutable framework versions.' },
  { key: 'audit', label: 'Audit Log', collection: 'auditLogs', description: 'Recent assessment and ISO diagnostic configuration activity.' },
];

const hiddenKeys = new Set(['id','createdAt','updatedAt','publishedAt','templateName','standardVersion','sectionId']);

function labelFor(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function editableValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldEditor(row: Row, key: string, value: unknown, onChange: (value: unknown) => void) {
  if (hiddenKeys.has(key)) return null;
  if (typeof value === 'boolean' || key.startsWith('is') || key === 'evidenceRequired') {
    const checked = value === true || value === 1 || value === '1';
    return (
      <label key={key} className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-grey-50 px-3 text-xs font-bold text-navy-900">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? 1 : 0)} />
        {labelFor(key)}
      </label>
    );
  }

  const numeric = typeof value === 'number' || ['weight','minScore','maxScore','score','scorePercent','sortOrder','priority','minimumResponse','maximumResponse'].includes(key);
  const long = key.toLowerCase().includes('text') || key.toLowerCase().includes('description') || key.toLowerCase().includes('recommendation') || key.toLowerCase().includes('evidence') || key.toLowerCase().includes('risk') || key.toLowerCase().includes('disclaimer') || String(value || '').length > 120;

  return (
    <label key={key} className={long ? 'block text-xs font-bold text-navy-900 sm:col-span-2' : 'block text-xs font-bold text-navy-900'}>
      {labelFor(key)}
      {long ? (
        <textarea rows={3} value={editableValue(value)} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-xs font-normal" />
      ) : (
        <input type={numeric ? 'number' : 'text'} step={numeric ? 'any' : undefined} value={editableValue(value)} onChange={(event) => onChange(numeric ? Number(event.target.value) : event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-xs font-normal" />
      )}
    </label>
  );
}

export default function Iso27001AdminPage() {
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);
  const [tab, setTab] = React.useState('overview');
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [draftRows, setDraftRows] = React.useState<Record<string, Row>>({});
  const [newVersion, setNewVersion] = React.useState('');
  const [createJson, setCreateJson] = React.useState('{}');
  const [importText, setImportText] = React.useState('');

  const currentTab = tabs.find((item) => item.key === tab) || tabs[0];
  const selectedVersionId = String(snapshot?.selectedVersion?.id || '');
  const selectedStatus = String(snapshot?.selectedVersion?.status || '');
  const editable = ['Draft','Review'].includes(selectedStatus);

  async function load(versionId?: string) {
    setLoading(true);
    setMessage('');
    try {
      const suffix = versionId ? '?versionId=' + encodeURIComponent(versionId) : '';
      const response = await fetch('/api/admin/iso27001' + suffix, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'ISO 27001 CMS data unavailable.');
      setSnapshot(data.snapshot);
      setDraftRows({});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ISO 27001 CMS data unavailable.');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function rowsForCurrentTab(): Row[] {
    if (!snapshot || !currentTab.collection) return [];
    const value = snapshot[currentTab.collection];
    return Array.isArray(value) ? (value as Row[]) : [];
  }

  function rowDraft(row: Row) {
    const id = String(row.id || '');
    return draftRows[id] || row;
  }

  function patchLocal(row: Row, key: string, value: unknown) {
    const id = String(row.id || '');
    setDraftRows((current) => ({
      ...current,
      [id]: { ...(current[id] || row), [key]: value },
    }));
  }

  async function saveRow(row: Row) {
    if (!currentTab.entity || !row.id) return;
    setLoading(true);
    setMessage('');
    try {
      const payload = rowDraft(row);
      const response = await fetch('/api/admin/iso27001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: currentTab.entity, id: row.id, patch: payload }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Update failed.');
      setMessage('Configuration saved.');
      await load(selectedVersionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed.');
      setLoading(false);
    }
  }

  async function deactivate(row: Row) {
    if (!currentTab.entity || !row.id) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/iso27001', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: currentTab.entity, id: row.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Deactivate failed.');
      setMessage('Configuration deactivated.');
      await load(selectedVersionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deactivate failed.');
      setLoading(false);
    }
  }

  async function createEntity() {
    if (!currentTab.entity || !selectedVersionId) return;
    setLoading(true);
    setMessage('');
    try {
      const input = JSON.parse(createJson);
      const response = await fetch('/api/admin/iso27001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_entity', entity: currentTab.entity, versionId: selectedVersionId, input }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Create failed.');
      setCreateJson('{}');
      setMessage('New configuration record created.');
      await load(selectedVersionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create JSON is invalid.');
      setLoading(false);
    }
  }

  async function cloneVersion() {
    if (!selectedVersionId || !newVersion.trim()) return setMessage('Enter a new framework version label.');
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/iso27001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone_version', sourceVersionId: selectedVersionId, newVersion: newVersion.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Version clone failed.');
      setNewVersion('');
      setMessage('Draft version cloned successfully.');
      await load(String(data.result.versionId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Version clone failed.');
      setLoading(false);
    }
  }

  async function setVersionStatus(status: string) {
    if (!selectedVersionId) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/iso27001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_version_status', versionId: selectedVersionId, status }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Version status update failed.');
      setMessage('Framework status updated to ' + status + '.');
      await load(selectedVersionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Version status update failed.');
      setLoading(false);
    }
  }

  function exportSnapshot() {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'RTI-ISO27001-' + String(snapshot.selectedVersion.version || 'framework') + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importSnapshot() {
    if (!snapshot || !editable) return;
    setLoading(true);
    setMessage('');
    try {
      const imported = JSON.parse(importText) as Partial<Snapshot>;
      const mappings: Array<[keyof Snapshot, string]> = [
        ['questions','question'],['sections','section'],['controls','control'],['responseOptions','response_option'],
        ['scoringRules','scoring_rule'],['maturityLevels','maturity_level'],['gates','gate'],
        ['evidenceStatuses','evidence_status'],['gapRules','gap_rule'],['roadmapRules','roadmap_rule'],
        ['recommendationRules','recommendation_rule'],['serviceMappings','service_mapping'],['reportTemplates','report_template'],
      ];
      let updated = 0;
      for (const [collection, entity] of mappings) {
        const rows = imported[collection];
        if (!Array.isArray(rows)) continue;
        for (const row of rows as Row[]) {
          if (!row.id) continue;
          const response = await fetch('/api/admin/iso27001', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity, id: row.id, patch: row }),
          });
          if (response.ok) updated += 1;
        }
      }
      setMessage('Import completed. Updated ' + updated + ' matching configuration records.');
      setImportText('');
      await load(selectedVersionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import JSON is invalid.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-gold-300">
                <ShieldCheck className="h-4 w-4" /> Admin · Diagnostic Tools
              </div>
              <h1 className="mt-3 text-2xl font-black text-navy-900 sm:text-3xl">ISO/IEC 27001 Readiness CMS</h1>
              <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted">
                Manage the versioned question bank, Annex A diagnostic layer, deterministic scoring, evidence maturity, readiness gates, recommendations, report content and AI routing metadata without redeploying the application.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/system" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">System Setup</Link>
              <Link href="/admin/parameters" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">Lead & CTA Settings</Link>
              <button onClick={() => load(selectedVersionId || undefined)} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</button>
            </div>
          </div>

          {snapshot && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-grey-50 p-3">
              <label className="text-xs font-bold text-navy-900">Framework version
                <select value={selectedVersionId} onChange={(e) => load(e.target.value)} className="ml-2 rounded-lg border border-line bg-white px-3 py-2 text-xs">
                  {snapshot.versions.map((version) => <option key={String(version.id)} value={String(version.id)}>{String(version.version)} · {String(version.status)}</option>)}
                </select>
              </label>
              <span className={editable ? 'rounded-full bg-amber-50 px-3 py-1 text-[10px] font-extrabold text-amber-800' : 'rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700'}>
                {editable ? 'EDITABLE ' + selectedStatus : 'IMMUTABLE ' + selectedStatus}
              </span>
            </div>
          )}
        </section>

        {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">{message}</div>}

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="sticky top-4 rounded-2xl border border-line bg-white p-2 shadow-sm">
              {tabs.map((item) => (
                <button key={item.key} onClick={() => { setTab(item.key); setMessage(''); }} className={tab === item.key ? 'w-full rounded-xl bg-navy-900 px-3 py-3 text-left text-xs font-extrabold text-white' : 'w-full rounded-xl px-3 py-3 text-left text-xs font-bold text-navy-900 hover:bg-grey-50'}>
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4 lg:col-span-9">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-navy-900">{currentTab.label}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{currentTab.description}</p>
            </div>

            {loading && !snapshot && <div className="rounded-2xl border border-line bg-white p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /><p className="mt-2 text-xs font-bold text-navy-900">Loading ISO CMS…</p></div>}

            {snapshot && tab === 'overview' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Question Bank', snapshot.statistics.questions],
                    ['Quick Scan', snapshot.statistics.quickQuestions],
                    ['Annex A Controls', snapshot.statistics.annexControls],
                    ['Assessments on Version', snapshot.statistics.assessments],
                  ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-line bg-white p-5 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div><div className="mt-2 text-3xl font-black text-navy-900">{String(value)}</div></div>)}
                </div>
                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-extrabold text-navy-900">Framework integrity</h3>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">{snapshot.statistics.annexControls === 93 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />} Annex A active/control records: {snapshot.statistics.annexControls} / 93</div>
                    <div className="flex items-center gap-2">{snapshot.statistics.quickQuestions >= 25 && snapshot.statistics.quickQuestions <= 40 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />} Quick Scan question count: {snapshot.statistics.quickQuestions} (target 25–40)</div>
                    <div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-600" /> Existing assessments remain pinned to their framework version ID.</div>
                  </div>
                </div>
              </>
            )}

            {snapshot && tab === 'lead' && (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <h3 className="text-sm font-extrabold text-navy-900">ISO 27001 Lead & CTA Parameters</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Contact, consultation, duration, and disclaimer values are stored in system_parameters under the ISO 27001 scalar group and can be updated without redeployment.
                </p>
                <Link href="/admin/parameters" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white">
                  <Settings2 className="h-4 w-4" /> Open Parameter Manager
                </Link>
              </div>
            )}

            {snapshot && tab === 'version' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-extrabold text-navy-900">Clone Current Version</h3>
                  <p className="mt-1 text-xs text-muted">Published/archived versions are immutable. Clone first, then edit the Draft.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} placeholder="ISO27001-2022-RTI-v1.1" className="min-h-11 flex-1 rounded-xl border border-line px-3 text-sm" />
                    <button onClick={cloneVersion} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 text-xs font-extrabold text-white"><Copy className="h-4 w-4" /> Duplicate to Draft</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-extrabold text-navy-900">Lifecycle</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Draft','Review','Published','Archived'].map((status) => <button key={status} onClick={() => setVersionStatus(status)} disabled={loading || selectedStatus === status} className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-navy-900 disabled:opacity-40">{status}</button>)}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">Publishing runs integrity gates including 93 Annex A controls, 25–40 Quick Scan questions, response scale completeness, and core deterministic scoring rules. Publishing archives the previous Published version without changing historical assessments.</p>
                </div>
              </div>
            )}

            {snapshot && tab === 'audit' && (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="space-y-2">
                  {snapshot.auditLogs.length === 0 ? <p className="text-xs text-muted">No ISO diagnostic audit records yet.</p> : snapshot.auditLogs.map((row) => <div key={String(row.id)} className="rounded-xl border border-line bg-grey-50 p-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-extrabold text-navy-900">{String(row.action)}</span><span className="text-[10px] text-muted">{String(row.createdAt)}</span></div><div className="mt-1 text-[11px] text-muted">{String(row.objectType)} · {String(row.objectId || 'n/a')} · actor {String(row.actorType)}</div></div>)}
                </div>
              </div>
            )}

            {snapshot && currentTab.collection && tab !== 'audit' && (
              <>
                {!editable && currentTab.entity && currentTab.entity !== 'ai_provider' && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />This framework is immutable. Clone it to a Draft before changing content.</div>
                )}

                <div className="space-y-3">
                  {rowsForCurrentTab().map((row) => {
                    const draft = rowDraft(row);
                    return (
                      <div key={String(row.id || JSON.stringify(row))} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Object.entries(draft).map(([key, value]) => fieldEditor(draft, key, value, (next) => patchLocal(row, key, next)))}
                        </div>
                        {currentTab.entity && (
                          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                            <button onClick={() => deactivate(row)} disabled={loading || (!editable && currentTab.entity !== 'ai_provider')} className="rounded-lg border border-line px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-30">Deactivate</button>
                            <button onClick={() => saveRow(row)} disabled={loading || (!editable && currentTab.entity !== 'ai_provider')} className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-3 py-2 text-[11px] font-extrabold text-navy-900 disabled:opacity-30"><Save className="h-3.5 w-3.5" /> Save</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {currentTab.entity && currentTab.entity !== 'ai_provider' && editable && (
                  <div className="rounded-2xl border border-dashed border-gold-500/60 bg-amber-50/40 p-5">
                    <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-gold-700" /><h3 className="text-sm font-extrabold text-navy-900">Add Configuration Record</h3></div>
                    <p className="mt-1 text-[11px] text-muted">Advanced admin input. Supply only the fields required by this configuration type. For a new question, include sectionId.</p>
                    <textarea rows={6} value={createJson} onChange={(e) => setCreateJson(e.target.value)} className="mt-3 w-full rounded-xl border border-line bg-white p-3 font-mono text-xs" />
                    <button onClick={createEntity} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white"><Plus className="h-4 w-4" /> Add Record</button>
                  </div>
                )}
              </>
            )}

            {snapshot && tab === 'overview' && (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportSnapshot} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900"><Download className="h-4 w-4" /> Export Configuration JSON</button>
                  <Link href="/admin/parameters" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900"><Settings2 className="h-4 w-4" /> Edit CTA / Contact Parameters</Link>
                </div>
                {editable && (
                  <div className="mt-5 border-t border-line pt-5">
                    <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-blue-600" /><h3 className="text-sm font-extrabold text-navy-900">Import Matching Configuration JSON</h3></div>
                    <p className="mt-1 text-[11px] text-muted">Imports only records whose IDs match the selected Draft/Review version. Use Version Management to duplicate a framework before bulk editing.</p>
                    <textarea rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="{ ... exported configuration ... }" className="mt-3 w-full rounded-xl border border-line p-3 font-mono text-xs" />
                    <button onClick={importSnapshot} disabled={!importText.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-30"><FileJson className="h-4 w-4" /> Import Updates</button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
