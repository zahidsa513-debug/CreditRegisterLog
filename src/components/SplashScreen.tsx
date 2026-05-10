import React from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F5F5F5] overflow-hidden">
      {/* Background Decorative Gradient Highlights */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00C853] to-[#FF9800]" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-8"
        >
          <Logo size="xl" />
        </motion.div>

        {/* Brand Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-display font-black tracking-tight text-slate-900 mb-2">
            Credit<span className="text-[#1976D2]">Register</span>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="text-sm font-medium text-[#666666] tracking-wide"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Track Smarter, Grow Faster
          </motion.p>
        </motion.div>
      </div>

      <div className="fixed bottom-20 flex flex-col items-center gap-3">
        <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 origin-left bg-gradient-to-r from-[#00C853] to-[#FF9800]" 
          />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Loading Application
        </span>
      </div>
    </div>
  );
};

export default SplashScreen;
