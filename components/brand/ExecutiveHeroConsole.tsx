'use client';

import React, { useState, useEffect } from 'react';
import { HexMark } from './HexMark';
import {
  Compass,
  Code2,
  Server,
  ShieldCheck,
  Lock,
  GraduationCap,
  Activity,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export const ExecutiveHeroConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [pulseIndex, setPulseIndex] = useState(0);

  const pillars = [
    {
      name: 'Technology Advisory',
      tag: 'Strategic Roadmap',
      metric: '3-Year Horizon',
      icon: Compass,
      outcome: 'Board-level technology blueprints & digital ROI optimization.',
      href: '/services/technology-advisory',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      name: 'Software Engineering',
      tag: 'Scale & Resilience',
      metric: 'Microservices & Cloud',
      icon: Code2,
      outcome: 'High-throughput enterprise platforms built for seamless evolution.',
      href: '/services/software-development',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      name: 'Technology Support',
      tag: '24/7 Reliability',
      metric: '99.98% SLA',
      icon: Server,
      outcome: 'Proactive Site Reliability Engineering & managed cloud operations.',
      href: '/services/technology-support',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      name: 'GRC & Policy',
      tag: 'Governance Assurance',
      metric: 'ISO 27001 & UU PDP',
      icon: ShieldCheck,
      outcome: 'Institutional compliance, SOPs, and regulatory audit defense.',
      href: '/services/policy-sop-governance',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      name: 'Cybersecurity Hub',
      tag: 'Offensive & Defensive',
      metric: 'NIST CSF 2.0',
      icon: Lock,
      outcome: 'VAPT vulnerability discovery & 24/7 Managed SOC containment.',
      href: '/services/cybersecurity',
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    },
    {
      name: 'Capability Building',
      tag: 'Workforce Readiness',
      metric: 'Culture & Labs',
      icon: GraduationCap,
      outcome: 'Empowering engineering teams with secure coding habits.',
      href: '/services/training-awareness',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
  ];

  // Auto-cycle through pillars every 4 seconds if untouched
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % pillars.length);
      setPulseIndex((prev) => (prev + 1) % 6);
    }, 4000);
    return () => clearInterval(timer);
  }, [pillars.length]);

  const activePillar = pillars[activeTab];
  const IconComponent = activePillar.icon;

  return (
    <div className="w-full relative">
      {/* Background ambient glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-gold-500/20 to-purple-600/20 rounded-3xl blur-2xl opacity-50" />

      {/* Main Glass Console Card */}
      <div className="relative rounded-3xl bg-navy-900/90 border border-navy-700/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-6 sm:p-8 overflow-hidden text-white">
        {/* Console Header Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-navy-700/80">
          <div className="flex items-center gap-3">
            <HexMark size={32} glow={true} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-gold-300">
                  RTI Integrated Matrix
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                End-to-End Enterprise Capability Engine
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-navy-700/60 border border-navy-500/60 text-[11px] text-slate-300 font-mono">
            <Activity className="w-3.5 h-3.5 text-gold-400" />
            <span>6 Pillars Balanced</span>
          </div>
        </div>

        {/* 6 Pillars Quick Selector Ribbon */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-5">
          {pillars.map((p, idx) => {
            const isCurrent = activeTab === idx;
            const PillIcon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-navy-700 text-white border-gold-500 shadow-md scale-105'
                    : 'bg-navy-700/30 text-slate-400 border-navy-600/50 hover:bg-navy-700/50 hover:text-slate-200'
                }`}
              >
                <PillIcon
                  className={`w-4 h-4 ${
                    isCurrent ? 'text-gold-300' : 'text-slate-400'
                  }`}
                />
                <span className="text-[10px] font-bold tracking-tight line-clamp-1">
                  {p.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Focus Area Card */}
        <div className="bg-navy-700/40 rounded-2xl border border-navy-600/60 p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-700/60">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${activePillar.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Active Discipline Focus:
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {activePillar.name}
                </h4>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-navy-900/90 text-gold-300 text-xs font-mono font-bold border border-gold-500/30 shrink-0 self-start sm:self-auto">
              {activePillar.metric}
            </span>
          </div>

          <div className="py-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
              Measurable Executive Value:
            </span>
            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              &ldquo;{activePillar.outcome}&rdquo;
            </p>
          </div>

          <div className="pt-3 border-t border-navy-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full SLA & Governance Warranty</span>
            </span>

            <Link
              href={activePillar.href}
              className="inline-flex items-center gap-1 text-xs font-bold text-gold-400 hover:text-gold-300 transition group"
            >
              <span>Explore Pillar Specifications</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Live Security & Resilience Signals */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-navy-700/30 border border-navy-600/40">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Regulatory</span>
            <span className="text-xs font-bold text-slate-200 font-mono">UU PDP & OJK</span>
          </div>
          <div className="p-2.5 rounded-xl bg-navy-700/30 border border-navy-600/40">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Standard</span>
            <span className="text-xs font-bold text-slate-200 font-mono">ISO/IEC 27001</span>
          </div>
          <div className="p-2.5 rounded-xl bg-navy-700/30 border border-navy-600/40">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Architecture</span>
            <span className="text-xs font-bold text-slate-200 font-mono">Zero-Trust Ready</span>
          </div>
          <div className="p-2.5 rounded-xl bg-navy-700/30 border border-navy-600/40">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Privilege</span>
            <span className="text-xs font-bold text-slate-200 font-mono">100% NDA Covered</span>
          </div>
        </div>
      </div>
    </div>
  );
};
