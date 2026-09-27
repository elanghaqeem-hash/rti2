'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeadModal } from '@/components/tools/LeadModal';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface PdpQuestion {
  id: string;
  topic: string;
  prompt: string;
}

const PDP_QUESTIONS: PdpQuestion[] = [
  { id: 'pdp_ropa', topic: 'Inventaris Data (RoPA)', prompt: 'Apakah organisasi telah menyusun Record of Processing Activities (RoPA) untuk seluruh aliran data pribadi pelanggan dan karyawan?' },
  { id: 'pdp_basis', topic: 'Dasar Pemrosesan & Persetujuan', prompt: 'Apakah persetujuan pemrosesan data (consent) telah diperbarui agar eksplisit, terpisah per tujuan, dan dapat ditarik kembali sewaktu-waktu?' },
  { id: 'pdp_dpo', topic: 'Pejabat Pelindungan Data (DPO)', prompt: 'Apakah telah ditunjuk Pejabat/Petugas Pelindungan Data Pribadi (Data Protection Officer) yang melapor ke manajemen puncak?' },
  { id: 'pdp_dpia', topic: 'Penilaian Dampak Privasi (DPIA)', prompt: 'Apakah dilakukan Data Protection Impact Assessment sebelum meluncurkan sistem atau pemrosesan berisiko tinggi?' },
  { id: 'pdp_rights', topic: 'Hak Subjek Data', prompt: 'Apakah tersedia mekanisme atau SOP bagi subjek data untuk meminta akses, perbaikan, atau penghapusan data pribadi mereka?' },
  { id: 'pdp_thirdparty', topic: 'Perjanjian Pemroses Pihak Ketiga', prompt: 'Apakah seluruh vendor/cloud penyimpan data telah menandatangani Data Processing Agreement (DPA) yang mewajibkan kepatuhan UU PDP?' },
  { id: 'pdp_incident', topic: 'Prosedur Notifikasi Insiden 3x24 Jam', prompt: 'Apakah ada SOP penanganan kebocoran data dengan kewajiban notifikasi tertulis kepada otoritas dan subjek data maksimal 3x24 jam?' },
];

export default function PdpReadinessPage() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [showLeadModal, setShowLeadModal] = useState(false);

  const toggleAnswer = (id: string) => {
    setAnswers({ ...answers, [id]: !answers[id] });
  };

  const completedCount = Object.values(answers).filter(Boolean).length;
  const percentage = Math.round((completedCount / PDP_QUESTIONS.length) * 100);

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-12 sm:py-16 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              UU No. 27/2022 Kepatuhan Hukum
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              UU PDP Readiness Check
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Evaluasi kesiapan tata kelola dan teknis organisasi Anda terhadap mandat Undang-Undang Pelindungan Data Pribadi (UU PDP).
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-grey-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Tingkat Kesiapan Regulasi
              </span>
              <div className="text-2xl sm:text-3xl font-black text-navy-900 mt-0.5">
                {percentage}% Siap ({completedCount}/{PDP_QUESTIONS.length} Parameter Terpenuhi)
              </div>
            </div>

            <button
              onClick={() => setShowLeadModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Laporan Kesiapan UU PDP
            </button>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-3">
            {PDP_QUESTIONS.map((q) => {
              const isChecked = Boolean(answers[q.id]);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleAnswer(q.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-4 ${
                    isChecked
                      ? 'bg-beige-50 border-gold-500 shadow-sm'
                      : 'bg-grey-50 border-line hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 ${
                      isChecked
                        ? 'bg-gold-500 border-gold-500 text-navy-900'
                        : 'border-line bg-white'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block mb-1">
                      {q.topic}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-navy-900 leading-relaxed">
                      {q.prompt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-beige-50 border border-beige-200 rounded-xl text-xs text-navy-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Disclaimer:</strong> Hasil kuesioner ini merupakan alat diagnostik teknis indikatif dan tidak menggantikan nasihat hukum resmi. PT Riset Teknologi Indonesia menyediakan pendampingan konsultasi arsitektur data, keamanan teknis, dan perancangan SOP kepatuhan UU PDP.
            </div>
          </div>
        </div>
      </section>

      {showLeadModal && (
        <LeadModal
          toolSlug="pdp-readiness"
          toolName="Laporan Diagnostik Kesiapan UU PDP"
          summaryData={{ percentage, completedCount }}
          onClose={() => setShowLeadModal(false)}
          onSuccess={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
