'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
} from 'lucide-react';

export default function SecurityHeadersCheckPage() {
  const [domain, setDomain] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorized) {
      alert('Mohon centang kotak persetujuan wewenang atas domain.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/tools/headers-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, authorized }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Pemeriksaan gagal.');
      }
    } catch (err: any) {
      setError(err.message || 'Kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5" />
              Passive Baseline Check
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Website Security Headers Check
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Passively analyze your public domain for modern defensive HTTP headers (CSP, HSTS, X-Frame-Options) with strict anti-SSRF protections.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Input Form */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm">
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Target Domain or Hostname
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-line text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !domain.trim() || !authorized}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-navy-900 text-white hover:bg-navy-700 transition disabled:opacity-40"
                    aria-label="Scan Domain"
                  >
                    <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Mandatory Authorization Checkbox */}
              <div>
                <label className="flex items-start gap-2.5 text-xs text-navy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    className="mt-0.5 rounded text-gold-500 focus:ring-gold-500 h-4 w-4 border-line"
                  />
                  <span className="text-muted leading-relaxed">
                    Saya menyatakan secara sah berwenang untuk memeriksa domain ini, atau domain ini merupakan domain publik milik organisasi saya.
                  </span>
                </label>
              </div>

              <div className="text-[11px] text-slate-400 bg-grey-50 p-3 rounded-lg border border-line">
                <strong>Catatan Keamanan:</strong> Pengujian ini bersifat 100% pasif (hanya 1 permintaan HTTP HEAD/GET tunggal untuk membaca header respons publik). Tanpa port scanning, crawling, ataupun fuzzing.
              </div>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Analyzed Host: <strong className="text-navy-900">{result.domain}</strong>
                  </span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Resolved IP: {result.ip} &bull; HTTP Status: {result.statusCode}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted block">Security Grade</span>
                    <span className="text-xs font-bold text-navy-900">{result.score}/100 Pts</span>
                  </div>
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${
                      result.score >= 80
                        ? 'bg-emerald-500 text-white shadow-md'
                        : result.score >= 50
                        ? 'bg-gold-500 text-navy-900 shadow-md'
                        : 'bg-rose-600 text-white shadow-md'
                    }`}
                  >
                    {result.grade}
                  </div>
                </div>
              </div>

              {/* Headers Breakdown */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-navy-900">
                  HTTP Security Headers Breakdown:
                </h3>

                <div className="space-y-2">
                  {Object.entries(result.headers).map(([name, item]: [string, any]) => (
                    <div
                      key={name}
                      className="p-3.5 rounded-xl border border-line bg-grey-50 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-navy-900">{name}</div>
                        <div className="font-mono text-[11px] text-muted break-all">
                          {item.value}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                          item.present
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.present ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {item.present ? 'Configured' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps CTA */}
              <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 bg-beige-50 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-xs text-navy-900">
                    Need a Comprehensive Vulnerability Assessment?
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">
                    Security headers are only one layer. Our offensive VAPT service tests business logic, authentication, and APIs.
                  </p>
                </div>
                <Link
                  href="/services/cybersecurity/offensive"
                  className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-700 transition shrink-0"
                >
                  Schedule VAPT &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
