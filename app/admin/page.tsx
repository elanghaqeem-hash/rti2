'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  TestTube2,
  TriangleAlert,
} from 'lucide-react';

type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'groq'
  | 'openrouter';

type ClientSettings = {
  version: 1;
  updatedAt: string | null;
  cms: {
    heroEyebrow: string;
    heroTitle: string;
    heroHighlight: string;
    positioning: string;
    contactEmail: string;
    phone: string;
    whatsapp: string;
    whatsappUrl: string;
    officeAddress: string;
    bookingUrl: string;
  };
  ai: {
    providerOrder: ProviderId[];
    timeoutMs: number;
    providers: Record<
      ProviderId,
      {
        enabled: boolean;
        model: string;
        apiKeyConfigured: boolean;
      }
    >;
  };
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    fromName: string;
    fromEmail: string;
    replyTo: string;
    passwordConfigured: boolean;
  };
};

type StorageStatus = {
  provider: string;
  configured: boolean;
  missing: string[];
};

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
};

const TABS = [
  { id: 'cms', label: 'CMS', icon: FileText },
  { id: 'ai', label: 'AI & API', icon: Bot },
  { id: 'smtp', label: 'SMTP', icon: Mail },
] as const;

type TabId = (typeof TABS)[number]['id'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
      {children}
    </span>
  );
}

export default function AdminControlCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>('cms');
  const [settings, setSettings] = useState<ClientSettings | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [apiSecrets, setApiSecrets] = useState<
    Partial<Record<ProviderId, string>>
  >({});
  const [smtpPassword, setSmtpPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState<string>('');

  const providerOrder = useMemo(
    () => settings?.ai.providerOrder || [],
    [settings],
  );

  async function loadSettings() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/settings', {
        cache: 'no-store',
      });

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal memuat konfigurasi admin.');
      }

      setSettings(data.settings);
      setStorage(data.storage);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Gagal memuat konfigurasi admin.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateCms(
    key: keyof ClientSettings['cms'],
    value: string,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            cms: { ...current.cms, [key]: value },
          }
        : current,
    );
  }

  function updateSmtp(
    key: keyof ClientSettings['smtp'],
    value: string | number | boolean,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            smtp: { ...current.smtp, [key]: value },
          }
        : current,
    );
  }

  function updateProvider(
    id: ProviderId,
    patch: Partial<ClientSettings['ai']['providers'][ProviderId]>,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            ai: {
              ...current.ai,
              providers: {
                ...current.ai.providers,
                [id]: {
                  ...current.ai.providers[id],
                  ...patch,
                },
              },
            },
          }
        : current,
    );
  }

  function moveProvider(id: ProviderId, direction: -1 | 1) {
    setSettings((current) => {
      if (!current) return current;
      const order = [...current.ai.providerOrder];
      const index = order.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= order.length) {
        return current;
      }
      [order[index], order[target]] = [order[target], order[index]];
      return {
        ...current,
        ai: { ...current.ai, providerOrder: order },
      };
    });
  }

  async function saveAll() {
    if (!settings) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const providers = Object.fromEntries(
        Object.entries(settings.ai.providers).map(([id, provider]) => [
          id,
          {
            enabled: provider.enabled,
            model: provider.model,
            ...(apiSecrets[id as ProviderId]?.trim()
              ? { apiKey: apiSecrets[id as ProviderId]!.trim() }
              : {}),
          },
        ]),
      );

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cms: settings.cms,
          ai: {
            providerOrder: settings.ai.providerOrder,
            timeoutMs: settings.ai.timeoutMs,
            providers,
          },
          smtp: {
            enabled: settings.smtp.enabled,
            host: settings.smtp.host,
            port: settings.smtp.port,
            secure: settings.smtp.secure,
            username: settings.smtp.username,
            fromName: settings.smtp.fromName,
            fromEmail: settings.smtp.fromEmail,
            replyTo: settings.smtp.replyTo,
            ...(smtpPassword.trim()
              ? { password: smtpPassword.trim() }
              : {}),
          },
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal menyimpan konfigurasi.');
      }

      setSettings(data.settings);
      setStorage(data.storage);
      setApiSecrets({});
      setSmtpPassword('');
      setMessage('Konfigurasi berhasil disimpan dan aktif.');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Gagal menyimpan konfigurasi.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function testAi(id: ProviderId) {
    setTesting(id);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'ai', provider: id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.detail || data?.error || 'Tes koneksi gagal.');
      }
      setMessage(PROVIDER_LABELS[id] + ': ' + data.detail);
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : 'Tes koneksi AI gagal.',
      );
    } finally {
      setTesting('');
    }
  }

  async function validateSmtp() {
    setTesting('smtp');
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'smtp' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.detail || 'Validasi SMTP gagal.');
      }
      setMessage(data.detail);
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : 'Validasi SMTP gagal.',
      );
    } finally {
      setTesting('');
    }
  }

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/admin/login';
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-navy-900">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Memuat Risetin Control Center...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <div className="max-w-2xl mx-auto rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Konfigurasi admin tidak tersedia.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-2xl bg-navy-900 text-white p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/15 border border-gold-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              SUPER_ADMIN
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">
              Risetin CMS & Integration Control Center
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Kelola konten utama website, AI provider, API secret, dan SMTP
              dari satu area terproteksi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-bold hover:bg-slate-800"
            >
              <Database className="w-4 h-4" />
              Lead Dashboard
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-xs font-bold hover:bg-white/15"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>

        <div
          className={
            'rounded-2xl border p-4 flex items-start gap-3 ' +
            (storage?.configured
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50')
          }
        >
          {storage?.configured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" />
          ) : (
            <TriangleAlert className="w-5 h-5 text-amber-700 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed">
            <div className="font-extrabold text-slate-900">
              {storage?.configured
                ? 'Encrypted configuration storage aktif'
                : 'Encrypted configuration storage belum lengkap'}
            </div>
            <div className="text-slate-600 mt-0.5">
              {storage?.configured
                ? 'Secret disimpan terenkripsi AES-GCM di Cloudflare KV dan tidak dikirim kembali ke browser.'
                : 'Tambahkan environment berikut agar perubahan dapat disimpan: ' +
                  (storage?.missing || []).join(', ')}
            </div>
          </div>
        </div>

        {(message || error) && (
          <div
            className={
              'rounded-xl border px-4 py-3 text-xs font-semibold ' +
              (error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700')
            }
          >
            {error || message}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 px-2 mb-2">
                System Settings
              </div>
              <div className="flex lg:flex-col gap-2 overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={
                        'shrink-0 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition ' +
                        (activeTab === tab.id
                          ? 'bg-navy-900 text-white'
                          : 'text-slate-700 hover:bg-white')
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex-1 p-5 sm:p-7">
              {activeTab === 'cms' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-900">
                      CMS Website
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Konten berikut digunakan untuk hero homepage dan informasi
                      kontak publik.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label>
                      <FieldLabel>Hero Eyebrow</FieldLabel>
                      <input
                        value={settings.cms.heroEyebrow}
                        onChange={(e) =>
                          updateCms('heroEyebrow', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Hero Title</FieldLabel>
                      <input
                        value={settings.cms.heroTitle}
                        onChange={(e) =>
                          updateCms('heroTitle', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Hero Highlight</FieldLabel>
                      <input
                        value={settings.cms.heroHighlight}
                        onChange={(e) =>
                          updateCms('heroHighlight', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Email Kontak</FieldLabel>
                      <input
                        type="email"
                        value={settings.cms.contactEmail}
                        onChange={(e) =>
                          updateCms('contactEmail', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Telepon</FieldLabel>
                      <input
                        value={settings.cms.phone}
                        onChange={(e) => updateCms('phone', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>WhatsApp</FieldLabel>
                      <input
                        value={settings.cms.whatsapp}
                        onChange={(e) =>
                          updateCms('whatsapp', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>WhatsApp URL</FieldLabel>
                      <input
                        value={settings.cms.whatsappUrl}
                        onChange={(e) =>
                          updateCms('whatsappUrl', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Booking URL</FieldLabel>
                      <input
                        value={settings.cms.bookingUrl}
                        onChange={(e) =>
                          updateCms('bookingUrl', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <FieldLabel>Positioning / Deskripsi Utama</FieldLabel>
                    <textarea
                      rows={4}
                      value={settings.cms.positioning}
                      onChange={(e) =>
                        updateCms('positioning', e.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Alamat Kantor</FieldLabel>
                    <textarea
                      rows={3}
                      value={settings.cms.officeAddress}
                      onChange={(e) =>
                        updateCms('officeAddress', e.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-900">
                      AI & API Provider
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Urutan di bawah adalah primary lalu backup. Chatbot akan
                      failover otomatis ke provider berikutnya.
                    </p>
                  </div>

                  <label className="block max-w-xs">
                    <FieldLabel>Timeout per Provider (ms)</FieldLabel>
                    <input
                      type="number"
                      min={3000}
                      max={20000}
                      value={settings.ai.timeoutMs}
                      onChange={(e) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                ai: {
                                  ...current.ai,
                                  timeoutMs: Number(e.target.value),
                                },
                              }
                            : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <div className="space-y-3">
                    {providerOrder.map((id, index) => {
                      const provider = settings.ai.providers[id];
                      return (
                        <div
                          key={id}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                            <div className="flex items-center gap-3 xl:w-56">
                              <div className="w-8 h-8 rounded-lg bg-navy-900 text-gold-300 flex items-center justify-center text-xs font-extrabold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-sm font-extrabold text-navy-900">
                                  {PROVIDER_LABELS[id]}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {index === 0
                                    ? 'Primary'
                                    : 'Backup ' + index}
                                </div>
                              </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={provider.enabled}
                                onChange={(e) =>
                                  updateProvider(id, {
                                    enabled: e.target.checked,
                                  })
                                }
                              />
                              Aktif
                            </label>

                            <input
                              value={provider.model}
                              onChange={(e) =>
                                updateProvider(id, {
                                  model: e.target.value,
                                })
                              }
                              placeholder="Model"
                              className="flex-1 min-w-48 rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-mono"
                            />

                            <div className="flex-1 min-w-56">
                              <input
                                type="password"
                                value={apiSecrets[id] || ''}
                                onChange={(e) =>
                                  setApiSecrets((current) => ({
                                    ...current,
                                    [id]: e.target.value,
                                  }))
                                }
                                placeholder={
                                  provider.apiKeyConfigured
                                    ? 'API key tersimpan ••••••••'
                                    : 'Masukkan API key'
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-mono"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveProvider(id, -1)}
                                disabled={index === 0}
                                className="p-2 rounded-lg border border-slate-200 disabled:opacity-30"
                                title="Naikkan prioritas"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveProvider(id, 1)}
                                disabled={index === providerOrder.length - 1}
                                className="p-2 rounded-lg border border-slate-200 disabled:opacity-30"
                                title="Turunkan prioritas"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => testAi(id)}
                                disabled={testing === id}
                                className="p-2 rounded-lg border border-slate-200 text-blue-700 disabled:opacity-40"
                                title="Tes koneksi provider"
                              >
                                {testing === id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <TestTube2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-2">
                    <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
                    API key lama tidak pernah ditampilkan kembali. Isi field
                    secret hanya bila ingin mengganti key provider tersebut.
                  </div>
                </div>
              )}

              {activeTab === 'smtp' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-900">
                      SMTP Configuration
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Konfigurasi server email untuk notifikasi, lead, dan
                      komunikasi sistem.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={settings.smtp.enabled}
                      onChange={(e) =>
                        updateSmtp('enabled', e.target.checked)
                      }
                    />
                    Aktifkan SMTP
                  </label>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label>
                      <FieldLabel>SMTP Host</FieldLabel>
                      <input
                        value={settings.smtp.host}
                        onChange={(e) =>
                          updateSmtp('host', e.target.value)
                        }
                        placeholder="smtp.example.com"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Port</FieldLabel>
                      <input
                        type="number"
                        value={settings.smtp.port}
                        onChange={(e) =>
                          updateSmtp('port', Number(e.target.value))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Username</FieldLabel>
                      <input
                        value={settings.smtp.username}
                        onChange={(e) =>
                          updateSmtp('username', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Password</FieldLabel>
                      <input
                        type="password"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder={
                          settings.smtp.passwordConfigured
                            ? 'Password tersimpan ••••••••'
                            : 'Masukkan password SMTP'
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>From Name</FieldLabel>
                      <input
                        value={settings.smtp.fromName}
                        onChange={(e) =>
                          updateSmtp('fromName', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>From Email</FieldLabel>
                      <input
                        type="email"
                        value={settings.smtp.fromEmail}
                        onChange={(e) =>
                          updateSmtp('fromEmail', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label>
                      <FieldLabel>Reply-To</FieldLabel>
                      <input
                        type="email"
                        value={settings.smtp.replyTo}
                        onChange={(e) =>
                          updateSmtp('replyTo', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={settings.smtp.secure}
                        onChange={(e) =>
                          updateSmtp('secure', e.target.checked)
                        }
                      />
                      TLS/SSL langsung
                    </label>
                  </div>

                  <button
                    onClick={validateSmtp}
                    disabled={testing === 'smtp'}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-extrabold text-navy-900"
                  >
                    {testing === 'smtp' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Settings2 className="w-4 h-4" />
                    )}
                    Validasi Konfigurasi SMTP
                  </button>
                </div>
              )}

              <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">
                  {settings.updatedAt
                    ? 'Terakhir disimpan: ' +
                      new Date(settings.updatedAt).toLocaleString('id-ID')
                    : 'Belum ada konfigurasi tersimpan di KV.'}
                </div>
                <button
                  onClick={saveAll}
                  disabled={saving || !storage?.configured}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 text-navy-900 px-5 py-3 text-xs font-extrabold hover:bg-gold-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan Semua Konfigurasi
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
