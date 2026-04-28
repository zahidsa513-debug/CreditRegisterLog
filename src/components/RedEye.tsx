import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { 
  Eye, 
  Plus, 
  Calendar, 
  FileText, 
  Copy, 
  Check as CheckIcon, 
  Bell, 
  Trash2, 
  Clock, 
  TrendingUp,
  Building2,
  DollarSign,
  User,
  X,
  Image as ImageIcon,
  Download,
  Camera,
  Edit2,
  Database
} from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Check } from '../types';
import { format, isTomorrow, isPast, isValid } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const RedEye = ({ language, currency }: { language: 'en' | 'bn', currency: string }) => {
  const t = translations[language];
  const checks = useLiveQuery(() => db.checks.orderBy('dueDate').toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const companySettings = useLiveQuery(() => db.settings.toArray());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
  const [editingCheckId, setEditingCheckId] = useState<number | null>(null);
  const [newCheck, setNewCheck] = useState<Partial<Check>>({
    checkNumber: '',
    bankName: '',
    amount: 0,
    dueDate: new Date(),
    notes: '',
    isCleared: false,
    customerId: undefined,
    customerName: '',
    imageUrl: ''
  });
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTop, setSearchTop] = useState('');
  const [searchOutstanding, setSearchOutstanding] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCheck(prev => ({ ...prev, imageUrl: reader.result as string }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    if (!pdfRef.current || !selectedCheck) return;
    
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Check_Details_${selectedCheck.checkNumber}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
    }
  };

  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCheck.imageUrl) {
      alert(language === 'en' ? 'Check image is required!' : 'চেকের ছবি আবশ্যক!');
      return;
    }

    if (newCheck.checkNumber && newCheck.bankName && newCheck.dueDate) {
      const selectedCustomerObj = customers?.find(c => c.id === Number(newCheck.customerId));
      const checkData = {
        ...newCheck,
        customerName: selectedCustomerObj ? selectedCustomerObj.name : (newCheck.customerName || ''),
        updatedAt: new Date(),
        userId: 'current-user'
      };

      if (editingCheckId) {
        await db.checks.update(editingCheckId, checkData);
      } else {
        await db.checks.add({
          ...checkData,
          createdAt: new Date(),
          isCleared: false
        } as Check);
      }
      
      closeModal();
    }
  };

  const openEditModal = (check: Check) => {
    setEditingCheckId(Number(check.id));
    setNewCheck({
      ...check,
      dueDate: new Date(check.dueDate)
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCheckId(null);
    setNewCheck({
      checkNumber: '',
      bankName: '',
      amount: 0,
      dueDate: new Date(),
      notes: '',
      isCleared: false,
      customerId: undefined,
      customerName: '',
      imageUrl: ''
    });
  };

  const openDetails = (check: Check) => {
    setSelectedCheck(check);
    setIsDetailsModalOpen(true);
  };

  const copyToClipboard = (check: Check) => {
    const text = `Check No: ${check.checkNumber}\nBank: ${check.bankName}\nCustomer: ${check.customerName || 'N/A'}\nAmount: ${formatCurrency(check.amount, currency)}\nDue: ${format(new Date(check.dueDate), 'dd/MM/yyyy')}\nNotes: ${check.notes || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(check.id?.toString() || null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCleared = async (id: number, current: boolean) => {
    await db.checks.update(id, { isCleared: !current });
  };

  const deleteCheck = async (id: number) => {
    if (confirm(language === 'en' ? 'Are you sure you want to delete this entry?' : 'আপনি কি এই এন্ট্রিটি ডিলিট করতে নিশ্চিত?')) {
      await db.checks.delete(id);
    }
  };

  const getCustomerAging = (customerId: number) => {
    const customerSales = sales?.filter(s => s.customerId === customerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
    if (customerSales.length === 0) return { lastDate: null, days: 0, lastAmount: 0 };
    const lastSale = customerSales[0];
    const diff = Math.floor((new Date().getTime() - new Date(lastSale.date).getTime()) / (1000 * 60 * 60 * 24));
    return { lastDate: lastSale.date, days: diff, lastAmount: lastSale.totalAmount || 0 };
  };

  const topCreditHolders = customers 
    ? [...customers]
        .filter(c => c.name.toLowerCase().includes(searchTop.toLowerCase()) || (c.shopName || '').toLowerCase().includes(searchTop.toLowerCase()))
        .map(c => ({ ...c, ...getCustomerAging(Number(c.id)), balance: (c.debit || 0) - (c.credit || 0) }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5) 
    : [];

  const longestCreditHolders = customers 
    ? [...customers]
        .filter(c => c.name.toLowerCase().includes(searchOutstanding.toLowerCase()) || (c.shopName || '').toLowerCase().includes(searchOutstanding.toLowerCase()))
        .map(c => ({ ...c, ...getCustomerAging(Number(c.id)), balance: (c.debit || 0) - (c.credit || 0) }))
        .filter(c => c.balance > 0)
        .sort((a, b) => b.days - a.days)
        .slice(0, 5) 
    : [];

  const upcomingChecks = checks?.filter(c => !c.isCleared && isTomorrow(new Date(c.dueDate)));

  return (
    <div className="space-y-8 pb-12">
      {/* Red Eye Dashboard Header */}
      <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <Eye className="w-8 h-8 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                {language === 'en' ? 'RED EYE' : 'রেড আই'} 
                <span className="ml-3 text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30 tracking-[0.2em] uppercase font-bold">
                  Surveillance Active
                </span>
              </h2>
              <p className="text-slate-400 mt-1 text-sm font-medium">Risk assessment and credit monitoring dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right mr-4 border-r border-white/10 pr-6">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pending Checks</p>
              <p className="text-2xl font-mono font-bold text-white leading-none mt-1">
                {checks?.filter(c => !c.isCleared).length || 0}
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              {language === 'en' ? 'Issue New Check' : 'নতুন চেক ইস্যু'}
            </button>
          </div>
        </div>

        {/* Global Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/5">
          {[
            { label: 'Hot Zone Exposure', value: formatCurrency(topCreditHolders.reduce((acc, c) => acc + c.balance, 0), currency), icon: TrendingUp, color: 'text-rose-400' },
            { label: 'Upcoming Clearances', value: upcomingChecks?.length || 0, icon: Clock, color: 'text-indigo-400' },
            { label: 'Alert Level', value: 'Elevated', icon: Bell, color: 'text-amber-400' },
            { label: 'Active Registry', value: checks?.length || 0, icon: FileText, color: 'text-emerald-400' }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</span>
              <div className="flex items-center gap-2">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-lg font-bold text-white tracking-tight">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {upcomingChecks && upcomingChecks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-4 rounded-[2rem] flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              {language === 'en' ? 'Check Due Alert!' : 'চেক পেমেন্ট এলার্ট!'}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {language === 'en' 
                ? `You have ${upcomingChecks.length} check(s) passing tomorrow.` 
                : `আগামীকাল আপনার ${upcomingChecks.length}টি চেক পাশ হবে।`}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Credit Holders - Hot Zone 1 */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Top Credit Holders' : 'শীর্ষ বকেয়াধারী'}
                </h3>
                <p className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-widest">Highest Balances</p>
              </div>
            </div>
            <div className="relative w-40">
              <input 
                type="text" 
                placeholder={language === 'en' ? 'Filter...' : 'ফিল্টার...'}
                value={searchTop}
                onChange={e => setSearchTop(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs border border-rose-200 dark:border-rose-900 focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <TrendingUp className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          
          <div className="p-2 flex-1">
            <div className="space-y-1">
              {topCreditHolders.map((customer, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={customer.id} 
                  className={cn(
                    "p-4 rounded-2xl flex items-center justify-between group transition-all",
                    idx === 0 ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                      idx === 0 ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    )}>
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{customer.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">{customer.shopName || 'Individual'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-rose-500">{customer.days} Days Since Last Billing</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-lg font-bold font-mono tracking-tight", idx === 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
                      {formatCurrency(customer.balance, currency)}
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                         {customer.lastDate ? format(new Date(customer.lastDate), 'dd/MM/yyyy') : 'Never'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Highest Outstanding - Concentration Risk */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Longest Pending' : 'দীর্ঘকাল বকেয়াধারী'}
                </h3>
                <p className="text-[10px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-widest">Aged Receivables</p>
              </div>
            </div>
            <div className="relative w-40">
              <input 
                type="text" 
                placeholder={language === 'en' ? 'Filter...' : 'ফিল্টার...'}
                value={searchOutstanding}
                onChange={e => setSearchOutstanding(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs border border-amber-200 dark:border-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          
          <div className="p-2 flex-1">
            <div className="space-y-1">
              {longestCreditHolders.map((customer, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={customer.id} 
                  className="p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-amber-100 dark:hover:border-amber-900/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center border border-amber-100 dark:border-amber-900/50 shrink-0">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">{customer.days}</span>
                      <span className="text-[8px] font-bold text-amber-500/50 uppercase">Days</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Last bill: {customer.lastDate ? format(new Date(customer.lastDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-md font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(customer.balance, currency)}
                    </p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <p className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Action Required</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Check Registry Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Active Check Registry</h3>
              <p className="text-sm text-slate-500 font-medium">Unified record of all incoming and pending clearances</p>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {checks?.map((check) => (
              <motion.div 
                layout
                key={check.id}
                className={cn(
                  "group relative bg-white dark:bg-slate-900 rounded-3xl border transition-all p-5",
                  check.isCleared ? "opacity-60 border-slate-100 dark:border-slate-800 grayscale" : "border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1"
                )}
              >
                {!check.isCleared && (
                  <div className={cn(
                    "absolute -top-px -left-px h-1 rounded-full transition-all",
                    isPast(new Date(check.dueDate)) ? "bg-rose-500 w-full" : "bg-indigo-500 w-1/3 group-hover:w-full"
                  )} />
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden border border-indigo-100 dark:border-indigo-900/50">
                      {check.imageUrl ? (
                        <img 
                          src={check.imageUrl} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" 
                          alt="Check"
                          onClick={() => openDetails(check)}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Building2 className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[120px]">{check.customerName || 'No Customer'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-widest">
                        {check.bankName}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    check.isCleared ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {check.isCleared ? 'Cleared' : 'Pending'}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 leading-none">Amount</p>
                      <p className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                        {formatCurrency(check.amount, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 leading-none">Due Date</p>
                      <p className={cn(
                        "text-sm font-bold",
                        !check.isCleared && isPast(new Date(check.dueDate)) ? "text-rose-500" : "text-slate-600 dark:text-slate-400"
                      )}>
                        {format(new Date(check.dueDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono p-1 bg-slate-50 dark:bg-slate-800 rounded border dark:border-slate-700 text-slate-500 italic">#{check.checkNumber}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openDetails(check)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                      title="View Details"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEditModal(check)}
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                      title="Edit Check"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => copyToClipboard(check)}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                      title="Copy Info"
                    >
                      {copiedId === check.id?.toString() ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => deleteCheck(Number(check.id))}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={() => toggleCleared(Number(check.id), check.isCleared)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95",
                      check.isCleared ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm"
                    )}
                  >
                    {check.isCleared ? 'Reopen' : 'Clear Check'}
                  </button>
                </div>
              </motion.div>
            ))}
            {(!checks || checks.length === 0) && (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                No active checks in registry.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedCheck && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl relative my-auto border border-slate-200 dark:border-slate-800">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-display font-bold">{language === 'en' ? 'Check Details' : 'চেকের বিস্তারিত'}</h3>
               <div className="flex gap-2">
                 <button 
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                 >
                   <Download className="w-4 h-4" />
                   {language === 'en' ? 'Download PDF' : 'পিডিএফ ডাউনলোড'}
                 </button>
                 <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                   <X className="w-6 h-6 text-slate-300" />
                 </button>
               </div>
             </div>

             <div ref={pdfRef} className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
               {/* PDF Content */}
               <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-indigo-600 uppercase">
                      {companySettings?.[0]?.companyName || 'Credit Registry'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1">Check Memo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1">Ref: #{selectedCheck.id}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Bank Name</label>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCheck.bankName}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Check Number</label>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">#{selectedCheck.checkNumber}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Issued To/From</label>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCheck.customerName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Due Date</label>
                      <div className="flex items-center justify-end gap-2 text-rose-500 font-black text-lg">
                        <Calendar className="w-5 h-5" />
                        {format(new Date(selectedCheck.dueDate), 'dd MMM, yyyy')}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Amount</label>
                      <p className="text-3xl font-black text-indigo-600">{formatCurrency(selectedCheck.amount, currency)}</p>
                    </div>
                  </div>
               </div>

               <div className="mb-8">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Check Copy</label>
                 <div className="w-full aspect-video rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    {selectedCheck.imageUrl ? (
                      <img src={selectedCheck.imageUrl} alt="Check Copy" className="w-full h-full object-contain" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        No Image Available
                      </div>
                    )}
                 </div>
               </div>

               {selectedCheck.notes && (
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Notes</label>
                   <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{selectedCheck.notes}"</p>
                 </div>
               )}
               
               <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated via Credit Registry App</p>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Add/Edit Check Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-display font-bold">
                  {editingCheckId ? (language === 'en' ? 'Edit Check' : 'চেক ইডিট করুন') : (language === 'en' ? 'Issue Check' : 'চেক ইস্যু করুন')}
                </h3>
                <p className="text-slate-400 text-sm">{language === 'en' ? 'Record or update a check note' : 'চেক নোট রেকর্ড বা আপডেট করুন'}</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl">
                 <X className="w-6 h-6 text-slate-300" />
              </button>
            </div>

            <form onSubmit={handleAddCheck} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Check Number' : 'চেক নাম্বার'}</label>
                   <input 
                     required
                     type="text"
                     value={newCheck.checkNumber}
                     onChange={e => setNewCheck({...newCheck, checkNumber: e.target.value})}
                     className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                     placeholder="#001122"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Bank Name' : 'ব্যাংকের নাম'}</label>
                   <div className="relative">
                     <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                     <input 
                       required
                       type="text"
                       value={newCheck.bankName}
                       onChange={e => setNewCheck({...newCheck, bankName: e.target.value})}
                       className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                       placeholder="IBBL / City Bank"
                     />
                   </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Amount' : 'পরিমাণ'}</label>
                   <input 
                     required
                     type="number"
                     value={newCheck.amount}
                     onChange={e => setNewCheck({...newCheck, amount: Number(e.target.value)})}
                     className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-black"
                     placeholder="0.00"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Due Date' : 'তারিখ'}</label>
                   <div className="relative">
                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                     <input 
                       required
                       type="date"
                       className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold appearance-none dark:[color-scheme:dark]"
                       onChange={e => {
                         const date = new Date(e.target.value);
                         if (isValid(date)) setNewCheck({...newCheck, dueDate: date});
                       }}
                       value={newCheck.dueDate instanceof Date && !isNaN(newCheck.dueDate.getTime()) ? newCheck.dueDate.toISOString().split('T')[0] : ''}
                     />
                   </div>
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Customer' : 'কাস্টমার'}</label>
                 <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <select 
                     value={newCheck.customerId || ''}
                     onChange={e => {
                        const cid = Number(e.target.value);
                        const cust = customers?.find(c => c.id === cid);
                        setNewCheck({...newCheck, customerId: cid, customerName: cust?.name || ''});
                     }}
                     className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold appearance-none cursor-pointer"
                   >
                     <option value="">{language === 'en' ? 'Select Customer' : 'কাস্টমার সিলেক্ট করুন'}</option>
                     {customers?.map(c => (
                       <option key={c.id} value={c.id}>{c.name} ({c.shopName || 'N/A'})</option>
                     ))}
                   </select>
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'en' ? 'Check Image (Required)' : 'চেকের ছবি (আবশ্যক)'}</label>
                 <div className="flex gap-4">
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="flex-1 h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition overflow-hidden relative group"
                   >
                     {newCheck.imageUrl ? (
                       <>
                         <img src={newCheck.imageUrl} className="w-full h-full object-cover" alt="Check" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                         </div>
                       </>
                     ) : (
                       <>
                         {isUploading ? (
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                         ) : (
                           <>
                             <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click to Upload</span>
                           </>
                         )}
                       </>
                     )}
                   </div>
                   <input 
                     type="file" 
                     ref={fileInputRef}
                     onChange={handleImageUpload}
                     className="hidden" 
                     accept="image/*"
                   />
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   type="button"
                   onClick={closeModal}
                   className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold transition active:scale-95"
                 >
                   {t.cancel}
                 </button>
                 <button 
                   type="submit"
                   className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 dark:shadow-none transition active:scale-95"
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

export default RedEye;
