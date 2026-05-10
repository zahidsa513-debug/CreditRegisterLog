import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, ShieldCheck, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

import { Language } from '../types';

import { useSettings } from '../context/SettingsContext';
import { translations } from '../translations';

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const { language } = useSettings();
  const { login, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const t = translations[language];

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
      const authErrorCode = err.code || '';
      const authErrorMsg = (err.message || '').toLowerCase();
      
      if (authErrorCode === 'auth/network-request-failed' || authErrorMsg.includes('offline') || authErrorMsg.includes('network-request-failed')) {
        setError(t.firebaseOffline);
      } else if (authErrorCode === 'auth/unauthorized-domain' || authErrorMsg.includes('unauthorized-domain')) {
        setError(t.confirmDomain);
      } else if (authErrorCode === 'auth/operation-not-allowed' || authErrorMsg.includes('operation-not-allowed')) {
        setError(t.enableGoogleSignIn);
      } else if (authErrorMsg.includes('missing initial state')) {
        setError(t.browserSettingsError);
      } else if (authErrorCode === 'auth/invalid-credential' || authErrorMsg.includes('invalid-credential')) {
        setError(language === 'en' ? 'Authentication failed. Please try again or use a different method.' : 'অথেনটিকেশন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await resetPassword(formData.email.trim());
      setSuccess(t.resetLinkSent);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetting) return handleResetPassword(e);
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isLogin) {
        await loginWithEmail(formData.email.trim(), formData.password);
      } else {
        await registerWithEmail(formData.email.trim(), formData.password, formData.name.trim());
      }
      onAuthSuccess();
    } catch (err: any) {
      const authErrorCode = err.code || '';
      const authErrorMsg = (err.message || '').toLowerCase();
      
      if (authErrorCode === 'auth/network-request-failed' || authErrorMsg.includes('offline') || authErrorMsg.includes('network-request-failed')) {
        setError(t.firebaseOffline);
      } else if (authErrorCode === 'auth/unauthorized-domain' || authErrorMsg.includes('unauthorized-domain')) {
        setError(t.confirmDomain);
      } else if (
        authErrorCode === 'auth/invalid-credential' || 
        authErrorCode === 'auth/wrong-password' || 
        authErrorCode === 'auth/user-not-found' ||
        authErrorCode === 'auth/invalid-email' ||
        authErrorMsg.includes('invalid-credential') ||
        authErrorMsg.includes('wrong-password') ||
        authErrorMsg.includes('user-not-found') ||
        authErrorMsg.includes('invalid-email')
      ) {
        setError(language === 'en' 
          ? 'Invalid email or password. If you are a new user, please click "Create New" at the bottom to register first.' 
          : 'ভুল ইমেইল বা পাসওয়ার্ড। আপনি যদি নতুন ব্যবহারকারী হন, তবে প্রথমে নিচের "নতুন তৈরি করুন" বাটনে ক্লিক করে রেজিস্ট্রেশন করুন।');
      } else if (authErrorCode === 'auth/too-many-requests' || authErrorMsg.includes('too-many-requests')) {
        setError(language === 'en' 
          ? 'Too many failed attempts. Please try again later or reset your password.' 
          : 'অতিরিক্ত ভুল চেষ্টার কারণে একাউন্টটি সাময়িকভাবে বন্ধ আছে। কিছুক্ষণ পর চেষ্টা করুন বা পাসওয়ার্ড রিসেট করুন।');
      } else {
        setError(err.message || 'Authentication failed');
      }
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
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 relative z-10"
      >
        <div className="p-8 pb-4 text-center">
          <div className="flex justify-center mb-6">
            <Logo size="xl" className="drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Credit<span className="text-[#1976D2]">Register</span>
          </h1>
          <p className="text-[#666666] text-sm mt-2 font-medium px-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Track Smarter, Grow Faster
          </p>
          <p className="text-slate-400 text-[10px] mt-4 font-bold uppercase tracking-widest">
            {isResetting
              ? t.forgotPasswordSubtitle
              : isLogin 
                ? t.signInSubtitle
                : t.signUpSubtitle}
          </p>
        </div>

        <div className="px-8 pb-8">
          {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider text-center">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isResetting && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.fullName}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Zahid Hasan"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-[#00C853] outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.emailAddress}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-[#1976D2] outline-none text-sm font-medium"
                />
              </div>
            </div>

            {!isResetting && (
              <div className="space-y-1">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.password}</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsResetting(true);
                        setError(null);
                        setSuccess(null);
                      }}
                      className="text-[10px] font-bold text-[#1976D2] hover:underline uppercase tracking-widest"
                    >
                      {t.forgotPassword}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="password" 
                    minLength={6}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-[#1976D2] outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <button 
              disabled={isLoading}
              type="submit"
              className="w-full bg-gradient-to-r from-[#00C853] to-[#FF9800] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>
                    {isResetting
                      ? t.sendResetLink
                      : isLogin 
                        ? t.signIn 
                        : t.createAccount}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {isResetting && (
            <button 
              type="button"
              onClick={() => {
                setIsResetting(false);
                setError(null);
                setSuccess(null);
              }}
              className="mt-4 w-full text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              {t.backToLogin}
            </button>
          )}

          {!isResetting && (
            <>
              <div className="my-6 flex items-center gap-4">
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.or}</span>
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
                <span className="text-sm">{t.continueWithGoogle}</span>
              </button>
            </>
          )}

          <footer className="mt-8 text-center pt-6 border-t border-slate-50 dark:border-slate-800/50">
            <p className="text-xs text-slate-500 font-medium">
              {isResetting
                ? null
                : isLogin 
                  ? t.noAccount 
                  : t.alreadyHaveAccount}
              {!isResetting && (
                <button 
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-indigo-500 font-bold hover:underline ml-1"
                >
                  {isLogin 
                    ? t.createNew 
                    : t.signIn}
                </button>
              )}
            </p>
          </footer>
        </div>
      </motion.div>
      
      <div className="mt-8 flex items-center gap-6">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t.encrypted}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <LogIn className="w-3.5 h-3.5 text-indigo-500" />
          <span>{t.cloudSync}</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
