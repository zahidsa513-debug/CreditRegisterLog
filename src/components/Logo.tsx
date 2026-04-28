import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`relative flex items-center justify-center rounded-3xl overflow-hidden ${sizeClasses[size]} ${className}`}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900" />
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
      
      {/* SVG Icon */}
      <svg
        viewBox="0 0 100 100"
        className="w-2/3 h-2/3 z-10 text-white drop-shadow-lg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 30C20 24.4772 24.4772 20 30 20H70C75.5228 20 80 24.4772 80 30V70C80 75.5228 75.5228 80 70 80H30C24.4772 80 20 75.5228 20 70V30Z"
          className="fill-white/10"
        />
        <path
          d="M35 50L45 60L65 40"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray="10 5"
          className="opacity-40"
        />
        <path
          d="M25 65C25 65 35 55 50 55C65 55 75 65 75 65"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="opacity-20"
        />
      </svg>
      
      {/* Abstract Shapes */}
      <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-400/20 rounded-full blur-xl" />
      <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-emerald-400/20 rounded-full blur-xl" />
    </div>
  );
};

export default Logo;
