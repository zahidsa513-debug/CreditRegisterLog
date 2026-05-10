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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.areas}</h2>
          <p className="text-slate-500 text-sm">{language === 'en' ? 'Manage business territories' : 'আপনার ব্যবসার এলাকাগুলি পরিচালনা করুন'}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {t.addArea}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {areas?.map((area) => (
          <div key={area.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-soft group hover:shadow-premium transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-current/20"
                  style={{ backgroundColor: area.color }}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn("font-display font-bold text-lg leading-tight", redEyeActive && "blur-sm")}>{area.name}</h3>
                  <div className={cn("flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1", redEyeActive && "blur-sm")}>
                    <TargetIcon className="w-3 h-3 mr-1" />
                    Target: {formatCurrency(area.target, currency)}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => area.id && deleteArea(area.id)}
                  className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Customers</p>
                <p className="text-xl font-bold mt-1">128</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MOM Growth</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">+14%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-display font-bold mb-6">{t.addArea}</h3>
            <form onSubmit={handleAddArea} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Area Name</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={newArea.name}
                  onChange={e => setNewArea({...newArea, name: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Kapar"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Monthly Target</label>
                <input 
                  required
                  type="number"
                  value={newArea.target || ''}
                  onChange={e => setNewArea({...newArea, target: Number(e.target.value)})}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Theme Color</label>
                <div className="flex gap-3">
                  {['#4741e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewArea({...newArea, color})}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all",
                        newArea.color === color ? "ring-4 ring-offset-2 ring-slate-200 scale-110" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-slate-100 hover:bg-slate-200 transition"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
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
