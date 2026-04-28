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
  User,
  Menu, 
  X, 
  Sun, 
  Moon,
  TrendingUp,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { translations } from './translations';
import { Language, Theme, UserProfile } from './types';
import Logo from './components/Logo';
import Dashboard from './components/Dashboard';
import Areas from './components/Areas';
import Customers from './components/Customers';
import CustomerProfile from './components/CustomerProfile';
import SalesEntry from './components/SalesEntry';
import Reports from './components/Reports';
import SettingsView from './components/SettingsView';
import AuthScreen from './components/AuthScreen';
import { cn } from './lib/utils';
import { db } from './db/db';
import { useAuth } from './hooks/useAuth';

const App = () => {
  const { user, profile: firebaseProfile, loading: authLoading, logout: firebaseLogout } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [monthlyTarget, setMonthlyTarget] = useState<number>(50000);
  const [currency, setCurrency] = useState('USD');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);

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
    { id: 'customerProfile', icon: User, label: t.customerProfile },
    { id: 'sales', icon: PlusCircle, label: t.salesEntry },
    { id: 'reports', icon: FileText, label: t.reports },
    { id: 'settings', icon: Settings, label: t.settings },
  ];

  const handleLogout = async () => {
    await firebaseLogout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard language={language} currency={currency} monthlyTarget={monthlyTarget} setActiveTab={setActiveTab} />;
      case 'areas': return <Areas language={language} currency={currency} />;
      case 'customers': return <Customers language={language} currency={currency} />;
      case 'customerProfile': return <CustomerProfile language={language} currency={currency} />;
      case 'sales': return <SalesEntry language={language} theme={theme} currency={currency} editingSale={editingSale} setEditingSale={setEditingSale} />;
      case 'reports': return <Reports language={language} currency={currency} setActiveTab={setActiveTab} setEditingSale={setEditingSale} />;
      case 'settings': return (
        <SettingsView 
          language={language} 
          setTheme={setTheme} 
          setLanguage={setLanguage} 
          theme={theme} 
          currency={currency} 
          setCurrency={setCurrency} 
          monthlyTarget={monthlyTarget} 
          setMonthlyTarget={setMonthlyTarget}
          userProfile={firebaseProfile as any}
          setUserProfile={() => {}} // Firebase profile is managed via hook
          onLogout={handleLogout}
        />
      );
      default: return <Dashboard language={language} currency={currency} monthlyTarget={monthlyTarget} setActiveTab={setActiveTab} />;
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="mb-8"
        >
          <Logo size="xl" />
        </motion.div>
        <motion.h1 
          className="text-4xl font-display font-black tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Credit <span className="text-indigo-400">Register</span>
        </motion.h1>
        <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden mt-6">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-full bg-indigo-500 rounded-full"
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} language={language} />;
  }

  return (
    <div className={cn("min-h-screen", theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Logo size="sm" className="rounded-lg shadow-lg ring-1 ring-slate-100 dark:ring-white/10" />
          <span className="font-display font-bold text-lg">CreditRegister</span>
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
              <Logo size="md" className="rounded-2xl shadow-xl ring-1 ring-white/10" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight leading-tight">Credit<span className="text-indigo-400">Register</span></h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Official Business App</p>
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
            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center text-xs font-bold ring-2 ring-slate-700 shrink-0">
              {firebaseProfile?.avatar ? (
                <img src={firebaseProfile.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                firebaseProfile?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{firebaseProfile?.name || 'User'}</p>
              <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider truncate leading-none mb-0.5">{firebaseProfile?.designation || (firebaseProfile?.email || 'Admin')}</p>
            </div>
            <button className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 uppercase shrink-0">{language}</button>
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
