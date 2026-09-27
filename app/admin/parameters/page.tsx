'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Database,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';

type OptionRow = {
  group: string;
  value: string;
  label: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  system: boolean;
};

type Group = {
  key: string;
  label: string;
  description: string;
  logicBound?: boolean;
  options: OptionRow[];
};

export default function AdminParametersPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(null);
  const [newRow, setNewRow] = useState({ value: '', label: '', description: '', sortOrder: 100 });

  const selected = useMemo(
    () => groups.find((group) => group.key === selectedKey) || groups[0],
    [groups, selectedKey],
  );

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/parameters', {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDatabaseConnected(data?.database?.connected ?? null);
        throw new Error(data?.error || 'Gagal memuat parameter.');
      }
      const nextGroups = Array.isArray(data?.groups) ? data.groups : [];
      setGroups(nextGroups);
      setDatabaseConnected(data?.database?.connected === true);
      if (!selectedKey && nextGroups[0]?.key) setSelectedKey(nextGroups[0].key);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat parameter.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    // Admin layout already guarantees an authenticated admin session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLocal = (value: string, patch: Partial<OptionRow>) => {
    if (!selected) return;
    setGroups((current) =>
      current.map((group) =>
        group.key !== selected.key
          ? group
          : {
              ...group,
              options: group.options.map((item) =>
                item.value === value ? { ...item, ...patch } : item,
              ),
            },
      ),
    );
  };

  const saveRow = async (row: OptionRow) => {
    setMessage('');
    const response = await fetch('/api/admin/parameters', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ option: row }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error || 'Gagal menyimpan parameter.');
      return;
    }
    setMessage(`Parameter “${row.label}” berhasil disimpan.`);
  };

  const deactivate = async (row: OptionRow) => {
    setMessage('');
    const response = await fetch('/api/admin/parameters', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ group: row.group, value: row.value }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error || 'Gagal menonaktifkan parameter.');
      return;
    }
    updateLocal(row.value, { active: false });
    setMessage(`Parameter “${row.label}” dinonaktifkan.`);
  };

  const addRow = async () => {
    if (!selected || !newRow.value.trim() || !newRow.label.trim()) {
      setMessage('Value dan label wajib diisi.');
      return;
    }
    const row: OptionRow = {
      group: selected.key,
      value: newRow.value.trim(),
      label: newRow.label.trim(),
      description: newRow.description.trim() || undefined,
      sortOrder: Number(newRow.sortOrder) || 100,
      active: true,
      system: false,
    };
    await saveRow(row);
    setGroups((current) =>
      current.map((group) =>
        group.key === selected.key
          ? { ...group, options: [...group.options, row].sort((a, b) => a.sortOrder - b.sortOrder) }
          : group,
      ),
    );
    setNewRow({ value: '', label: '', description: '', sortOrder: 100 });
  };

  return (
    <main className="min-h-screen bg-grey-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-300">
                <Settings2 className="h-3.5 w-3.5" />
                Admin Configuration
              </div>
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
                Parameter & Field Option Manager
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
                Kelola label, urutan, status aktif, dan opsi tambahan untuk field pilihan di seluruh web RTI.
                Identifier bawaan yang digunakan engine tetap dikunci agar perubahan tampilan tidak merusak scoring atau routing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/system"
                className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50"
              >
                System Setup
              </Link>
              <Link
                href="/admin/leads"
                className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-grey-50"
              >
                Lead Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-extrabold text-navy-900">Authenticated Admin Session</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Perubahan parameter sekarang hanya dapat dilakukan setelah login Admin.
                Token konfigurasi tidak lagi dimasukkan atau disimpan di browser.
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Parameters
            </button>
          </div>

          {databaseConnected !== null && (
            <div className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
              databaseConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              <Database className="h-4 w-4" />
              {databaseConnected ? 'Server Database Connected' : 'Database / migration belum tersedia'}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {message}
            </div>
          )}
        </div>

        {groups.length > 0 && selected && (
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-4">
              <div className="sticky top-24 rounded-2xl border border-line bg-white p-3 shadow-sm">
                <div className="mb-2 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Parameter Groups
                </div>
                <div className="max-h-[70vh] space-y-1 overflow-auto">
                  {groups.map((group) => (
                    <button
                      key={group.key}
                      onClick={() => setSelectedKey(group.key)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        selected.key === group.key
                          ? 'bg-navy-900 text-white'
                          : 'hover:bg-grey-50 text-navy-900'
                      }`}
                    >
                      <div className="text-xs font-extrabold">{group.label}</div>
                      <div className={`mt-0.5 text-[10px] ${
                        selected.key === group.key ? 'text-slate-300' : 'text-muted'
                      }`}>
                        {group.options.length} opsi
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="space-y-4 lg:col-span-8">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <SlidersHorizontal className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                  <div>
                    <h2 className="text-lg font-extrabold text-navy-900">{selected.label}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{selected.description}</p>
                    {selected.logicBound && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Group ini terhubung ke business/scoring logic. Value bawaan dikunci; Admin tetap dapat
                        mengubah label, deskripsi, urutan, dan status aktif.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selected.options.map((row) => (
                  <div
                    key={row.value}
                    className={`rounded-2xl border bg-white p-4 shadow-sm ${
                      row.active ? 'border-line' : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-muted">Value / Key</label>
                        <input
                          value={row.value}
                          readOnly
                          className="w-full cursor-not-allowed rounded-lg border border-line bg-grey-50 px-3 py-2 text-xs font-mono"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-muted">Label</label>
                        <input
                          value={row.label}
                          onChange={(event) => updateLocal(row.value, { label: event.target.value })}
                          className="w-full rounded-lg border border-line px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-muted">Urutan</label>
                        <input
                          type="number"
                          value={row.sortOrder}
                          onChange={(event) => updateLocal(row.value, { sortOrder: Number(event.target.value) })}
                          className="w-full rounded-lg border border-line px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-12">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-muted">Deskripsi</label>
                        <input
                          value={row.description || ''}
                          onChange={(event) => updateLocal(row.value, { description: event.target.value })}
                          className="w-full rounded-lg border border-line px-3 py-2 text-xs"
                          placeholder="Opsional"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-navy-900">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(event) => updateLocal(row.value, { active: event.target.checked })}
                        />
                        Aktif
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deactivate(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Nonaktifkan
                        </button>
                        <button
                          onClick={() => saveRow(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-gold-500 px-3 py-2 text-[11px] font-extrabold text-navy-900 hover:bg-gold-300"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Simpan
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!selected.logicBound && (
                <div className="rounded-2xl border border-dashed border-gold-500/50 bg-gold-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-gold-700" />
                    <h3 className="text-sm font-extrabold text-navy-900">Tambah Opsi Baru</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-12">
                    <input
                      value={newRow.value}
                      onChange={(event) => setNewRow((current) => ({ ...current, value: event.target.value }))}
                      placeholder="value-key"
                      className="rounded-lg border border-line px-3 py-2 text-xs sm:col-span-3"
                    />
                    <input
                      value={newRow.label}
                      onChange={(event) => setNewRow((current) => ({ ...current, label: event.target.value }))}
                      placeholder="Label yang tampil"
                      className="rounded-lg border border-line px-3 py-2 text-xs sm:col-span-6"
                    />
                    <input
                      type="number"
                      value={newRow.sortOrder}
                      onChange={(event) => setNewRow((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                      className="rounded-lg border border-line px-3 py-2 text-xs sm:col-span-3"
                    />
                    <input
                      value={newRow.description}
                      onChange={(event) => setNewRow((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Deskripsi opsional"
                      className="rounded-lg border border-line px-3 py-2 text-xs sm:col-span-12"
                    />
                  </div>
                  <button
                    onClick={addRow}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-extrabold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Tambahkan Parameter
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
