'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Save, Settings2 } from 'lucide-react';

type Dashboard = {
  categories: Array<{ id: string; slug: string; name: string; description: string; sortOrder: number; active: boolean }>;
  services: Array<{ id: string; categoryId: string; categoryName: string; slug: string; name: string; description: string; baseEffortDays: number; basePriceMin: number; basePriceMax: number; durationMinWeeks: number; durationMaxWeeks: number; active: boolean }>;
  settings: Array<{ key: string; label: string; value: string; public: boolean }>;
  questions: Array<{ id: string; serviceId: string | null; serviceName: string; key: string; label: string; helpText: string; fieldType: string; required: boolean; dimension: string | null; weight: number; quickMode: boolean; detailedMode: boolean; active: boolean; sortOrder: number }>;
  questionConditions: Array<{ id: string; questionId: string; sourceQuestionKey: string; operator: string; compareValue: string; active: boolean }>;
  questionOptions: Array<{ id: string; questionId: string; value: string; label: string; score: number; effortMultiplier: number; priceMultiplier: number; sortOrder: number; active: boolean }>;
  rules: Array<{ id: string; serviceId: string | null; serviceName: string; name: string; conditionsJson: string; effectsJson: string; sortOrder: number; active: boolean }>;
  resources: Array<{ id: string; roleKey: string; name: string; internalDayRate: number | null; active: boolean }>;
  serviceDependencies: Array<{ serviceId: string; serviceName: string; relatedServiceId: string; relatedServiceName: string; relationType: 'requires' | 'recommends'; reason: string; sortOrder: number; active: boolean }>;
  serviceResources: Array<{ serviceId: string; serviceName: string; resourceRoleId: string; resourceName: string; quantity: number; effortShare: number }>;
};

const fieldTypes = ['text','number','currency','date','dropdown','multiselect','radio','checkbox','slider','file','textarea'];
const dimensions = ['scope','technology','integration','security','regulatory','data','organization','timeline','resource','dependency'];

export default function EstimatorConfigurationPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'catalog'|'questions'|'rules'|'resources'|'settings'>('catalog');
  const [category, setCategory] = useState({ name: '', slug: '', description: '', sortOrder: 100 });
  const [service, setService] = useState({ categoryId: '', name: '', slug: '', description: '', baseEffortDays: 5, basePriceMin: 0, basePriceMax: 0, durationMinWeeks: 1, durationMaxWeeks: 2 });
  const [question, setQuestion] = useState({ serviceId: '', key: '', label: '', helpText: '', fieldType: 'radio', required: true, dimension: 'scope', weight: 1, sortOrder: 100, quickMode: true, detailedMode: true });
  const [option, setOption] = useState({ questionId: '', value: '', label: '', score: 3, effortMultiplier: 1, priceMultiplier: 1, sortOrder: 100 });
  const [condition, setCondition] = useState({ questionId: '', sourceQuestionKey: '', operator: 'equals', compareValue: '' });
  const [rule, setRule] = useState({ serviceId: '', name: '', conditionsJson: '[]', effectsJson: '{"complexityDelta":0,"effortMultiplier":1,"priceMultiplier":1}', sortOrder: 100, active: true });
  const [resource, setResource] = useState({ roleKey: '', name: '', internalDayRate: '' });
  const [assignment, setAssignment] = useState({ serviceId: '', resourceRoleId: '', quantity: 1, effortShare: 0.2 });
  const [dependency, setDependency] = useState({ serviceId: '', relatedServiceId: '', relationType: 'recommends' as 'requires' | 'recommends', reason: '', sortOrder: 100 });

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/admin/project-estimator', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Configuration tidak dapat dimuat.');
      setData(body.dashboard);
      setService((current) => ({ ...current, categoryId: current.categoryId || body.dashboard.categories?.[0]?.id || '' }));
      setQuestion((current) => ({ ...current, serviceId: current.serviceId || body.dashboard.services?.[0]?.id || '' }));
      setOption((current) => ({ ...current, questionId: current.questionId || body.dashboard.questions?.[0]?.id || '' }));
      setCondition((current) => ({
        ...current,
        questionId: current.questionId || body.dashboard.questions?.[0]?.id || '',
        sourceQuestionKey: current.sourceQuestionKey || body.dashboard.questions?.[0]?.key || '',
      }));
      setAssignment((current) => ({
        ...current,
        serviceId: current.serviceId || body.dashboard.services?.[0]?.id || '',
        resourceRoleId: current.resourceRoleId || body.dashboard.resources?.[0]?.id || '',
      }));
      setDependency((current) => ({
        ...current,
        serviceId: current.serviceId || body.dashboard.services?.[0]?.id || '',
        relatedServiceId: current.relatedServiceId || body.dashboard.services?.[1]?.id || body.dashboard.services?.[0]?.id || '',
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Configuration tidak dapat dimuat.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patch = async (payload: Record<string, unknown>, success: string) => {
    setMessage('');
    const response = await fetch('/api/v1/admin/project-estimator', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(body?.error || 'Perubahan gagal disimpan.');
      return false;
    }
    setData(body.dashboard);
    setMessage(success);
    return true;
  };

  const selectedQuestionOptions = useMemo(
    () => (data?.questionOptions || []).filter((item) => item.questionId === option.questionId),
    [data, option.questionId],
  );

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-300">
                <Settings2 className="h-3.5 w-3.5" /> Estimator Configuration
              </div>
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Database-Driven Configuration Center</h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
                Tambah kategori/layanan, pertanyaan, opsi scoring, rules, resource assumptions dan operational settings tanpa deployment source code.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/project-estimator" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">RFQ Dashboard</Link>
              <Link href="/admin/project-estimator/policy" className="rounded-xl border border-gold-500/40 bg-gold-500/5 px-4 py-2.5 text-xs font-extrabold text-navy-900">Policy Simulation</Link>
              <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </div>
          </div>
        </header>

        {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">{message}</div>}

        {data && (
          <>
            <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-sm">
              {[
                ['catalog','Catalog'],
                ['questions','Question Engine'],
                ['rules','Rules'],
                ['resources','Resources'],
                ['settings','Settings'],
              ].map(([value,label]) => (
                <button key={value} onClick={() => setSection(value as typeof section)} className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-xs font-extrabold ${section === value ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-grey-50'}`}>{label}</button>
              ))}
            </nav>

            {section === 'catalog' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Add Service Category">
                  <Text label="Name" value={category.name} onChange={(v) => setCategory({ ...category, name: v })} />
                  <Text label="Slug (optional)" value={category.slug} onChange={(v) => setCategory({ ...category, slug: v })} />
                  <Text label="Description" value={category.description} onChange={(v) => setCategory({ ...category, description: v })} />
                  <Num label="Sort order" value={category.sortOrder} onChange={(v) => setCategory({ ...category, sortOrder: v })} />
                  <Action label="Add Category" onClick={() => patch({ action: 'category', category }, 'Kategori layanan ditambahkan.').then((ok) => ok && setCategory({ name:'', slug:'', description:'', sortOrder:100 }))} />
                </Panel>

                <Panel title="Add Service">
                  <Select label="Category" value={service.categoryId} onChange={(v) => setService({ ...service, categoryId: v })} options={data.categories.filter((item) => item.active).map((item) => [item.id, item.name])} />
                  <Text label="Service name" value={service.name} onChange={(v) => setService({ ...service, name: v })} />
                  <Text label="Slug (optional)" value={service.slug} onChange={(v) => setService({ ...service, slug: v })} />
                  <Text label="Description" value={service.description} onChange={(v) => setService({ ...service, description: v })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Num label="Base effort days" value={service.baseEffortDays} onChange={(v) => setService({ ...service, baseEffortDays: v })} />
                    <Num label="Duration max weeks" value={service.durationMaxWeeks} onChange={(v) => setService({ ...service, durationMaxWeeks: v })} />
                    <Num label="Price min" value={service.basePriceMin} onChange={(v) => setService({ ...service, basePriceMin: v })} />
                    <Num label="Price max" value={service.basePriceMax} onChange={(v) => setService({ ...service, basePriceMax: v })} />
                  </div>
                  <Action label="Add Service" onClick={() => patch({ action: 'create_service', service }, 'Service baru ditambahkan.')} />
                </Panel>

                <Panel title="Service Dependency / Recommendation">
                  <Select label="Primary service" value={dependency.serviceId} onChange={(v) => setDependency({ ...dependency, serviceId: v })} options={data.services.map((item) => [item.id, item.name])} />
                  <Select label="Related service" value={dependency.relatedServiceId} onChange={(v) => setDependency({ ...dependency, relatedServiceId: v })} options={data.services.map((item) => [item.id, item.name])} />
                  <Select label="Relationship" value={dependency.relationType} onChange={(v) => setDependency({ ...dependency, relationType: v === 'requires' ? 'requires' : 'recommends' })} options={[['recommends','Recommends'],['requires','Requires']]} />
                  <Text label="Reason" value={dependency.reason} onChange={(v) => setDependency({ ...dependency, reason: v })} />
                  <Num label="Sort order" value={dependency.sortOrder} onChange={(v) => setDependency({ ...dependency, sortOrder: v })} />
                  <Action label="Save Relationship" onClick={() => patch({ action: 'service_dependency', dependency }, 'Service relationship diperbarui.')} />
                  <div className="mt-4 space-y-2">
                    {data.serviceDependencies.map((item) => (
                      <div key={`${item.serviceId}:${item.relatedServiceId}:${item.relationType}`} className="rounded-lg bg-grey-50 px-3 py-2 text-xs">
                        <strong>{item.serviceName}</strong>
                        <span className="mx-2 font-extrabold text-gold-700">{item.relationType === 'requires' ? 'requires' : 'recommends'}</span>
                        <strong>{item.relatedServiceName}</strong>
                        {item.reason && <div className="mt-1 text-[10px] text-muted">{item.reason}</div>}
                      </div>
                    ))}
                  </div>
                </Panel>

                <div className="lg:col-span-2 rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Active Catalog</h2>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {data.services.map((item) => <div key={item.id} className="rounded-xl border border-line p-3"><div className="text-[10px] font-bold uppercase text-muted">{item.categoryName}</div><div className="mt-1 text-xs font-extrabold text-navy-900">{item.name}</div><div className="mt-1 font-mono text-[10px] text-muted">{item.slug}</div></div>)}
                  </div>
                </div>
              </div>
            )}

            {section === 'questions' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Add Dynamic Question">
                  <Select label="Service" value={question.serviceId} onChange={(v) => setQuestion({ ...question, serviceId: v })} options={[['','Common / all services'], ...data.services.filter((item) => item.active).map((item) => [item.id, item.name] as [string,string])]} />
                  <Text label="Question key" value={question.key} onChange={(v) => setQuestion({ ...question, key: v })} />
                  <Text label="Question label" value={question.label} onChange={(v) => setQuestion({ ...question, label: v })} />
                  <Text label="Help text" value={question.helpText} onChange={(v) => setQuestion({ ...question, helpText: v })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Field type" value={question.fieldType} onChange={(v) => setQuestion({ ...question, fieldType: v })} options={fieldTypes.map((v) => [v,v])} />
                    <Select label="Complexity dimension" value={question.dimension} onChange={(v) => setQuestion({ ...question, dimension: v })} options={[['','Non-scoring'], ...dimensions.map((v) => [v,v] as [string,string])]} />
                    <Num label="Weight" value={question.weight} step="0.1" onChange={(v) => setQuestion({ ...question, weight: v })} />
                    <Num label="Sort order" value={question.sortOrder} onChange={(v) => setQuestion({ ...question, sortOrder: v })} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-navy-900">
                    <Check label="Required" checked={question.required} onChange={(v) => setQuestion({ ...question, required: v })} />
                    <Check label="Quick mode" checked={question.quickMode} onChange={(v) => setQuestion({ ...question, quickMode: v })} />
                    <Check label="Detailed mode" checked={question.detailedMode} onChange={(v) => setQuestion({ ...question, detailedMode: v })} />
                  </div>
                  <Action label="Add Question" onClick={() => patch({ action: 'create_question', question }, 'Question baru ditambahkan.')} />
                </Panel>

                <Panel title="Add / Update Question Option">
                  <Select label="Question" value={option.questionId} onChange={(v) => setOption({ ...option, questionId: v })} options={data.questions.map((item) => [item.id, `${item.serviceName} · ${item.label}`])} />
                  <Text label="Value / key" value={option.value} onChange={(v) => setOption({ ...option, value: v })} />
                  <Text label="Label" value={option.label} onChange={(v) => setOption({ ...option, label: v })} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Num label="Score 1–5" value={option.score} step="0.1" onChange={(v) => setOption({ ...option, score: v })} />
                    <Num label="Effort multiplier" value={option.effortMultiplier} step="0.05" onChange={(v) => setOption({ ...option, effortMultiplier: v })} />
                    <Num label="Price multiplier" value={option.priceMultiplier} step="0.05" onChange={(v) => setOption({ ...option, priceMultiplier: v })} />
                  </div>
                  <Action label="Add Option" onClick={() => patch({ action: 'question_option', option }, 'Question option ditambahkan.')} />
                  <div className="mt-4 space-y-2">{selectedQuestionOptions.map((item) => <div key={item.id} className="rounded-lg bg-grey-50 px-3 py-2 text-xs"><strong>{item.label}</strong><span className="ml-2 text-muted">score {item.score} · effort ×{item.effortMultiplier} · price ×{item.priceMultiplier}</span></div>)}</div>
                </Panel>

                <Panel title="Conditional Visibility">
                  <Select label="Target question" value={condition.questionId} onChange={(v) => setCondition({ ...condition, questionId: v })} options={data.questions.map((item) => [item.id, `${item.serviceName} · ${item.label}`])} />
                  <Select label="Source question" value={condition.sourceQuestionKey} onChange={(v) => setCondition({ ...condition, sourceQuestionKey: v })} options={data.questions.map((item) => [item.key, `${item.serviceName} · ${item.label}`])} />
                  <Select label="Operator" value={condition.operator} onChange={(v) => setCondition({ ...condition, operator: v })} options={['equals','not_equals','includes','gt','gte','lt','lte','truthy','falsy'].map((value) => [value,value])} />
                  {!['truthy','falsy'].includes(condition.operator) && <Text label="Compare value" value={condition.compareValue} onChange={(v) => setCondition({ ...condition, compareValue: v })} />}
                  <Action label="Add Condition" onClick={() => patch({ action: 'question_condition', condition }, 'Conditional visibility rule ditambahkan.')} />
                  <div className="mt-4 space-y-2">
                    {data.questionConditions.map((item) => {
                      const target = data.questions.find((q) => q.id === item.questionId);
                      return (
                        <div key={item.id} className="rounded-lg bg-grey-50 px-3 py-2 text-xs">
                          <strong>{target?.label || item.questionId}</strong>
                          <div className="mt-1 font-mono text-[10px] text-muted">IF {item.sourceQuestionKey} {item.operator} {item.compareValue || ''}</div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            )}

            {section === 'rules' && (
              <div className="space-y-5">
                <Panel title="Create Rule">
                  <Select label="Service" value={rule.serviceId} onChange={(v) => setRule({ ...rule, serviceId: v })} options={[['','Common / all services'], ...data.services.map((item) => [item.id,item.name] as [string,string])]} />
                  <Text label="Rule name" value={rule.name} onChange={(v) => setRule({ ...rule, name: v })} />
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">Conditions JSON<textarea value={rule.conditionsJson} onChange={(e) => setRule({ ...rule, conditionsJson: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-line p-3 font-mono text-xs" /></label>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">Effects JSON<textarea value={rule.effectsJson} onChange={(e) => setRule({ ...rule, effectsJson: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-line p-3 font-mono text-xs" /></label>
                  <Action label="Create Rule" onClick={() => patch({ action: 'rule', rule }, 'Rule estimator ditambahkan.')} />
                </Panel>
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.rules.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.serviceName}</div>
                      <div className="mt-1 text-sm font-extrabold text-navy-900">{item.name}</div>
                      <pre className="mt-3 overflow-auto rounded-xl bg-grey-50 p-3 text-[10px] text-navy-900">{item.conditionsJson}</pre>
                      <pre className="mt-2 overflow-auto rounded-xl bg-grey-50 p-3 text-[10px] text-navy-900">{item.effectsJson}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'resources' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Add Resource Role">
                  <Text label="Role key" value={resource.roleKey} onChange={(v) => setResource({ ...resource, roleKey: v })} />
                  <Text label="Role name" value={resource.name} onChange={(v) => setResource({ ...resource, name: v })} />
                  <Text label="Internal day rate (optional, never public)" value={resource.internalDayRate} onChange={(v) => setResource({ ...resource, internalDayRate: v })} />
                  <Action label="Add Resource" onClick={() => patch({ action: 'resource', resource: { ...resource, internalDayRate: resource.internalDayRate ? Number(resource.internalDayRate) : null } }, 'Resource role ditambahkan.')} />
                </Panel>
                <Panel title="Assign Resource to Service">
                  <Select label="Service" value={assignment.serviceId} onChange={(v) => setAssignment({ ...assignment, serviceId: v })} options={data.services.map((item) => [item.id,item.name])} />
                  <Select label="Resource role" value={assignment.resourceRoleId} onChange={(v) => setAssignment({ ...assignment, resourceRoleId: v })} options={data.resources.map((item) => [item.id,item.name])} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Num label="Quantity" value={assignment.quantity} step="0.1" onChange={(v) => setAssignment({ ...assignment, quantity: v })} />
                    <Num label="Effort share (0–1)" value={assignment.effortShare} step="0.05" onChange={(v) => setAssignment({ ...assignment, effortShare: v })} />
                  </div>
                  <Action label="Save Assignment" onClick={() => patch({ action: 'service_resource', serviceResource: assignment }, 'Resource assumption diperbarui.')} />
                </Panel>
                <div className="lg:col-span-2 rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Resource Defaults</h2>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data.serviceResources.map((item) => <div key={`${item.serviceId}:${item.resourceRoleId}`} className="rounded-xl border border-line p-3 text-xs"><strong>{item.serviceName}</strong><div className="mt-1 text-muted">{item.resourceName} × {item.quantity} · effort share {item.effortShare}</div></div>)}</div>
                </div>
              </div>
            )}

            {section === 'settings' && (
              <div className="space-y-3">
                {data.settings.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-navy-900">{item.label}</div>
                        <div className="mt-1 font-mono text-[10px] text-muted">{item.key} · {item.public ? 'PUBLIC' : 'INTERNAL'}</div>
                        <textarea value={item.value} onChange={(e) => setData((current) => current ? { ...current, settings: current.settings.map((setting) => setting.key === item.key ? { ...setting, value: e.target.value } : setting) } : current)} className="mt-2 min-h-20 w-full rounded-xl border border-line p-3 text-xs" />
                      </div>
                      <button onClick={() => patch({ action: 'setting', key: item.key, value: item.value }, `Setting ${item.label} diperbarui.`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900"><Save className="h-4 w-4" /> Save</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!data && !loading && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs text-amber-900">Apply migration 0003 from Admin → System Setup before using this configuration center.</div>}
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-sm"><h2 className="text-sm font-extrabold text-navy-900">{title}</h2>{children}</section>;
}
function Text({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-semibold normal-case text-navy-900" /></label>;
}
function Num({ label, value, onChange, step='1' }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}<input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-semibold normal-case text-navy-900" /></label>;
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string,string]> }) {
  return <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-semibold normal-case text-navy-900">{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="inline-flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900"><Plus className="h-4 w-4" />{label}</button>;
}
