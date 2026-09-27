'use client';

import React, { useEffect, useState } from 'react';
import { HexMark } from './HexMark';

export const HoneycombHero: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Sequence light-up across 6 nodes for 1.2 seconds, then settle
    const intervals = [200, 400, 600, 800, 1000, 1200];
    const timers = intervals.map((time, idx) =>
      setTimeout(() => setActiveStep(idx + 1), time)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[520px] flex items-center justify-center overflow-hidden pointer-events-none select-none">
      <svg
        className="w-full h-full max-w-[720px] opacity-90"
        viewBox="0 0 600 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trace-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EE7A1E" />
            <stop offset="55%" stopColor="#EFA41C" />
            <stop offset="100%" stopColor="#F1D21B" />
          </linearGradient>
          <filter id="hero-node-glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Honeycomb Grid Background */}
        <g stroke="#1B3E70" strokeWidth="1" strokeOpacity="0.4" fill="none">
          {/* Top Row */}
          <polygon points="175,40 225,12 275,40 275,98 225,126 175,98" />
          <polygon points="325,40 375,12 425,40 425,98 375,126 325,98" />
          {/* Middle Row Outer */}
          <polygon points="50,185 100,157 150,185 150,243 100,271 50,243" />
          <polygon points="450,185 500,157 550,185 550,243 500,271 450,243" />
          {/* Bottom Row */}
          <polygon points="175,330 225,302 275,330 275,388 225,416 175,388" />
          <polygon points="325,330 375,302 425,330 425,388 375,416 325,388" />
        </g>

        {/* Primary Circuit Traces interconnecting the central RTI core */}
        {/* Branch 1: Top-Left to Center */}
        <path
          d="M 225 126 L 225 180 L 260 215"
          stroke="url(#trace-gold)"
          strokeWidth="2.5"
          strokeDasharray="200"
          strokeDashoffset={mounted && activeStep >= 1 ? 0 : 200}
          className="transition-all duration-700 ease-out"
        />

        {/* Branch 2: Top-Right to Center */}
        <path
          d="M 375 126 L 375 180 L 340 215"
          stroke="url(#trace-gold)"
          strokeWidth="2.5"
          strokeDasharray="200"
          strokeDashoffset={mounted && activeStep >= 2 ? 0 : 200}
          className="transition-all duration-700 ease-out"
        />

        {/* Branch 3: Far-Left to Center */}
        <path
          d="M 150 214 L 210 214 L 250 240"
          stroke="url(#trace-gold)"
          strokeWidth="2.5"
          strokeDasharray="200"
          strokeDashoffset={mounted && activeStep >= 3 ? 0 : 200}
          className="transition-all duration-700 ease-out"
        />

        {/* Branch 4: Far-Right to Center */}
        <path
          d="M 450 214 L 390 214 L 350 240"
          stroke="url(#trace-gold)"
          strokeWidth="2.5"
          strokeDasharray="200"
          strokeDashoffset={mounted && activeStep >= 4 ? 0 : 200}
          className="transition-all duration-700 ease-out"
        />

        {/* Branch 5: Bottom-Left to Center */}
        <path
          d="M 225 302 L 225 280 L 260 260"
          stroke="url(#trace-gold)"
          strokeWidth="2.5"
          strokeDasharray="200"
          strokeDashoffset={mounted && activeStep >= 5 ? 0 : 200}
          className="transition-all duration-700 ease-out"
        />

        {/* Branch 6: Bottom-Right to Center */}
        <path
          d="M 375 302 L 375 280 L 340 260"
          stroke="url(#trace-gold)"
          strokeWidth="2.5"
          strokeDasharray="200"
          strokeDashoffset={mounted && activeStep >= 6 ? 0 : 200}
          className="transition-all duration-700 ease-out"
        />

        {/* Interactive Glowing Nodes at Intersections */}
        <circle
          cx="225"
          cy="126"
          r="5"
          fill={activeStep >= 1 ? '#F1D21B' : '#1B3E70'}
          filter={activeStep >= 1 ? 'url(#hero-node-glow)' : ''}
          className="transition-all duration-300"
        />
        <circle
          cx="375"
          cy="126"
          r="5"
          fill={activeStep >= 2 ? '#F1D21B' : '#1B3E70'}
          filter={activeStep >= 2 ? 'url(#hero-node-glow)' : ''}
          className="transition-all duration-300"
        />
        <circle
          cx="150"
          cy="214"
          r="5"
          fill={activeStep >= 3 ? '#F1D21B' : '#1B3E70'}
          filter={activeStep >= 3 ? 'url(#hero-node-glow)' : ''}
          className="transition-all duration-300"
        />
        <circle
          cx="450"
          cy="214"
          r="5"
          fill={activeStep >= 4 ? '#F1D21B' : '#1B3E70'}
          filter={activeStep >= 4 ? 'url(#hero-node-glow)' : ''}
          className="transition-all duration-300"
        />
        <circle
          cx="225"
          cy="302"
          r="5"
          fill={activeStep >= 5 ? '#F1D21B' : '#1B3E70'}
          filter={activeStep >= 5 ? 'url(#hero-node-glow)' : ''}
          className="transition-all duration-300"
        />
        <circle
          cx="375"
          cy="302"
          r="5"
          fill={activeStep >= 6 ? '#F1D21B' : '#1B3E70'}
          filter={activeStep >= 6 ? 'url(#hero-node-glow)' : ''}
          className="transition-all duration-300"
        />

        {/* Concentric Signal Rings around Center Core */}
        <circle
          cx="300"
          cy="245"
          r="75"
          stroke="#EFA41C"
          strokeWidth="1.5"
          strokeOpacity={activeStep >= 6 ? '0.35' : '0.1'}
          strokeDasharray="4 8"
          className="animate-[spin_40s_linear_infinite]"
        />
      </svg>

      {/* Central HexMark Anchor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
        <HexMark size={110} glow={true} className="transform hover:scale-105 transition-transform" />
      </div>
    </div>
  );
};
