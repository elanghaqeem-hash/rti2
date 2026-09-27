'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Check, X } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    // Check if user has already stored consent
    const consent = localStorage.getItem('rti_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const payload = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: '1.0-UU-PDP',
    };
    localStorage.setItem('rti_cookie_consent', JSON.stringify(payload));
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    const payload = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: '1.0-UU-PDP',
    };
    localStorage.setItem('rti_cookie_consent', JSON.stringify(payload));
    setShowBanner(false);
  };

  const handleSaveCustom = () => {
    const payload = {
      necessary: true,
      analytics: analyticsConsent,
      marketing: marketingConsent,
      timestamp: new Date().toISOString(),
      version: '1.0-UU-PDP',
    };
    localStorage.setItem('rti_cookie_consent', JSON.stringify(payload));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      role="region"
      aria-label="Persetujuan Cookie dan Pelindungan Data Pribadi"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-navy-900/95 backdrop-blur-md text-white border-t border-navy-700 shadow-2xl transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-300">
            <Shield className="w-4 h-4 text-emerald-400" />
            Pelindungan Data Pribadi (UU PDP No. 27/2022)
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Website PT Riset Teknologi Indonesia menggunakan cookie esensial untuk pengoperasian dasar dan keamanan. Dengan persetujuan Anda, kami juga menggunakan cookie analitik anonim guna meningkatkan kualitas interaksi. Baca selengkapnya di{' '}
            <Link href="/privacy" className="text-gold-300 underline hover:text-white">
              Kebijakan Privasi
            </Link>{' '}
            dan{' '}
            <Link href="/cookies" className="text-gold-300 underline hover:text-white">
              Kebijakan Cookie
            </Link>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          {!preferencesOpen ? (
            <>
              <button
                onClick={() => setPreferencesOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-navy-700 hover:bg-navy-500 transition text-slate-200"
              >
                Pengaturan
              </button>
              <button
                onClick={handleAcceptNecessary}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-navy-700 hover:bg-navy-500 transition text-slate-200"
              >
                Hanya Esensial
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-300 text-navy-900 transition shadow"
              >
                Setujui Semua
              </button>
            </>
          ) : (
            <div className="w-full bg-navy-700/80 p-4 rounded-xl border border-navy-500 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Cookie Esensial</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Selalu Aktif
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="analytics-chk" className="cursor-pointer text-slate-300">
                  Cookie Analitik Kinerja (Plausible / Anonymous)
                </label>
                <input
                  id="analytics-chk"
                  type="checkbox"
                  checked={analyticsConsent}
                  onChange={(e) => setAnalyticsConsent(e.target.checked)}
                  className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 bg-navy-900 border-navy-500"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="marketing-chk" className="cursor-pointer text-slate-300">
                  Preferensi & Rekomendasi Modul
                </label>
                <input
                  id="marketing-chk"
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 bg-navy-900 border-navy-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-navy-500/60">
                <button
                  onClick={() => setPreferencesOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCustom}
                  className="px-3 py-1.5 rounded bg-gold-500 text-navy-900 text-xs font-bold"
                >
                  Simpan Pilihan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
