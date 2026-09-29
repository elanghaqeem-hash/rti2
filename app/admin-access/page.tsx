'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';

export default function AdminAccessPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || 'Login admin gagal.');
        return;
      }

      router.replace(data?.mustChangePassword ? '/admin/change-password' : '/admin/system');
      router.refresh();
    } catch {
      setError('Koneksi ke layanan autentikasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-navy-900 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-navy-700 bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15">
            <ShieldCheck className="h-6 w-6 text-gold-700" />
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-700">
              RTI Secure Administration
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-navy-900">
              Internal Sign In
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Akses internal RTI menggunakan akun bernama dan role sesuai tanggung jawab. Hak akses ditentukan oleh permission server-side.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-navy-900">
                Username
              </label>
              <input
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-navy-900">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-line py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            >
              <LogIn className="h-4 w-4 text-gold-400" />
              {loading ? 'Memverifikasi...' : 'Masuk ke RTI Internal'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
