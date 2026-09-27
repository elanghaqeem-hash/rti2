'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  GraduationCap,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  Users,
  Send,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  format: string;
  description: string;
  syllabus: string[];
}

const COURSES: Course[] = [
  {
    id: 'cyber_awareness',
    title: 'Executive & Employee Cybersecurity Awareness',
    category: 'Cybersecurity Awareness',
    level: 'All Staff / Executives',
    duration: '1 Day (6 Hours)',
    format: 'Onsite / Virtual / In-House',
    description: 'Transforming staff from vulnerability to active defensive sensors against phishing, social engineering, and account takeovers.',
    syllabus: ['Real-World Threat Landscape', 'Spear Phishing & BEC Identification', 'Credential & Device Hygiene', 'Incident Reporting Protocols'],
  },
  {
    id: 'secure_coding',
    title: 'Secure Coding Bootcamp for Software Engineers',
    category: 'Secure Coding',
    level: 'Intermediate – Advanced Developers',
    duration: '3 Days (18 Hours)',
    format: 'Hands-on Lab (Virtual / Onsite)',
    description: 'Intensive code-level security: addressing OWASP Top 10 vulnerabilities, secure API design, cryptography, and DevSecOps pipelines.',
    syllabus: ['Injection & Broken Access Control Flaws', 'JWT & OAuth2 Security Pitfalls', 'Automated SAST/DAST in Git CI/CD', 'Remediation Workshops with Live Code'],
  },
  {
    id: 'iso_lead',
    title: 'ISO/IEC 27001:2022 Implementation & Internal Auditor',
    category: 'ISO Awareness',
    level: 'Compliance & IT Managers',
    duration: '2 Days (12 Hours)',
    format: 'Interactive Workshop',
    description: 'Practical guide to establishing an Information Security Management System (ISMS) and conducting rigorous internal audits.',
    syllabus: ['Clauses 4–10 Deep Dive', 'Annex A 93 Controls Masterclass', 'Risk Assessment & SoA Formulation', 'Conducting Stage 1 & 2 Audit Readiness'],
  },
  {
    id: 'it_governance_leadership',
    title: 'IT Governance, Risk & Board Compliance (POJK / BI)',
    category: 'IT Governance',
    level: 'C-Level / Heads of IT & Risk',
    duration: '2 Days (12 Hours)',
    format: 'Executive Seminar',
    description: 'Strategic IT capital allocation, multi-year blueprint execution, and managing regulatory accountability under OJK and Bank Indonesia.',
    syllabus: ['COBIT & ITIL Principles in Practice', 'Regulatory IT Risk Frameworks (POJK/SEOJK)', 'Technology Investment Scorecards', 'Boardroom Cyber Risk Communication'],
  },
];

export default function TrainingPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [registeredCourse, setRegisteredCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    email: '',
    whatsapp: '',
    pax: '1',
    consent: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCourses = COURSES.filter((c) => {
    if (selectedCategory === 'ALL') return true;
    return c.category === selectedCategory;
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      alert('Mohon setujui ketentuan privasi (UU PDP).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'training_registration',
          toolSlug: `training-${registeredCourse?.id}`,
          name: formData.name,
          role: formData.role,
          company: formData.company,
          email: formData.email,
          whatsapp: formData.whatsapp,
          needSummary: `Registrasi Training: ${registeredCourse?.title} (Jumlah Peserta: ${formData.pax})`,
          consent: formData.consent,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Gagal mengirim registrasi.');
      }
    } catch {
      alert('Kendala jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white min-h-screen">
      <section className="bg-navy-900 text-white py-16 sm:py-24 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              <GraduationCap className="w-3.5 h-3.5" />
              Workforce Capability Development
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Corporate Training & Engineering Bootcamps
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Upskill developers, IT managers, and corporate staff with hands-on labs taught by practicing enterprise architects and cybersecurity practitioners.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-grey-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {['ALL', 'Cybersecurity Awareness', 'Secure Coding', 'ISO Awareness', 'IT Governance'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-navy-900 text-white shadow'
                    : 'bg-white text-navy-700 border border-line hover:border-gold-500/50'
                }`}
              >
                {cat === 'ALL' ? 'All Programs' : cat}
              </button>
            ))}
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCourses.map((c) => (
              <div
                key={c.id}
                className="bg-white p-6 sm:p-8 rounded-2xl border border-line shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                      {c.category}
                    </span>
                    <span className="text-xs font-semibold text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gold-500" />
                      {c.duration}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-navy-900 mb-2">
                    {c.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mb-4">
                    {c.description}
                  </p>

                  <div className="bg-grey-50 p-4 rounded-xl border border-line space-y-2 mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900 block">
                      Core Syllabus Modules:
                    </span>
                    <ul className="space-y-1.5 text-xs text-navy-900">
                      {c.syllabus.map((syl, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{syl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-muted">
                    Format: <strong>{c.format}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setRegisteredCourse(c);
                      setSubmitted(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow"
                  >
                    Register / In-House Inquiry &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Modal */}
      {registeredCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-line relative">
            <button
              onClick={() => setRegisteredCourse(null)}
              className="absolute top-4 right-4 p-2 text-muted hover:text-navy-900 text-sm font-bold"
            >
              ✕
            </button>

            {!submitted ? (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 block mb-1">
                  Training Registration & In-House Proposal
                </span>
                <h3 className="text-lg font-extrabold text-navy-900 mb-1">
                  {registeredCourse.title}
                </h3>
                <p className="text-xs text-muted mb-4">
                  Lengkapi formulir di bawah ini untuk menerima silabus lengkap, jadwal terdekat, dan penawaran in-house corporate training.
                </p>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-line text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Jabatan / Role *</label>
                      <input
                        type="text"
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-line text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Perusahaan / Instansi *</label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-line text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Email Kerja *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-line text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Nomor WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-line text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Perkiraan Jumlah Peserta (Pax)</label>
                    <select
                      value={formData.pax}
                      onChange={(e) => setFormData({ ...formData, pax: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-line text-xs bg-white"
                    >
                      <option value="1">1 Peserta (Individu / Public Schedule)</option>
                      <option value="2-5">2 – 5 Peserta (Small Squad)</option>
                      <option value="6-15">6 – 15 Peserta (In-House Department)</option>
                      <option value="15+">Lebih dari 15 Peserta (Corporate-Wide)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-2 text-[11px] text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={formData.consent}
                        onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                        className="mt-0.5 rounded text-gold-500"
                      />
                      <span>
                        Saya menyetujui pemrosesan data oleh {BRAND_CONFIG.legalName} untuk keperluan koordinasi pelatihan sesuai Kebijakan Privasi UU PDP.
                      </span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-xs transition shadow disabled:opacity-50"
                    >
                      {isSubmitting ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran & Jadwal'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-navy-900">Pendaftaran Berhasil Dikirim</h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Silabus resmi dan jadwal pelatihan telah dikirimkan ke <strong>{formData.email}</strong>. Tim pelatihan kami akan segera menghubungi Anda.
                </p>
                <button
                  onClick={() => setRegisteredCourse(null)}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
