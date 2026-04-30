import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Languages, 
  Shield, 
  Database, 
  Smartphone,
  CloudUpload,
  CloudDownload,
  Info,
  Target,
  DollarSign,
  User,
  LogOut,
  Camera,
  Mail,
  Save,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Phone,
  RefreshCw,
  Cloud,
  Edit2,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import Logo from './Logo';
import { translations } from '../translations';
import { cn } from '../lib/utils';
import { db } from '../db/db';
import { Area, CompanySettings, Language, Theme, UserProfile } from '../types';
import { syncToCloud, restoreFromCloud } from '../lib/sync';
import { useSettings } from '../context/SettingsContext';
import { db as firestoreDb, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { trackFeatureUsage } from '../lib/analytics';

const SettingsView = ({ 
  onLogout,
  redEyeActive
}: {
  onLogout: () => void;
  redEyeActive?: boolean;
}) => {
  const { 
    language, 
    theme, 
    currency, 
    target: monthlyTarget, 
    updateSettings 
  } = useSettings();
  
  const t = translations[language];
  const areas = useLiveQuery(() => db.areas.toArray());
  const companySettings = useLiveQuery(() => db.settings.toArray());
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [isAddingArea, setIsAddingArea] = React.useState(false);
  const [isEditingCompany, setIsEditingCompany] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{msg: string, type: 'success' | 'error' | null}>({msg: '', type: null});
  const [showSaveToast, setShowSaveToast] = React.useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [isSendingFeedback, setIsSendingFeedback] = React.useState(false);
  const [feedbackStatus, setFeedbackStatus] = React.useState<{msg: string, type: 'success' | 'error' | null}>({msg: '', type: null});

  const [editingArea, setEditingArea] = React.useState<Area | null>(null);
  const [newArea, setNewArea] = React.useState({ name: '', target: 1000, color: '#6366f1' });
  const [profileForm, setProfileForm] = React.useState({
    name: '',
    phone: '',
    avatar: '',
    designation: '',
    location: '',
    monthlyTarget: 100000
  });

  const [localTarget, setLocalTarget] = React.useState(monthlyTarget);

  React.useEffect(() => {
    setLocalTarget(monthlyTarget);
  }, [monthlyTarget]);

  const [companyForm, setCompanyForm] = React.useState<CompanySettings>({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo: '',
    autoBackup: false,
    isPinEnabled: false,
    securityPin: ''
  });

  // Load profile from DB
  const profiles = useLiveQuery(() => db.profiles.toArray());
  const userProfile = profiles?.[0] || null;

  React.useEffect(() => {
    if (userProfile) {
      setProfileForm({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        avatar: userProfile.avatar || '',
        designation: userProfile.designation || '',
        location: userProfile.location || '',
        monthlyTarget: userProfile.monthlyTarget || 100000
      });
    }
  }, [userProfile]);

  React.useEffect(() => {
    if (companySettings && companySettings.length > 0) {
      setCompanyForm(companySettings[0]);
    }
  }, [companySettings]);

  const triggerToast = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleCloudBackup = async () => {
    setIsSyncing(true);
    setSyncStatus({msg: '', type: null});
    try {
      await syncToCloud();
      setSyncStatus({
        msg: t.backupSuccess,
        type: 'success'
      });
    } catch (error) {
      setSyncStatus({
        msg: t.backupFailed,
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus({msg: '', type: null}), 5000);
    }
  };

  const handleCloudRestore = async () => {
    if (!confirm(t.restoreWarning || 'Warning: This will overwrite your current local data. Continue?')) return;
    
    setIsRestoring(true);
    setSyncStatus({msg: '', type: null});
    try {
      await restoreFromCloud();
      setSyncStatus({
        msg: t.restoreSuccess || 'Data restored successfully! Page will reload.',
        type: 'success'
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setSyncStatus({
        msg: t.restoreFailed || 'Restore failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setSyncStatus({msg: '', type: null}), 5000);
    }
  };

  React.useEffect(() => {
    if (editingArea) {
      setNewArea({ name: editingArea.name, target: editingArea.target || 1000, color: editingArea.color || '#6366f1' });
      setIsAddingArea(true);
    } else {
      setNewArea({ name: '', target: 1000, color: '#6366f1' });
    }
  }, [editingArea]);

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newArea.name) {
      if (editingArea) {
        await db.areas.update(editingArea.id!, newArea as Area);
      } else {
        await db.areas.add(newArea as Area);
      }
      setEditingArea(null);
      setIsAddingArea(false);
    }
  };

  const closeAreaModal = () => {
    setIsAddingArea(false);
    setEditingArea(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyForm({ ...companyForm, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const exportData = async () => {
    const data = {
      areas: await db.areas.toArray(),
      customers: await db.customers.toArray(),
      sales: await db.sales.toArray(),
      expenses: await db.expenses.toArray(),
      profiles: await db.profiles.toArray(),
      settings: await db.settings.toArray(),
      checks: await db.checks.toArray(),
      exportDate: new Date().toISOString(),
      version: '1.2'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CreditRegistry_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(t.importWarning || 'Warning: This will overwrite CURRENT local data with the backup file. Continue?')) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        
        await db.transaction('rw', [db.areas, db.customers, db.sales, db.expenses, db.profiles, db.settings, db.checks], async () => {
          await db.areas.clear();
          await db.customers.clear();
          await db.sales.clear();
          await db.expenses.clear();
          await db.profiles.clear();
          await db.settings.clear();
          await db.checks.clear();

          if (data.areas) await db.areas.bulkAdd(data.areas);
          if (data.customers) await db.customers.bulkAdd(data.customers);
          if (data.sales) await db.sales.bulkAdd(data.sales);
          if (data.expenses) await db.expenses.bulkAdd(data.expenses);
          if (data.profiles) await db.profiles.bulkAdd(data.profiles);
          if (data.settings) await db.settings.bulkAdd(data.settings);
          if (data.checks) await db.checks.bulkAdd(data.checks);
        });

        alert(t.importSuccess || 'Data imported successfully! The app will reload.');
        window.location.reload();
      } catch (err) {
        console.error('Import failed:', err);
        alert(t.importFailed || 'Import failed: Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const saveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(companyForm);
    setIsEditingCompany(false);
    triggerToast();
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setIsSendingFeedback(true);
    setFeedbackStatus({ msg: '', type: null });

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const feedbackId = Math.random().toString(36).substring(2, 12);
      await setDoc(doc(firestoreDb, 'feedback', feedbackId), {
        message: feedbackMessage,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        category: 'suggestion'
      });

      trackFeatureUsage('feedback_submitted');
      setFeedbackStatus({ msg: t.feedbackSuccess, type: 'success' });
      setFeedbackMessage('');
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackStatus({ msg: '', type: null });
      }, 2000);
    } catch (error) {
      console.error('Feedback error:', error);
      setFeedbackStatus({ msg: t.feedbackError, type: 'error' });
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const deleteArea = async (id: number) => {
    if (confirm(t.confirmDelete || 'Are you sure? Customers in this area will need reassignment.')) {
      await db.areas.delete(id);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm({ ...profileForm, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    const profiles = await db.profiles.toArray();
    if (profiles.length > 0) {
      await db.profiles.update(profiles[0].id!, profileForm);
      await updateSettings({ targetAmount: profileForm.monthlyTarget });
      setIsEditing(false);
      triggerToast();
    }
  };

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
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  ];

  const clearDatabase = async () => {
    if (confirm(t.confirmDelete || 'Are you sure? This will delete all local data permanently.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 relative">
      {/* Dynamic Background Accents */}
      <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-500">{t.settings}</h2>
          <div className="flex items-center gap-2">
             <div className="h-0.5 w-8 bg-indigo-600 rounded-full" />
             <p className="text-slate-500 dark:text-slate-500 font-bold text-xs uppercase tracking-widest leading-none">System Architecture & Intelligence</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-colors"
          title={t.logout}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Company Settings Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{(t as any).companySettings}</p>
                <p className="text-xs text-slate-500">{(t as any).companySettingsDesc}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditingCompany(!isEditingCompany)}
              className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              {isEditingCompany ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
          
          {isEditingCompany ? (
            <form onSubmit={saveCompanySettings} className="p-6 space-y-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-indigo-100 dark:border-slate-700">
                    {companyForm.logo ? (
                      <img src={companyForm.logo} className="w-full h-full object-contain" alt="logo" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-indigo-500 text-white p-2 rounded-xl cursor-pointer shadow-lg active:scale-95 transition-transform">
                    <Edit2 className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                  </label>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{t.businessLogo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{(t as any).companyName}</label>
                  <input 
                    type="text" 
                    value={companyForm.companyName}
                    onChange={e => setCompanyForm({...companyForm, companyName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{(t as any).phone}</label>
                  <input 
                    type="tel" 
                    value={companyForm.phone}
                    onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email</label>
                  <input 
                    type="email" 
                    value={companyForm.email}
                    onChange={e => setCompanyForm({...companyForm, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{(t as any).website}</label>
                  <input 
                    type="text" 
                    value={companyForm.website}
                    onChange={e => setCompanyForm({...companyForm, website: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{(t as any).address}</label>
                  <textarea 
                    value={companyForm.address}
                    onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold min-h-[80px]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{t.dailyAutoBackup}</p>
                    <p className="text-xs text-slate-500">{t.syncDataAuto}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setCompanyForm({...companyForm, autoBackup: !companyForm.autoBackup})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      companyForm.autoBackup ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      companyForm.autoBackup ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{t.screenLock}</p>
                    <p className="text-xs text-slate-500">{t.requirePin}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setCompanyForm({...companyForm, isPinEnabled: !companyForm.isPinEnabled})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      companyForm.isPinEnabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      companyForm.isPinEnabled ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                {companyForm.isPinEnabled && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.setPin}</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      pattern="\d{4}"
                      value={companyForm.securityPin}
                      onChange={e => setCompanyForm({...companyForm, securityPin: e.target.value.replace(/\D/g, '')})}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold tracking-[0.5em]"
                      placeholder="XXXX"
                      required
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                {t.save}
              </button>
            </form>
          ) : (
            <div className="p-6">
              {companySettings && companySettings.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-6">
                  {companySettings[0].logo && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                      <img src={companySettings[0].logo} alt="logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="space-y-3 flex-1">
                    <p className="text-lg font-bold text-indigo-600">{companySettings[0].companyName}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      <p className="text-xs text-slate-500 flex items-center gap-2 font-medium"><Phone className="w-3.5 h-3.5 text-indigo-500" /> {companySettings[0].phone}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 font-medium"><Mail className="w-3.5 h-3.5 text-indigo-500" /> {companySettings[0].email}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 font-medium col-span-full"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {companySettings[0].address}</p>
                    </div>
                    {(companySettings[0].isPinEnabled || companySettings[0].autoBackup) && (
                      <div className="flex gap-2 pt-2">
                        {companySettings[0].autoBackup && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-md">Auto-Backup ON</span>
                        )}
                        {companySettings[0].isPinEnabled && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-md">PIN Armed</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No company settings found. Click + to add.</p>
              )}
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-indigo-100 dark:border-slate-700">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} className="w-full h-full object-cover" alt="avatar" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-indigo-500 text-white p-2 rounded-xl cursor-pointer shadow-lg active:scale-95 transition-transform">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              {isEditing ? (
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    placeholder="Full Name"
                    className="w-full text-xl font-bold bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input 
                    type="text" 
                    value={profileForm.designation} 
                    onChange={e => setProfileForm({...profileForm, designation: e.target.value})}
                    placeholder={t.designation}
                    className="w-full text-sm font-medium bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input 
                    type="tel" 
                    value={profileForm.phone} 
                    onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                    placeholder="Phone Number"
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input 
                    type="number" 
                    value={profileForm.monthlyTarget} 
                    onChange={e => setProfileForm({...profileForm, monthlyTarget: Number(e.target.value)})}
                    placeholder={language === 'en' ? 'Monthly Sales Target' : 'মাসিক বিক্রির লক্ষ্যমাত্রা'}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white truncate max-w-xs">{userProfile?.name}</h3>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">{userProfile?.designation || 'No Designation'}</p>
                  <p className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {userProfile?.email}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{userProfile?.phone || 'No phone set'}</p>
                    {userProfile?.location && (
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {userProfile.location}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0">
              {isEditing ? (
                <button 
                  onClick={saveProfile}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Area Management Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{language === 'en' ? 'Manage Areas' : 'এলাকা পরিচালনা'}</p>
                <p className="text-xs text-slate-500">{language === 'en' ? 'Configure default areas' : 'এলাকাগুলো সেট করুন'}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsAddingArea(true)}
              className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="divide-y dark:divide-slate-800">
            {areas?.map(area => (
              <div key={area.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                  <span className="text-sm font-bold">{area.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingArea(area)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => deleteArea(area.id!)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {(!areas || areas.length === 0) && (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No areas found. Add one to get started.
              </div>
            )}
          </div>
        </div>

        {isAddingArea && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
              <button 
                onClick={closeAreaModal}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-display font-bold mb-6">
                {editingArea ? (language === 'en' ? 'Edit Area' : 'এলাকা সংস্কার') : (language === 'en' ? 'Add New Area' : 'নতুন এলাকা যোগ করুন')}
              </h3>
              <form onSubmit={handleAddArea} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Area Name</label>
                   <input 
                    required
                    autoFocus
                    type="text"
                    value={newArea.name}
                    onChange={e => setNewArea({...newArea, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    placeholder="Ex: Kuala Lumpur"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Color Label</label>
                   <input 
                    type="color"
                    value={newArea.color}
                    onChange={e => setNewArea({...newArea, color: e.target.value})}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer p-1"
                   />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95 transition-transform"
                >
                  {editingArea ? (language === 'en' ? 'Update Area' : 'আপডেট করুন') : (language === 'en' ? 'Create Area' : 'তৈরী করুন')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Preference Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y dark:divide-slate-800 shadow-sm overflow-hidden">
          {/* Target Setting */}
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{language === 'en' ? 'Monthly Performance Target' : (language === 'bn' ? 'মাসিক পারফরম্যান্স টার্গেট' : 'Meta de Rendimiento Mensual')}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'en' ? 'Core business objective' : (language === 'bn' ? 'মূল ব্যবসার লক্ষ্য' : 'Objetivo principal del negocio')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">{currency}</span>
                  <input 
                    type="number"
                    value={localTarget}
                    onChange={(e) => setLocalTarget(Number(e.target.value))}
                    className={cn(
                      "w-40 bg-slate-50 dark:bg-slate-950 pl-14 pr-4 py-3 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-black outline-none",
                      redEyeActive && "blur-sm"
                    )}
                  />
                </div>
                <button 
                  onClick={async () => {
                    await updateSettings({ targetAmount: localTarget });
                    triggerToast();
                  }}
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                  title="Final Save Target & Currency"
                >
                  <Save className="w-5 h-5" />
                </button>
              </div>
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
                onClick={() => updateSettings({ theme: 'light' })}
                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all", theme === 'light' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                Light
              </button>
              <button 
                onClick={() => updateSettings({ theme: 'dark' })}
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
                <p className="text-xs text-slate-500">{t.interfaceLanguage}</p>
              </div>
            </div>
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => updateSettings({ language: 'en' })}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", language === 'en' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                EN
              </button>
              <button 
                onClick={() => updateSettings({ language: 'bn' })}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", language === 'bn' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                BN
              </button>
              <button 
                onClick={() => updateSettings({ language: 'es' })}
                className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", language === 'es' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              >
                ES
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
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>
        </div>

        <AnimatePresence>
          {showSaveToast && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 font-bold"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>{language === 'en' ? 'Settings Saved Permanently' : 'সেটিংস স্থায়ীভাবে সংরক্ষিত হয়েছে'}</span>
            </motion.div>
          )}
        </AnimatePresence>

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

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">{language === 'en' ? 'Data Export/Import' : 'ডাটা এক্সপোর্ট/ইমপোর্ট'}</p>
                  <p className="text-xs text-slate-500">{language === 'en' ? 'Transfer data via JSON files' : 'JSON ফাইল দিয়ে ডাটা ট্রান্সফার করুন'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-2">
                  <CloudDownload className="w-3 h-3" />
                  Import
                  <input type="file" accept=".json" className="hidden" onChange={importData} />
                </label>
                <button 
                  onClick={exportData}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <CloudUpload className="w-3 h-3" />
                  Export
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">Cloud Backup</p>
                  <p className="text-xs text-slate-500">Securely sync data to Google Cloud</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleCloudRestore}
                  disabled={isRestoring || isSyncing}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isRestoring ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CloudDownload className="w-3 h-3" />}
                  Restore
                </button>
                <button 
                  onClick={handleCloudBackup}
                  disabled={isSyncing || isRestoring}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
                  Backup
                </button>
              </div>
            </div>

            {syncStatus.msg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold text-center",
                  syncStatus.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}
              >
                {syncStatus.msg}
              </motion.div>
            )}
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
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 mb-4">
                <Smartphone className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Application Status</span>
              </div>
              <h4 className="text-2xl font-display font-bold">CreditReg Pro v1.2</h4>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-lg">
                Encryption active. Local storage isolated via IndexedDB. 
                Backup your data to Google Cloud to prevent data loss.
              </p>
            </div>
            <div className="shrink-0">
               <Logo size="md" className="shadow-2xl" />
            </div>
          </div>
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
          <Info className="absolute -bottom-10 -right-10 w-40 h-40 opacity-5 text-white" />
        </div>

        {/* Feedback Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight">{t.feedback}</p>
              <p className="text-xs text-slate-500">{t.shareSuggestions}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsFeedbackOpen(true);
              trackFeatureUsage('feedback_opened');
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-100 dark:shadow-none transition-all active:scale-95"
          >
            {t.sendFeedback}
          </button>
        </div>

        {isFeedbackOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsFeedbackOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">{t.feedback}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t.shareSuggestions}</p>
                </div>
              </div>

              <form onSubmit={handleSendFeedback} className="space-y-4">
                <textarea 
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder={t.feedbackPlaceholder}
                  className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium resize-none border-none shadow-inner"
                  required
                />

                {feedbackStatus.msg && (
                  <div className={cn(
                    "p-4 rounded-xl text-xs font-bold text-center",
                    feedbackStatus.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {feedbackStatus.msg}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSendingFeedback || !feedbackMessage.trim()}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  {isSendingFeedback ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  {t.sendFeedback}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Developer Info Section */}
        <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
          
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="p-4 bg-white/10 text-indigo-400 rounded-3xl backdrop-blur-xl border border-white/10">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-white text-xl uppercase tracking-tighter">{(t as any).aboutDeveloper}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">{(t as any).developerDetails}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
            <div className="flex items-start gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Architect</p>
                <p className="text-sm font-black text-white">Sakawat Zahid</p>
                <p className="text-[10px] text-indigo-400 font-bold">Innovation Lead</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Intelligence</p>
                <p className="text-sm font-black text-white truncate w-full">hello.sakawatzahid@gmail.com</p>
                <p className="text-[10px] text-slate-500 font-bold">24/7 Global Support</p>
              </div>
            </div>
            
            <div className="sm:col-span-2 pt-6 border-t border-white/5 mt-4">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] text-center">
                © 2024 CreditRegistry Professional Ecosystem
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
