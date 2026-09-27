import React from 'react';

interface HexMarkProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const HexMark: React.FC<HexMarkProps> = ({
  size = 36,
  className = '',
  glow = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ${glow ? 'drop-shadow-[0_0_12px_rgba(228,161,27,0.6)]' : ''} ${className}`}
      aria-label="RTI Hexagon Mark"
    >
      <defs>
        <linearGradient id="rti-gold-grad" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#EE7A1E" />
          <stop offset="55%" stopColor="#EFA41C" />
          <stop offset="100%" stopColor="#F1D21B" />
        </linearGradient>
        <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Hexagon Outer Perimeter */}
      <polygon
        points="50,6 88,28 88,72 50,94 12,72 12,28"
        stroke="url(#rti-gold-grad)"
        strokeWidth="5"
        strokeLinejoin="round"
        fill="rgba(11, 31, 58, 0.4)"
      />

      {/* Circuit Trace Lines inside Hexagon */}
      {/* Horizontal bus line */}
      <path
        d="M26 50 L46 50 L56 36 L74 36"
        stroke="url(#rti-gold-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Lower circuit branch */}
      <path
        d="M46 50 L54 64 L72 64"
        stroke="url(#rti-gold-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Upper vertical bridge */}
      <path
        d="M50 20 L50 32"
        stroke="url(#rti-gold-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Nodes (Pads) */}
      <circle cx="26" cy="50" r="4.5" fill="#F1D21B" filter="url(#node-glow)" />
      <circle cx="74" cy="36" r="4.5" fill="#F1D21B" filter="url(#node-glow)" />
      <circle cx="72" cy="64" r="4" fill="#EE7A1E" />
      <circle cx="50" cy="20" r="3.5" fill="#EFA41C" />
      <circle cx="50" cy="78" r="3.5" fill="#EE7A1E" />

      {/* Center core pulse node */}
      <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
    </svg>
  );
};
