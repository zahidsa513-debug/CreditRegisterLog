import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Phone, User, Camera, ShieldCheck } from 'lucide-react';
import { db } from '../db/db';
import { cn } from '../lib/utils';

const AuthScreen = ({ onAuthSuccess, language }: { onAuthSuccess: () => void, language: 'en' | 'bn' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: ''
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      // Sign up logic: save to Dexie
      await db.profiles.clear(); // Only one profile for now
      await db.profiles.add({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        avatar: formData.avatar
      });
    } else {
      // Local check if profile exists
      const profile = await db.profiles.toArray();
      if (profile.length === 0) {
        alert(language === 'en' ? 'No account found. Please sign up.' : 'কোন একাউন্ট পাওয়া যায়নি। দয়া করে সাইন-আপ করুন।');
        setIsLogin(false);
        return;
      }
    }
    
    onAuthSuccess();
  };

  const handleGoogleLogin = () => {
    // Since Firebase was declined, this is a mock. 
    // In a real app with Firebase, this would be a real implementation.
    alert(language === 'en' ? 'Google Login Simulated. Setting up profile...' : 'গুগল লগইন সিমুলেট করা হয়েছে। প্রোফাইল তৈরি হচ্ছে...');
    setFormData({
      name: 'Test User',
      email: 'user@gmail.com',
      phone: '01700000000',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    });
    setIsLogin(false); // Let them verify before saving
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
        <div className="p-8 pb-4 text-center">
          <div className="w-20 h-20 bg-white dark:bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl p-2 ring-1 ring-slate-100 dark:ring-white/20">
            <img src="/input_file_0.png" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            {isLogin 
              ? (language === 'en' ? 'Welcome Back!' : 'আবার স্বাগতম!') 
              : (language === 'en' ? 'Create Account' : 'নতুন একাউন্ট')}
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            {isLogin 
              ? (language === 'en' ? 'Sign in to access your dashboard' : 'আপনার ড্যাশবোর্ডে লগইন করুন')
              : (language === 'en' ? 'Enter details to start managing registry' : 'রেজিস্ট্রি পরিচালনা শুরু করতে তথ্য দিন')}
          </p>
        </div>

        <div className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700">
                      {formData.avatar ? (
                        <img src={formData.avatar} className="w-full h-full object-cover" alt="avatar" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-1.5 rounded-lg cursor-pointer shadow-lg active:scale-95 transition-transform">
                      <Plus className="w-3 h-3" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {language === 'en' ? 'Upload Photo' : 'ছবি আপলোড করুন'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Full Name' : 'পুরো নাম'}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                      placeholder="Ex: Zahid Hasan"
                    />
                  </div>
                </div>
              </>
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
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Phone Number' : 'ফোন নাম্বার'}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    placeholder="017-00000000"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none"
            >
              {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isLogin 
                ? (language === 'en' ? 'Sign In' : 'লগইন করুন') 
                : (language === 'en' ? 'Create Account' : 'একাউন্ট তৈরি করুন')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">OR</span>
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm">{language === 'en' ? 'Continue with Google' : 'গুগল দিয়ে প্রবেশ করুন'}</span>
          </button>

          <p className="text-center text-xs text-slate-500 font-medium">
            {isLogin 
              ? (language === 'en' ? "Don't have an account? " : "একাউন্ট নেই? ") 
              : (language === 'en' ? "Already have an account? " : "আগে থেকেই একাউন্ট আছে? ")}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-500 font-bold hover:underline"
            >
              {isLogin 
                ? (language === 'en' ? 'Create New' : 'নতুন তৈরি করুন') 
                : (language === 'en' ? 'Sign In' : 'লগইন করুন')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default AuthScreen;
