'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Database,
  LogOut,
  PlayCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

type Status = {
  databasePath: string;
  connected: boolean;
  applied: string[];
  pending: string[];
  tables: {
    leads: boolean;
    systemParameters: boolean;
    nistAssessments: boolean;
    nistQuestions: boolean;
  };
};

export default function AdminSystemPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/system/setup', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(null);
        setMessage(data?.error || 'Gagal memeriksa database.');
        return;
      }
      setStatus(data.status);
    } catch {
      setStatus(null);
      setMessage('Koneksi pemeriksaan sistem gagal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runSetup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/system/setup', {
        method: 'POST',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error || 'Setup database gagal.');
        return;
      }
      setStatus(data.status);
      setMessage('Database RTI berhasil diinisialisasi dan migration telah diverifikasi.');
    } catch {
      setMessage('Eksekusi setup database gagal.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/admin-access';
  };

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Only
              </div>
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
                RTI System Setup
              </h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
                Inisialisasi database dan migration dilakukan dari server produksi RTI.
                Tidak ada dependency terhadap Cloudflare D1 untuk proses ini.
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/parameters" className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-gold-500">
            <Settings2 className="h-5 w-5 text-gold-700" />
            <div className="mt-2 text-sm font-extrabold text-navy-900">Parameter Manager</div>
          </Link>
          <Link href="/admin/leads" className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-gold-500">
            <Database className="h-5 w-5 text-blue-600" />
            <div className="mt-2 text-sm font-extrabold text-navy-900">Lead Database</div>
          </Link>
          <Link href="/admin/nist" className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-gold-500">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <div className="mt-2 text-sm font-extrabold text-navy-900">NIST Cyber Quick Check Admin</div>
          </Link>
          <button onClick={load} className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm hover:border-gold-500">
            <RefreshCw className={`h-5 w-5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <div className="mt-2 text-sm font-extrabold text-navy-900">Refresh Status</div>
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-navy-900">Database Initialization</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Tombol ini hanya tersedia setelah login Admin. Eksekusi bersifat idempotent:
            migration yang sudah tercatat tidak dijalankan ulang.
          </p>

          {status && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-grey-50 p-4">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Database</div>
                <div className="mt-1 flex items-center gap-2 text-xs font-bold text-navy-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {status.connected ? 'Connected' : 'Unavailable'}
                </div>
                <div className="mt-2 break-all font-mono text-[10px] text-muted">{status.databasePath}</div>
              </div>

              <div className="rounded-xl border border-line bg-grey-50 p-4">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Tables</div>
                <div className="mt-1 text-xs text-navy-900">
                  leads: <strong>{status.tables.leads ? 'READY' : 'PENDING'}</strong>
                  <br />
                  system_parameters: <strong>{status.tables.systemParameters ? 'READY' : 'PENDING'}</strong>
                  <br />
                  nist_assessments: <strong>{status.tables.nistAssessments ? 'READY' : 'PENDING'}</strong>
                  <br />
                  nist_questions: <strong>{status.tables.nistQuestions ? 'READY' : 'PENDING'}</strong>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-grey-50 p-4 sm:col-span-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Migration</div>
                <div className="mt-2 text-xs text-navy-900">
                  Applied: {status.applied.length ? status.applied.join(', ') : 'belum ada'}
                </div>
                <div className="mt-1 text-xs text-navy-900">
                  Pending: {status.pending.length ? status.pending.join(', ') : 'tidak ada'}
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              {message}
            </div>
          )}

          <button
            onClick={runSetup}
            disabled={loading}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-extrabold text-navy-900 hover:bg-gold-300 disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" />
            {loading ? 'Menjalankan...' : 'Initialize / Apply Pending Migrations'}
          </button>
        </div>
      </div>
    </main>
  );
}
