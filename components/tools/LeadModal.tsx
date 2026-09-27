'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  X,
  FileText,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface LeadModalProps {
  toolSlug: string;
  toolName: string;
  summaryData: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  toolSlug,
  toolName,
  summaryData,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    sector: 'banking_insurance',
    email: '',
    whatsapp: '',
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      alert('Mohon setujui ketentuan Pelindungan Data Pribadi (UU PDP) untuk menerima laporan.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'tool_lead_modal',
          toolSlug,
          name: formData.name,
          role: formData.role,
          company: formData.company,
          sector: formData.sector,
          email: formData.email,
          whatsapp: formData.whatsapp,
          needSummary: `Completed ${toolName}. Diagnostic payload: ${JSON.stringify(summaryData)}`,
          consent: formData.consent,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        onSuccess();
      } else {
        alert('Gagal mengirim data. Silakan coba kembali.');
      }
    } catch (err) {
      console.error(err);
      alert('Kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-line relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted hover:text-navy-900 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <FileText className="w-4 h-4 text-gold-500" />
              Download Formal Executive Report
            </div>
            <h3 className="text-xl font-extrabold text-navy-900">
              Receive Your Full {toolName}
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Enter your professional details below to generate and dispatch your customized executive report and roadmap gaps.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Hendra Gunawan"
                  className="w-full px-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. CISO / Head of IT"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Bank ABC"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.co.id"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+62 812-xxxx"
                    className="w-full px-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>

              {/* UU PDP Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2 text-[11px] text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consent}
                    onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                    className="mt-0.5 rounded text-gold-500 focus:ring-gold-500 h-3.5 w-3.5 border-line"
                  />
                  <span>
                    Saya menyetujui pemrosesan data pribadi oleh{' '}
                    <strong>{BRAND_CONFIG.legalName}</strong> untuk pengiriman laporan dan penjajakan konsultasi, sesuai{' '}
                    <Link href="/privacy" className="text-blue-600 underline">
                      Kebijakan Privasi UU PDP
                    </Link>.
                  </span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Generating Report...' : 'Generate & Download Executive Report'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-extrabold text-navy-900">
              Report Dispatched & Available
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              Your executive summary report has been compiled and emailed to <strong>{formData.email}</strong>.
            </p>

            <div className="p-4 bg-beige-50 rounded-xl border border-beige-200 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy-700 block mb-1">
                Recommended Next Step:
              </span>
              <p className="text-xs text-navy-900 font-semibold mb-3">
                Review your top priority gaps with our enterprise architecture leads in an initial 30-minute working session.
              </p>
              <a
                href={BRAND_CONFIG.contact.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-navy-900 text-white font-bold text-xs hover:bg-navy-700 transition"
              >
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                Book 30-Minute Consultation (Cal.com)
              </a>
            </div>

            <button
              onClick={onClose}
              className="text-xs font-bold text-muted hover:text-navy-900"
            >
              Close and return to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
