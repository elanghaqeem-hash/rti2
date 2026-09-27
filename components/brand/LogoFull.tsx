import React from 'react';
import Link from 'next/link';
import { HexMark } from './HexMark';

interface LogoFullProps {
  variant?: 'light' | 'dark'; // 'light' has white text (for navy bg), 'dark' has navy text (for light bg)
  size?: 'sm' | 'md' | 'lg';
  showLegalSubtext?: boolean;
  className?: string;
  href?: string;
}

export const LogoFull: React.FC<LogoFullProps> = ({
  variant = 'dark',
  size = 'md',
  showLegalSubtext = false,
  className = '',
  href = '/',
}) => {
  const isLight = variant === 'light';

  const markSizes = {
    sm: 28,
    md: 36,
    lg: 44,
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const subTextSizes = {
    sm: 'text-[9px] tracking-[0.25em]',
    md: 'text-[11px] tracking-[0.3em]',
    lg: 'text-[13px] tracking-[0.32em]',
  };

  const content = (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <HexMark size={markSizes[size]} />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-extrabold tracking-tight font-sans ${textSizes[size]} ${
              isLight ? 'text-white' : 'text-navy-900'
            }`}
          >
            Rise<span className="text-gold-500">T</span>
          </span>
          <span
            className={`font-semibold uppercase tracking-wider font-sans text-xs ${
              isLight ? 'text-slate-300' : 'text-navy-700'
            }`}
          >
            INDONESIA
          </span>
        </div>
        {showLegalSubtext && (
          <span
            className={`font-semibold uppercase mt-0.5 ${subTextSizes[size]} ${
              isLight ? 'text-slate-400' : 'text-muted'
            }`}
          >
            PT Riset Teknologi Indonesia
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded">
        {content}
      </Link>
    );
  }

  return content;
};
