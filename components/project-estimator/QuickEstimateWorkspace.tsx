'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BRAND_CONFIG } from '@/lib/config/contact';
import type { EstimatorBootstrap, EstimatorQuestion } from '@/lib/project-estimator/types';
import { computeDurationRange, tshirtFromMd } from '@/packages/engine/index.js';

type QuickEstimateWorkspaceProps = {
  bootstrap: EstimatorBootstrap;
  initialServiceId?: string;
  onExport: (payload: { serviceId: string; answers: Record<string, unknown> }) => void;
  onStartDetailed: (payload: { serviceId: string; answers: Record<string, unknown> }) => void;
};

const shortLabels: Record<string, string> = {
  'web-application': 'Web App',
  'mobile-application': 'Mobile',
  'api-integration-middleware': 'API & Integrasi',
  'ai-data-solution': 'AI / Data',
  'managed-support': 'Support',
  'vapt-web': 'VAPT Web',
  'vapt-mobile': 'VAPT Mobile',
  'vapt-api': 'VAPT API',
  'vapt-network': 'VAPT Network',
  'secure-code-review': 'Code Review',
  'governance-iso': 'ISO',
  'governance-pdp': 'UU PDP',
  'it-security-audit': 'IT Audit',
  'it-advisory': 'Advisory',
  'training-academy': 'Training',
};

const guaranteesBySlug: Record<string, string[]> = {
  'web-application': ['Weekly sprint demo & milestone tracking', 'Dokumentasi arsitektur & secure coding', 'Bug warranty sesuai kebijakan RTI'],
  'mobile-application': ['Weekly sprint demo & milestone tracking', 'Release readiness documentation', 'Bug warranty sesuai kebijakan RTI'],
  'api-integration-middleware': ['Integration specification', 'Milestone tracking', 'Technical handover documentation'],
  'ai-data-solution': ['Data/AI scope traceability', 'Evaluation criteria documented', 'Operational handover'],
  'managed-support': ['SLA response/resolution sesuai tier', 'Monthly service reporting', 'Escalation path'],
  'vapt-web': ['Free verification retest sesuai kebijakan RTI', 'Executive + technical report', 'Evidence-based findings'],
  'vapt-mobile': ['Free verification retest sesuai kebijakan RTI', 'Executive + technical report', 'Mobile security evidence'],
  'vapt-api': ['Free verification retest sesuai kebijakan RTI', 'Executive + technical report', 'Endpoint-level findings'],
  'vapt-network': ['Free verification retest sesuai kebijakan RTI', 'Executive + technical report', 'Infrastructure findings register'],
  'secure-code-review': ['Code finding traceability', 'Remediation guidance', 'Executive + technical report'],
  'governance-iso': ['Gap register', 'Implementation roadmap', 'Evidence readiness guidance'],
  'governance-pdp': ['Privacy gap register', 'RoPA/DPIA work products sesuai scope', 'Prioritized remediation roadmap'],
  'it-security-audit': ['Evidence-based assessment', 'Gap and risk register', 'Prioritized improvement roadmap'],
  'it-advisory': ['Executive workshop', 'Target-state recommendation', 'Implementation roadmap'],
  'training-academy': ['Training material', 'Certificate administration sesuai scope', 'Post-session feedback'],
};

function defaultValue(question: EstimatorQuestion) {
  if (!question.options.length) return '';
  const recommended = question.options.find((option) => /recommended|direkomendasikan/i.test(option.label));
  if (recommended) return recommended.value;
  const middle = question.options[Math.min(1, question.options.length - 1)];
  return middle?.value || question.options[0]?.value || '';
}

function buildDefaults(questions: EstimatorQuestion[]) {
  return Object.fromEntries(questions.map((question) => [question.key, defaultValue(question)]));
}

function serviceQuestions(bootstrap: EstimatorBootstrap, serviceId: string) {
  const specific = bootstrap.questions
    .filter((question) => question.serviceId === serviceId && question.quickMode && question.options.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const common = bootstrap.questions
    .filter((question) => !question.serviceId && question.quickMode && question.options.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return [...specific, ...common].slice(0, 6);
}

function squadFor(slug: string, md: number, tshirt: string) {
  if (slug.startsWith('vapt-') || slug === 'secure-code-review') {
    const count = md <= 10 ? 1 : md <= 30 ? 2 : 3;
    return count === 1
      ? '1 Security Specialist + verification/review'
      : `${count} Security Specialists + Lead/verification review`;
  }
  if (slug === 'managed-support') return 'Service Lead + L1/L2/L3 coverage sesuai SLA';
  if (slug === 'training-academy') return '1 Lead Trainer + coordinator / lab support sesuai kelas';
  if (slug.startsWith('governance-') || slug === 'it-security-audit' || slug === 'it-advisory') {
    return md <= 12 ? '1 Lead Consultant + SME support' : '1 Lead Consultant + 1–2 Consultants / SME';
  }
  if (tshirt === 'XS' || tshirt === 'S') return '1 Lead Developer + 1 Developer + QA part-time';
  if (tshirt === 'M') return '1 PM, 1 Tech Lead, 2 Developers, 1 QA';
  return '1 PM, 1 Tech Lead, 3–5 Developers, 1–2 QA + specialist support';
}

function nonExecutionDays(slug: string) {
  if (slug.startsWith('vapt-')) return 7;
  if (slug.startsWith('governance-') || slug === 'it-security-audit' || slug === 'it-advisory') return 5;
  if (slug === 'training-academy') return 2;
  if (slug === 'managed-support') return 0;
  return 10;
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function QuickEstimateWorkspace({
  bootstrap,
  initialServiceId,
  onExport,
  onStartDetailed,
}: QuickEstimateWorkspaceProps) {
  const services = bootstrap.services;
  const initial = services.some((service) => service.id === initialServiceId)
    ? String(initialServiceId)
    : services[0]?.id || '';
  const [serviceId, setServiceId] = useState(initial);
  const [locale, setLocale] = useState<'id' | 'en'>('id');
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const questions = useMemo(
    () => serviceQuestions(bootstrap, serviceId),
    [bootstrap, serviceId],
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => buildDefaults(questions));

  useEffect(() => {
    const nextQuestions = serviceQuestions(bootstrap, serviceId);
    setAnswers(buildDefaults(nextQuestions));
    setTouched(new Set());
  }, [bootstrap, serviceId]);

  const selectedService = services.find((service) => service.id === serviceId) || services[0];

  const result = useMemo(() => {
    if (!selectedService) return null;
    const selected = questions
      .map((question) => {
        const value = String(answers[question.key] ?? '');
        const option = question.options.find((item) => item.value === value);
        return { question, option };
      })
      .filter((item) => item.option);

    const effortFactor = selected.length
      ? selected.reduce((sum, item) => sum + Number(item.option?.effortMultiplier || 1), 0) / selected.length
      : 1;
    const md = Math.max(1, Math.ceil(selectedService.baseEffortDays * effortFactor));
    const tshirt = tshirtFromMd(md);
    const confirmedRatio = questions.length ? touched.size / questions.length : 0;
    const confidence = Math.max(45, Math.min(95, Math.round(55 + confirmedRatio * 35)));
    const squadSize =
      selectedService.slug.startsWith('vapt-') || selectedService.slug === 'secure-code-review'
        ? md <= 10 ? 1 : md <= 30 ? 2 : 3
        : tshirt === 'XS' || tshirt === 'S' ? 2 : tshirt === 'M' ? 4 : 6;
    const duration = computeDurationRange({
      executionMd: md,
      squadSize,
      efficiency: 0.85,
      nonExecutionDays: nonExecutionDays(selectedService.slug),
      confidenceScore: confidence,
    });

    const assumptions = questions
      .filter((question) => !touched.has(question.key))
      .map((question) => `${question.label}: ${question.options.find((item) => item.value === String(answers[question.key] ?? ''))?.label || 'default'}`);

    const riskFlags = selected
      .filter((item) => Number(item.option?.score || 0) >= 5)
      .slice(0, 3)
      .map((item) => `${item.question.label}: ${item.option?.label}`);

    return {
      md,
      tshirt,
      confidence,
      duration,
      squad: squadFor(selectedService.slug, md, tshirt),
      guarantees: guaranteesBySlug[selectedService.slug] || ['Scope confirmation', 'Delivery documentation', 'Formal RTI review before quotation'],
      assumptions,
      riskFlags,
      priceConfigured: selectedService.basePriceMin > 0 && selectedService.basePriceMax >= selectedService.basePriceMin,
      priceMin: selectedService.basePriceMin,
      priceMax: selectedService.basePriceMax,
    };
  }, [selectedService, questions, answers, touched]);

  if (!selectedService || !result) return null;

  const labels = locale === 'id'
    ? {
        helper: 'Pilih layanan dan parameter utama. Estimasi berubah secara deterministik saat parameter berubah.',
        params: 'Parameter Quick Estimate',
        effort: 'Indicative Effort & Sizing',
        weeks: 'Minggu',
        md: 'MD P50',
        squad: 'Recommended Dedicated Squad',
        guarantees: 'Included Guarantees',
        confidence: 'Scope Confidence',
        assumptions: 'Asumsi yang belum dikonfirmasi',
        flags: 'Risk flags',
        investment: 'Rentang investasi indikatif',
        calibration: 'KALIBRASI RTI',
        export: 'Export Draft RFQ Package',
        detail: 'Lanjut ke Detailed RFQ',
        whatsapp: 'Konsultasi via WhatsApp',
        schedule: 'Jadwalkan Discovery Call',
      }
    : {
        helper: 'Select the service and core parameters. The deterministic estimate refreshes whenever scope changes.',
        params: 'Quick Estimate Parameters',
        effort: 'Indicative Effort & Sizing',
        weeks: 'Weeks',
        md: 'MD P50',
        squad: 'Recommended Dedicated Squad',
        guarantees: 'Included Guarantees',
        confidence: 'Scope Confidence',
        assumptions: 'Unconfirmed assumptions',
        flags: 'Risk flags',
        investment: 'Indicative investment range',
        calibration: 'RTI CALIBRATION',
        export: 'Export Draft RFQ Package',
        detail: 'Continue to Detailed RFQ',
        whatsapp: 'Consult via WhatsApp',
        schedule: 'Schedule Discovery Call',
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-xs leading-relaxed text-muted sm:text-sm">{labels.helper}</p>
        <div className="inline-flex w-fit rounded-lg border border-line bg-white p-1 text-[10px] font-extrabold">
          <button type="button" onClick={() => setLocale('id')} className={`rounded-md px-3 py-1.5 ${locale === 'id' ? 'bg-navy-900 text-white' : 'text-muted'}`}>ID</button>
          <button type="button" onClick={() => setLocale('en')} className={`rounded-md px-3 py-1.5 ${locale === 'en' ? 'bg-navy-900 text-white' : 'text-muted'}`}>EN</button>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        <div className="flex min-w-max gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setServiceId(service.id)}
              className={`min-h-10 rounded-xl border px-3.5 py-2 text-[11px] font-extrabold transition sm:text-xs ${
                service.id === serviceId
                  ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
                  : 'border-line bg-white text-navy-900 hover:border-gold-500'
              }`}
            >
              {shortLabels[service.slug] || service.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-700">{labels.params}</div>
            <h2 className="mt-1 text-base font-extrabold text-navy-900 sm:text-lg">{selectedService.name}</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">{selectedService.description}</p>
          </div>
          <ShieldCheck className="h-5 w-5 shrink-0 text-gold-600" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {questions.map((question) => {
            const isConfirmed = touched.has(question.key);
            return (
              <label key={question.id} className="block min-w-0 text-[11px] font-bold text-navy-900">
                <span className="flex items-center justify-between gap-2">
                  <span>{question.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                    isConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {isConfirmed ? (locale === 'id' ? 'Dikonfirmasi' : 'Confirmed') : (locale === 'id' ? 'Asumsi' : 'Assumption')}
                  </span>
                </span>
                <select
                  value={String(answers[question.key] ?? '')}
                  onChange={(event) => {
                    setAnswers((current) => ({ ...current, [question.key]: event.target.value }));
                    setTouched((current) => new Set([...current, question.key]));
                  }}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-xs font-medium text-navy-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 sm:text-sm"
                >
                  {question.options.map((option) => (
                    <option key={option.id} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {question.helpText && <span className="mt-1 block text-[10px] font-normal leading-relaxed text-muted">{question.helpText}</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gold-500/25 bg-beige-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700">{labels.effort}</div>
            <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
              <div>
                <div className="text-2xl font-black tracking-tight text-navy-900 sm:text-3xl">
                  {result.duration.p50Weeks}–{result.duration.p80Weeks} {labels.weeks}
                </div>
                <div className="mt-1 text-[11px] text-muted">{result.md} {labels.md}</div>
              </div>
              <div className="rounded-full bg-navy-900 px-3 py-1.5 text-[11px] font-extrabold text-gold-300">
                T-Shirt Size: {result.tshirt}
              </div>
            </div>
          </div>

          <div className="min-w-[180px] rounded-xl border border-line bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-wider text-muted">
              <span>{labels.confidence}</span><span>{result.confidence}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-grey-50">
              <div className="h-full rounded-full bg-navy-900" style={{ width: `${result.confidence}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 border-t border-gold-500/20 pt-5 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-extrabold text-navy-900">{labels.squad}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{result.squad}</p>
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-navy-900">{labels.guarantees}</h3>
            <div className="mt-2 space-y-1.5">
              {result.guarantees.map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {(result.assumptions.length > 0 || result.riskFlags.length > 0) && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result.assumptions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">{labels.assumptions}</div>
                <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted">
                  {result.assumptions.slice(0, 3).map((item) => <div key={item}>• {item}</div>)}
                </div>
              </div>
            )}
            {result.riskFlags.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-white p-4">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> {labels.flags}
                </div>
                <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted">
                  {result.riskFlags.map((item) => <div key={item}>• {item}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-xl border border-line bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{labels.investment}</div>
              <div className="mt-1 text-sm font-extrabold text-navy-900">
                {result.priceConfigured ? `${money(result.priceMin)} – ${money(result.priceMax)}` : (locale === 'id' ? 'Ditampilkan setelah kalibrasi komersial RTI' : 'Shown after RTI commercial calibration')}
              </div>
            </div>
            {!result.priceConfigured && (
              <span className="w-fit rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-gold-700">{labels.calibration}</span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onExport({ serviceId, answers })}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-3 text-xs font-extrabold text-navy-900 transition hover:bg-gold-300"
          >
            <FileText className="h-4 w-4" /> {labels.export}
          </button>
          <button
            type="button"
            onClick={() => onStartDetailed({ serviceId, answers })}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-xs font-extrabold text-navy-900 transition hover:border-gold-500/60"
          >
            {labels.detail} <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a
            href={BRAND_CONFIG.contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[11px] font-bold text-navy-900"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" /> {labels.whatsapp}
          </a>
          <Link
            href={BRAND_CONFIG.contact.bookingUrl}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[11px] font-bold text-navy-900"
          >
            <Calendar className="h-4 w-4 text-gold-600" /> {labels.schedule}
          </Link>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-navy-900 px-4 py-3 text-[10px] leading-relaxed text-slate-300">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400" />
          <span>
            Estimasi quick scope menggunakan engine deterministik. AI Scoping Copilot hanya boleh membantu ekstraksi, pertanyaan dan narasi; angka effort, durasi dan harga tidak boleh dihasilkan AI.
          </span>
        </div>
      </div>
    </div>
  );
}
