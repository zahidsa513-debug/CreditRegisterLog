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
  DollarSign,
  Eye,
  Sparkles
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
import RedEye from './components/RedEye';
import MyProgress from './components/MyProgress';
import AiCorner from './components/AiCorner';
import PinLock from './components/PinLock';
import SplashScreen from './components/SplashScreen';
import { cn } from './lib/utils';
import { db } from './db/db';
import { useAuth } from './hooks/useAuth';
import { syncToCloud } from './lib/sync';
import { useSettings } from './context/SettingsContext';
import { trackPageChange } from './lib/analytics';

const App = () => {
  const { user, profile: firebaseProfile, loading: authLoading, logout: firebaseLogout } = useAuth();
  const { language, theme, currency, target: monthlyTarget, isLoaded: settingsLoaded } = useSettings();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    trackPageChange(activeTab);
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [redEyeActive, setRedEyeActive] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasCheckedLock, setHasCheckedLock] = useState(false);

  const monthlySalesTotal = useLiveQuery(async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sales = await db.sales.toArray();
    
    return sales
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0);
  }, []);

  const progressPercent = monthlyTarget > 0 ? Math.min(Math.round((monthlySalesTotal / monthlyTarget) * 100), 100) : 0;
  const remaining = Math.max(monthlyTarget - (monthlySalesTotal || 0), 0);

  const t = translations[language];

  // Load settings for Pin Lock and Auto Backup
  const dexieSettings = useLiveQuery(() => db.settings.toArray());

  useEffect(() => {
    if (dexieSettings && dexieSettings.length > 0) {
      const s = dexieSettings[0];
      
      // Only lock on initial load
      if (!hasCheckedLock && s.isPinEnabled && s.securityPin) {
        setIsLocked(true);
        setHasCheckedLock(true);
      } else if (!hasCheckedLock) {
        setHasCheckedLock(true);
      }
      
      if (s.autoBackup) {
        let lastBackup: string | null = null;
        try {
          lastBackup = localStorage.getItem('last_auto_backup');
        } catch (e) {}

        const today = new Date().toISOString().split('T')[0];
        if (lastBackup !== today) {
          syncToCloud().then(() => {
            try { localStorage.setItem('last_auto_backup', today); } catch(e) {}
          }).catch(err => console.error('Auto backup failed:', err));
        }
      }
    }
  }, [dexieSettings, hasCheckedLock]);

  useEffect(() => {
    // Initial DB seed
    const seedDB = async () => {
      const areaCount = await db.areas.count();
      if (areaCount === 0) {
        await db.areas.bulkAdd([
          { name: 'Kapar', target: 50000, color: '#3b82f6' },
          { name: 'Klang', target: 75000, color: '#10b981' },
          { name: 'Shah Alam', target: 100000, color: '#f59e0b' }
        ]);
      }
    };
    seedDB();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'myProgress', icon: TrendingUp, label: t.myProgress },
    { id: 'areas', icon: MapPin, label: t.areas },
    { id: 'customers', icon: Users, label: t.customers },
    { id: 'customerProfile', icon: User, label: t.customerProfile },
    { id: 'sales', icon: PlusCircle, label: t.salesEntry },
    { id: 'reports', icon: FileText, label: t.reports },
    { id: 'aiCorner', icon: Sparkles, label: t.aiCorner || 'AI Corner' },
    { id: 'redeye', icon: Eye, label: t.redEye },
    { id: 'settings', icon: Settings, label: t.settings },
  ];

  const handleLogout = async () => {
    await firebaseLogout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} redEyeActive={redEyeActive} />;
      case 'myProgress': return <MyProgress redEyeActive={redEyeActive} />;
      case 'areas': return <Areas redEyeActive={redEyeActive} />;
      case 'customers': return <Customers redEyeActive={redEyeActive} />;
      case 'customerProfile': return <CustomerProfile redEyeActive={redEyeActive} />;
      case 'sales': return <SalesEntry editingSale={editingSale} setEditingSale={setEditingSale} />;
      case 'reports': return <Reports setActiveTab={setActiveTab} setEditingSale={setEditingSale} redEyeActive={redEyeActive} />;
      case 'aiCorner': return <AiCorner redEyeActive={redEyeActive} />;
      case 'redeye': return <RedEye />;
      case 'settings': return (
        <SettingsView 
          onLogout={handleLogout}
          redEyeActive={redEyeActive}
        />
      );
      default: return <Dashboard setActiveTab={setActiveTab} redEyeActive={redEyeActive} />;
    }
  };

  if (!settingsLoaded || authLoading || showSplash) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  if (isLocked && dexieSettings?.[0]?.securityPin) {
    return <PinLock correctPin={dexieSettings[0].securityPin} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className={cn("min-h-screen", theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Logo size="sm" className="rounded-lg shadow-lg ring-1 ring-slate-100 dark:ring-white/10" />
          <span className="font-display font-bold text-lg">CreditRegister</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setRedEyeActive(!redEyeActive)}
            className={cn(
              "p-2 rounded-xl transition-all",
              redEyeActive ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            )}
            title={redEyeActive ? "Privacy Mode ON" : "Privacy Mode OFF"}
          >
            <Eye className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
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
            <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">{t.monthlyTarget}</p>
            <div className="flex justify-between text-[11px] mb-1 font-medium">
              <span>{progressPercent}% {t.completed}</span>
              <span className="text-slate-500">{currency} {remaining.toLocaleString()} {t.left}</span>
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
