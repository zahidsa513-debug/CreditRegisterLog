import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, MapPin, Target as TargetIcon } from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Area, Language } from '../types';
import { markForSync } from '../lib/sync';

import { useSettings } from '../context/SettingsContext';

const Areas = ({ redEyeActive }: { redEyeActive?: boolean }) => {
  const { language, currency } = useSettings();
  const t = translations[language];
  const areas = useLiveQuery(() => db.areas.toArray());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newArea, setNewArea] = useState<Partial<Area>>({ name: '', target: 0, color: '#3b82f6' });

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newArea.name && newArea.target) {
      const id = await db.areas.add(newArea as Area);
      await markForSync('areas', id as number);
      setNewArea({ name: '', target: 0, color: '#3b82f6' });
      setIsModalOpen(false);
    }
  };

  const deleteArea = async (id: number) => {
    if (confirm(language === 'en' ? 'Delete this area? Customers in this area will need reassignment.' : 'এই এলাকাটি কি মুছে ফেলতে চান?')) {
      await db.areas.delete(id);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-display font-bold tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]">{t.areas}</h2>
          <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest opacity-80">{language === 'en' ? 'Manage business territories' : 'আপনার ব্যবসার এলাকাগুলি পরিচালনা করুন'}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="md-btn-primary px-6 py-3 rounded-full"
        >
          <Plus className="w-5 h-5 font-black" />
          {t.addArea}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {areas?.map((area) => (
          <div key={area.id} className="surface-container p-8 group hover:shadow-soft transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20"
                  style={{ backgroundColor: area.color }}
                >
                  <MapPin className="w-7 h-7" />
                </div>
                <div>
                  <h3 className={cn("font-display font-black text-xl text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>{area.name}</h3>
                  <div className={cn("flex items-center text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-70", redEyeActive && "blur-sm")}>
                    <TargetIcon className="w-4 h-4 mr-1 text-brand-primary" />
                    Target: {formatCurrency(area.target, currency)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 bg-black/5 dark:bg-white/5 rounded-full text-slate-500 hover:text-brand-primary transition-all active:scale-90">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => area.id && deleteArea(area.id)}
                  className="p-3 bg-rose-50 rounded-full text-rose-500 hover:bg-rose-100 transition-all active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="p-5 bg-black/5 dark:bg-white/5 rounded-[1.5rem] border border-black/5 dark:border-white/5 shadow-inner">
                <p className="stat-label">Customers</p>
                <p className="text-3xl font-black mt-2 text-brand-primary">128</p>
              </div>
              <div className="p-5 bg-black/5 dark:bg-white/5 rounded-[1.5rem] border border-black/5 dark:border-white/5 shadow-inner">
                <p className="stat-label">Growth</p>
                <p className="text-3xl font-black mt-2 text-emerald-600">+14%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1D1B20] w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-black/5">
            <h3 className="text-3xl font-display font-black mb-8 text-[#1D1B20] dark:text-[#E6E1E5]">{t.addArea}</h3>
            <form onSubmit={handleAddArea} className="space-y-6">
              <div className="space-y-2">
                <label className="stat-label flex items-center gap-2">Area Name</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={newArea.name}
                  onChange={e => setNewArea({...newArea, name: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-4 focus:ring-brand-primary/20 outline-none font-bold text-lg"
                  placeholder="e.g. Kapar"
                />
              </div>
              <div className="space-y-2">
                <label className="stat-label flex items-center gap-2">Monthly Target</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">{currency}</span>
                  <input 
                    required
                    type="number"
                    value={newArea.target || ''}
                    onChange={e => setNewArea({...newArea, target: Number(e.target.value)})}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-4 focus:ring-brand-primary/20 outline-none font-black text-2xl"
                    placeholder="50,000"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="stat-label flex items-center gap-2">Theme Color</label>
                <div className="flex gap-4">
                  {['#6750A4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#49454F'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewArea({...newArea, color})}
                      className={cn(
                        "w-12 h-12 rounded-full transition-all border-4 border-white dark:border-[#21005D] shadow-lg",
                        newArea.color === color ? "scale-125 ring-4 ring-[#D0BCFF]" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-full font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition active:scale-95"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex-1 md-btn-primary px-6 py-4 rounded-full font-black text-lg"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Areas;
