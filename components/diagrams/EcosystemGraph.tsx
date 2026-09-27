'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HexMark } from '../brand/HexMark';
import {
  Compass,
  Code2,
  Server,
  ShieldCheck,
  Lock,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

interface Pillar {
  id: string;
  name: string;
  tagline: string;
  outcome: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const PILLARS: Pillar[] = [
  {
    id: 'strategy',
    name: 'Technology Advisory',
    tagline: 'Strategic Direction & Tech Roadmaps',
    outcome: 'Better investment decisions and digital roadmaps aligned to business goals.',
    href: '/services/technology-advisory',
    icon: Compass,
    accentColor: '#1F5BD8',
  },
  {
    id: 'software',
    name: 'Software Engineering',
    tagline: 'Modern, Scalable Platforms',
    outcome: 'Faster, highly scalable, and secure applications built for change.',
    href: '/services/software-development',
    icon: Code2,
    accentColor: '#0EA5E9',
  },
  {
    id: 'operations',
    name: 'Technology Operations',
    tagline: 'Managed Cloud & 24/7 Support',
    outcome: 'Higher system reliability, fast incident resolution, and continuous monitoring.',
    href: '/services/technology-support',
    icon: Server,
    accentColor: '#10B981',
  },
  {
    id: 'governance',
    name: 'Policy, SOP & Governance',
    tagline: 'Enterprise GRC & ISO 27001',
    outcome: 'Institutional accountability, policy clarity, and regulatory peace of mind.',
    href: '/services/policy-sop-governance',
    icon: ShieldCheck,
    accentColor: '#8B5CF6',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    tagline: 'Offensive, Defensive & Security Ops',
    outcome: 'Proactive vulnerability discovery and resilient defense across your attack surface.',
    href: '/services/cybersecurity',
    icon: Lock,
    accentColor: '#EE7A1E',
  },
  {
    id: 'people',
    name: 'People & Capability',
    tagline: 'Workforce Readiness & Culture',
    outcome: 'Stronger technical capability, secure coding habits, and organizational cyber awareness.',
    href: '/services/training-awareness',
    icon: GraduationCap,
    accentColor: '#F59E0B',
  },
];

export const EcosystemGraph: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<Pillar>(PILLARS[0]);

  return (
    <div className="w-full bg-white py-20 text-navy-900 border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-600/20">
            6 Pillars of Enterprise Technology
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            Balanced Capability. Unified Delivery.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted">
            Risetin is neither solely a software house nor merely a security provider. We unite strategy, engineering, operations, governance, cybersecurity, and talent into one cohesive engine.
          </p>
        </div>

        {/* 6 Pillars Interactive Selector & Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Hexagon Navigation Cards (6 Pillars) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const isSelected = selectedPillar.id === pillar.id;

              return (
                <button
                  key={pillar.id}
                  onClick={() => setSelectedPillar(pillar)}
                  onMouseEnter={() => setSelectedPillar(pillar)}
                  className={`text-left p-5 rounded-xl border transition-all duration-200 relative group focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                    isSelected
                      ? 'bg-navy-900 text-white border-navy-900 shadow-xl scale-[1.02]'
                      : 'bg-grey-50 text-navy-900 border-line hover:border-gold-500/50 hover:bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-gold-500 text-navy-900'
                          : 'bg-white text-navy-700 shadow-sm group-hover:text-blue-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-navy-700 text-gold-300'
                          : 'bg-line/40 text-muted'
                      }`}
                    >
                      Pillar
                    </span>
                  </div>
                  <h3 className="mt-3 font-bold text-base tracking-tight">
                    {pillar.name}
                  </h3>
                  <p
                    className={`mt-1 text-xs line-clamp-2 ${
                      isSelected ? 'text-slate-300' : 'text-muted'
                    }`}
                  >
                    {pillar.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detailed Outcome Focus Card */}
          <div className="lg:col-span-5">
            <div className="bg-beige-50 rounded-2xl p-8 border border-beige-200 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <HexMark size={140} />
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-navy-700 text-xs font-semibold uppercase tracking-wider mb-4 border border-line shadow-sm">
                  Active Capability Detail
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-300 flex items-center justify-center shadow">
                    <selectedPillar.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-navy-900">
                      {selectedPillar.name}
                    </h3>
                    <p className="text-xs text-muted font-medium">
                      {selectedPillar.tagline}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-line/60">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-blue-600 mb-2">
                    Measurable Business Outcome:
                  </h4>
                  <p className="text-navy-900 font-medium text-base sm:text-lg leading-relaxed">
                    &ldquo;{selectedPillar.outcome}&rdquo;
                  </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={selectedPillar.href}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-navy-900 text-white font-semibold text-sm hover:bg-navy-700 transition shadow hover:shadow-md"
                  >
                    Explore Service Details
                    <ArrowRight className="w-4 h-4 text-gold-500" />
                  </Link>

                  <Link
                    href="/tools/solution-finder"
                    className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-white text-navy-900 font-semibold text-sm hover:bg-grey-50 transition border border-line"
                  >
                    Match With Your Need
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
