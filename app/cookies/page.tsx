import React from 'react';
import type { Metadata } from 'next';
import { BRAND_CONFIG } from '@/lib/config/contact';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kebijakan Cookie',
  description: 'Informasi penggunaan cookie dan teknologi pelacakan pada situs PT Riset Teknologi Indonesia.',
};

export default function CookiesPage() {
  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-14 sm:py-20 border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Kebijakan Cookie (Cookie Policy)
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Transparansi mengenai penyimpanan data lokal dan cookie di situs <strong>{BRAND_CONFIG.legalName}</strong>.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-navy-900 space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">1. Apa Itu Cookie?</h2>
            <p className="text-muted">
              Cookie adalah berkas teks kecil yang disimpan pada peramban (browser) perangkat Anda saat mengunjungi situs web kami. Cookie membantu kami menjaga sesi penilaian interaktif Anda agar tidak hilang saat halaman diperbarui (refresh).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">2. Kategori Cookie yang Digunakan</h2>
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-grey-50 rounded-xl border border-line">
                <strong className="block text-navy-900">Cookie Esensial (Diperlukan):</strong>
                <p className="text-xs text-muted mt-1">
                  Wajib untuk fungsi dasar keamanan web, pencegahan serangan CSRF, dan menyimpan status persetujuan privasi. Kategori ini tidak dapat dinonaktifkan.
                </p>
              </div>

              <div className="p-4 bg-grey-50 rounded-xl border border-line">
                <strong className="block text-navy-900">Cookie Fungsional & Diagnostik Sesi:</strong>
                <p className="text-xs text-muted mt-1">
                  Menyimpan progres kuesioner assessment Anda secara temporer di <code>sessionStorage</code> lokal pada browser Anda.
                </p>
              </div>

              <div className="p-4 bg-grey-50 rounded-xl border border-line">
                <strong className="block text-navy-900">Cookie Analitik Privasi (Opsional):</strong>
                <p className="text-xs text-muted mt-1">
                  Mengumpulkan data agregat tanpa mengidentifikasi pengguna secara pribadi (menggunakan platform privasi seperti Plausible / Umami tanpa cookie lintas-situs pihak ketiga).
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">3. Mengatur Preferensi</h2>
            <p className="text-muted">
              Anda dapat mengatur preferensi cookie kapan saja melalui banner privasi di bagian bawah situs web atau melalui pengaturan privasi pada peramban Anda.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
