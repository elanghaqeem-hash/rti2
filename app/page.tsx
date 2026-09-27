import React from 'react';
import Link from 'next/link';
import { ExecutiveHeroConsole } from '@/components/brand/ExecutiveHeroConsole';
import { ComplexityToClarity } from '@/components/diagrams/ComplexityToClarity';
import { EcosystemGraph } from '@/components/diagrams/EcosystemGraph';
import { LifecycleSeven } from '@/components/diagrams/LifecycleSeven';
import { ClientsSection } from '@/components/layout/ClientsSection';
import { BRAND_CONFIG } from '@/lib/config/contact';
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Calendar,
  Sparkles,
  FileCheck,
  CheckCircle2,
  Lock,
  Compass,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="w-full bg-white">
      {/* 1. PRESTIGIOUS BIG 4 EXECUTIVE HERO SECTION */}
      <section className="relative bg-navy-900 text-white pt-10 pb-20 sm:pt-14 sm:pb-24 overflow-hidden border-b border-navy-700/80">
        {/* Subtle geometric background grid and lighting mesh */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#4F86F0_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Authoritative Editorial Copy */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Executive Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-700/80 border border-gold-500/40 text-gold-300 text-xs font-bold uppercase tracking-[0.2em] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Technology &bull; Security &bull; Transformation</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Technology That Moves{' '}
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Business Forward
                </span>
              </h1>

              {/* Six Pillars Monospace Sub-bar */}
              <div className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 uppercase font-mono flex flex-wrap items-center gap-2">
                <span>Strategy</span>
                <span className="text-gold-500">&bull;</span>
                <span>Software</span>
                <span className="text-gold-500">&bull;</span>
                <span>Support</span>
                <span className="text-gold-500">&bull;</span>
                <span>Governance</span>
                <span className="text-gold-500">&bull;</span>
                <span>Cybersecurity</span>
                <span className="text-gold-500">&bull;</span>
                <span>People</span>
              </div>

              {/* Strategic Positioning Paragraph */}
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                {BRAND_CONFIG.positioning.id}
              </p>

              {/* Key Trust Checkmarks */}
              <div className="pt-1 space-y-2 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Trusted by Tier-1 Banks, Sovereign Regulators & Fintech Gateways</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Integrated Governance, DevSecOps & 24/7 Managed Operations</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/assessment"
                  className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-sm transition-all shadow-[0_10px_30px_-10px_rgba(228,161,27,0.5)] flex items-center justify-center gap-2 group"
                >
                  <span>Start Free Maturity Assessment</span>
                  <ArrowRight className="w-4 h-4 text-navy-900 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/contact"
                  className="w-full sm:w-auto px-7 py-4 rounded-xl bg-navy-700/80 hover:bg-navy-600 text-white font-bold text-sm transition border border-navy-500/80 flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Talk to Risetin</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Executive Hero Console */}
            <div className="lg:col-span-5">
              <ExecutiveHeroConsole />
            </div>
          </div>
        </div>

        {/* Executive Strategic Trust Strip */}
        <div className="mt-16 pt-8 border-t border-navy-700/60 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-700/80 border border-navy-500/60 flex items-center justify-center text-gold-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">6 Balanced Pillars</span>
                <span className="text-[11px] text-slate-400">Zero vendor silo bias</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-700/80 border border-navy-500/60 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">UU PDP No. 27/2022</span>
                <span className="text-[11px] text-slate-400">National privacy aligned</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-700/80 border border-navy-500/60 flex items-center justify-center text-blue-400 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">20-Domain Diagnostic</span>
                <span className="text-[11px] text-slate-400">Instant radar benchmarks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-navy-700/80 border border-navy-500/60 flex items-center justify-center text-gold-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">100% NDA Privilege</span>
                <span className="text-[11px] text-slate-400">Enterprise grade secrecy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPLEXITY TO CLARITY SECTION */}
      <ComplexityToClarity />

      {/* 3. INTERACTIVE 6-PILLAR ECOSYSTEM GRAPH */}
      <EcosystemGraph />

      {/* 4. PURPOSE & VALUE CHAIN (UNDERSTAND -> DESIGN -> DELIVER -> PROTECT -> IMPROVE) */}
      <section className="py-20 bg-beige-50 border-b border-beige-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-navy-700 text-xs font-bold uppercase tracking-wider mb-4 border border-line">
              Continuous Loop
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
              A Complete Technology Lifecycle
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted">
              We bridge strategic executive intent with day-to-day engineering precision through five continuous disciplines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'UNDERSTAND',
                desc: 'Business drivers, regulatory context, current gaps, and ROI parameters.',
                color: 'border-blue-600/30 text-blue-600',
              },
              {
                step: '02',
                title: 'DESIGN',
                desc: 'Target architecture, technology master plans, and security-by-design models.',
                color: 'border-gold-500/30 text-gold-600',
              },
              {
                step: '03',
                title: 'DELIVER',
                desc: 'High-throughput enterprise software, microservices, and clean infrastructure.',
                color: 'border-emerald-600/30 text-emerald-600',
              },
              {
                step: '04',
                title: 'PROTECT',
                desc: 'Offensive VAPT, defensive telemetry, and rigorous GRC compliance assurance.',
                color: 'border-rose-600/30 text-rose-600',
              },
              {
                step: '05',
                title: 'IMPROVE',
                desc: '24/7 managed support, resilience reviews, and organizational capability growth.',
                color: 'border-purple-600/30 text-purple-600',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-line hover:shadow-md transition-shadow relative"
              >
                <div className={`text-2xl font-black mb-2 ${item.color}`}>
                  {item.step}
                </div>
                <h3 className="font-extrabold text-base text-navy-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE TOOLS TEASER (B2B LEAD ENGINES) */}
      <section className="py-20 bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 text-gold-600 text-xs font-bold uppercase tracking-wider mb-3 border border-gold-500/30">
                Interactive B2B Tools
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
                Benchmark Your Readiness in Minutes
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted max-w-2xl">
                Try our self-service diagnostic modules with zero login required. Receive instant gap visualizers and download comprehensive executive reports.
              </p>
            </div>
            <Link
              href="/tools"
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-400"
            >
              Browse All Diagnostic Tools &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tool 1 */}
            <div className="bg-grey-50 rounded-2xl p-6 border border-line hover:border-gold-500/50 hover:bg-white transition flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-gold-600 mb-1">
                  20 Domains &bull; 5–10 Mins
                </div>
                <h3 className="text-lg font-extrabold text-navy-900 mb-2">
                  Technology & Cyber Maturity Assessment
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Assess technology, cybersecurity, governance, resilience, privacy, cloud, AI governance, and people capability with server-verified scoring and a prioritized roadmap.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line/60">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 text-xs font-bold text-navy-900 group-hover:text-blue-600 transition"
                >
                  Start Free Maturity Assessment &rarr;
                </Link>
              </div>
            </div>

            {/* Tool 2 */}
            <div className="bg-grey-50 rounded-2xl p-6 border border-line hover:border-gold-500/50 hover:bg-white transition flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                  NIST CSF 2.0 &bull; 5 Mins
                </div>
                <h3 className="text-lg font-extrabold text-navy-900 mb-2">
                  Cyber Quick Check
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Quickly assess your posture across Govern, Identify, Protect, Detect, Respond, and Recover with instant wheel scoring.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line/60">
                <Link
                  href="/tools/cyber-quick-check"
                  className="inline-flex items-center gap-2 text-xs font-bold text-navy-900 group-hover:text-blue-600 transition"
                >
                  Run Quick Check &rarr;
                </Link>
              </div>
            </div>

            {/* Tool 3 */}
            <div className="bg-grey-50 rounded-2xl p-6 border border-line hover:border-gold-500/50 hover:bg-white transition flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                  Passive &bull; Instant
                </div>
                <h3 className="text-lg font-extrabold text-navy-900 mb-2">
                  Security Headers Check
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Passively inspect HTTP security headers (HSTS, CSP, X-Frame-Options) and TLS certificates with strict anti-SSRF protection.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line/60">
                <Link
                  href="/tools/security-headers-check"
                  className="inline-flex items-center gap-2 text-xs font-bold text-navy-900 group-hover:text-blue-600 transition"
                >
                  Analyze Domain &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INDUSTRIES & SELECTED CLIENTS */}
      <ClientsSection />

      {/* 7. HOW WE WORK (7 STEPS) */}
      <LifecycleSeven />

      {/* 8. FINAL HIGH-CONVERSION CTA SECTION (Dark Navy) */}
      <section className="bg-navy-900 text-white py-20 relative overflow-hidden border-t border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4 border border-gold-500/30">
            <Calendar className="w-3.5 h-3.5" />
            30-Minute Initial Consultation
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            LET&apos;S BUILD WHAT&apos;S NEXT.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Collaborate with an end-to-end partner who respects your operational realities, protects your digital assets, and accelerates your strategic milestones.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-6 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-300 text-navy-900 font-extrabold text-sm transition shadow-lg"
            >
              Discuss Your Requirement
            </Link>

            <Link
              href="/assessment"
              className="px-6 py-3.5 rounded-xl bg-navy-700 hover:bg-navy-500 text-white font-semibold text-sm transition border border-navy-500"
            >
              Start Free Maturity Assessment
            </Link>

            <Link
              href="/contact"
              className="px-6 py-3.5 rounded-xl bg-navy-700 hover:bg-navy-500 text-white font-semibold text-sm transition border border-navy-500"
            >
              Request a Proposal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
