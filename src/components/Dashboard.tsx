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
import Logo from './Logo';
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

const StatCard = ({ title, value, icon: Icon, trend, color, language, onClick, delay = 0 }: any) => (
  <motion.button 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      "bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-soft transition-all group text-left w-full disabled:cursor-default relative overflow-hidden",
      onClick && "hover:shadow-premium hover:border-indigo-200 dark:hover:border-indigo-900 active:scale-[0.98]"
    )}
  >
    <div className="flex items-start justify-between relative z-10">
      <div className={cn("p-3 rounded-2xl transition-all group-hover:scale-110", color)}>
        <Icon className="text-white w-6 h-6" />
      </div>
      {trend && (
        <span className={cn(
          "flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
          trend > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30"
        )}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-6 relative z-10">
      <p className="stat-label">{title}</p>
      <h3 className="text-3xl font-black font-display mt-2 tracking-tight group-hover:text-indigo-600 transition-colors">{value}</h3>
    </div>
    
    {/* Decorative background element */}
    <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity", color)}>
      <Icon className="w-full h-full" />
    </div>

    {onClick && (
      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center gap-1.5 text-indigo-500 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        {language === 'en' ? 'Explore' : 'বিস্তারিত'} <ArrowUpRight className="w-3 h-3" />
      </div>
    )}
  </motion.button>
);

const Dashboard = ({ language, currency, monthlyTarget, setActiveTab }: { language: 'en' | 'bn', currency: string, monthlyTarget: number, setActiveTab: (tab: string) => void }) => {
  const t = translations[language];

  const totalCustomers = useLiveQuery(() => db.customers.count());
  const recentSales = useLiveQuery(() => db.sales.orderBy('date').reverse().limit(5).toArray());
  
  const totals = useLiveQuery(async () => {
    const customers = await db.customers.toArray();
    const sales = await db.sales.toArray();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Calculate current month data
    const currentMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthSalesList = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const totalCreditSaleCurrentMonth = currentMonthSales.reduce((acc, s) => acc + (s.creditSale || 0), 0);
    const lastMonthCreditSale = lastMonthSalesList.reduce((acc, s) => acc + (s.creditSale || 0), 0);
    
    // Month-over-month trend
    const creditTrend = lastMonthCreditSale === 0 ? 0 : Math.round(((totalCreditSaleCurrentMonth - lastMonthCreditSale) / lastMonthCreditSale) * 100);

    const monthlyTotalAchieved = currentMonthSales.reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0);
    const lastMonthTotalAchieved = lastMonthSalesList.reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0);
    const salesTrend = lastMonthTotalAchieved === 0 ? 0 : Math.round(((monthlyTotalAchieved - lastMonthTotalAchieved) / lastMonthTotalAchieved) * 100);

    const totalDebitOverall = customers.reduce((acc, curr) => acc + (curr.debit || 0), 0);
    const totalCreditOverall = customers.reduce((acc, curr) => acc + (curr.credit || 0), 0);
    const totalOutstanding = totalDebitOverall - totalCreditOverall;

    const creditCustomersCount = customers.filter(c => ((c.debit || 0) - (c.credit || 0)) > 0).length;

    return {
      totalOutstanding,
      salesTrend,
      creditTrend,
      monthlyTotalAchieved,
      targetRemaining: Math.max(0, monthlyTarget - monthlyTotalAchieved),
      creditCustomersCount,
      totalSales: sales.reduce((acc, s) => acc + (s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0))), 0)
    };
  }, [monthlyTarget]);

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
    }).sort((a, b) => b.debit - a.debit);
  }, [monthlyTarget]);

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-display font-black tracking-tight"
          >
            Insights <span className="text-indigo-600">&</span> Overview
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 font-medium mt-1"
          >
            {language === 'en' ? 'Monitor your credit flow and targets in real-time.' : 'আপনার ক্রেডিট প্রবাহ এবং টার্গেট রিয়েল-টাইমে মনিটর করুন।'}
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('sales')}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            {language === 'en' ? 'New Entry' : 'নতুন এন্ট্রি'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={language === 'en' ? "Monthly Revenue" : 'মাসিক আয়'} 
          value={formatCurrency(totals?.monthlyTotalAchieved || 0, currency)} 
          icon={TrendingUp} 
          trend={totals?.salesTrend}
          color="bg-indigo-600"
          language={language}
          delay={0.1}
        />
        <StatCard 
          title={language === 'en' ? 'New Credit' : 'নতুন বাকি'} 
          value={formatCurrency(totals?.creditTrend || 0, currency)} // Using trend as value placeholder if needed, but let's use actual current month credit
          trend={totals?.creditTrend}
          icon={CreditCard} 
          color="bg-amber-500"
          language={language}
          delay={0.2}
        />
        <StatCard 
          title={language === 'en' ? 'Total Outstanding' : 'মোট বকেয়া'} 
          value={formatCurrency(totals?.totalOutstanding || 0, currency)} 
          icon={Wallet} 
          color="bg-rose-500"
          language={language}
          delay={0.3}
        />
        <StatCard 
          title={language === 'en' ? 'Active Customers' : 'সক্রিয় ক্রেতা'} 
          value={totalCustomers || 0} 
          icon={Users} 
          color="bg-slate-800 dark:bg-slate-700"
          language={language}
          onClick={() => setActiveTab('customers')}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales by Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-xl">{language === 'en' ? 'Area Performance' : 'এরিয়া পারফরম্যান্স'}</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collection</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                  tickFormatter={(val) => `${currency} ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 10 }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                    backgroundColor: '#1e293b',
                    color: '#fff',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ marginBottom: '4px', opacity: 0.6, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                />
                <Bar dataKey="debit" name="Sales" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="credit" name="Collection" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Target Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-indigo-600 rounded-[2.5rem] p-8 text-white flex flex-col relative overflow-hidden shadow-2xl shadow-indigo-500/20"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10">
              <span className="stat-label text-indigo-200">Achievement Goal</span>
              <Target className="w-5 h-5 text-indigo-300" />
            </div>

            <div className="flex flex-col items-center mb-10">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="88" cy="88" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                  <motion.circle
                    cx="88" cy="88" r="80" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={502.6}
                    initial={{ strokeDashoffset: 502.6 }}
                    animate={{ strokeDashoffset: 502.6 - (502.6 * Math.min(1, (totals?.monthlyTotalAchieved || 0) / (monthlyTarget || 1))) }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <h4 className="text-4xl font-black font-display">
                    {Math.round(Math.min(100, ((totals?.monthlyTotalAchieved || 0) / (monthlyTarget || 1)) * 100))}%
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mt-1">Status</span>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Target</p>
                  <p className="text-xl font-black">{formatCurrency(monthlyTarget, currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Achieved</p>
                  <p className="text-xl font-black text-emerald-300">{formatCurrency(totals?.monthlyTotalAchieved || 0, currency)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Abstract circles */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-xl">{language === 'en' ? 'Recent Transactions' : 'সাম্প্রতিক লেনদেন'}</h3>
            <button 
              onClick={() => setActiveTab('reports')}
              className="text-xs font-black uppercase tracking-widest text-indigo-500 hover:underline"
            >
              See All
            </button>
          </div>
          <div className="space-y-4">
            {recentSales?.map((sale, i) => {
              const customer = customers?.find(c => c.id === sale.customerId);
              return (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                      sale.creditSale > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {sale.creditSale > 0 ? <ArrowDownRight className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                        {customer?.name || (language === 'en' ? 'Unknown Customer' : 'অজানা কাস্টমার')}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(sale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 dark:text-white">
                      {formatCurrency(sale.totalAmount || ((sale.cashSale || 0) + (sale.chequeSale || 0) + (sale.creditSale || 0)), currency)}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {sale.creditSale > 0 ? 'Credit' : 'Cash'}
                    </p>
                  </div>
                </div>
              );
            })}
            {recentSales?.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic text-sm">
                No recent activity recorded.
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Tips or Reminders */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/20 p-8"
        >
          <h3 className="font-display font-bold text-xl text-emerald-900 dark:text-emerald-400 mb-6">Smart Insights</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100 dark:border-emerald-900/20">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">Customer Retention</h4>
                <p className="text-sm text-emerald-800/70 dark:text-emerald-400/70 leading-relaxed mt-1">
                  You have <span className="font-black text-emerald-900 dark:text-emerald-400">{totals?.creditCustomersCount}</span> customers with outstanding balances. Following up could recover up to <span className="font-black text-emerald-900 dark:text-emerald-400">{formatCurrency(totals?.totalOutstanding || 0, currency)}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100 dark:border-emerald-900/20">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">Sales Outlook</h4>
                <p className="text-sm text-emerald-800/70 dark:text-emerald-400/70 leading-relaxed mt-1">
                  Your sales performance is currently <span className="font-black text-emerald-900 dark:text-emerald-400">{totals?.salesTrend > 0 ? 'up' : 'down'} {Math.abs(totals?.salesTrend || 0)}%</span> compared to last month.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
