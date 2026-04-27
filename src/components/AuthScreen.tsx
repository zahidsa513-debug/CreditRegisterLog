import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AuthScreen = ({ onAuthSuccess, language }: { onAuthSuccess: () => void, language: 'en' | 'bn' }) => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const handleGoogleLogin = async () => {
    await login();
    onAuthSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10"
      >
        <div className="p-10 pb-6 text-center">
          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl p-4 ring-1 ring-slate-100 dark:ring-white/10">
            <svg className="w-full h-full text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Credit<span className="text-indigo-600">Register</span>
          </h1>
          <p className="text-slate-500 text-sm mt-3 font-medium px-4">
            {language === 'en' 
              ? 'Securely backup and sync your shop ledger across all your devices' 
              : 'আপনার শপ লেজার নিরাপদে ব্যাকআপ এবং সকল ডিভাইসে সিঙ্ক করুন'}
          </p>
        </div>

        <div className="px-10 pb-12">
          <div className="space-y-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <button 
                onClick={handleGoogleLogin}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm active:ring-4 active:ring-indigo-100 dark:active:ring-indigo-900/30"
              >
                <div className="w-6 h-6">
                  <svg viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <span className="text-slate-700 dark:text-slate-200">
                  {language === 'en' ? 'Continue with Google' : 'গুগল দিয়ে প্রবেশ করুন'}
                </span>
              </button>
            </motion.div>

            <div className="pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'en' ? 'Data is encrypted and private' : 'আপনার তথ্য গোপন ও সুরক্ষিত'}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
                <LogIn className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === 'en' ? 'One-tap cloud backup' : 'এক ক্লিকে ক্লাউড ব্যাকআপ'}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
        Powered by Google Cloud
      </p>
    </div>
  );
};

export default AuthScreen;

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
