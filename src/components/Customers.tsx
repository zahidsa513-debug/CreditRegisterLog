import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, User, Phone, MapPin, ChevronRight, DollarSign } from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Customer } from '../types';

const Customers = ({ language, currency }: { language: 'en' | 'bn', currency: string }) => {
  const t = translations[language];
  const customers = useLiveQuery(() => db.customers.toArray());
  const areas = useLiveQuery(() => db.areas.toArray());
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ 
    name: '', 
    phone: '', 
    areaId: 0, 
    debit: 0, 
    credit: 0 
  });

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomer.name && newCustomer.areaId) {
      await db.customers.add(newCustomer as Customer);
      setNewCustomer({ name: '', phone: '', areaId: 0, debit: 0, credit: 0 });
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.customers}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{language === 'en' ? 'Directory of all active credit accounts' : 'সব সক্রিয় ক্রেডিট অ্যাকাউন্টের ডিরেক্টরি'}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {t.addCustomer}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
        <input 
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-11 pr-5 py-3 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.customers}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.areas}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.totalDebit}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.totalCredit}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.balance}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers?.map((customer) => {
                const area = areas?.find(a => a.id === customer.areaId);
                const balance = (customer.debit || 0) - (customer.credit || 0);
                return (
                  <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold font-display text-sm">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">{customer.name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center">
                            <Phone className="w-3 h-3 mr-1 opacity-70" /> {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
                        <MapPin className="w-3 h-3 mr-1 text-indigo-500 opacity-70" />
                        {area?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(customer.debit, currency)}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(customer.credit, currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-bold",
                        balance > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}>
                        {formatCurrency(balance, currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="p-1.5 text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 rounded-lg inline-block transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-display font-bold mb-6">{t.addCustomer}</h3>
            <form onSubmit={handleAddCustomer} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number</label>
                <input 
                  required
                  type="tel"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+88017xxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Area</label>
                <select 
                  required
                  value={newCustomer.areaId}
                  onChange={e => setNewCustomer({...newCustomer, areaId: Number(e.target.value)})}
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={0}>Select Area</option>
                  {areas?.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-2xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg shadow-blue-100"
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

export default Customers;
