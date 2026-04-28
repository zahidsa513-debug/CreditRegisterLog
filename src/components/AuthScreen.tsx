import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, ShieldCheck, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

const AuthScreen = ({ onAuthSuccess, language }: { onAuthSuccess: () => void, language: 'en' | 'bn' }) => {
  const { login, loginWithEmail, registerWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login();
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        await loginWithEmail(formData.email, formData.password);
      } else {
        await registerWithEmail(formData.email, formData.password, formData.name);
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10"
      >
        <div className="p-8 pb-4 text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" className="shadow-xl ring-1 ring-slate-100 dark:ring-white/10" />
          </div>
          <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Credit<span className="text-indigo-600">Register</span>
          </h1>
          <p className="text-slate-500 text-xs mt-2 font-medium px-4">
            {isLogin 
              ? (language === 'en' ? 'Sign in to access your shop ledger' : 'আপনার শপ লেজারে প্রবেশ করতে লগইন করুন')
              : (language === 'en' ? 'Create a secure account for your business' : 'আপনার ব্যবসার জন্য একটি নিরাপদ একাউন্ট তৈরি করুন')}
          </p>
        </div>

        <div className="px-8 pb-8">
          {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Full Name' : 'পুরো নাম'}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Zahid Hasan"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Email Address' : 'ইমেইল অ্যাড্রেস'}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Password' : 'পাসওয়ার্ড'}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="password" 
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <button 
              disabled={isLoading}
              type="submit"
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>
                    {isLogin 
                      ? (language === 'en' ? 'Sign In' : 'লগইন করুন') 
                      : (language === 'en' ? 'Create Account' : 'একাউন্ট তৈরি করুন')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-50"
          >
            <div className="w-5 h-5">
              <svg viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <span className="text-sm">{language === 'en' ? 'Continue with Google' : 'গুগল দিয়ে প্রবেশ করুন'}</span>
          </button>

          <footer className="mt-8 text-center pt-6 border-t border-slate-50 dark:border-slate-800/50">
            <p className="text-xs text-slate-500 font-medium">
              {isLogin 
                ? (language === 'en' ? "Don't have an account? " : "একাউন্ট নেই? ") 
                : (language === 'en' ? "Already have an account? " : "আগে থেকেই একাউন্ট আছে? ")}
              <button 
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-indigo-500 font-bold hover:underline"
              >
                {isLogin 
                  ? (language === 'en' ? 'Create New' : 'নতুন তৈরি করুন') 
                  : (language === 'en' ? 'Sign In' : 'লগইন করুন')}
              </button>
            </p>
          </footer>
        </div>
      </motion.div>
      
      <div className="mt-8 flex items-center gap-6">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{language === 'en' ? 'Encrypted' : 'সুরক্ষিত'}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <LogIn className="w-3.5 h-3.5 text-indigo-500" />
          <span>{language === 'en' ? 'Cloud Sync' : 'ক্লাউড সিঙ্ক'}</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
