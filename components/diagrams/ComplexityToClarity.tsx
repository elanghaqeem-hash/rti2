'use client';

import React from 'react';
import { HexMark } from '../brand/HexMark';

export const ComplexityToClarity: React.FC = () => {
  return (
    <div className="w-full bg-navy-900 border-y border-navy-700/60 py-16 sm:py-24 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Complexity to Clarity
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Taming Enterprise IT Fragmentation
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300">
            From tangled systems, tech debt, and disparate compliance mandates into streamlined, resilient, and business-driven technology operations.
          </p>
        </div>

        {/* Interactive Visual Graphic */}
        <div className="relative bg-navy-900/80 rounded-2xl border border-navy-700 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Chaos & Complexity */}
            <div className="lg:col-span-4 bg-navy-700/40 rounded-xl p-5 border border-red-500/20 relative">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm tracking-wide uppercase mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                Fragmented State
              </div>
              <svg viewBox="0 0 320 180" className="w-full h-auto" fill="none">
                {/* Tangled wavy chaotic lines */}
                <path d="M 10 40 Q 60 140 120 30 T 200 130 T 310 90" stroke="#F43F5E" strokeWidth="2.5" strokeOpacity="0.7" />
                <path d="M 10 90 Q 90 20 160 160 T 240 40 T 310 90" stroke="#FB7185" strokeWidth="2" strokeOpacity="0.8" />
                <path d="M 10 140 Q 140 30 180 150 T 260 80 T 310 90" stroke="#E11D48" strokeWidth="2.5" strokeOpacity="0.6" />
                <path d="M 30 160 C 90 10 200 170 310 90" stroke="#FDA4AF" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <p>• Siloed systems & technical debt</p>
                <p>• Unmeasured cyber & operational risks</p>
                <p>• Disconnected technology investments</p>
              </div>
            </div>

            {/* Center: RTI Transformation Catalyst */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center text-center py-4 relative">
              <div className="relative group cursor-pointer">
                <HexMark size={84} glow={true} className="mx-auto transform transition-transform group-hover:scale-110" />
                <div className="mt-4">
                  <div className="text-gold-300 font-extrabold text-lg tracking-tight">RTI Architecture Engine</div>
                  <div className="text-xs text-slate-400 mt-1">End-to-End Governance & Delivery</div>
                </div>
              </div>

              {/* Directional indicators */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-gold-400/90 bg-navy-700/80 px-4 py-1.5 rounded-full border border-gold-500/20">
                <span>Filter</span>
                <span>→</span>
                <span>Structure</span>
                <span>→</span>
                <span>Accelerate</span>
              </div>
            </div>

            {/* Right: Clarity & Business Acceleration */}
            <div className="lg:col-span-4 bg-navy-700/40 rounded-xl p-5 border border-emerald-500/20 relative">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm tracking-wide uppercase mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Unified Clarity
              </div>
              <svg viewBox="0 0 320 180" className="w-full h-auto" fill="none">
                {/* Clean, parallel, ordered circuit paths */}
                <path d="M 10 30 L 100 30 L 140 30 L 310 30" stroke="#10B981" strokeWidth="2.5" />
                <circle cx="310" cy="30" r="4.5" fill="#34D399" />

                <path d="M 10 70 L 120 70 L 180 70 L 310 70" stroke="#3B82F6" strokeWidth="2.5" />
                <circle cx="310" cy="70" r="4.5" fill="#60A5FA" />

                <path d="M 10 110 L 150 110 L 220 110 L 310 110" stroke="#EFA41C" strokeWidth="2.5" />
                <circle cx="310" cy="110" r="4.5" fill="#F1D21B" />

                <path d="M 10 150 L 130 150 L 200 150 L 310 150" stroke="#06B6D4" strokeWidth="2.5" />
                <circle cx="310" cy="150" r="4.5" fill="#22D3EE" />
              </svg>
              <div className="mt-3 space-y-1 text-xs text-slate-300">
                <p className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Resilient & Scalable Software Architecture</p>
                <p className="flex items-center gap-1.5"><span className="text-blue-400">✓</span> Proactive 24/7 Operations & Security</p>
                <p className="flex items-center gap-1.5"><span className="text-gold-400">✓</span> Assured UU PDP & Regulatory Compliance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
