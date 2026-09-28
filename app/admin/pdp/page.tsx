'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

type Dashboard = {
  config: any;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    averageScore: number | null;
    averageEvidence: number | null;
  };
  assessments: any[];
  topGaps: any[];
  auditLogs: any[];
};

type Tab = 'overview' | 'questions' | 'scoring' | 'services' | 'assessments' | 'audit';

export default function PdpAdminPage() {
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [tab, setTab] = React.useState<Tab>('overview');
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/pdp', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'PDP admin unavailable.');
      setDashboard(data.dashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PDP admin unavailable.');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function patch(entity: string, key: string, changes: Record<string, unknown>) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/pdp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, key, changes }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Update failed.');
      setDashboard(data.dashboard);
      setMessage('Configuration saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-gold-300">
                <ShieldCheck className="h-4 w-4" /> Admin · Diagnostic Tools
              </div>
              <h1 className="mt-3 text-2xl font-black text-navy-900 sm:text-3xl">
                UU PDP Readiness CMS
              </h1>
              <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted">
                Kelola question bank, evidence maturity, scoring, readiness gates, service mapping,
                analytics assessment, dan audit trail tanpa mengubah source code.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/parameters" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">
                <Settings2 className="h-4 w-4" /> CTA & System Parameters
              </Link>
              <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">
                <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside>
            <div className="sticky top-4 rounded-2xl border border-line bg-white p-2 shadow-sm">
              {([
                ['overview','Overview'],
                ['questions','Question Bank'],
                ['scoring','Scoring & Gates'],
                ['services','Service Mapping'],
                ['assessments','Assessments'],
                ['audit','Audit Log'],
              ] as Array<[Tab,string]>).map(([key,label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={
                    'w-full rounded-xl px-3 py-3 text-left text-xs font-bold ' +
                    (tab === key ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-grey-50')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-5">
            {loading && !dashboard && (
              <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-sm">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                <p className="mt-2 text-xs font-bold text-navy-900">Loading PDP CMS…</p>
              </div>
            )}

            {dashboard && tab === 'overview' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ['Total Assessments', dashboard.stats.total],
                    ['Completed', dashboard.stats.completed],
                    ['In Progress', dashboard.stats.inProgress],
                    ['Average Readiness', dashboard.stats.averageScore == null ? '—' : dashboard.stats.averageScore + '%'],
                    ['Average Evidence', dashboard.stats.averageEvidence == null ? '—' : dashboard.stats.averageEvidence + '%'],
                  ].map(([label,value]) => (
                    <div key={String(label)} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
                      <div className="mt-2 text-2xl font-black text-navy-900">{String(value)}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-extrabold text-navy-900">Framework Health</h2>
                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex items-center gap-2">
                        {dashboard.config.domains.filter((d: any) => d.active !== false).length === 7 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        7 readiness domains: {dashboard.config.domains.filter((d: any) => d.active !== false).length}
                      </div>
                      <div className="flex items-center gap-2">
                        {dashboard.config.questions.filter((q: any) => q.active !== false).length === 42 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        Detailed questions: {dashboard.config.questions.filter((q: any) => q.active !== false).length} / 42
                      </div>
                      <div className="flex items-center gap-2">
                        {dashboard.config.questions.filter((q: any) => q.active !== false && q.isCore).length === 14 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        Quick Scan questions: {dashboard.config.questions.filter((q: any) => q.active !== false && q.isCore).length} / 14
                      </div>
                      <div className="flex items-center gap-2">
                        {dashboard.config.readinessGates.filter((g: any) => g.active !== false).length === 7 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        Readiness gates: {dashboard.config.readinessGates.filter((g: any) => g.active !== false).length} / 7
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-extrabold text-navy-900">Most Frequent Priority Gaps</h2>
                    <div className="mt-4 space-y-2">
                      {dashboard.topGaps.length === 0 ? (
                        <p className="text-xs text-muted">Belum ada completed assessment yang menghasilkan gap data.</p>
                      ) : dashboard.topGaps.slice(0, 8).map((gap) => (
                        <div key={String(gap.question_code) + String(gap.severity)} className="rounded-xl border border-line bg-grey-50 p-3">
                          <div className="flex justify-between gap-3">
                            <span className="text-[10px] font-extrabold text-blue-700">{String(gap.question_code)} · {String(gap.domain_code)}</span>
                            <span className="text-[10px] font-bold text-muted">{String(gap.occurrences)}x</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-navy-900">{String(gap.title)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Operational Links</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['/tools/pdp-readiness','Open Public PDP Tool','Production UX'],
                      ['/admin/parameters','Parameter Manager','CTA, duration, disclaimer'],
                      ['/admin/system','Database & Migrations','Protected schema setup'],
                      ['/admin/leads','Lead Management','Consultation conversion'],
                    ].map(([href,title,desc]) => (
                      <Link key={href} href={href} className="rounded-xl border border-line bg-grey-50 p-4 hover:border-gold-400">
                        <div className="text-xs font-extrabold text-navy-900">{title}</div>
                        <div className="mt-1 text-[10px] text-muted">{desc}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}

            {dashboard && tab === 'questions' && (
              <div className="space-y-4">
                {dashboard.config.domains.map((domain: any) => (
                  <div key={domain.code} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">{domain.code}</div>
                        <h2 className="text-base font-black text-navy-900">{domain.name}</h2>
                        <p className="mt-1 text-xs text-muted">{domain.description}</p>
                      </div>
                      <DomainEditor
                        frameworkVersion={dashboard.config.frameworkVersion}
                        domain={domain}
                        onSave={patch}
                      />
                    </div>

                    <div className="mt-5 space-y-3">
                      {dashboard.config.questions
                        .filter((question: any) => question.domainCode === domain.code)
                        .map((question: any) => (
                          <QuestionEditor key={question.id} question={question} onSave={patch} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dashboard && tab === 'scoring' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Scoring Weights</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {dashboard.config.scoringWeights.map((item: any) => (
                      <ScoringWeightEditor key={item.key} item={item} onSave={patch} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Readiness Thresholds</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {dashboard.config.scoringThresholds.map((item: any) => (
                      <ThresholdEditor key={item.key} item={item} onSave={patch} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">7 Readiness Gates</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {dashboard.config.readinessGates.map((item: any) => (
                      <GateEditor key={item.key} item={item} evidenceOptions={dashboard.config.evidenceOptions} onSave={patch} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Answer / Maturity Options</h2>
                  <p className="mt-1 text-xs text-muted">Label dan score dapat dikelola admin; opsi Not Applicable tetap menggunakan score null.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {dashboard.config.answerOptions.map((item: any) => (
                      <AnswerOptionEditor key={item.value} item={item} onSave={patch} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-navy-900">Evidence Maturity</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {dashboard.config.evidenceOptions.map((item: any) => (
                      <EvidenceEditor key={item.value} item={item} onSave={patch} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboard && tab === 'services' && (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-navy-900">RTI Service Recommendation Mapping</h2>
                <div className="mt-4 space-y-3">
                  {dashboard.config.serviceMappings.map((item: any) => (
                    <ServiceEditor key={item.id} item={item} onSave={patch} />
                  ))}
                </div>
              </div>
            )}

            {dashboard && tab === 'assessments' && (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead>
                      <tr className="border-b border-line text-[9px] font-extrabold uppercase tracking-wider text-muted">
                        <th className="px-2 py-2">Organization</th>
                        <th className="px-2 py-2">Industry</th>
                        <th className="px-2 py-2">Type</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Score</th>
                        <th className="px-2 py-2">Evidence</th>
                        <th className="px-2 py-2">Gates</th>
                        <th className="px-2 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.assessments.map((item) => (
                        <tr key={String(item.id)} className="border-b border-line text-[10px] text-navy-900">
                          <td className="px-2 py-2 font-bold">{String(item.company_name)}</td>
                          <td className="px-2 py-2">{String(item.industry)}</td>
                          <td className="px-2 py-2">{String(item.assessment_type)}</td>
                          <td className="px-2 py-2">{String(item.status)}</td>
                          <td className="px-2 py-2">{item.overall_score == null ? '—' : String(item.overall_score) + '%'}</td>
                          <td className="px-2 py-2">{item.evidence_score == null ? '—' : String(item.evidence_score) + '%'}</td>
                          <td className="px-2 py-2">{String(item.gates_completed || 0)}/7</td>
                          <td className="px-2 py-2">{String(item.completed_at || item.started_at).slice(0,10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dashboard && tab === 'audit' && (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="max-h-[620px] overflow-auto">
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
                          <td className="px-2 py-2">{String(log.resource_type)} {log.resource_id ? '· ' + String(log.resource_id) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function DomainEditor({ frameworkVersion, domain, onSave }: any) {
  const [name, setName] = React.useState(domain.name);
  const [description, setDescription] = React.useState(domain.description);
  const [weight, setWeight] = React.useState(domain.weight);
  const [active, setActive] = React.useState(domain.active !== false);
  return (
    <div className="grid min-w-[280px] gap-2 sm:grid-cols-[1fr_80px_40px]">
      <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-[10px]" />
      <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="rounded-lg border border-line px-2 py-1.5 text-[10px]" />
      <button onClick={() => onSave('domain', frameworkVersion + '::' + domain.code, { name, description, weight, active })} className="rounded-lg bg-gold-500 p-2 text-navy-900"><Save className="h-3.5 w-3.5" /></button>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-lg border border-line px-2 py-1.5 text-[10px] sm:col-span-3" />
      <label className="flex items-center gap-2 text-[10px] font-bold text-navy-900 sm:col-span-3"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active domain</label>
    </div>
  );
}

function QuestionEditor({ question, onSave }: any) {
  const [questionText, setQuestionText] = React.useState(question.questionText);
  const [legalReference, setLegalReference] = React.useState(question.legalReference || '');
  const [helpText, setHelpText] = React.useState(question.helpText || '');
  const [expectedEvidence, setExpectedEvidence] = React.useState(question.expectedEvidence || '');
  const [riskIfMissing, setRiskIfMissing] = React.useState(question.riskIfMissing || '');
  const [recommendation, setRecommendation] = React.useState(question.recommendation || '');
  const [criticality, setCriticality] = React.useState(question.criticality);
  const [weight, setWeight] = React.useState(question.weight);
  const [isCore, setIsCore] = React.useState(question.isCore);
  const [active, setActive] = React.useState(question.active !== false);

  return (
    <details className="rounded-xl border border-line bg-grey-50">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-extrabold text-blue-700">{question.questionCode} · {question.criticality}</div>
            <div className="mt-1 text-xs font-bold text-navy-900">{question.questionText}</div>
          </div>
          <div className="text-[10px] text-muted">{question.isCore ? 'Quick + Detailed' : 'Detailed only'}</div>
        </div>
      </summary>
      <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
        <label className="text-[10px] font-bold text-navy-900 md:col-span-2">Question<textarea rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <label className="text-[10px] font-bold text-navy-900">Legal reference<input value={legalReference} onChange={(e) => setLegalReference(e.target.value)} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <label className="text-[10px] font-bold text-navy-900">Criticality<select value={criticality} onChange={(e) => setCriticality(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white p-2 text-xs font-normal"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
        <label className="text-[10px] font-bold text-navy-900 md:col-span-2">Guidance<textarea rows={2} value={helpText} onChange={(e) => setHelpText(e.target.value)} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <label className="text-[10px] font-bold text-navy-900">Expected evidence<textarea rows={3} value={expectedEvidence} onChange={(e) => setExpectedEvidence(e.target.value)} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <label className="text-[10px] font-bold text-navy-900">Risk if missing<textarea rows={3} value={riskIfMissing} onChange={(e) => setRiskIfMissing(e.target.value)} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <label className="text-[10px] font-bold text-navy-900 md:col-span-2">Recommendation<textarea rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <label className="text-[10px] font-bold text-navy-900">Weight<input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-line p-2 text-xs font-normal" /></label>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-[10px] font-bold text-navy-900"><input type="checkbox" checked={isCore} onChange={(e) => setIsCore(e.target.checked)} /> Quick Scan</label>
          <label className="flex items-center gap-2 text-[10px] font-bold text-navy-900"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
          <button onClick={() => onSave('question', question.id, { questionText, legalReference, helpText, expectedEvidence, riskIfMissing, recommendation, criticality, weight, isCore, active })} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-gold-500 px-3 py-2 text-[10px] font-extrabold text-navy-900"><Save className="h-3.5 w-3.5" /> Save</button>
        </div>
      </div>
    </details>
  );
}

function ScoringWeightEditor({ item, onSave }: any) {
  const [weight, setWeight] = React.useState(item.weight);
  return <div className="rounded-xl border border-line bg-grey-50 p-4"><div className="text-xs font-extrabold text-navy-900">{item.label}</div><div className="mt-3 flex gap-2"><input type="number" step="0.05" min="0" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full rounded-lg border border-line p-2 text-xs" /><button onClick={() => onSave('scoring-weight', item.key, { weight })} className="rounded-lg bg-gold-500 p-2"><Save className="h-4 w-4" /></button></div></div>;
}

function ThresholdEditor({ item, onSave }: any) {
  const [label, setLabel] = React.useState(item.label);
  const [minScore, setMinScore] = React.useState(item.minScore);
  const [maxScore, setMaxScore] = React.useState(item.maxScore);
  return <div className="rounded-xl border border-line bg-grey-50 p-4"><input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-line p-2 text-xs font-bold" /><div className="mt-2 grid grid-cols-[1fr_1fr_40px] gap-2"><input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="rounded-lg border border-line p-2 text-xs" /><input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} className="rounded-lg border border-line p-2 text-xs" /><button onClick={() => onSave('threshold', item.key, { label, minScore, maxScore })} className="rounded-lg bg-gold-500 p-2"><Save className="h-4 w-4" /></button></div></div>;
}

function GateEditor({ item, evidenceOptions, onSave }: any) {
  const [label, setLabel] = React.useState(item.label);
  const [minimumScore, setMinimumScore] = React.useState(item.minimumScore);
  const [evidenceMinimum, setEvidenceMinimum] = React.useState(item.evidenceMinimum);
  const [active, setActive] = React.useState(item.active !== false);
  return (
    <div className="rounded-xl border border-line bg-grey-50 p-4">
      <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-line p-2 text-xs font-bold" />
      <div className="mt-2 grid grid-cols-[1fr_1fr_40px] gap-2">
        <input type="number" min="0" max="100" value={minimumScore} onChange={(e) => setMinimumScore(Number(e.target.value))} className="rounded-lg border border-line p-2 text-xs" />
        <select value={evidenceMinimum} onChange={(e) => setEvidenceMinimum(e.target.value)} className="rounded-lg border border-line bg-white p-2 text-xs">
          {evidenceOptions.map((e: any) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={() => onSave('gate', item.key, { label, minimumScore, evidenceMinimum, active })} className="rounded-lg bg-gold-500 p-2"><Save className="h-4 w-4" /></button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[10px] font-bold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active gate</label>
    </div>
  );
}

function AnswerOptionEditor({ item, onSave }: any) {
  const [label, setLabel] = React.useState(item.label);
  const [description, setDescription] = React.useState(item.description);
  const [score, setScore] = React.useState(item.score == null ? '' : String(item.score));
  const [active, setActive] = React.useState(item.active !== false);
  return (
    <div className="rounded-xl border border-line bg-grey-50 p-4">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">{item.value}</div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-2 w-full rounded-lg border border-line p-2 text-xs font-bold" />
      <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full rounded-lg border border-line p-2 text-xs" />
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          min="0"
          max="100"
          disabled={item.isNa}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder={item.isNa ? 'N/A' : 'Score'}
          className="w-full rounded-lg border border-line p-2 text-xs disabled:bg-slate-100"
        />
        <button
          onClick={() => onSave('answer-option', item.value, {
            label,
            description,
            score: item.isNa ? null : Number(score),
            active,
          })}
          className="rounded-lg bg-gold-500 p-2"
        >
          <Save className="h-4 w-4" />
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[10px] font-bold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active option
      </label>
    </div>
  );
}

function EvidenceEditor({ item, onSave }: any) {
  const [label, setLabel] = React.useState(item.label);
  const [multiplier, setMultiplier] = React.useState(item.multiplier);
  const [active, setActive] = React.useState(item.active !== false);
  return (
    <div className="rounded-xl border border-line bg-grey-50 p-4">
      <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-line p-2 text-xs font-bold" />
      <div className="mt-2 flex gap-2">
        <input type="number" min="0" max="1" step="0.05" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} className="w-full rounded-lg border border-line p-2 text-xs" />
        <button onClick={() => onSave('evidence-option', item.value, { label, multiplier, active })} className="rounded-lg bg-gold-500 p-2"><Save className="h-4 w-4" /></button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[10px] font-bold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active option</label>
    </div>
  );
}

function ServiceEditor({ item, onSave }: any) {
  const [serviceName, setServiceName] = React.useState(item.serviceName);
  const [reasonTemplate, setReasonTemplate] = React.useState(item.reasonTemplate);
  const [active, setActive] = React.useState(item.active !== false);
  return <div className="rounded-xl border border-line bg-grey-50 p-4"><div className="text-[10px] font-extrabold text-blue-700">{item.domainCode}</div><input value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="mt-2 w-full rounded-lg border border-line p-2 text-xs font-bold" /><textarea rows={2} value={reasonTemplate} onChange={(e) => setReasonTemplate(e.target.value)} className="mt-2 w-full rounded-lg border border-line p-2 text-xs" /><div className="mt-2 flex items-center justify-between"><label className="flex items-center gap-2 text-[10px] font-bold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label><button onClick={() => onSave('service', item.id, { serviceName, reasonTemplate, active })} className="inline-flex items-center gap-1 rounded-lg bg-gold-500 px-3 py-2 text-[10px] font-extrabold"><Save className="h-3.5 w-3.5" /> Save</button></div></div>;
}
