'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Video,
  Building2,
} from 'lucide-react';
import { BRAND_CONFIG } from '@/lib/config/contact';
import { useParameterGroups } from '@/components/parameters/useParameterOptions';

export default function ConsultationPage() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('technology-cybersecurity');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const parameterGroups = useParameterGroups(['consultation.topics', 'consultation.time_slots']);
  const topicOptions = parameterGroups['consultation.topics'] || [];
  const timeSlots = parameterGroups['consultation.time_slots'] || [];

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const topicLabel = topicOptions.find((option) => option.value === topic)?.label || topic;

    const message = [
      'Halo Risetin, saya ingin mengajukan jadwal konsultasi awal 30 menit.',
      '',
      `Nama: ${name}`,
      `Perusahaan: ${company || '-'}`,
      `Topik: ${topicLabel}`,
      `Tanggal pilihan: ${date}`,
      `Waktu pilihan: ${time}`,
      '',
      'Mohon konfirmasi ketersediaan jadwal tersebut. Terima kasih.',
    ].join('\n');

    const url = `${BRAND_CONFIG.contact.whatsappUrl}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="min-h-screen bg-grey-50">
      <section className="border-b border-navy-700 bg-navy-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link
            href="/contact"
            className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-300 transition hover:text-gold-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Kontak
          </Link>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-300">
              Konsultasi Awal • 30 Menit
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Pilih Jadwal Konsultasi
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Pilih tanggal dan waktu yang Anda inginkan. Permintaan akan diteruskan ke tim
              Risetin melalui WhatsApp untuk konfirmasi final.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-navy-900">Pertemuan Virtual</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Video call untuk diskusi awal yang cepat dan fleksibel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-navy-900">Pertemuan Tatap Muka</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Koordinasikan lokasi dan waktu bersama tim RTI setelah pengajuan jadwal.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-8">
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8"
          >
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Detail Konsultasi</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Tidak ada pembayaran pada tahap ini. Jadwal baru dianggap final setelah
                dikonfirmasi oleh tim Risetin.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-navy-900">Nama *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-navy-900">
                  Perusahaan
                </label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Nama perusahaan / instansi"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-navy-900">
                Topik Konsultasi *
              </label>
              <select
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
              >
                {topicOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-bold text-navy-900">
                  <CalendarDays className="h-4 w-4 text-gold-600" />
                  Tanggal *
                </label>
                <input
                  type="date"
                  min={today}
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-bold text-navy-900">
                  <Clock3 className="h-4 w-4 text-gold-600" />
                  Waktu *
                </label>
                <select
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Pilih waktu</option>
                  {timeSlots.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
            >
              <MessageCircle className="h-5 w-5 text-gold-400" />
              Kirim Pilihan Jadwal ke WhatsApp RTI
            </button>
          </form>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h3 className="text-sm font-extrabold text-navy-900">Alur yang jelas</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Pilih jadwal, kirim permintaan, lalu tim RTI mengonfirmasi ketersediaannya.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <h3 className="text-sm font-extrabold text-navy-900">Kontak resmi RTI</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  WhatsApp {BRAND_CONFIG.contact.whatsapp}
                  <br />
                  {BRAND_CONFIG.contact.email}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
