import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  CreditCard, 
  DollarSign, 
  Wallet,
  TrendingUp,
  Target,
  PlusCircle
} from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';

const StatCard = ({ title, value, icon: Icon, trend, color, language }: any) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group">
    <div className="flex items-start justify-between">
      <div className={cn("p-2.5 rounded-xl transition-colors", color)}>
        <Icon className="text-white w-5 h-5" />
      </div>
      {trend && (
        <span className={cn(
          "flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full",
          trend > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30"
        )}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold font-display mt-0.5 tracking-tight group-hover:text-indigo-600 transition-colors">{value}</h3>
    </div>
  </div>
);

const Dashboard = ({ language, currency, monthlyTarget }: { language: 'en' | 'bn', currency: string, monthlyTarget: number }) => {
  const t = translations[language];

  const totalCustomers = useLiveQuery(() => db.customers.count());
  const totals = useLiveQuery(async () => {
    const customers = await db.customers.toArray();
    return customers.reduce((acc, curr) => ({
      debit: acc.debit + (curr.debit || 0),
      credit: acc.credit + (curr.credit || 0),
    }), { debit: 0, credit: 0 });
  });

  const areaData = useLiveQuery(async () => {
    const areas = await db.areas.toArray();
    const customers = await db.customers.toArray();
    
    return areas.map(area => {
      const areaCustomers = customers.filter(c => c.areaId === area.id);
      const debit = areaCustomers.reduce((acc, curr) => acc + curr.debit, 0);
      const credit = areaCustomers.reduce((acc, curr) => acc + curr.credit, 0);
      return {
        name: area.name,
        debit,
        credit,
        color: area.color,
        balance: debit - credit
      };
    });
  });

  const monthlyGrowth = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Apr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">System Status: <span className="text-emerald-500 font-bold">Online</span></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Area:</span>
            <select className="text-sm bg-transparent border-none font-bold text-indigo-600 cursor-pointer focus:ring-0">
              <option>All Areas</option>
              {areaData?.map((a, idx) => <option key={`${a.name}-${idx}`}>{a.name}</option>)}
            </select>
          </div>
          <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 leading-none">
            <PlusCircle className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.totalDebit} 
          value={formatCurrency(totals?.debit || 0, currency)} 
          icon={DollarSign} 
          color="bg-slate-900"
          trend={12}
          language={language}
        />
        <StatCard 
          title={t.totalCredit} 
          value={formatCurrency(totals?.credit || 0, currency)} 
          icon={CreditCard} 
          color="bg-slate-600"
          trend={-5}
          language={language}
        />
        <StatCard 
          title={t.balance} 
          value={formatCurrency((totals?.debit || 0) - (totals?.credit || 0), currency)} 
          icon={Wallet} 
          color="bg-indigo-500"
          trend={8}
          language={language}
        />
        <StatCard 
          title={t.totalCustomers} 
          value={totalCustomers || 0} 
          icon={Users} 
          color="bg-slate-400"
          language={language}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Area Performance Dashboard</h3>
            <div className="flex gap-2">
              <button className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">Weekly</button>
              <button className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">Monthly</button>
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                    tickFormatter={(val) => `${currency} ${val/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="debit" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="credit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Daily Goal</p>
                <p className="text-lg font-bold text-emerald-600 leading-tight">Reached</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Collections</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{currency} 4,200</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Active Areas</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">12 Regions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs tracking-widest leading-none">Target Progress</h3>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          
          <div className="flex-1 space-y-5">
            {areaData?.map((area, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{area.name}</span>
                  <span className="text-slate-500 font-mono text-[10px] font-bold">{Math.round((area.debit / (monthlyTarget / (areaData?.length || 1))) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((area.debit / (monthlyTarget / (areaData?.length || 1))) * 100, 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: idx * 0.1 }}
                    className={cn("h-full rounded-full transition-all")}
                    style={{ backgroundColor: idx % 2 === 0 ? '#6366f1' : '#10b981' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-5 bg-indigo-600 rounded-xl text-white relative overflow-hidden group border border-indigo-500">
            <div className="relative z-10">
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Monthly Growth</p>
              <div className="flex items-end justify-between mt-1">
                <h4 className="text-3xl font-bold font-display tracking-tight">↑ 78.4%</h4>
                <div className="flex items-center text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded backdrop-blur-md border border-white/10">
                   +4.2% MOM
                </div>
              </div>
            </div>
            <TrendingUp className="absolute -bottom-2 -right-2 w-20 h-20 opacity-10 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
