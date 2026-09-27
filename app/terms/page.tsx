import React from 'react';
import type { Metadata } from 'next';
import { BRAND_CONFIG } from '@/lib/config/contact';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Syarat dan Ketentuan Layanan Penggunaan Situs Web PT Riset Teknologi Indonesia.',
};

export default function TermsPage() {
  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-14 sm:py-20 border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Syarat & Ketentuan Layanan (Terms of Service)
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Ketentuan penggunaan situs web resmi <strong>{BRAND_CONFIG.legalName}</strong> ({BRAND_CONFIG.brandName} / {BRAND_CONFIG.acronym}).
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-navy-900 space-y-8 text-sm leading-relaxed">
          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">1. Penerimaan Ketentuan</h2>
            <p className="text-muted">
              Dengan mengakses dan menggunakan situs web ini, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui salah satu bagian dari ketentuan ini, Anda disarankan untuk tidak melanjutkan akses ke situs web ini.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">2. Batasan Tanggung Jawab atas Alat Interaktif (Disclaimer)</h2>
            <p className="text-muted">
              Modul interaktif seperti Maturity Assessment, Cyber Quick Check, dan ISO Readiness Checklist disediakan untuk tujuan indikatif dan estimasi awal. Hasil laporan tidak boleh ditafsirkan sebagai audit sertifikasi resmi atau opini hukum final. Penilaian menyeluruh membutuhkan penugasan audit profesional berlisensi bersama {BRAND_CONFIG.legalName}.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">3. Larangan Penggunaan Ilegal & Keamanan Siber</h2>
            <p className="text-muted">
              Pengunjung dilarang keras menyalahgunakan situs web ini, termasuk namun tidak terbatas pada melakukan port scanning agresif, Distributed Denial of Service (DDoS), eksploitasi kerentanan, atau pengiriman kode berbahaya (malware). Setiap pengujian keamanan terhadap sistem {BRAND_CONFIG.legalName} harus mematuhi kebijakan{' '}
              <Link href="/security" className="text-blue-600 underline">
                Responsible Disclosure
              </Link>.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">4. Hak Kekayaan Intelektual</h2>
            <p className="text-muted">
              Seluruh merek dagang, logo hexagon, materi visual arsitektur, teks, kode sumber, dan dokumentasi metodologi pada situs ini merupakan hak kekayaan intelektual milik {BRAND_CONFIG.legalName} yang dilindungi oleh undang-undang hak cipta Republik Indonesia.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">5. Hukum yang Berlaku</h2>
            <p className="text-muted">
              Syarat dan ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Negara Kesatuan Republik Indonesia. Setiap sengketa yang timbul akan diselesaikan secara musyawarah atau melalui yurisdiksi Pengadilan Negeri di Jakarta Selatan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
