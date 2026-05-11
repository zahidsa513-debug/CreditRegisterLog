import React from 'react';
import { CreditCard } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-28 h-28',
    xl: 'w-40 h-40'
  };

  const iconSizes = {
    sm: 18,
    md: 26,
    lg: 52,
    xl: 72
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {/* Outer Ring / Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00C853]/20 to-[#FF9800]/20 rounded-3xl blur-md" />
      
      {/* Main Container */}
      <div className="relative w-full h-full bg-slate-900 rounded-[22%] overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center group">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#00C853] via-[#00C853] to-[#FF9800] opacity-90 transition-transform duration-700 group-hover:scale-110" />
        
        {/* Glass Lighting Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />
        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]" />

        {/* Abstract "C" & Ledger Element */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
          
          <svg 
            width={iconSizes[size]} 
            height={iconSizes[size]} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
          >
            <path 
              d="M17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3Z" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M9 7H15" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="opacity-60"
            />
            <path 
              d="M9 12H15" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M9 17H12" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <circle cx="16.5" cy="17.5" r="2.5" fill="#FF9800" className="drop-shadow-sm" />
          </svg>
        </div>

        {/* Shine Layer */}
        <div className="absolute top-[-100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-br from-white/0 via-white/10 to-white/0 rotate-45 pointer-events-none group-hover:top-[0%] group-hover:left-[0%] transition-all duration-1000 ease-in-out" />
      </div>
    </div>
  );
};

export default Logo;
