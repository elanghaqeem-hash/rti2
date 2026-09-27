'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckSquare,
  DraftingCompass,
  Code,
  ShieldCheck,
  Server,
  RefreshCw,
} from 'lucide-react';

interface Step {
  step: number;
  phase: string;
  name: string;
  deliverables: string[];
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    step: 1,
    phase: 'UNDERSTAND',
    name: 'Discover & Align',
    icon: Search,
    deliverables: ['Stakeholder alignment', 'Business context', 'Current state baseline'],
    description: 'We conduct rigorous discovery into your strategic objectives, regulatory requirements, constraints, and target outcomes.',
  },
  {
    step: 2,
    phase: 'ASSESS',
    name: 'Benchmark & Assess',
    icon: CheckSquare,
    deliverables: ['Maturity scorecards', 'Risk registers', 'Gap prioritization'],
    description: 'Using proven frameworks (NIST CSF, ISO 27001, POJK, UU PDP), we quantify existing maturity and pin down operational gaps.',
  },
  {
    step: 3,
    phase: 'DESIGN',
    name: 'Architect & Blueprint',
    icon: DraftingCompass,
    deliverables: ['Target architecture', 'Technology blueprint', 'Implementation roadmap'],
    description: 'We formulate concrete technology roadmaps, system architectures, and security-by-design specifications.',
  },
  {
    step: 4,
    phase: 'DELIVER',
    name: 'Engineer & Build',
    icon: Code,
    deliverables: ['Clean codebases', 'Modern microservices/APIs', 'Automated CI/CD'],
    description: 'Enterprise-grade software engineering executed with modern DevOps pipelines, automated quality gates, and scalable design.',
  },
  {
    step: 5,
    phase: 'PROTECT',
    name: 'Secure & Assure',
    icon: ShieldCheck,
    deliverables: ['VAPT reports', 'Security hardening', 'Compliance verification'],
    description: 'Offensive penetration testing and defensive validations verify that applications, networks, and data stores withstand active threats.',
  },
  {
    step: 6,
    phase: 'OPERATE',
    name: 'Operate & Monitor',
    icon: Server,
    deliverables: ['SLA monitoring', 'Incident response runbooks', 'Cloud operations'],
    description: '24/7 proactive infrastructure operations, system reliability engineering, and managed support to ensure high availability.',
  },
  {
    step: 7,
    phase: 'IMPROVE',
    name: 'Refine & Transform',
    icon: RefreshCw,
    deliverables: ['Post-implementation reviews', 'Capacity planning', 'Workforce upskilling'],
    description: 'Continuous feedback loops, performance optimizations, and training to solidify self-sufficient capability inside your team.',
  },
];

export const LifecycleSeven: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const current = STEPS.find((s) => s.step === activeStep) || STEPS[0];

  return (
    <section className="py-20 bg-white border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 text-gold-600 text-xs font-bold uppercase tracking-wider mb-4 border border-gold-500/30">
            How We Work
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            The 7-Step Delivery & Assurance Lifecycle
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted">
            From initial business discovery to continuous operational refinement, we execute through structured, transparent, and outcome-oriented milestones.
          </p>
        </div>

        {/* Step Buttons Chain */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-10">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = s.step === activeStep;
            return (
              <button
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-navy-900 text-white border-navy-900 shadow-md scale-105'
                    : 'bg-grey-50 text-navy-900 border-line hover:bg-white hover:border-gold-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCurrent ? 'bg-gold-500 text-navy-900' : 'bg-line/60 text-muted'
                    }`}
                  >
                    0{s.step}
                  </span>
                  <Icon
                    className={`w-4 h-4 ${
                      isCurrent ? 'text-gold-300' : 'text-muted'
                    }`}
                  />
                </div>
                <div className="font-bold text-xs line-clamp-1">{s.name}</div>
                <div
                  className={`text-[9px] uppercase tracking-wider font-semibold mt-0.5 ${
                    isCurrent ? 'text-gold-300/80' : 'text-blue-600'
                  }`}
                >
                  {s.phase}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Detail Card */}
        <div className="bg-beige-50 border border-beige-200 rounded-2xl p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-line text-xs font-bold text-navy-700 uppercase tracking-wider mb-4">
                Step 0{current.step}: {current.phase}
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                {current.name}
              </h3>
              <p className="mt-3 text-muted text-base leading-relaxed">
                {current.description}
              </p>
            </div>

            <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-line shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold-500" />
                Key Deliverables & Artifacts:
              </h4>
              <ul className="space-y-2.5">
                {current.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-navy-900">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
