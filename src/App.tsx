import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  PlusCircle, 
  FileText, 
  Settings, 
  Menu, 
  X, 
  Sun, 
  Moon,
  TrendingUp,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { translations } from './translations';
import { Language, Theme } from './types';
import Dashboard from './components/Dashboard';
import Areas from './components/Areas';
import Customers from './components/Customers';
import SalesEntry from './components/SalesEntry';
import Reports from './components/Reports';
import SettingsView from './components/SettingsView';
import { cn } from './lib/utils';
import { db } from './db/db';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [monthlyTarget, setMonthlyTarget] = useState<number>(50000);
  const [currency, setCurrency] = useState('USD');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const totalDebit = useLiveQuery(async () => {
    const customers = await db.customers.toArray();
    return customers.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  }) || 0;

  const progressPercent = Math.min(Math.round((totalDebit / monthlyTarget) * 100), 100);
  const remaining = Math.max(monthlyTarget - totalDebit, 0);

  const t = translations[language];

  useEffect(() => {
    // Check local storage for settings
    const savedLang = localStorage.getItem('lang') as Language;
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedCurrency = localStorage.getItem('currency');
    const savedTarget = localStorage.getItem('monthlyTarget');
    if (savedLang) setLanguage(savedLang);
    if (savedTheme) setTheme(savedTheme);
    if (savedCurrency) setCurrency(savedCurrency);
    if (savedTarget) setMonthlyTarget(Number(savedTarget));

    // Initial DB seed if empty
    const seedDB = async () => {
      const areaCount = await db.areas.count();
      if (areaCount === 0) {
        await db.areas.bulkAdd([
          { name: 'Kapar', target: 50000, color: '#3b82f6' },
          { name: 'Klang', target: 75000, color: '#10b981' },
          { name: 'Shah Alam', target: 100000, color: '#f59e0b' }
        ]);
        console.log('Seeded initial areas');
      }
      setLoading(false);
    };

    seedDB();
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', language);
    localStorage.setItem('theme', theme);
    localStorage.setItem('currency', currency);
    localStorage.setItem('monthlyTarget', monthlyTarget.toString());
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [language, theme, currency, monthlyTarget]);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'areas', icon: MapPin, label: t.areas },
    { id: 'customers', icon: Users, label: t.customers },
    { id: 'sales', icon: PlusCircle, label: t.salesEntry },
    { id: 'reports', icon: FileText, label: t.reports },
    { id: 'settings', icon: Settings, label: t.settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard language={language} currency={currency} monthlyTarget={monthlyTarget} />;
      case 'areas': return <Areas language={language} currency={currency} />;
      case 'customers': return <Customers language={language} currency={currency} />;
      case 'sales': return <SalesEntry language={language} theme={theme} currency={currency} />;
      case 'reports': return <Reports language={language} currency={currency} />;
      case 'settings': return <SettingsView language={language} setTheme={setTheme} setLanguage={setLanguage} theme={theme} currency={currency} setCurrency={setCurrency} monthlyTarget={monthlyTarget} setMonthlyTarget={setMonthlyTarget} />;
      default: return <Dashboard language={language} currency={currency} monthlyTarget={monthlyTarget} />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
            <TrendingUp className="text-white w-12 h-12" />
          </div>
        </motion.div>
        <motion.h1 
          className="text-3xl font-bold font-display text-gray-900 dark:text-white"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          CrediRegistry
        </motion.h1>
        <motion.p 
          className="text-gray-500 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {language === 'en' ? 'Initializing phone storage...' : 'ফোন স্টোরেজ শুরু হচ্ছে...'}
        </motion.p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg">CrediRegistry</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex h-[calc(100vh-64px)] lg:h-screen">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shrink-0 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-6 hidden lg:flex items-center gap-3">
            <div className="shrink-0">
              <img 
                src="https://ais-dev-tqnuv7k6atrmjktjev7pgg-511205091422.asia-southeast1.run.app/artifact/input_file_0.png" 
                alt="Logo" 
                className="w-10 h-10 rounded-xl shadow-lg shadow-indigo-500/20 object-cover"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight leading-tight">CreditReg</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Smart Registry</p>
            </div>
          </div>

          <nav className="mt-4 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm",
                  activeTab === item.id 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 font-semibold" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 bg-slate-800 m-4 rounded-lg shadow-inner">
            <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">{language === 'en' ? 'Monthly Target' : 'মাসিক টার্গেট'}</p>
            <div className="flex justify-between text-[11px] mb-1 font-medium">
              <span>{progressPercent}% {language === 'en' ? 'Completed' : 'সম্পন্ন'}</span>
              <span className="text-slate-500">{currency} {remaining.toLocaleString()} {language === 'en' ? 'left' : 'বাকি'}</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-1000" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-slate-700">RK</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Rahman Khan</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Admin Role</p>
            </div>
            <button className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">EN</button>
          </div>
        </aside>

        {/* Global Overlay for Mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default App;
