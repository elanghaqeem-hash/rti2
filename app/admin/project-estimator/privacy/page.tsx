'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';

type Retention = {
  retentionDays:number;
  cutoffAt:string;
  candidateCount:number;
  candidates:Array<{sessionId:string;status:string;createdAt:string}>;
};

export default function EstimatorPrivacyPage(){
  const [data,setData]=useState<Retention|null>(null);
  const [message,setMessage]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [working,setWorking]=useState(false);

  const load=async()=>{
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/v1/admin/project-estimator/retention',{cache:'no-store'});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Retention preview unavailable.');
      setData(body.retention);
    }catch(error){setMessage(error instanceof Error?error.message:'Retention preview unavailable.');}
    finally{setWorking(false);}
  };

  useEffect(()=>{void load();},[]);

  const run=async()=>{
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/v1/admin/project-estimator/retention',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({confirmation}),
      });
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Retention run failed.');
      setData(body.retention);
      setConfirmation('');
      setMessage('Retention selesai: '+body.result.anonymizedCount+' session dianonimkan, '+body.result.deletedDocumentCount+' document object dan '+body.result.deletedAttachmentCount+' attachment object diproses.');
    }catch(error){setMessage(error instanceof Error?error.message:'Retention run failed.');}
    finally{setWorking(false);}
  };

  return <main className="min-h-screen bg-grey-50 py-8">
    <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold-300"><ShieldCheck className="h-3.5 w-3.5"/>Privacy & Retention</div>
            <h1 className="mt-3 text-2xl font-extrabold text-navy-900">Estimator Data Retention</h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">Session abandoned yang melewati retention window dianonimkan. Draft document/attachment object juga dihapus dari private storage bila tidak berlanjut ke quotation/opportunity.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/project-estimator/policy" className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900">Policy</Link>
            <button onClick={()=>void load()} disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"><RefreshCw className={(working?'animate-spin ':'')+'h-4 w-4'}/>Refresh</button>
          </div>
        </div>
      </header>

      {message&&<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">{message}</div>}

      {data&&<>
        <section className="grid gap-3 sm:grid-cols-3">
          <Card label="Retention Window" value={data.retentionDays+' days'}/>
          <Card label="Cutoff" value={new Date(data.cutoffAt).toLocaleDateString('id-ID')}/>
          <Card label="Candidates" value={String(data.candidateCount)}/>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-navy-900">Anonymization Preview</h2>
          <p className="mt-1 text-[11px] text-muted">Daftar hanya menampilkan technical session identifier, status, dan timestamp; tidak menampilkan PII.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-grey-50 text-[10px] font-extrabold uppercase text-muted"><tr><th className="px-3 py-2">Session</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.candidates.map((item)=><tr key={item.sessionId}><td className="px-3 py-3 font-mono text-[10px]">{item.sessionId}</td><td className="px-3 py-3">{item.status}</td><td className="px-3 py-3">{new Date(item.createdAt).toLocaleString('id-ID')}</td></tr>)}
                {!data.candidates.length&&<tr><td colSpan={3} className="px-3 py-8 text-center text-muted">Tidak ada session yang memenuhi kriteria retention.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-2 text-sm font-extrabold text-rose-900"><Trash2 className="h-4 w-4"/>Run Anonymization</div>
          <p className="mt-2 text-[11px] leading-relaxed text-rose-800">Tindakan ini menghapus PII, resume token, scope messages, provenance evidence, abandoned draft RFQ, serta private document objects untuk session yang memenuhi kriteria. Project estimate non-PII dapat dipertahankan untuk aggregate accuracy analytics.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} placeholder="ANONYMIZE EXPIRED SESSIONS" className="min-h-11 flex-1 rounded-xl border border-rose-200 bg-white px-3 text-xs"/>
            <button onClick={()=>void run()} disabled={working||confirmation!=='ANONYMIZE EXPIRED SESSIONS'||data.candidateCount===0} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">Anonymize Eligible Sessions</button>
          </div>
        </section>
      </>}
    </div>
  </main>;
}

function Card({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-line bg-white p-4 shadow-sm"><div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</div><div className="mt-2 text-lg font-extrabold text-navy-900">{value}</div></div>;}
