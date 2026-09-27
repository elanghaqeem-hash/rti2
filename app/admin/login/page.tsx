'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@risetin.co.id');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || 'Login admin gagal.');
        return;
      }

      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke layanan autentikasi admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[75vh] bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-gold-400" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">
            Risetin Control Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Akses khusus SUPER_ADMIN untuk CMS, API, SMTP, dan integrasi sistem.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-900">
            <LockKeyhole className="w-4 h-4" />
            Secure administrator sign-in
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Email Admin</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Password</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-navy-900 text-white px-4 py-3 text-sm font-extrabold hover:bg-navy-800 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Masuk sebagai Super Admin'}
          </button>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Kredensial tidak disimpan di source code. Password dan session secret
            dibaca dari secret environment deployment.
          </p>
        </form>
      </div>
    </div>
  );
}
