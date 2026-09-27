import React from 'react';
import Link from 'next/link';
import { HexMark } from './HexMark';

interface LogoFullProps {
  variant?: 'light' | 'dark';
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
    sm: 34,
    md: 46,
    lg: 58,
  };

  const brandSizes = {
    sm: 'text-[18px]',
    md: 'text-[24px]',
    lg: 'text-[31px]',
  };

  const indonesiaSizes = {
    sm: 'text-[7px] tracking-[0.30em]',
    md: 'text-[9px] tracking-[0.34em]',
    lg: 'text-[11px] tracking-[0.36em]',
  };

  const legalSizes = {
    sm: 'text-[7px]',
    md: 'text-[8px]',
    lg: 'text-[9px]',
  };

  const content = (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <HexMark size={markSizes[size]} />
      <div className="flex min-w-0 flex-col justify-center leading-none">
        <div
          className={`font-black tracking-[-0.055em] leading-[0.9] ${brandSizes[size]} ${
            isLight ? 'text-white' : 'text-[#171717]'
          }`}
        >
          Rise<span className="text-gold-500">T</span>
        </div>

        <div
          className={`mt-1 font-semibold uppercase whitespace-nowrap ${indonesiaSizes[size]} ${
            isLight ? 'text-slate-200' : 'text-[#242424]'
          }`}
        >
          Indonesia
        </div>

        {showLegalSubtext && (
          <div
            className={`mt-1.5 whitespace-nowrap font-medium tracking-[0.04em] ${
              legalSizes[size]
            } ${isLight ? 'text-slate-400' : 'text-muted'}`}
          >
            PT Riset Teknologi Indonesia
          </div>
        )}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="Riset Teknologi Indonesia"
      className="inline-flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
    >
      {content}
    </Link>
  );
};
