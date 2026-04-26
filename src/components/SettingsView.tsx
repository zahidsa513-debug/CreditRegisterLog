import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  DollarSign,
  User,
  LogOut,
  Camera,
  Save,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react';
import { translations } from '../translations';
import { cn } from '../lib/utils';
import { db } from '../db/db';
import { Area } from '../types';

const SettingsView = ({ 
  language, 
  theme, 
  setTheme, 
  setLanguage, 
  currency, 
  setCurrency, 
  monthlyTarget, 
  setMonthlyTarget,
  userProfile,
  setUserProfile,
  onLogout
}: any) => {
  const t = translations[language as 'en' | 'bn'];
  const areas = useLiveQuery(() => db.areas.toArray());
  const [isEditing, setIsEditing] = React.useState(false);
  const [isAddingArea, setIsAddingArea] = React.useState(false);
  const [newArea, setNewArea] = React.useState({ name: '', target: 1000, color: '#6366f1' });
  const [profileForm, setProfileForm] = React.useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    avatar: userProfile?.avatar || '',
    designation: userProfile?.designation || '',
    location: userProfile?.location || '',
    monthlyTarget: userProfile?.monthlyTarget || 100000
  });

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newArea.name) {
      await db.areas.add(newArea as Area);
      setNewArea({ name: '', target: 1000, color: '#6366f1' });
      setIsAddingArea(false);
    }
  };

  const deleteArea = async (id: number) => {
    if (confirm(language === 'en' ? 'Are you sure? Customers in this area will need reassignment.' : 'আপনি কি নিশ্চিত? এই এলাকার গ্রাহকদের আবার এলাকা এসাইন করতে হবে।')) {
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
      const updatedProfile = { ...profiles[0], ...profileForm };
      await db.profiles.update(profiles[0].id!, profileForm);
      setUserProfile(updatedProfile);
      setIsEditing(false);
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
  ];

  const clearDatabase = async () => {
    if (confirm(language === 'en' ? 'Are you sure? This will delete all local data permanently.' : 'আপনি কি নিশ্চিত? এটি আপনার সব লোকাল ডাটা স্থায়ীভাবে মুছে ফেলবে।')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.settings}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">System configuration and profile management</p>
        </div>
        <button 
          onClick={onLogout}
          className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-colors"
          title={language === 'en' ? 'Logout' : 'লগআউট'}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
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
                    placeholder={language === 'en' ? 'Designation / Role' : 'পদবি'}
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
              <div key={area.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                  <span className="text-sm font-bold">{area.name}</span>
                </div>
                <button 
                  onClick={() => deleteArea(area.id!)}
                  className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                onClick={() => setIsAddingArea(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-display font-bold mb-6">{language === 'en' ? 'Add New Area' : 'নতুন এলাকা যোগ করুন'}</h3>
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
                  Create Area
                </button>
              </form>
            </div>
          </div>
        )}

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
