'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FlaskConical, RefreshCw, Save, ShieldCheck } from 'lucide-react';

type Policy = {
  id: string; version: string; floorMargin: number; premiumFactor: number; rushFactor: number;
  marketAdjustment: number; minMarginAlert: number; status: 'draft'|'active'|'retired';
  notes: string; updatedAt: string;
};
type Governance = {
  policies: Policy[];
  segments: Array<{code:string;name:string;multiplier:number;needsCalibration:boolean}>;
  resources: Array<{id:string;roleKey:string;name:string;internalDayRate:number|null;active:boolean;calibrated:boolean}>;
  approvalRules: Array<{id:string;name:string;approvalLevel:string;approverRole:string;needsCalibration:boolean;active:boolean}>;
  decisions: Array<{code:string;title:string;status:'pending'|'confirmed';decision:any;decidedBy?:string|null;decidedAt?:string|null}>;
  simulations: Array<{id:string;policyVersionId?:string|null;sampleSize:number;includedCount:number;excludedCount:number;result:any;actor:string;createdAt:string}>;
};
type Candidate = {
  id?: string; version: string; floorMargin: number; premiumFactor: number; rushFactor: number;
  marketAdjustment: number; minMarginAlert: number; notes: string;
};

function money(value:number){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value||0));}
function fromPolicy(policy?:Policy|null):Candidate{return {
  id:policy?.id,version:policy?.version||'',floorMargin:policy?.floorMargin??0.2,premiumFactor:policy?.premiumFactor??1.25,
  rushFactor:policy?.rushFactor??1.25,marketAdjustment:policy?.marketAdjustment??1,minMarginAlert:policy?.minMarginAlert??0.25,notes:policy?.notes||''
};}

export default function EstimatorPolicyPage(){
  const [data,setData]=useState<Governance|null>(null);
  const [selectedId,setSelectedId]=useState('');
  const [candidate,setCandidate]=useState<Candidate>(fromPolicy(null));
  const [simulation,setSimulation]=useState<any>(null);
  const [checks,setChecks]=useState<any>(null);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [approvalNote,setApprovalNote]=useState('');
  const [publishPhrase,setPublishPhrase]=useState('');
  const [decisionNotes,setDecisionNotes]=useState<Record<string,string>>({});

  const load=async()=>{
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/v1/admin/project-estimator/policy',{cache:'no-store'});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Policy governance tidak dapat dimuat.');
      const governance=body.governance as Governance;
      setData(governance);
      const preferred=governance.policies.find((item)=>item.status==='draft')||governance.policies.find((item)=>item.status==='active')||governance.policies[0];
      if(preferred){setSelectedId(preferred.id);setCandidate(fromPolicy(preferred));}
    }catch(error){setMessage(error instanceof Error?error.message:'Policy governance tidak dapat dimuat.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  const post=async(payload:Record<string,unknown>)=>{
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/v1/admin/project-estimator/policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Policy action failed.');
      if(body.governance)setData(body.governance);
      return body;
    }catch(error){setMessage(error instanceof Error?error.message:'Policy action failed.');return null;}
    finally{setWorking(false);}
  };

  if(loading)return <main className="min-h-[60vh] bg-grey-50 flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-gold-600"/></main>;
  if(!data)return <main className="min-h-[60vh] bg-grey-50 p-8"><div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-sm text-amber-900">{message||'Policy governance unavailable.'}</div></main>;

  const selected=data.policies.find((item)=>item.id===selectedId)||null;
  const pendingDecisions=data.decisions.filter((item)=>item.status!=='confirmed').length;
  const pendingSegments=data.segments.filter((item)=>item.needsCalibration).length;
  const missingRates=data.resources.filter((item)=>item.active&&!item.calibrated).length;
  const pendingApprovals=data.approvalRules.filter((item)=>item.active&&item.needsCalibration).length;
  const latestSimulation=simulation||data.simulations[0]?.result||null;

  return <main className="min-h-screen bg-grey-50 py-8">
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300"><ShieldCheck className="h-3.5 w-3.5"/>Pricing Policy Governance</div>
            <h1 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">Policy, Calibration & 20-Session Impact Simulation</h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">Policy hanya dapat dipublish setelah simulation terbaru, rate card, segment multiplier, approval matrix, dan keputusan K-1–K-8 lulus readiness gate.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/project-estimator/configuration" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">Configuration</Link>
            <Link href="/admin/project-estimator" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">RFQ Dashboard</Link>
            <button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white"><RefreshCw className="h-4 w-4"/>Refresh</button>
          </div>
        </div>
      </header>

      {message&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Status label="Open Decisions" value={pendingDecisions}/>
        <Status label="Uncalibrated Segments" value={pendingSegments}/>
        <Status label="Missing Active Rates" value={missingRates}/>
        <Status label="Approval Rules Pending" value={pendingApprovals}/>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-sm font-extrabold text-navy-900">Policy Draft</h2><p className="mt-1 text-[11px] text-muted">Active/retired policy read-only. Clone untuk membuat versi baru.</p></div>
            <select value={selectedId} onChange={(e)=>{const id=e.target.value;const p=data.policies.find((item)=>item.id===id);setSelectedId(id);setCandidate(fromPolicy(p));setSimulation(null);setChecks(null);}} className="rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-navy-900">
              {data.policies.map((p)=><option key={p.id} value={p.id}>{p.version+' · '+p.status}</option>)}
            </select>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Text label="Version" value={candidate.version} disabled={selected?.status!=='draft'} onChange={(v)=>setCandidate({...candidate,version:v})}/>
            <Num label="Floor margin" value={candidate.floorMargin} disabled={selected?.status!=='draft'} onChange={(v)=>setCandidate({...candidate,floorMargin:v})}/>
            <Num label="Premium factor" value={candidate.premiumFactor} disabled={selected?.status!=='draft'} onChange={(v)=>setCandidate({...candidate,premiumFactor:v})}/>
            <Num label="Rush factor" value={candidate.rushFactor} disabled={selected?.status!=='draft'} onChange={(v)=>setCandidate({...candidate,rushFactor:v})}/>
            <Num label="Market adjustment" value={candidate.marketAdjustment} disabled={selected?.status!=='draft'} onChange={(v)=>setCandidate({...candidate,marketAdjustment:v})}/>
            <Num label="Minimum margin alert" value={candidate.minMarginAlert} disabled={selected?.status!=='draft'} onChange={(v)=>setCandidate({...candidate,minMarginAlert:v})}/>
          </div>
          <label className="mt-4 block text-xs font-bold text-navy-900">Notes<textarea rows={3} value={candidate.notes} disabled={selected?.status!=='draft'} onChange={(e)=>setCandidate({...candidate,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal disabled:bg-grey-50"/></label>
          <div className="mt-5 flex flex-wrap gap-2">
            {selected?.status==='draft'?<>
              <button disabled={working} onClick={async()=>{const b=await post({action:'save_policy',policy:candidate});if(b){setSelectedId(String(b.result?.id||selectedId));setMessage('Draft policy disimpan. Simulation perlu dijalankan ulang setelah perubahan.');}}} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"><Save className="h-4 w-4"/>Save Draft</button>
              <button disabled={working} onClick={async()=>{const b=await post({action:'simulate',policyVersionId:selected.id,candidate});if(b?.result){setSimulation(b.result);setChecks(null);setMessage('Simulation selesai: '+b.result.includedCount+' included, '+b.result.excludedCount+' excluded.');}}} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-900 disabled:opacity-40"><FlaskConical className="h-4 w-4"/>Simulate Last 20 Sessions</button>
            </>:<button disabled={working||!selected} onClick={async()=>{if(!selected)return;const version=selected.version+'-draft';const b=await post({action:'clone_policy',sourceId:selected.id,version});if(b?.result?.id){const created=b.governance?.policies?.find((item:Policy)=>item.id===b.result.id);setSelectedId(b.result.id);setCandidate(fromPolicy(created));setMessage('Draft policy baru dibuat.');}}} className="min-h-11 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">Clone as New Draft</button>}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-extrabold text-navy-900">Readiness Snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Floor Margin" value={(candidate.floorMargin*100).toFixed(1)+'%'}/>
            <Metric label="Premium" value={candidate.premiumFactor.toFixed(2)+'×'}/>
            <Metric label="Rush" value={candidate.rushFactor.toFixed(2)+'×'}/>
            <Metric label="Market Adj." value={candidate.marketAdjustment.toFixed(2)+'×'}/>
            <Metric label="Margin Alert" value={(candidate.minMarginAlert*100).toFixed(1)+'%'}/>
            <Metric label="Status" value={selected?.status||'draft'}/>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-900">Seed komersial tetap berstatus KALIBRASI RTI sampai keputusan dan readiness gate dikonfirmasi. Sistem tidak mempublish seed secara otomatis.</div>
        </div>
      </section>

      {latestSimulation&&<section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-sm font-extrabold text-navy-900">Impact Simulation</h2><p className="mt-1 text-[11px] text-muted">Maksimal 20 session terbaru dengan internal cost yang dapat ditelusuri.</p></div>
          <div className="text-right"><div className="text-[9px] font-extrabold uppercase text-muted">Standard Delta</div><div className="text-lg font-extrabold text-navy-900">{money(latestSimulation.totals?.standardDelta||0)+' · '+Number(latestSimulation.totals?.standardDeltaPct||0).toFixed(2)+'%'}</div></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Current Standard" value={money(latestSimulation.totals?.currentStandard||0)}/>
          <Metric label="Candidate Standard" value={money(latestSimulation.totals?.candidateStandard||0)}/>
          <Metric label="Current Floor" value={money(latestSimulation.totals?.currentFloor||0)}/>
          <Metric label="Candidate Floor" value={money(latestSimulation.totals?.candidateFloor||0)}/>
        </div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-grey-50 text-[10px] font-extrabold uppercase text-muted"><tr><th className="px-3 py-2">Project</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Segment</th><th className="px-3 py-2">Internal Cost</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">Candidate</th><th className="px-3 py-2">Delta</th></tr></thead>
          <tbody className="divide-y divide-line">{(latestSimulation.rows||[]).map((row:any)=><tr key={row.sessionId}><td className="px-3 py-3 font-bold text-navy-900">{row.projectName}</td><td className="px-3 py-3 text-muted">{row.serviceName}</td><td className="px-3 py-3">{row.segmentCode}</td><td className="px-3 py-3">{row.included?money(row.internalCost):'Excluded'}</td><td className="px-3 py-3">{row.current?money(row.current.standard):'—'}</td><td className="px-3 py-3">{row.candidate?money(row.candidate.standard):'—'}</td><td className="px-3 py-3 font-bold">{row.included?money(row.standardDelta)+' · '+row.standardDeltaPct+'%':row.reason}</td></tr>)}</tbody>
        </table></div>
      </section>}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-navy-900">Client Segment Calibration</h2>
          <div className="mt-4 space-y-3">{data.segments.map((segment)=><Segment key={segment.code} segment={segment} disabled={working} onSave={async(multiplier,confirmed)=>{const b=await post({action:'segment',segment:{code:segment.code,multiplier,confirmed}});if(b)setMessage(segment.code+' updated.');}}/>)}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-navy-900">Approval Matrix Calibration</h2>
          <div className="mt-4 space-y-2">{data.approvalRules.map((rule)=><div key={rule.id} className="rounded-xl border border-line p-3 text-xs"><div className="flex justify-between gap-2"><strong>{rule.name}</strong><span className={(rule.needsCalibration?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700')+' rounded-full px-2 py-0.5 text-[9px] font-extrabold'}>{rule.needsCalibration?'KALIBRASI RTI':'CONFIRMED'}</span></div><div className="mt-1 text-[10px] text-muted">{rule.approvalLevel+' · '+rule.approverRole}</div></div>)}</div>
          <textarea rows={3} value={approvalNote} onChange={(e)=>setApprovalNote(e.target.value)} placeholder="Management calibration note..." className="mt-4 w-full rounded-xl border border-line px-3 py-2.5 text-xs"/>
          <button disabled={working||approvalNote.trim().length<10} onClick={async()=>{const b=await post({action:'confirm_approval_matrix',note:approvalNote});if(b){setApprovalNote('');setMessage('Approval matrix calibration confirmed with audit trail.');}}} className="mt-2 min-h-11 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">Confirm Approval Matrix</button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-extrabold text-navy-900">Go-Live Decisions K-1–K-8</h2>
        <p className="mt-1 text-[11px] text-muted">Keputusan tidak diasumsikan. Catat keputusan/evidence sebelum status Confirmed.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{data.decisions.map((decision)=><div key={decision.code} className="rounded-xl border border-line p-4">
          <div className="flex justify-between gap-3"><div><div className="text-[10px] font-extrabold text-gold-700">{decision.code}</div><div className="mt-1 text-xs font-extrabold text-navy-900">{decision.title}</div></div><span className={(decision.status==='confirmed'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700')+' h-fit rounded-full px-2 py-1 text-[9px] font-extrabold uppercase'}>{decision.status}</span></div>
          {decision.decision&&<div className="mt-2 rounded-lg bg-grey-50 p-2 text-[10px] text-muted">{JSON.stringify(decision.decision)}</div>}
          <textarea rows={2} value={decisionNotes[decision.code]||''} onChange={(e)=>setDecisionNotes({...decisionNotes,[decision.code]:e.target.value})} placeholder="Decision / evidence note..." className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-[11px]"/>
          <div className="mt-2 flex gap-2"><button disabled={working||!(decisionNotes[decision.code]||'').trim()} onClick={async()=>{const note=decisionNotes[decision.code]||'';const b=await post({action:'decision',decision:{code:decision.code,status:'confirmed',decision:note}});if(b){setDecisionNotes({...decisionNotes,[decision.code]:''});setMessage(decision.code+' confirmed.');}}} className="rounded-lg bg-navy-900 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-40">Confirm</button>
          {decision.status==='confirmed'&&<button disabled={working} onClick={async()=>{const b=await post({action:'decision',decision:{code:decision.code,status:'pending',decision:'Reopened for review.'}});if(b)setMessage(decision.code+' reopened.');}} className="rounded-lg border border-line px-3 py-2 text-[10px] font-bold text-navy-900">Reopen</button>}</div>
        </div>)}</div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-sm font-extrabold text-navy-900">Publish Readiness Gate</h2><p className="mt-1 text-[11px] text-muted">Run checks setelah policy dan simulation terakhir disimpan.</p></div>
          <button disabled={working||selected?.status!=='draft'} onClick={async()=>{const b=await post({action:'checks',policyVersionId:selectedId});if(b?.result){setChecks(b.result);setMessage(b.result.canPublish?'All blocking policy checks passed.':'Policy remains blocked.');}}} className="min-h-11 rounded-xl border border-navy-900 px-4 py-2.5 text-xs font-extrabold text-navy-900 disabled:opacity-40">Run Publish Checks</button>
        </div>
        {checks&&<div className="mt-4 grid gap-2 md:grid-cols-2">{checks.checks.map((check:any)=><div key={check.code} className={(check.status==='block'?'border-rose-200 bg-rose-50':check.status==='warn'?'border-amber-200 bg-amber-50':'border-emerald-200 bg-emerald-50')+' rounded-xl border p-3'}><div className="flex items-center gap-2">{check.status==='pass'?<CheckCircle2 className="h-4 w-4 text-emerald-700"/>:<AlertTriangle className="h-4 w-4 text-amber-700"/>}<span className="text-[10px] font-extrabold text-navy-900">{check.code}</span></div><p className="mt-1 text-[11px] leading-relaxed text-muted">{check.message}</p></div>)}</div>}
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="text-xs font-extrabold text-rose-900">Production Policy Publication</div><p className="mt-1 text-[10px] text-rose-800">Ketik <strong>PUBLISH RTI POLICY</strong> hanya setelah seluruh check lulus.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={publishPhrase} onChange={(e)=>setPublishPhrase(e.target.value)} placeholder="PUBLISH RTI POLICY" className="min-h-11 flex-1 rounded-xl border border-rose-200 bg-white px-3 text-xs"/><button disabled={working||selected?.status!=='draft'||publishPhrase!=='PUBLISH RTI POLICY'||!checks?.canPublish} onClick={async()=>{const b=await post({action:'publish',policyVersionId:selectedId,confirmation:publishPhrase});if(b){setPublishPhrase('');setChecks(null);setMessage('Policy published; prior active policy retired.');}}} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">Publish Policy</button></div>
        </div>
      </section>
    </div>
  </main>;
}

function Status({label,value}:{label:string;value:number}){const ok=value===0;return <div className="rounded-2xl border border-line bg-white p-4 shadow-sm"><div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</div><div className={(ok?'text-emerald-700':'text-amber-700')+' mt-2 text-2xl font-extrabold'}>{value}</div><div className="mt-1 text-[10px] text-muted">{ok?'Ready':'Needs action'}</div></div>;}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-line bg-grey-50 p-3"><div className="text-[9px] font-extrabold uppercase tracking-wider text-muted">{label}</div><div className="mt-1 text-sm font-extrabold text-navy-900">{value}</div></div>;}
function Text({label,value,disabled,onChange}:{label:string;value:string;disabled?:boolean;onChange:(v:string)=>void}){return <label className="text-xs font-bold text-navy-900">{label}<input value={value} disabled={disabled} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal disabled:bg-grey-50"/></label>;}
function Num({label,value,disabled,onChange}:{label:string;value:number;disabled?:boolean;onChange:(v:number)=>void}){return <label className="text-xs font-bold text-navy-900">{label}<input type="number" step="0.01" value={value} disabled={disabled} onChange={(e)=>onChange(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-xs font-normal disabled:bg-grey-50"/></label>;}
function Segment({segment,disabled,onSave}:{segment:Governance['segments'][number];disabled:boolean;onSave:(m:number,c:boolean)=>Promise<void>}){const [m,setM]=useState(segment.multiplier);const [c,setC]=useState(!segment.needsCalibration);useEffect(()=>{setM(segment.multiplier);setC(!segment.needsCalibration);},[segment.multiplier,segment.needsCalibration]);return <div className="rounded-xl border border-line p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-xs font-extrabold text-navy-900">{segment.code+' · '+segment.name}</div><div className="text-[10px] text-muted">{segment.needsCalibration?'KALIBRASI RTI':'Confirmed'}</div></div><input type="number" min="0.5" max="3" step="0.05" value={m} onChange={(e)=>setM(Number(e.target.value))} className="w-24 rounded-lg border border-line px-2 py-2 text-xs"/><label className="flex items-center gap-2 text-[10px] font-bold"><input type="checkbox" checked={c} onChange={(e)=>setC(e.target.checked)}/>Confirmed</label><button disabled={disabled} onClick={()=>void onSave(m,c)} className="rounded-lg bg-navy-900 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-40">Save</button></div></div>;}
