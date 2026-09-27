'use client';

import React, { useState } from 'react';
import { HexMark } from '../brand/HexMark';
import {
  Compass,
  Code2,
  Server,
  ShieldCheck,
  Lock,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Cloud,
  Cpu,
  Terminal,
} from 'lucide-react';

/* 1. ROADMAP CURVE (Technology Advisory) */
export const RoadmapCurve: React.FC = () => {
  const [activeMilestone, setActiveMilestone] = useState(2);

  const milestones = [
    { id: 0, title: '01. Current Baseline', deliverable: 'IT Health & Capability Assessment' },
    { id: 1, title: '02. Target State', deliverable: '3-Year Enterprise Target Architecture' },
    { id: 2, title: '03. Gap & Prioritization', deliverable: 'Strategic Investment Matrix & Business Case' },
    { id: 3, title: '04. Implementation Wave', deliverable: 'Quarterly Sprint Plan & Vendor Governance' },
    { id: 4, title: '05. Business Value Realization', deliverable: 'Continuous ROI Scorecard & Cost Savings' },
  ];

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white">
      <div className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-2">
        Interactive Visual: Strategic Technology Curve
      </div>
      <h3 className="text-lg font-bold mb-6">5-Stage Advisory Milestone Journey</h3>

      {/* Interactive Milestone Curve / Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
        {milestones.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMilestone(m.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeMilestone === m.id
                ? 'bg-gold-500 text-navy-900 border-gold-300 shadow-lg scale-105'
                : 'bg-navy-700/50 text-slate-300 border-navy-500 hover:bg-navy-700'
            }`}
          >
            <div className="text-xs font-extrabold">{m.title}</div>
          </button>
        ))}
      </div>

      <div className="bg-navy-700/60 p-5 rounded-xl border border-navy-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Milestone Key Deliverable:
          </span>
          <span className="text-base font-bold text-gold-300">
            {milestones[activeMilestone].deliverable}
          </span>
        </div>
        <span className="px-3 py-1 rounded-full bg-navy-900 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
          Executive Sign-Off
        </span>
      </div>
    </div>
  );
};

/* 2. SOFTWARE SDLC & ARCHITECTURE STACK */
export const SoftwareArchitectureStack: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<number>(0);

  const layers = [
    { title: 'User Experience & Client Tier', tech: 'Next.js 15, React, Tailwind, iOS & Android Native', sec: 'Content-Security-Policy & Anti-Tampering' },
    { title: 'API & Gateway Tier', tech: 'GraphQL, REST API, Kong / Envoy, Rate-Limiting', sec: 'JWT / mTLS & Strict Input Validation (Zod)' },
    { title: 'Application Services Tier', tech: 'Microservices (Go / TypeScript / Python), Event Mesh', sec: 'Role-Based Access Control (RBAC) & DevSecOps' },
    { title: 'Data Persistence & Vector Tier', tech: 'PostgreSQL, pgvector, Redis Cache, Encrypted S3', sec: 'AES-256 at Rest & Field-Level PII Masking' },
    { title: 'Cloud Infrastructure Tier', tech: 'Kubernetes (K8s), Docker Containers, Terraform', sec: 'VPC Peering, Least-Privilege IAM & Zero-Trust' },
  ];

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white relative">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-gold-300">
          Security By Design &bull; 5-Layer Stack
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
          OWASP ASVS Ready
        </span>
      </div>

      <div className="space-y-2 mb-6">
        {layers.map((l, idx) => (
          <button
            key={idx}
            onClick={() => setActiveLayer(idx)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              activeLayer === idx
                ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.01]'
                : 'bg-navy-700/40 text-slate-300 border-navy-500 hover:bg-navy-700'
            }`}
          >
            <div>
              <div className="font-bold text-xs sm:text-sm">{l.title}</div>
              <div className="text-[11px] opacity-80">{l.tech}</div>
            </div>
            <span className="text-[10px] font-mono uppercase bg-navy-900/60 px-2 py-1 rounded text-gold-300 shrink-0">
              Layer 0{idx + 1}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-navy-700/80 p-4 rounded-xl border border-gold-500/30 flex items-center gap-3">
        <Lock className="w-5 h-5 text-gold-400 shrink-0" />
        <div className="text-xs">
          <strong className="text-gold-300">Security Control Enforced: </strong>
          <span className="text-slate-200">{layers[activeLayer].sec}</span>
        </div>
      </div>
    </div>
  );
};

/* 3. COMMAND CENTER MOCK (Technology Support) */
export const CommandCenterMock: React.FC = () => {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Operations Command Center Live
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400">SLA 99.98% Guaranteed</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-navy-700/50 p-3 rounded-xl border border-navy-500">
          <div className="text-[10px] text-slate-400 uppercase font-bold">API Uptime</div>
          <div className="text-xl font-extrabold text-white mt-1">99.99%</div>
        </div>
        <div className="bg-navy-700/50 p-3 rounded-xl border border-navy-500">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Avg Latency</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">42 ms</div>
        </div>
        <div className="bg-navy-700/50 p-3 rounded-xl border border-navy-500">
          <div className="text-[10px] text-slate-400 uppercase font-bold">MTTR Resolution</div>
          <div className="text-xl font-extrabold text-gold-300 mt-1">&lt; 15 mins</div>
        </div>
        <div className="bg-navy-700/50 p-3 rounded-xl border border-navy-500">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Active Backups</div>
          <div className="text-xl font-extrabold text-blue-400 mt-1">Encrypted</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-navy-700">
        <span>Continuous Operational Cycle:</span>
        <span className="font-bold text-gold-300">Monitor &rarr; Detect &rarr; Respond &rarr; Resolve &rarr; Improve</span>
      </div>
    </div>
  );
};

/* 4. TEMPLE FRAMEWORK (Technology Blueprint) */
export const TempleFramework: React.FC = () => {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-2">
        Enterprise Temple Blueprint Architecture
      </div>
      {/* Roof */}
      <div className="bg-gold-500 text-navy-900 font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg mb-3">
        Business Strategy & Executive Outcomes
      </div>
      {/* Architrave */}
      <div className="bg-blue-600 text-white font-bold text-xs py-2 px-4 rounded-lg mb-4">
        Technology Strategy & Enterprise Digital Vision
      </div>
      {/* 6 Pillars */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
        {['Application Arch', 'Data & Analytics', 'Cloud & Infra', 'Security & PDP', 'Integration Mesh', 'People & Ops'].map((p, i) => (
          <div key={i} className="bg-navy-700 p-2.5 rounded-lg border border-navy-500 text-[11px] font-semibold text-slate-200">
            {p}
          </div>
        ))}
      </div>
      {/* Foundation */}
      <div className="bg-navy-700/90 text-slate-300 font-bold text-xs py-2.5 px-4 rounded-lg border border-navy-500">
        Foundation: Governance, Regulatory Compliance (OJK / BI / BSSN) & Multi-Year Roadmap
      </div>
    </div>
  );
};

/* 5. GOVERNANCE PYRAMID (Policy, SOP & Governance) */
export const GovernancePyramid: React.FC = () => {
  const levels = [
    { title: 'Level 1: Policies', desc: 'Board & Executive mandate, high-level directives' },
    { title: 'Level 2: Standards', desc: 'Mandatory technical controls & security baselines' },
    { title: 'Level 3: Standard Operating Procedures (SOP)', desc: 'Step-by-step cross-functional operational workflows' },
    { title: 'Level 4: Work Instructions', desc: 'Granular system task guides for engineers and operators' },
    { title: 'Level 5: Records & Evidence', desc: 'Audit-ready logs, approvals, and compliance artifacts' },
  ];

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white">
      <div className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-4">
        Hierarchy of IT Governance Documentation
      </div>
      <div className="space-y-2">
        {levels.map((lvl, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl border border-navy-500 bg-navy-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
            style={{ marginInline: `${idx * 4}%` }}
          >
            <span className="font-bold text-xs text-gold-300">{lvl.title}</span>
            <span className="text-[11px] text-slate-300">{lvl.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 6. ATTACK SURFACE RINGS (Offensive Security) */
export const AttackSurfaceRings: React.FC = () => {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
        Attack Surface Penetration Testing
      </div>
      <p className="text-xs text-slate-300 mb-6">
        Simulating real adversary tactics across external exposure, APIs, internal networks, and human vectors.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-navy-700/50 border border-rose-500/30">
          <div className="text-rose-400 font-bold text-sm">External Perimeter</div>
          <div className="text-[11px] text-slate-400 mt-1">Web Apps, DNS, Public IPs</div>
        </div>
        <div className="p-4 rounded-xl bg-navy-700/50 border border-orange-500/30">
          <div className="text-orange-400 font-bold text-sm">Application Layer</div>
          <div className="text-[11px] text-slate-400 mt-1">APIs, Mobile Apps, Business Logic</div>
        </div>
        <div className="p-4 rounded-xl bg-navy-700/50 border border-amber-500/30">
          <div className="text-amber-400 font-bold text-sm">Internal Network</div>
          <div className="text-[11px] text-slate-400 mt-1">Active Directory, Lateral Pivots</div>
        </div>
        <div className="p-4 rounded-xl bg-navy-700/50 border border-emerald-500/30">
          <div className="text-emerald-400 font-bold text-sm">Remediation Retest</div>
          <div className="text-[11px] text-slate-400 mt-1">Free Verification Retest & Sign-Off</div>
        </div>
      </div>
    </div>
  );
};

/* 7. SOC PIPELINE (Defensive Security) */
export const SocPipeline: React.FC = () => {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white">
      <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4">
        24/7 Managed Telemetry Pipeline
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
        <div className="p-3 bg-navy-700 rounded-xl border border-navy-500 w-full">
          <div className="font-bold text-xs">1. Data Sources</div>
          <div className="text-[10px] text-slate-400">Cloud, Endpoints, Network, Auth</div>
        </div>
        <div className="text-gold-300 font-bold">&rarr;</div>
        <div className="p-3 bg-navy-700 rounded-xl border border-navy-500 w-full">
          <div className="font-bold text-xs">2. SIEM & AI Analytics</div>
          <div className="text-[10px] text-slate-400">Behavioral Correlation & Triage</div>
        </div>
        <div className="text-gold-300 font-bold">&rarr;</div>
        <div className="p-3 bg-navy-700 rounded-xl border border-navy-500 w-full">
          <div className="font-bold text-xs">3. 24/7 Analyst Triage</div>
          <div className="text-[10px] text-slate-400">False-Positive Filtering</div>
        </div>
        <div className="text-gold-300 font-bold">&rarr;</div>
        <div className="p-3 bg-navy-700 rounded-xl border border-navy-500 w-full">
          <div className="font-bold text-xs">4. Rapid Containment</div>
          <div className="text-[10px] text-slate-400">Host Isolation & Runbooks</div>
        </div>
      </div>
    </div>
  );
};

/* 8. ISO STAIRCASE (ISO Standards) */
export const IsoStaircase: React.FC = () => {
  const steps = [
    '1. Gap Assessment',
    '2. ISMS Scope Definition',
    '3. Risk Assessment',
    '4. Policy & SOP Drafting',
    '5. Annex A Controls',
    '6. Internal Audit',
    '7. Management Review',
    '8. Stage 2 Audit Pass',
  ];

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 text-white">
      <div className="text-xs font-bold uppercase tracking-wider text-gold-300 mb-4">
        8-Step ISO/IEC 27001 Certification Readiness Staircase
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {steps.map((st, i) => (
          <div key={i} className="p-3 rounded-lg bg-navy-700/60 border border-navy-500 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gold-500 text-navy-900 font-bold text-[10px] flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-xs font-semibold text-slate-200">{st.split('. ')[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Visual Dispatcher helper */
export const ServiceVisualDispatcher: React.FC<{ visualType: string }> = ({ visualType }) => {
  switch (visualType) {
    case 'roadmap-curve':
      return <RoadmapCurve />;
    case 'software-sdlc':
      return <SoftwareArchitectureStack />;
    case 'command-center':
      return <CommandCenterMock />;
    case 'temple-framework':
      return <TempleFramework />;
    case 'governance-pyramid':
      return <GovernancePyramid />;
    case 'attack-surface':
      return <AttackSurfaceRings />;
    case 'soc-pipeline':
      return <SocPipeline />;
    case 'iso-staircase':
      return <IsoStaircase />;
    default:
      return <RoadmapCurve />;
  }
};
