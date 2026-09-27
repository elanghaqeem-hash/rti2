import React from 'react';
import type { Metadata } from 'next';
import { BRAND_CONFIG } from '@/lib/config/contact';
import { ShieldCheck, Mail, Lock, CheckCircle2, AlertOctagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Responsible Security Disclosure Policy',
  description:
    'Kebijakan pengungkapan kerentanan secara bertanggung jawab (Responsible Disclosure) PT Riset Teknologi Indonesia.',
};

export default function SecurityPage() {
  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-14 sm:py-20 border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Lock className="w-3.5 h-3.5" />
            Security By Design
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Responsible Vulnerability Disclosure
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Komitmen keamanan siber <strong>{BRAND_CONFIG.legalName}</strong> dan panduan pelaporan bagi peneliti keamanan siber independen.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-navy-900 space-y-8 text-sm leading-relaxed">
          <div className="p-5 bg-beige-50 rounded-2xl border border-beige-200">
            <h3 className="font-extrabold text-navy-900 text-base mb-1">
              Prinsip Kolaborasi dengan Komunitas Keamanan
            </h3>
            <p className="text-xs sm:text-sm text-navy-900">
              Sebagai konsultan teknologi dan cybersecurity, kami memprioritaskan keamanan seluruh aset digital. Jika Anda menemukan potensi kerentanan keamanan pada domain risetin.co.id, kami mengapresiasi pelaporan yang bertanggung jawab sesuai etika pengungkapan terkoordinasi.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-navy-900">1. Saluran Resmi Pelaporan</h2>
            <p>Kirimkan laporan teknis kerentanan Anda secara aman ke:</p>
            <div className="p-4 bg-grey-50 rounded-xl border border-line flex items-center gap-3">
              <Mail className="w-5 h-5 text-gold-500" />
              <div>
                <a href={`mailto:${BRAND_CONFIG.contact.email}`} className="font-mono font-bold text-blue-600">
                  {BRAND_CONFIG.contact.email}
                </a>
                <span className="block text-[11px] text-muted">Subjek: [SECURITY DISCLOSURE] - Ringkasan Temuan</span>
              </div>
            </div>
            <p className="text-xs text-muted">
              Anda juga dapat memeriksa file standar RFC 9116 kami di{' '}
              <a href="/.well-known/security.txt" className="text-blue-600 underline font-mono">
                /.well-known/security.txt
              </a>.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-navy-900">2. Panduan Pengujian yang Diizinkan</h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Berikan detail teknis yang memadai untuk mereproduksi temuan (Proof of Concept, PoC).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Beri kami tenggat waktu wajar (minimal 30 hari kerja) untuk memverifikasi dan merilis perbaikan sebelum mempublikasikan temuan ke publik.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-rose-900 font-medium">
                  Dilarang melakukan serangan denial of service (DoS/DDoS), spamming, eksfiltrasi data pengguna/klien, atau merusak integritas sistem produksi.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
