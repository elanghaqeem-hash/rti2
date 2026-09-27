'use client';

import React, { useState } from 'react';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Send,
  CheckCircle2,
  Shield,
  Clock,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    sector: 'banking_insurance',
    email: '',
    whatsapp: '',
    serviceInterest: 'technology-advisory',
    needSummary: '',
    consent: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      alert('Mohon setujui ketentuan Pelindungan Data Pribadi (UU PDP) untuk melanjutkan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'contact_form',
          toolSlug: 'rfq-contact',
          name: formData.name,
          role: formData.role,
          company: formData.company,
          sector: formData.sector,
          email: formData.email,
          whatsapp: formData.whatsapp,
          needSummary: `[Layanan: ${formData.serviceInterest}] ${formData.needSummary}`,
          consent: formData.consent,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Terjadi kendala saat mengirim formulir. Silakan hubungi kami via WhatsApp.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kendala jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <section className="bg-navy-900 text-white py-16 sm:py-20 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              Direct Access
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Initiate a Confidential Consultation
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Connect directly with our enterprise technology and cybersecurity leads. All inquiries are covered by standard NDA protocols.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Direct Info & 30-Min Cal Embed option */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm space-y-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                    Immediate Direct Channels
                  </span>
                  <h3 className="text-xl font-extrabold text-navy-900 mt-1">
                    Corporate Contact Details
                  </h3>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-navy-900">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-navy-900">{BRAND_CONFIG.legalName}</strong>
                      <span className="text-muted leading-relaxed">
                        {BRAND_CONFIG.contact.address.fullAddress}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gold-500 shrink-0" />
                    <a
                      href={BRAND_CONFIG.contact.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-navy-900 hover:text-blue-600"
                    >
                      WhatsApp: {BRAND_CONFIG.contact.whatsapp}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gold-500 shrink-0" />
                    <a
                      href={`mailto:${BRAND_CONFIG.contact.email}`}
                      className="font-bold text-navy-900 hover:text-blue-600"
                    >
                      {BRAND_CONFIG.contact.email}
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-line">
                  <div className="overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-br from-beige-50 via-white to-gold-500/5">
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-600">
                            Konsultasi Awal • 30 Menit
                          </span>
                          <h3 className="mt-1 text-base sm:text-lg font-extrabold leading-snug text-navy-900">
                            Jadwalkan Konsultasi dengan Tim RTI
                          </h3>
                        </div>
                      </div>

                      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted">
                        Diskusikan kebutuhan teknologi, cybersecurity, GRC, ISO, pengembangan sistem,
                        atau training bersama solution lead kami. Pilih waktu yang paling sesuai untuk
                        sesi video call awal.
                      </p>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {['30 menit', 'Video call', 'Tanpa komitmen'].map((item) => (
                          <div
                            key={item}
                            className="rounded-lg border border-line bg-white px-2 py-2 text-[10px] sm:text-[11px] font-bold text-navy-700"
                          >
                            {item}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 space-y-2.5">
                        <a
                          href={BRAND_CONFIG.contact.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs sm:text-sm font-extrabold text-white transition hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                        >
                          <Calendar className="h-4 w-4 text-gold-400" />
                          Pilih Jadwal Konsultasi
                        </a>

                        <a
                          href={BRAND_CONFIG.contact.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-xs sm:text-sm font-bold text-navy-900 transition hover:border-gold-500/60 hover:bg-gold-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                          Konsultasi via WhatsApp
                        </a>
                      </div>

                      <p className="mt-3 text-center text-[10px] text-muted">
                        Kalender konsultasi akan terbuka di tab baru.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Formal RFQ Form */}
            <div className="lg:col-span-7">
              <div className="bg-white p-6 sm:p-10 rounded-2xl border border-line shadow-sm">
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600 block">
                    Formal Inquiry
                  </span>
                  <h2 className="text-2xl font-extrabold text-navy-900 mt-1">
                    Request for Quotation (RFQ) / Project Discovery
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Fill out the form below. Our technical directors review and respond within 1 business day.
                  </p>
                </div>

                {submitted ? (
                  <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h3 className="text-lg font-extrabold text-navy-900">
                      Inquiry Received Successfully
                    </h3>
                    <p className="text-xs sm:text-sm text-navy-700 max-w-md mx-auto">
                      Thank you. A formal notification has been sent to our enterprise team ({BRAND_CONFIG.contact.email}). We will review your requirements and reach out promptly.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setSubmitted(false)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Send another inquiry &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Budi Pratama"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          Job Role / Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          placeholder="e.g. Head of IT / CISO"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          Organization / Company *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="e.g. Bank Mandiri Sejahtera"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          Sector / Industry *
                        </label>
                        <select
                          value={formData.sector}
                          onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                        >
                          <option value="banking_insurance">Banking & Insurance</option>
                          <option value="fintech_payments">Fintech & Payments</option>
                          <option value="government_bumn">Government & BUMN/BUMD</option>
                          <option value="energy_resources">Energy & Resources</option>
                          <option value="enterprise_other">Enterprise & Others</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@company.co.id"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          WhatsApp / Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          placeholder="+62 812-xxxx-xxxx"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">
                        Primary Service of Interest
                      </label>
                      <select
                        value={formData.serviceInterest}
                        onChange={(e) => setFormData({ ...formData, serviceInterest: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                      >
                        <option value="technology-advisory">Technology Advisory & Strategy</option>
                        <option value="software-development">Custom Software Engineering</option>
                        <option value="cybersecurity-vapt">Penetration Testing (VAPT)</option>
                        <option value="cybersecurity-soc">24/7 Managed SOC / Defensive</option>
                        <option value="technology-support">Managed Cloud & 24/7 Operations</option>
                        <option value="iso-standards">ISO/IEC 27001 Certification Readiness</option>
                        <option value="pdp-compliance">UU PDP Compliance & DPIA</option>
                        <option value="training">Corporate Capability Training</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">
                        Brief Context & Objectives *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.needSummary}
                        onChange={(e) => setFormData({ ...formData, needSummary: e.target.value })}
                        placeholder="Tell us about your organizational scale, target timeline, technical requirements, or regulatory pressures..."
                        className="w-full px-3.5 py-2.5 rounded-lg border border-line text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                      />
                    </div>

                    {/* Mandatory UU PDP Consent Checkbox (NOT pre-checked) */}
                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 text-xs text-navy-900 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={formData.consent}
                          onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                          className="mt-0.5 rounded text-gold-500 focus:ring-gold-500 h-4 w-4 border-line"
                        />
                        <span className="leading-relaxed text-muted">
                          Saya menyetujui data pribadi ini diproses oleh{' '}
                          <strong>{BRAND_CONFIG.legalName}</strong> untuk keperluan komunikasi penawaran dan penjajakan konsultasi, sesuai dengan ketentuan{' '}
                          <Link href="/privacy" className="text-blue-600 underline">
                            Kebijakan Privasi (UU No. 27/2022)
                          </Link>.
                        </span>
                      </label>
                    </div>

                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-sm transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <span>Processing Inquiry...</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-navy-900" />
                            <span>Submit Formal RFQ Inquiry</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
