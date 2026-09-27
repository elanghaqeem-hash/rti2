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
      <img
        src="/rti-mark-v3.webp"
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="block h-full w-full object-contain select-none"
      />
    </span>
  );
};
