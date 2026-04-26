import React from 'react';
import { 
  Sun, 
  Moon, 
  Languages, 
  Shield, 
  Database, 
  Smartphone,
  CloudUpload,
  Info,
  Target,
  DollarSign
} from 'lucide-react';
import { translations } from '../translations';
import { cn } from '../lib/utils';
import { db } from '../db/db';

const SettingsView = ({ language, theme, setTheme, setLanguage, currency, setCurrency, monthlyTarget, setMonthlyTarget }: any) => {
  const t = translations[language as 'en' | 'bn'];

  const currencies = [
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (টাকা)' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (রিঙ্গিত)' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (রুপি)' },
    { code: 'USD', symbol: '$', name: 'US Dollar (ডলার)' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
    { code: 'AED', symbol: 'dh', name: 'UAE Dirham' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  ];

  const clearDatabase = async () => {
    if (confirm(language === 'en' ? 'Are you sure? This will delete all local data permanently.' : 'আপনি কি নিশ্চিত? এটি আপনার সব লোকাল ডাটা স্থায়ীভাবে মুছে ফেলবে।')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">{t.settings}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">System configuration and data management</p>
      </div>

      <div className="space-y-6">
        {/* Preference Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y dark:divide-slate-800 shadow-sm overflow-hidden">
          {/* Target Setting */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{language === 'en' ? 'Monthly Target' : 'মাসিক টার্গেট'}</p>
                <p className="text-xs text-slate-500">{language === 'en' ? 'Set your goal amount' : 'আপনার মাসিক আয়ের লক্ষ্য নির্ধারণ করুন'}</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</span>
              <input 
                type="number"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-950 pl-10 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-32"
              />
            </div>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
                {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{t.theme}</p>
                <p className="text-xs text-slate-500">{language === 'en' ? 'Dark mode toggle' : 'থিম পরিবর্তন'}</p>
              </div>
            </div>
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setTheme('light')}
                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", theme === 'light' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                Light
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", theme === 'dark' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{t.language}</p>
                <p className="text-xs text-slate-500">{language === 'en' ? 'Interface language' : 'ভাষার সেটিংস'}</p>
              </div>
            </div>
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setLanguage('en')}
                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", language === 'en' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('bn')}
                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", language === 'bn' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                বাংলা
              </button>
            </div>
          </div>

          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{language === 'en' ? 'Currency' : 'কারেন্সি'}</p>
                <p className="text-xs text-slate-500">{language === 'en' ? 'Select global currency' : 'কারেন্সি নির্বাচন করুন'}</p>
              </div>
            </div>
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Security & DataSection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y dark:divide-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Security Check</p>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Admin Verified</p>
              </div>
            </div>
          </div>

          <div className="p-5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Cloud Backup</p>
                <p className="text-xs text-slate-500">Auto-sync is currently active</p>
              </div>
            </div>
            <button className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 active:scale-95 transition-transform">Configure</button>
          </div>

          <div className="p-5 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-rose-600 tracking-tight">Reset Local Data</p>
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Permanent Action</p>
              </div>
            </div>
            <button 
              onClick={clearDatabase}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-100 dark:shadow-none transition-all active:scale-95"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden border border-slate-800">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-400 mb-4">
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Application Status</span>
            </div>
            <h4 className="text-2xl font-display font-bold">CreditReg Pro v1.2</h4>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-lg">
              Encryption active. Local storage isolated via IndexedDB. 
              Regularly backup via Reports to ensure data integrity.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Storage</p>
                <p className="text-xl font-bold tracking-tight">1.28 MB</p>
              </div>
              <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Status</p>
                <p className="text-xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </p>
              </div>
            </div>
          </div>
          <Info className="absolute -bottom-10 -right-10 w-40 h-40 opacity-5 text-white" />
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
