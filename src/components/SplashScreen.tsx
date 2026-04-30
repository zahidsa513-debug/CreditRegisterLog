import React from 'react';
import { motion } from 'motion/react';

const SplashScreen = () => {
  // Generate random data stream lines
  const horizontalStreams = Array.from({ length: 8 });
  const verticalStreams = Array.from({ length: 12 });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] overflow-hidden">
      {/* Rich textured charcoal background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_100%)] opacity-50" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
      </div>

      {/* Subtle Matrix-style Data Streams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {verticalStreams.map((_, i) => (
          <motion.div
            key={`v-${i}`}
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ 
              y: ['0%', '200%'], 
              opacity: [0, 0.5, 0] 
            }}
            transition={{ 
              duration: 5 + Math.random() * 8, 
              repeat: Infinity, 
              delay: Math.random() * 5,
              ease: "linear"
            }}
            style={{
              left: `${(i / verticalStreams.length) * 100}%`,
              width: '1px',
              height: '30vh',
              background: 'linear-gradient(to bottom, #3b82f6, transparent)',
            }}
            className="absolute"
          />
        ))}
        {horizontalStreams.map((_, i) => (
          <motion.div
            key={`h-${i}`}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ 
              x: ['0%', '200%'], 
              opacity: [0, 0.3, 0] 
            }}
            transition={{ 
              duration: 8 + Math.random() * 10, 
              repeat: Infinity, 
              delay: Math.random() * 5,
              ease: "linear"
            }}
            style={{
              top: `${(i / horizontalStreams.length) * 100}%`,
              height: '1px',
              width: '30vw',
              background: 'linear-gradient(to right, #3b82f6, transparent)',
            }}
            className="absolute"
          />
        ))}
      </div>

      {/* Center Content Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Shield Logo */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0, 0.71, 0.2, 1.01] }}
          className="relative mb-10"
        >
          {/* Blue Glow Aura */}
          <motion.div 
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-10 bg-blue-500/10 blur-[60px] rounded-full" 
          />
          
          <div className="relative w-40 h-40 flex items-center justify-center">
             <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                <defs>
                  <linearGradient id="shieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                {/* Shield Body */}
                <path 
                  d="M50 5 L85 20 V50 C85 70 50 90 50 90 C50 90 15 70 15 50 V20 L50 5Z" 
                  fill="url(#shieldFill)"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
                {/* Inner Glow Stroke */}
                <path 
                  d="M50 10 L80 23 V50 C80 67 50 85 50 85 C50 85 20 67 20 50 V23 L50 10Z" 
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                />
                
                {/* Neon Purple Checkmark */}
                <motion.path 
                  d="M35 52 L45 62 L65 40" 
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                  className="drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                />
             </svg>
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center"
        >
          <h1 className="text-5xl font-display font-black tracking-tight text-white flex items-center gap-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Credit<span className="text-blue-500">Register</span>
          </h1>
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="h-[1px] w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mt-3"
          />
          <p className="text-[9px] uppercase tracking-[0.5em] text-slate-500 mt-4 font-black">
            Future-Proof Business Ledger
          </p>
        </motion.div>
      </div>

      {/* Loading Progress Section */}
      <div className="fixed bottom-24 flex flex-col items-center gap-4">
        <div className="w-64 h-[2px] bg-slate-800/50 rounded-full overflow-hidden relative">
          {/* Subtle Background Pulse */}
          <motion.div 
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-blue-500/20" 
          />
          
          {/* Neon Green Pulse line */}
          <motion.div 
            animate={{ 
              left: ["-100%", "200%"]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-0 bottom-0 w-40 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-10"
          />
        </div>
        <motion.span 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[8px] font-bold text-slate-600 uppercase tracking-widest"
        >
          Initialising Secure Infrastructure
        </motion.span>
      </div>
    </div>
  );
};

export default SplashScreen;
