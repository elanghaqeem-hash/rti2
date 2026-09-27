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
    <span
      role="img"
      aria-label="RTI logo mark"
      className={`relative inline-flex shrink-0 items-center justify-center ${glow ? 'drop-shadow-[0_0_14px_rgba(241,178,27,0.45)]' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="rtiOfficialGold"
            x1="46"
            y1="120"
            x2="462"
            y2="398"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#F47A20" />
            <stop offset="0.48" stopColor="#F5A51C" />
            <stop offset="1" stopColor="#FFE600" />
          </linearGradient>
        </defs>

        <polygon
          points="256,18 480,147 480,365 256,494 32,365 32,147"
          fill="url(#rtiOfficialGold)"
        />

        <path
          d="M72 350V174L188 108"
          stroke="#FFFFFF"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="72" cy="350" r="20" fill="#FFFFFF" />

        <path
          d="M264 68L420 158V314"
          stroke="#FFFFFF"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="264" cy="68" r="20" fill="#FFFFFF" />

        <path
          d="M145 354L256 418L410 332"
          stroke="#FFFFFF"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="410" cy="332" r="20" fill="#FFFFFF" />

        <polygon
          points="256,138 368,203 368,327 256,392 144,327 144,203"
          fill="#FFFFFF"
        />
        <polygon
          points="256,176 333,220 333,310 256,354 179,310 179,220"
          stroke="url(#rtiOfficialGold)"
          strokeWidth="8"
          strokeLinejoin="round"
        />

        <path
          d="M219 218V314M219 218H279C308 218 326 233 326 256C326 279 308 294 279 294H240M279 294L326 337"
          stroke="url(#rtiOfficialGold)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="219" cy="218" r="8" fill="#FFFFFF" stroke="#F47A20" strokeWidth="6" />
        <circle cx="326" cy="337" r="8" fill="#FFFFFF" stroke="#F2D51B" strokeWidth="6" />
      </svg>
    </span>
  );
};
