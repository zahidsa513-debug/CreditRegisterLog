import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import Logo from './Logo';

import { useSettings } from '../context/SettingsContext';
import { translations } from '../translations';

const PinLock = ({ correctPin, onUnlock }: { correctPin: string, onUnlock: () => void }) => {
  const { language } = useSettings();
  const t = translations[language];
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleNumber = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 1000);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center space-y-12"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <Logo size="lg" className="rounded-[2rem] shadow-2xl shadow-indigo-500/20" />
          </div>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">{language === 'en' ? 'Security Check' : 'নিরাপত্তা যাচাই'}</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">{language === 'en' ? 'Enter your PIN to access financial records' : 'আর্থিক তথ্য দেখতে আপনার পিন দিন'}</p>
        </div>

        <div className="space-y-8">
          <div className={cn(
            "flex justify-center gap-4 transition-all duration-300",
            error && "animate-shake"
          )}>
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-300",
                  pin.length > i 
                    ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                    : "border-slate-800"
                )} 
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                key={num}
                onClick={() => handleNumber(num.toString())}
                className="w-full h-20 bg-slate-900 border border-slate-800 text-2xl font-black text-white rounded-[2rem] flex items-center justify-center hover:bg-slate-800 transition-colors"
              >
                {num}
              </motion.button>
            ))}
            <div />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNumber('0')}
              className="w-full h-20 bg-slate-900 border border-slate-800 text-2xl font-black text-white rounded-[2rem] flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              0
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              className="w-full h-20 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-[2rem] flex items-center justify-center hover:bg-indigo-600/20 transition-colors"
            >
              <Delete className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        <div className="pt-8">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" /> End-to-End Encrypted Storage
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PinLock;
