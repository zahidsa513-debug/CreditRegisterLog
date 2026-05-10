import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${sizeClasses[size]} ${className}`}>
      {/* 
        Using the logo provided by the user. 
        In a real environment, this file would be placed in the public folder.
      */}
      <img 
        src="/logo.png" 
        alt="Credit Register Logo" 
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback if image doesn't exist
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement?.classList.add('bg-gradient-to-br', 'from-green-500', 'to-orange-500', 'rounded-2xl');
        }}
      />
    </div>
  );
};

export default Logo;
