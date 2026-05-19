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
import { Language, Theme, UserProfile } from '../types';
import { useSettings } from '../context/SettingsContext';

const StatCard = ({ title, value, icon: Icon, trend, color, language, onClick, delay = 0, redEyeActive }: { 
  title: string, value: string | number, icon: any, trend?: number, color: string, language: Language, onClick?: () => void, delay?: number, redEyeActive?: boolean 
}) => (
  <motion.button 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      "surface-container p-6 transition-all group text-left w-full disabled:cursor-default relative overflow-hidden",
      onClick && "hover:brightness-105 active:scale-[0.98]"
    )}
  >
    <div className="flex items-start justify-between relative z-10">
      <div className={cn("p-4 rounded-[1.25rem] transition-all group-hover:scale-110 shadow-md", color)}>
        <Icon className="text-white w-6 h-6" />
      </div>
      {trend && (
        <span className={cn(
          "flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
          trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-6 relative z-10">
      <p className="stat-label">{title}</p>
      <h3 className={cn(
        "text-3xl font-black font-display mt-2 tracking-tight group-hover:text-brand-primary transition-colors text-[#1D1B20] dark:text-[#E6E1E5]",
        redEyeActive && typeof value === 'string' && (value.includes('$') || value.includes('৳') || value.includes('RM')) && "blur-md select-none"
      )}>{value}</h3>
    </div>
    
    {onClick && (
      <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5 text-brand-primary font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        {translations[language].explore} <ArrowUpRight className="w-3 h-3" />
      </div>
    )}
  </motion.button>
);

const Dashboard = ({ setActiveTab, redEyeActive }: { setActiveTab: (tab: string) => void, redEyeActive?: boolean }) => {
  const { language, currency, target: monthlyTarget, updateSettings } = useSettings();
  const t = translations[language];

  const totalCustomers = useLiveQuery(() => db.customers.count());
  const customers = useLiveQuery(() => db.customers.toArray());
  const recentSales = useLiveQuery(() => db.sales.orderBy('date').reverse().limit(5).toArray());
  const companySettings = useLiveQuery(() => db.settings.toArray());
  
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
    const totalCashSaleCurrentMonth = currentMonthSales.reduce((acc, s) => acc + (s.cashSale || 0), 0);
    const totalChequeSaleCurrentMonth = currentMonthSales.reduce((acc, s) => acc + (s.chequeSale || 0), 0);
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
      totalCashSaleCurrentMonth,
      totalChequeSaleCurrentMonth,
      totalCreditSaleCurrentMonth,
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
        <div className="flex items-center gap-5">
          {companySettings?.[0]?.logo && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-premium shrink-0"
            >
              <img src={companySettings[0].logo} alt="Business Logo" className="w-full h-full object-contain" />
            </motion.div>
          )}
          <div>
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-display font-black tracking-tight"
            >
              {t.insightsOverview}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-400 font-medium mt-1"
            >
              {t.monitorDescription}
            </motion.p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-surface-container p-1 rounded-full shadow-sm">
            <button 
              onClick={() => updateSettings({ language: 'en' })}
              className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", language === 'en' ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-slate-400 hover:text-slate-600")}
            >
              EN
            </button>
            <button 
              onClick={() => updateSettings({ language: 'es' })}
              className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", language === 'es' ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-slate-400 hover:text-slate-600")}
            >
              ES
            </button>
            <button 
              onClick={() => updateSettings({ language: 'bn' })}
              className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", language === 'bn' ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" : "text-slate-400 hover:text-slate-600")}
            >
              BN
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('sales')}
            className="md-btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            {t.newEntry}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="surface-container overflow-hidden p-8"
        >
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="flex-1">
              <span className="stat-label mb-2 block">{t.monthlyPerformance}</span>
              <div className="flex items-end gap-3">
                <h3 className="text-5xl font-black font-display tracking-tight text-brand-primary">
                  {Math.round(Math.min(100, ((totals?.monthlyTotalAchieved || 0) / (monthlyTarget || 1)) * 100))}%
                </h3>
                <span className="text-slate-400 font-bold mb-2 uppercase text-[10px] tracking-widest">{t.targetReached}</span>
              </div>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="stat-label mb-1">{t.totalDebit}</p>
                  <p className={cn("font-bold text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>{formatCurrency(totals?.monthlyTotalAchieved || 0, currency)}</p>
                </div>
                <div>
                  <p className="stat-label mb-1">{t.cash}</p>
                  <p className={cn("font-bold text-emerald-600", redEyeActive && "blur-sm")}>{formatCurrency(totals?.totalCashSaleCurrentMonth || 0, currency)}</p>
                </div>
                <div>
                  <p className="stat-label mb-1">{t.credit}</p>
                  <p className={cn("font-bold text-rose-600", redEyeActive && "blur-sm")}>{formatCurrency(totals?.totalCreditSaleCurrentMonth || 0, currency)}</p>
                </div>
                <div>
                  <p className="stat-label mb-1">{t.cheque}</p>
                  <p className={cn("font-bold text-brand-primary", redEyeActive && "blur-sm")}>{formatCurrency(totals?.totalChequeSaleCurrentMonth || 0, currency)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center md:items-end gap-4">
              <button 
                onClick={() => setActiveTab('myProgress')}
                className="md-btn-primary flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                {t.dailyOperations}
              </button>
              <p className="stat-label">
                {t.manageSalesExpenses}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title={t.activeRevenue} 
          value={formatCurrency(totals?.monthlyTotalAchieved || 0, currency)} 
          icon={DollarSign} 
          color="bg-brand-primary"
          language={language}
          delay={0.2}
          redEyeActive={redEyeActive}
        />
        <StatCard 
          title={t.activeCredit} 
          value={formatCurrency(totals?.totalOutstanding || 0, currency)} 
          icon={Wallet} 
          color="bg-brand-secondary"
          language={language}
          delay={0.3}
          onClick={() => setActiveTab('myProgress')}
          redEyeActive={redEyeActive}
        />
        <StatCard 
          title={t.activeCustomers} 
          value={totalCustomers || 0} 
          icon={Users} 
          color="bg-brand-tertiary"
          language={language}
          onClick={() => setActiveTab('customers')}
          delay={0.4}
          redEyeActive={false} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales by Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 surface-container p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-xl">{t.areaPerformance}</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-primary" />
                <span className="stat-label">{t.creditSale || 'Sales'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span className="stat-label">{t.collection}</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E1E5" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#938F99', fontSize: 11, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#938F99', fontSize: 11, fontWeight: 700 }} 
                  tickFormatter={(val) => `${currency} ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#F3EDF7', radius: 10 }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', 
                    backgroundColor: '#2B2930',
                    color: '#fff',
                    padding: '16px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ marginBottom: '4px', opacity: 0.6, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                />
                <Bar dataKey="debit" name="Sales" fill="#6750A4" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="credit" name="Collection" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Balance Distribution Pie Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          className="surface-container p-8"
        >
          <h3 className="font-display font-bold text-xl mb-8">{t.marketDebtDistribution}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={areaData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="balance"
                >
                  {(areaData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', 
                    backgroundColor: '#2B2930',
                    color: '#fff',
                    padding: '16px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
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
              <span className="stat-label text-indigo-200">{t.achievementGoal}</span>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mt-1">{t.status || 'Status'}</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{t.remainingToTarget}</p>
                <p className={cn("text-lg font-black", redEyeActive && "blur-sm")}>
                  {formatCurrency(totals?.targetRemaining || 0, currency)}
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">{t.monthlyTarget}</p>
                  <p className={cn("text-xl font-black", redEyeActive && "blur-sm")}>{formatCurrency(monthlyTarget, currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">{t.achieved}</p>
                  <p className={cn("text-xl font-black text-emerald-300", redEyeActive && "blur-sm")}>{formatCurrency(totals?.monthlyTotalAchieved || 0, currency)}</p>
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
          className="surface-container p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-xl">{t.recentTransactions}</h3>
            <button 
              onClick={() => setActiveTab('reports')}
              className="text-xs font-black uppercase tracking-widest text-brand-primary hover:underline"
            >
              {t.seeAll}
            </button>
          </div>
          <div className="space-y-4">
            {recentSales?.map((sale, i) => {
              const customer = customers?.find(c => String(c.id) === String(sale.customerId));
              return (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-[#FEF7FF] dark:bg-[#1C1B1F] rounded-2xl border border-black/5 dark:border-white/5 group transition-all hover:brightness-105">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                      sale.creditSale > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {sale.creditSale > 0 ? <ArrowDownRight className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#1D1B20] dark:text-[#E6E1E5] group-hover:text-brand-primary transition-colors">
                        {customer?.name || t.unknownCustomer}
                      </h4>
                      <p className="stat-label">{new Date(sale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-black text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>
                      {formatCurrency(sale.totalAmount || ((sale.cashSale || 0) + (sale.chequeSale || 0) + (sale.creditSale || 0)), currency)}
                    </p>
                    <p className="stat-label">
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-[#F3EDF7] dark:bg-[#3B383E] rounded-[2.5rem] border border-black/5 dark:border-white/5 p-8"
        >
          <h3 className="font-display font-bold text-xl text-brand-primary mb-6 uppercase tracking-tight">{t.smartInsights}</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-[1.25rem] bg-white dark:bg-[#1D1B20] flex items-center justify-center shrink-0 shadow-soft border border-black/5">
                <Users className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#1D1B20] dark:text-[#E6E1E5] uppercase tracking-tight">{t.customerRetention}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  You have <span className="font-black text-brand-primary">{totals?.creditCustomersCount}</span> customers with outstanding balances. Following up could recover up to <span className={cn("font-black text-brand-primary", redEyeActive && "blur-sm")}>{formatCurrency(totals?.totalOutstanding || 0, currency)}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-[1.25rem] bg-white dark:bg-[#1D1B20] flex items-center justify-center shrink-0 shadow-soft border border-black/5">
                <TrendingUp className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#1D1B20] dark:text-[#E6E1E5] uppercase tracking-tight">{t.salesOutlook}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Your sales performance is currently <span className="font-black text-brand-primary">{totals?.salesTrend > 0 ? 'up' : 'down'} {Math.abs(totals?.salesTrend || 0)}%</span> compared to last month.
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
