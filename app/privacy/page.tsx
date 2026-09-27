import React from 'react';
import type { Metadata } from 'next';
import { BRAND_CONFIG } from '@/lib/config/contact';
import { Shield, CheckCircle2, Lock, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi (UU PDP No. 27/2022)',
  description:
    'Kebijakan Privasi PT Riset Teknologi Indonesia berdasarkan ketentuan Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
};

export default function PrivacyPage() {
  return (
    <div className="w-full bg-white">
      <section className="bg-navy-900 text-white py-14 sm:py-20 border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Kepatuhan Regulasi Nasional
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Kebijakan Privasi Data Pribadi
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Berlaku bagi seluruh pemrosesan data oleh <strong>{BRAND_CONFIG.legalName}</strong> selaras dengan Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-navy-900 space-y-10 text-sm leading-relaxed">
          {/* 1. Identitas Pengendali */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-navy-900">1. Identitas Pengendali Data Pribadi</h2>
            <p>
              Pengendali Data Pribadi atas situs web ini dan seluruh layanan konsultasi terkait adalah:
            </p>
            <div className="bg-grey-50 p-4 rounded-xl border border-line text-xs space-y-1">
              <p><strong>Nama Entitas Legal:</strong> {BRAND_CONFIG.legalName}</p>
              <p><strong>Brand / Merek:</strong> {BRAND_CONFIG.brandName} ({BRAND_CONFIG.acronym})</p>
              <p><strong>Alamat Resmi:</strong> {BRAND_CONFIG.contact.address.fullAddress}</p>
              <p><strong>Email Kontak DPO:</strong> dpo@risetin.co.id / {BRAND_CONFIG.contact.email}</p>
            </div>
          </div>

          {/* 2. Jenis Data Pribadi yang Diproses */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-navy-900">2. Jenis Data Pribadi yang Kami Kumpulkan</h2>
            <p>Kami menerapkan prinsip <em>data minimisation</em> (minimasi data), di mana kami hanya mengumpulkan data yang benar-benar relevan:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li><strong>Data Identitas Kontak:</strong> Nama lengkap, alamat email korporasi/kerja, nomor telepon/WhatsApp, nama perusahaan/organisasi, dan jabatan pekerjaan.</li>
              <li><strong>Data Kebutuhan Layanan & Diagnostik:</strong> Jawaban atas kuesioner maturity assessment, perkiraan skala sistem, dan ringkasan kebutuhan teknologi yang Anda berikan secara sukarela.</li>
              <li><strong>Data Teknis & Telemetri Esensial:</strong> Alamat IP yang telah di-hash (anonymized IP hash), log akses keamanan web untuk pencegahan serangan siber (DDoS, brute-force), dan preferensi cookie esensial.</li>
            </ul>
          </div>

          {/* 3. Dasar Pemrosesan & Tujuan */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-navy-900">3. Dasar Hukum dan Tujuan Pemrosesan</h2>
            <p>Sesuai Pasal 20 UU PDP, pemrosesan data dilakukan berdasarkan:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li><strong>Persetujuan Eksplisit (Consent):</strong> Saat Anda mengisi formulir penilaian maturity, formulir RFQ kontak, atau interaksi AI Assistant dengan mencentang kotak persetujuan.</li>
              <li><strong>Pelaksanaan Perjanjian (Contractual Necessity):</strong> Untuk menyusun proposal, kontrak NDA, dan delivery layanan konsultasi teknologi.</li>
              <li><strong>Kewajiban Hukum (Legal Obligation):</strong> Kepatuhan terhadap pelaporan peraturan perundang-undangan Republik Indonesia.</li>
              <li><strong>Kepentingan yang Sah (Legitimate Interest):</strong> Menjaga keamanan siber infrastruktur dan integritas sistem dari upaya serangan siber.</li>
            </ul>
          </div>

          {/* 4. Hak-Hak Subjek Data */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-navy-900">4. Hak-Hak Anda Sebagai Subjek Data Pribadi</h2>
            <p>Berdasarkan Bab IV UU PDP, Anda memiliki hak-hak yang tidak dapat diabaikan, meliputi:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                'Hak mendapatkan informasi kejelasan identitas dan pemrosesan.',
                'Hak melengkapi, memperbarui, dan memperbaiki kesalahan data pribadi.',
                'Hak mengakhiri pemrosesan, menghapus, dan memusnahkan data pribadi.',
                'Hak menarik kembali persetujuan pemrosesan (withdrawal of consent).',
                'Hak mengajukan keberatan atas keputusan yang semata-mata otomatis.',
                'Hak memperoleh salinan data pribadi dalam format yang terstruktur (portabilitas).',
              ].map((h, i) => (
                <div key={i} className="p-3 bg-beige-50 border border-beige-200 rounded-lg text-xs font-medium text-navy-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">
              Untuk melaksanakan hak-hak di atas, hubungi Pejabat Pelindungan Data Pribadi (DPO) kami melalui email:{' '}
              <a href={`mailto:${BRAND_CONFIG.contact.email}`} className="text-blue-600 underline font-bold">
                {BRAND_CONFIG.contact.email}
              </a>.
            </p>
          </div>

          {/* 5. Keamanan & Retensi */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-navy-900">5. Standar Keamanan & Retensi Data</h2>
            <p>
              Sebagai konsultan teknologi dan keamanan siber, {BRAND_CONFIG.legalName} menerapkan enkripsi transit (TLS 1.3), enkripsi at-rest (AES-256), kontrol akses berbasis peran (RBAC), dan pemantauan keamanan berkala.
            </p>
            <p className="text-xs text-muted">
              Data lead dan hasil asesmen disimpan selama maksimal 12 (dua belas) bulan untuk keperluan tindak lanjut konsultasi, setelah itu dimusnahkan secara aman kecuali terdapat kontrak kemitraan aktif. Log percakapan AI anonim dibersihkan otomatis setelah 30 hari.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
