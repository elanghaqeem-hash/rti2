'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  FileCheck2,
  Loader2,
  MessageSquare,
  RefreshCw,
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

export default function EstimatorClientPortalPage() {
  const [token, setToken] = useState('');
  const [portal, setPortal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState('');

  const load = async (resumeToken: string) => {
    if (!resumeToken) {
      setLoading(false);
      setMessage('Secure portal link is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/v1/project-estimator/portal', {
        cache: 'no-store',
        headers: { 'X-RTI-Resume-Token': resumeToken },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Portal unavailable.');
      setPortal(data.portal);
      setMessage('');
    } catch (error) {
      setPortal(null);
      setMessage(error instanceof Error ? error.message : 'Portal unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const resume = new URLSearchParams(hash).get('resume')?.trim() || '';
    setToken(resume);
    void load(resume);
  }, []);

  const downloadQuotation = async (quotation: any) => {
    setWorking(true);
    try {
      const response = await fetch(`/api/v1/project-estimator/quotation/${quotation.id}/pdf`, {
        cache: 'no-store',
        headers: { 'X-RTI-Resume-Token': token },
      });
      if (!response.ok) throw new Error('Quotation PDF unavailable.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${quotation.docNumber.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setWorking(false);
    }
  };

  const sendMessage = async () => {
    if (!chat.trim() || working) return;
    setWorking(true);
    try {
      const response = await fetch('/api/v1/project-estimator/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeToken: token, content: chat }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Message could not be sent.');
      setPortal(data.portal);
      setChat('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Message could not be sent.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <main className="min-h-[70vh] bg-grey-50 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gold-600" /></main>;
  }

  if (!portal) {
    return (
      <main className="min-h-[70vh] bg-grey-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-gold-600" />
          <h1 className="mt-3 text-xl font-extrabold text-navy-900">Risetin Client Portal</h1>
          <p className="mt-2 text-sm text-muted">{message || 'Secure portal link is required.'}</p>
          <Link href="/estimator" className="mt-5 inline-flex rounded-xl bg-navy-900 px-4 py-3 text-xs font-extrabold text-white">Open Project Estimator</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl bg-navy-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-300">Risetin Client Portal</div>
              <h1 className="mt-2 text-2xl font-extrabold">{portal.input.projectName || 'Project Scoping'}</h1>
              <p className="mt-1 text-sm text-slate-300">{portal.input.profile.companyName} · secure project workspace</p>
            </div>
            <button onClick={() => void load(token)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-navy-500 px-4 py-2 text-xs font-extrabold text-white">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </header>

        {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{message}</div>}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Current Scope</div>
            <div className="mt-3 space-y-2 text-xs">
              <KeyValue label="Service" value={portal.estimate?.serviceName || '-'} />
              <KeyValue label="Mode" value={portal.input.mode} />
              <KeyValue label="Readiness" value={portal.estimate ? `${portal.estimate.readinessScore}%` : '-'} />
              <KeyValue label="Project size" value={portal.estimate?.projectSize || '-'} />
              <KeyValue label="Duration" value={portal.estimate ? `${portal.estimate.durationMinWeeks}–${portal.estimate.durationMaxWeeks} weeks` : '-'} />
            </div>
            <Link href={`/tools/project-estimator#resume=${encodeURIComponent(token)}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-line px-4 py-2 text-[11px] font-extrabold text-navy-900">
              Continue Scoping
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Draft RFQ</div>
            {portal.rfq ? (
              <div className="mt-3">
                <div className="font-mono text-xs font-extrabold text-navy-900">{portal.rfq.rfqNumber}</div>
                <div className="mt-1 text-[10px] text-muted">Version {portal.rfq.version} · {portal.rfq.status}</div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-700"><FileCheck2 className="h-4 w-4" /> RFQ record available</div>
              </div>
            ) : <p className="mt-3 text-xs text-muted">No RFQ generated yet.</p>}
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Commercial Documents</div>
            <div className="mt-3 space-y-3">
              {portal.quotations?.map((quote: any) => (
                <div key={quote.id} className="rounded-xl bg-grey-50 p-3">
                  <div className="font-mono text-[10px] font-extrabold text-muted">{quote.docNumber}</div>
                  <div className="mt-1 text-sm font-extrabold text-navy-900">{money(quote.finalPrice)}</div>
                  <div className="mt-1 text-[9px] text-muted">{quote.status} · valid until {new Date(quote.validUntil).toLocaleDateString('id-ID')}</div>
                  <button disabled={working} onClick={() => void downloadQuotation(quote)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-navy-900 disabled:opacity-50">
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </button>
                </div>
              ))}
              {!portal.quotations?.length && <p className="text-xs text-muted">No approved quotation is available yet.</p>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-navy-900"><MessageSquare className="h-4 w-4 text-gold-600" /> Project Q&A with RTI</div>
            <p className="mt-1 text-[10px] text-muted">Use this channel for scoping clarification. Do not send passwords, credentials, NIK, account numbers, or other unnecessary sensitive data.</p>
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto bg-grey-50/70 p-4">
            {portal.messages?.map((item: any, index: number) => (
              <div key={index} className={`flex ${item.senderType === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-xs leading-relaxed ${item.senderType === 'client' ? 'bg-navy-900 text-white rounded-tr-md' : 'bg-white border border-line text-navy-900 rounded-tl-md'}`}>
                  {item.content}
                  <div className={`mt-1 text-[8px] ${item.senderType === 'client' ? 'text-slate-400' : 'text-muted'}`}>{new Date(item.createdAt).toLocaleString('id-ID')}</div>
                </div>
              </div>
            ))}
            {!portal.messages?.length && <p className="text-center text-xs text-muted">No messages yet.</p>}
          </div>
          <div className="flex gap-2 border-t border-line p-3">
            <textarea value={chat} onChange={(e) => setChat(e.target.value)} rows={2} placeholder="Tulis pertanyaan klarifikasi..." className="min-h-12 flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-xs" />
            <button disabled={working || !chat.trim()} onClick={() => void sendMessage()} className="inline-flex w-12 items-center justify-center rounded-xl bg-gold-500 text-navy-900 disabled:opacity-40" aria-label="Send message">
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </section>

        <div className="text-[10px] leading-relaxed text-muted">
          This portal exposes only client-facing project records. Internal cost, Floor pricing, margin, approval logic, AI audit logs and other client information are not returned by the portal API.
        </div>
      </div>
    </main>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-line py-2 last:border-0"><span className="text-muted">{label}</span><strong className="text-right text-navy-900">{value}</strong></div>;
}
