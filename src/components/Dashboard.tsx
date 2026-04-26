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

const StatCard = ({ title, value, icon: Icon, trend, color, language, onClick }: any) => (
  <button 
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all group text-left w-full disabled:cursor-default",
      onClick && "hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900 active:scale-98"
    )}
  >
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
    {onClick && (
      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center gap-1.5 text-indigo-500 font-bold text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        {language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'} <ArrowUpRight className="w-2.5 h-2.5" />
      </div>
    )}
  </button>
);

const Dashboard = ({ language, currency, monthlyTarget, setActiveTab }: { language: 'en' | 'bn', currency: string, monthlyTarget: number, setActiveTab: (tab: string) => void }) => {
  const t = translations[language];

  const totalCustomers = useLiveQuery(() => db.customers.count());
  const totals = useLiveQuery(async () => {
    const customers = await db.customers.toArray();
    const sales = await db.sales.toArray();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Calculate total credit (Baki) from sales
    const currentMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthSalesList = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const totalCreditSaleCurrentMonth = currentMonthSales.reduce((acc, s) => acc + (s.creditSale || 0), 0);
    const totalCreditSaleOverall = sales.reduce((acc, s) => acc + (s.creditSale || 0), 0);
    
    // Total Today Sales (including direct)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales
      .filter(s => {
        const d = new Date(s.date);
        return !isNaN(d.getTime()) && d.setHours(0,0,0,0) === today.getTime();
      })
      .reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0);

    // Calculate monthly total sales
    const monthlyTotalAchieved = currentMonthSales.reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0);
    const lastMonthTotalAchieved = lastMonthSalesList.reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0);
    
    // Calculate daily average sales for current month
    const daysInMonthPast = now.getDate();
    const dailyAverage = monthlyTotalAchieved / (daysInMonthPast || 1);

    const creditCustomersCount = customers.filter(c => ((c.debit || 0) - (c.credit || 0)) > 0).length;

    const profile = await db.profiles.toArray();
    const target = profile[0]?.monthlyTarget || 100000;

    const totalDebitOverall = customers.reduce((acc, curr) => acc + (curr.debit || 0), 0);
    const totalCreditOverall = customers.reduce((acc, curr) => acc + (curr.credit || 0), 0);
    const totalOutstanding = totalDebitOverall - totalCreditOverall;

    return {
      debit: totalDebitOverall,
      credit: totalCreditOverall,
      currentMonthBaki: totalCreditSaleCurrentMonth,
      oldOutstanding: totalOutstanding - totalCreditSaleCurrentMonth,
      totalOutstanding,
      todaySales,
      dailyAverage,
      lastMonthSales: lastMonthTotalAchieved,
      totalSales: sales.reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0),
      creditCustomersCount,
      monthlyTotalAchieved,
      target,
      targetRemaining: Math.max(0, target - monthlyTotalAchieved)
    };
  });

  const areaData = useLiveQuery(async () => {
    const areas = await db.areas.toArray();
    const customers = await db.customers.toArray();
    
    return areas.map(area => {
      const areaCustomers = customers.filter(c => c.areaId === area.id);
      const debit = areaCustomers.reduce((acc, curr) => acc + curr.debit, 0);
      const credit = areaCustomers.reduce((acc, curr) => acc + curr.credit, 0);
      const areaProgress = Math.round((debit / (monthlyTarget / (areas.length || 1))) * 100);
      
      return {
        name: area.name,
        debit,
        credit,
        color: area.color,
        balance: debit - credit,
        progress: areaProgress
      };
    });
  }, [monthlyTarget]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">System Status: <span className="text-emerald-500 font-bold">Online</span></p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 leading-none">
            <PlusCircle className="w-4 h-4" />
            {language === 'en' ? 'New Transaction' : 'নতুন লেনদেন'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title={language === 'en' ? "Daily Average" : 'প্রতিদিনের গড় বিক্রি'} 
          value={formatCurrency(totals?.dailyAverage || 0, currency)} 
          icon={TrendingUp} 
          color="bg-emerald-500"
          language={language}
        />
        <StatCard 
          title={language === 'en' ? "Last Month's Sales" : 'গতমাসের মোট বিক্রি'} 
          value={formatCurrency(totals?.lastMonthSales || 0, currency)} 
          icon={BarChart} 
          color="bg-indigo-600"
          language={language}
        />
        <StatCard 
          title={language === 'en' ? 'Credit This Month' : 'চলতি মাসের বাকি'} 
          value={formatCurrency(totals?.currentMonthBaki || 0, currency)} 
          icon={CreditCard} 
          color="bg-rose-500"
          language={language}
        />
        <StatCard 
          title={language === 'en' ? 'Total Outstanding' : 'মোট বকেয়া'} 
          value={formatCurrency(totals?.totalOutstanding || 0, currency)} 
          icon={Wallet} 
          color="bg-amber-500"
          language={language}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title={language === 'en' ? 'Total Customers' : 'মোট কাস্টমার'} 
          value={totalCustomers || 0} 
          icon={Users} 
          color="bg-slate-500"
          language={language}
          onClick={() => setActiveTab('customers')}
        />
        <StatCard 
          title={language === 'en' ? 'Credit Customers' : 'বাকি ক্রেতা'} 
          value={totals?.creditCustomersCount || 0} 
          icon={Users} 
          color="bg-indigo-400"
          language={language}
          onClick={() => setActiveTab('customers')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{language === 'en' ? 'Sales vs Collection' : 'বিক্রি বনাম কালেকশন'}</h3>
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
                  <Bar dataKey="debit" name={language === 'en' ? 'Sale' : 'বিক্রি'} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="credit" name={language === 'en' ? 'Collection' : 'সংগ্রহ'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{language === 'en' ? 'Monthly Target' : 'মাসিক টার্গেট'}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{formatCurrency(totals?.target || 0, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{language === 'en' ? 'Total Achieved' : 'অর্জিত মোট'}</p>
                <p className="text-lg font-bold text-indigo-600 leading-tight">{formatCurrency(totals?.monthlyTotalAchieved || 0, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{language === 'en' ? 'Remaining' : 'অবশিষ্ট'}</p>
                <p className="text-lg font-bold text-rose-500 leading-tight">{formatCurrency(totals?.targetRemaining || 0, currency)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Progress Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs tracking-widest leading-none">Overall Progress</h3>
            <Target className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-100 dark:text-slate-800"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={440}
                  initial={{ strokeDashoffset: 440 }}
                  animate={{ strokeDashoffset: 440 - (440 * Math.min(1, (totals?.monthlyTotalAchieved || 0) / (totals?.target || 1))) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className="text-indigo-600"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black font-display text-slate-800 dark:text-white">
                  {Math.round(Math.min(100, ((totals?.monthlyTotalAchieved || 0) / (totals?.target || 1)) * 100))}%
                </span>
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Target</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">{language === 'en' ? 'Target Summary' : 'টার্গেট সামারি'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{language === 'en' ? 'Sales Done' : 'বিক্রি হয়েছে'}</span>
                  <span className="text-sm font-black text-indigo-500">{formatCurrency(totals?.monthlyTotalAchieved || 0, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl text-white relative overflow-hidden group shadow-xl shadow-indigo-500/20">
            <div className="relative z-10">
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">{language === 'en' ? 'Monthly Achievement' : 'মাসিক অর্জন'}</p>
              <h4 className="text-2xl font-bold font-display mt-1">
                {(totals?.monthlyTotalAchieved || 0) >= (totals?.target || 0) 
                  ? (language === 'en' ? 'Goal Reached! 🎉' : 'টার্গেট পূরণ! 🎉') 
                  : (language === 'en' ? 'Keep Pushing! 💪' : 'চালিয়ে যান! 💪')}
              </h4>
            </div>
            <TrendingUp className="absolute -bottom-2 -right-2 w-20 h-20 opacity-10 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
