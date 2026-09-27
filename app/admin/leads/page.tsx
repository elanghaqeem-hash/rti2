'use client';

import React, { useState, useEffect } from 'react';
import type { Lead } from '@/lib/scoring/leads';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  AlertTriangle,
  Database,
  Download,
  Filter,
  RefreshCw,
  Search,
  Shield,
  Star,
} from 'lucide-react';

function csvCell(value: unknown) {
  let text = String(value ?? '');

  // Prevent spreadsheet formula execution when exported lead data is opened.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [dataError, setDataError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchLeads = async () => {
    setLoading(true);
    setDataError('');

    try {
      const res = await fetch('/api/leads', {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.database?.connected !== true) {
        setLeads([]);
        setDatabaseConnected(false);
        setDataError(
          data?.error ||
            'Database belum terhubung. Data operasional tidak ditampilkan sampai koneksi database aktif.'
        );
        return;
      }

      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setDatabaseConnected(true);
    } catch (error) {
      console.error(error);
      setLeads([]);
      setDatabaseConnected(false);
      setDataError(
        'Koneksi data gagal. Sistem tidak menampilkan data fallback, dummy, atau sample.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.company.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.role || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCsv = () => {
    if (!databaseConnected || leads.length === 0) return;

    const headers = [
      'ID',
      'Date',
      'Name',
      'Role',
      'Company',
      'Sector',
      'Email',
      'WhatsApp',
      'Score',
      'Status',
      'Consent Version',
    ];

    const rows = filteredLeads.map((l) => [
      l.id,
      l.createdAt,
      l.name,
      l.role,
      l.company,
      l.sector,
      l.email,
      l.whatsapp || '-',
      l.score,
      l.status,
      l.consentVersion,
    ]);

    const csvContent = [
      headers.map(csvCell).join(','),
      ...rows.map((row) => row.map(csvCell).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `risetin-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-grey-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-900 text-gold-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              Internal Admin Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
              Enterprise Lead & Diagnostic Pipeline
            </h1>
            <p className="text-xs text-muted mt-1">
              {BRAND_CONFIG.legalName} &bull; Data operasional hanya ditampilkan dari database persisten.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                databaseConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Database className="w-4 h-4" />
              {databaseConnected ? 'Database Connected' : 'Database Unavailable'}
            </div>

            <button
              onClick={fetchLeads}
              className="p-2.5 rounded-xl border border-line text-navy-900 hover:bg-grey-50 transition"
              title="Refresh Leads"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={exportToCsv}
              disabled={!databaseConnected || leads.length === 0}
              className="px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export to CSV
            </button>
          </div>
        </div>

        {!databaseConnected && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Data database belum tersedia
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {dataError ||
                  'Tidak ada data operasional yang ditampilkan. Sistem tidak menggunakan data dummy, sample, atau fallback.'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-line shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, organization, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!databaseConnected}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-grey-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-muted shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={!databaseConnected}
              className="px-3 py-2 rounded-lg border border-line text-xs font-semibold text-navy-900 bg-white disabled:bg-grey-50 disabled:cursor-not-allowed"
            >
              <option value="ALL">All Statuses</option>
              <option value="Qualified">Qualified (Score &ge; 70)</option>
              <option value="New">New</option>
              <option value="Meeting">Meeting Booked</option>
              <option value="Proposal">Proposal</option>
              <option value="Won">Won</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-grey-50 border-b border-line text-navy-900 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Lead / Contact</th>
                  <th className="py-3.5 px-4">Organization & Sector</th>
                  <th className="py-3.5 px-4">Source Tool</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Consent PDP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-navy-900">
                {databaseConnected &&
                  filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-beige-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-sm text-navy-900">{l.name}</div>
                        <div className="text-[11px] text-muted">{l.role}</div>
                        <div className="text-[11px] text-blue-600 font-mono mt-0.5">{l.email}</div>
                        {l.whatsapp && <div className="text-[10px] text-muted">{l.whatsapp}</div>}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-xs">{l.company}</div>
                        <span className="text-[10px] uppercase font-semibold text-muted tracking-wider block mt-0.5">
                          {l.sector.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px]">
                        {l.toolSlug || l.source}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-xs ${
                            l.score >= 70
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gold-500/20 text-gold-700'
                          }`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                          {l.score}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-navy-900 text-white">
                          {l.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-muted">
                        <span className="text-emerald-600 font-semibold block">
                          ✓ Granted ({l.consentVersion})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(l.consentAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}

                {!loading && filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted">
                      {databaseConnected
                        ? 'Belum ada data lead pada database.'
                        : 'Tidak ada data ditampilkan sampai database terhubung.'}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted">
                      Memeriksa koneksi database...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
