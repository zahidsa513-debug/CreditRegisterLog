import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  Upload, 
  Filter, 
  FileSpreadsheet, 
  Table as TableIcon,
  ChevronDown,
  Mail,
  Share2,
  Printer,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Sale, Language } from '../types';
import { trackFeatureUsage } from '../lib/analytics';
import { generateSmartSummary } from '../services/geminiService';

import { useSettings } from '../context/SettingsContext';

const Reports = ({ setActiveTab, setEditingSale, redEyeActive }: { setActiveTab?: (tab: string) => void, setEditingSale?: (sale: Sale | null) => void, redEyeActive?: boolean }) => {
  const { language, currency } = useSettings();
  const t = translations[language];
  const areas = useLiveQuery(() => db.areas.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      // Prepare compact data for AI analysis
      const summaryData = {
        totalCustomers: customers?.length || 0,
        totalOutstanding: customers?.reduce((acc, c) => acc + (c.debit - c.credit), 0) || 0,
        areaSummary: areas?.map(a => {
          const areaCustomers = customers?.filter(c => String(c.areaId) === String(a.id)) || [];
          return {
            name: a.name,
            customerCount: areaCustomers.length,
            outstanding: areaCustomers.reduce((acc, c) => acc + (c.debit - c.credit), 0)
          };
        }),
        recentTransactions: sales?.slice(-10).map(s => ({
          type: s.type,
          amount: (s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0),
          date: s.date
        }))
      };

      const result = await generateSmartSummary(summaryData);
      setAiSummary(result || "No summary generated.");
      trackFeatureUsage('ai_summary_generated');
    } catch (err) {
      console.error(err);
      setAiError(language === 'en' ? 'Failed to generate AI summary. Please try again.' : 'AI সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const calculateAge = (date: Date | string) => {
    const start = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredSales = sales?.filter(s => {
    if (s.type === 'direct') return false;
    const customer = customers?.find(c => String(c.id) === String(s.customerId));
    const sDate = new Date(s.date).toISOString().split('T')[0];
    const dateMatch = (!dateRange.start || sDate >= dateRange.start) && (!dateRange.end || sDate <= dateRange.end);
    const areaMatch = selectedArea === 'all' || String(customer?.areaId) === String(selectedArea);
    const customerMatch = selectedCustomer === 'all' || String(s.customerId) === String(selectedCustomer);
    return dateMatch && areaMatch && customerMatch;
  });

  const printPDF = async () => {
    const doc = new jsPDF();
    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: '',
      logo: ''
    };

    // Header Pad
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');
    
    let textX = 14;
    
    // Add Logo if exists
    if (company.logo) {
      try {
        doc.addImage(company.logo, 'PNG', 14, 8, 24, 24);
        textX = 42;
      } catch (err) {
        console.error('Failed to add logo to PDF:', err);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text(company.companyName.toUpperCase(), textX, 15);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let headerY = 22;
    if (company.address) {
      doc.text(company.address, textX, headerY);
      headerY += 5;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, textX, headerY);
      headerY += 5;
    }
    if (company.website) {
      doc.text(company.website, textX, headerY);
    }

    const title = language === 'en' ? 'Customer Credit Summary' : 'কাস্টমার ক্রেডিট সংক্ষিপ্ত বিবরণ';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 14, 50);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 56);

    const tableData = customers?.map(c => {
      const area = areas?.find(a => String(a.id) === String(c.areaId));
      return [
        c.name,
        area?.name || 'N/A',
        formatCurrency(c.debit, currency),
        formatCurrency(c.credit, currency),
        formatCurrency(c.debit - c.credit, currency)
      ];
    });

    autoTable(doc, {
      startY: 62,
      head: [[t.customers, t.areas, t.totalDebit, t.totalCredit, t.balance]],
      body: tableData || [],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Credit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    trackFeatureUsage('report_pdf_generated');
  };
  
  const generateMasterAreaReport = async () => {
    const doc = new jsPDF();
    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList[0] || { companyName: 'CREDIT REGISTRY PRO' };
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('MASTER AREA AUDIT REPORT', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Official Environmental Registry | ${new Date().toLocaleString()}`, 105, 35, { align: 'center' });

    let currentY = 55;

    const targetAreas = ['Kapar', 'Klang', 'Shah Alam'];
    
    for (const areaName of targetAreas) {
      const area = areas?.find(a => a.name === areaName);
      if (!area) continue;

      const areaCustomers = customers?.filter(c => String(c.areaId) === String(area.id)) || [];
      const areaDebit = areaCustomers.reduce((acc, c) => acc + (c.debit || 0), 0);
      const areaCredit = areaCustomers.reduce((acc, c) => acc + (c.credit || 0), 0);
      const areaBalance = areaDebit - areaCredit;

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`AREA: ${area.name.toUpperCase()}`, 14, currentY);
      
      const areaSummaryData = [
        ['Metric', 'Value'],
        ['Number of Customers', areaCustomers.length.toString()],
        ['Total Sales Volume', formatCurrency(areaDebit, currency)],
        ['Total Cash Receipts', formatCurrency(areaCredit, currency)],
        ['Outstanding Balance', formatCurrency(areaBalance, currency)],
      ];

      autoTable(doc, {
        startY: currentY + 5,
        head: [['PERFORMANCE METRIC', 'FINANCIAL VALUE']],
        body: areaSummaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    }

    doc.save(`Master_Area_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    trackFeatureUsage('report_master_area_generated');
  };

  const handleEditDailySale = (sale: Sale) => {
    const confirmMsg = language === 'en' 
      ? 'Are you sure you want to edit this entry?' 
      : 'আপনি কি এই এন্ট্রিটি ইডিট করতে নিশ্চিত?';
    
    if (window.confirm(confirmMsg)) {
      if (setActiveTab && setEditingSale) {
        setEditingSale(sale);
        setActiveTab('sales');
      }
    }
  };

  const handleDeleteDailySale = async (id: number) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await db.sales.delete(deleteId);
        setIsDeleting(false);
        setDeleteId(null);
      } catch (error) {
        console.error("Failed to delete sale:", error);
      }
    }
  };

  const handlePrintDailySales = async () => {
    const list = sales?.filter(s => {
      const sDate = new Date(s.date).toISOString().split('T')[0];
      return s.type === 'direct' && 
        (!dateRange.start || sDate >= dateRange.start) && 
        (!dateRange.end || sDate <= dateRange.end);
    }) || [];
    if (list.length === 0) return;

    const doc = new jsPDF();
    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: '',
      logo: ''
    };

    // Header Pad
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');
    
    let textX = 14;
    
    // Add Logo if exists
    if (company.logo) {
      try {
        doc.addImage(company.logo, 'PNG', 14, 8, 24, 24);
        textX = 42;
      } catch (err) {
        console.error('Failed to add logo to PDF:', err);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text(company.companyName.toUpperCase(), textX, 15);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let headerY = 22;
    if (company.address) {
      doc.text(company.address, textX, headerY);
      headerY += 5;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, textX, headerY);
      headerY += 5;
    }
    if (company.website) {
      doc.text(company.website, textX, headerY);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(language === 'en' ? 'Daily Sales Report' : 'দৈনিক বিক্রির রিপোর্ট', 105, 50, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${language === 'en' ? 'Date range' : 'তারিখ সীমা'}: ${dateRange.start || 'Start'} - ${dateRange.end || 'End'}`, 105, 56, { align: 'center' });

    autoTable(doc, {
      startY: 65,
      head: [[t.date, t.description, language === 'en' ? 'Invoice' : 'ইনভয়েস', t.cash]],
      body: list.map(s => [
        new Date(s.date).toLocaleDateString(),
        s.description || 'N/A',
        s.invoiceNumber || 'N/A',
        formatCurrency(s.cashSale || 0, currency)
      ]),
      foot: [[
        { content: language === 'en' ? 'Total' : 'মোট', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatCurrency(list.reduce((acc, s) => acc + (s.cashSale || 0), 0), currency), styles: { fontStyle: 'bold' } }
      ]]
    });

    doc.save(`Daily_Sales_${new Date().toISOString().split('T')[0]}.pdf`);
    trackFeatureUsage('report_daily_sales_printed');
  };

  const exportToExcel = () => {
    const data = customers?.map(c => {
      const area = areas?.find(a => a.id === c.areaId);
      return {
        'Customer Name': c.name,
        'Phone': c.phone,
        'Area': area?.name || 'N/A',
        'Total Debit': c.debit,
        'Total Credit': c.credit,
        'Outstanding Balance': c.debit - c.credit
      };
    });

    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Report');
    XLSX.writeFile(wb, `CreditRegistry_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    trackFeatureUsage('report_excel_exported');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Basic import logic (would need area ID mapping in production)
      console.log('Imported Data:', data);
      alert(language === 'en' ? 'Excel data parsed! (Check console)' : 'এক্সেল ডাটা পার্স করা হয়েছে!');
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-bold tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]">{t.reports}</h2>
          <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest opacity-80">{language === 'en' ? 'Export data and generate insights' : 'ডেটা রপ্তানি করুন এবং অন্তর্দৃষ্টি তৈরি করুন'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleGenerateAiSummary}
            disabled={isGeneratingAi}
            className="px-6 py-2.5 bg-[#4F378B] text-[#EADDFF] rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-black/10 flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {language === 'en' ? 'Smart Summary' : 'স্মার্ট সারসংক্ষেপ'}
          </button>
          <button 
            onClick={generateMasterAreaReport}
            className="px-6 py-2.5 bg-brand-tertiary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-black/10 flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {language === 'en' ? 'Master Area Report' : 'মাস্টার এরিয়া রিপোর্ট'}
          </button>
          <button 
            onClick={printPDF}
            className="md-btn-primary px-6 py-2.5 rounded-full text-xs"
          >
            <Printer className="w-4 h-4" />
            {t.printReport}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {aiSummary && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#EADDFF] dark:bg-[#2B2930] rounded-[2.5rem] border border-[#D0BCFF] p-10 relative overflow-hidden shadow-soft"
          >
            <div className="absolute top-0 right-0 p-6">
              <button 
                onClick={() => setAiSummary(null)}
                className="p-3 bg-white/50 hover:bg-white rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-[#6750A4] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-black text-[#21005D] dark:text-[#EADDFF] mb-4 flex items-center gap-3">
                  {language === 'en' ? 'AI Business Insights' : 'AI বিজনেস ইনসাইটস'}
                </h3>
                <div className="prose prose-sm prose-indigo max-w-none prose-p:leading-relaxed prose-li:my-2 text-[#1D1B20] dark:text-[#E6E1E5]">
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {aiError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl border border-rose-100 text-sm font-medium flex items-center gap-3"
        >
          <X className="w-4 h-4 cursor-pointer" onClick={() => setAiError(null)} />
          {aiError}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="surface-container p-6 space-y-6 shadow-soft">
            <h4 className="stat-label flex items-center gap-2 text-brand-primary">
              <Filter className="w-4 h-4" /> Filter Options
            </h4>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="stat-label">Select Area</label>
                <div className="relative">
                  <select 
                    value={selectedArea}
                    onChange={e => setSelectedArea(e.target.value)}
                    className="w-full px-5 py-3 bg-[#F3EDF7] dark:bg-[#2B2930] border-none rounded-2xl outline-none appearance-none font-bold text-xs"
                  >
                    <option value="all">All Areas</option>
                    {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="stat-label">Select Customer</label>
                <div className="relative">
                  <select 
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    className="w-full px-5 py-3 bg-[#F3EDF7] dark:bg-[#2B2930] border-none rounded-2xl outline-none appearance-none font-bold text-xs"
                  >
                    <option value="all">All Customers</option>
                    {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="stat-label">Start Date</label>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-5 py-3 bg-[#F3EDF7] dark:bg-[#2B2930] border-none rounded-2xl outline-none font-bold text-xs" 
                />
              </div>

              <div className="space-y-2">
                <label className="stat-label">End Date</label>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-5 py-3 bg-[#F3EDF7] dark:bg-[#2B2930] border-none rounded-2xl outline-none font-bold text-xs" 
                />
              </div>

              <button className="w-full py-4 bg-[#1D1B20] text-white rounded-full font-black text-xs mt-2 active:scale-95 transition-transform uppercase tracking-widest shadow-lg shadow-black/20">
                Apply Filters
              </button>
            </div>
          </div>
          
          <div className="bg-[#1D1B20] p-8 rounded-[2rem] text-white shadow-xl">
            <Share2 className="w-7 h-7 mb-4 text-[#D0BCFF]" />
            <h4 className="font-bold text-lg leading-tight">Instant Reports</h4>
            <p className="text-slate-400 text-[11px] mt-3 leading-relaxed font-bold uppercase tracking-wide opacity-70">Share PDF invoices or collection reports via WhatsApp automatically.</p>
            <button className="w-full py-3.5 bg-[#6750A4] text-white rounded-full font-black text-[11px] mt-6 hover:bg-[#4F378B] transition uppercase tracking-widest">
              Share Now
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-3 space-y-8">
          <div className="surface-container overflow-hidden shadow-soft">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/5">
              <h4 className="stat-label">
                {language === 'en' ? 'Transaction Age Report' : 'বকেয়া বয়স রিপোর্ট'}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 text-left">
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Customer' : 'কাস্টমার'}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Bill - Receipt' : 'বিল - রিসিট'}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Date' : 'তারিখ'}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Age (Days)' : 'বয়স (দিন)'}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Amount' : 'পরিমাণ'}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Type' : 'ধরণ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredSales?.map((s, i) => {
                    const customer = customers?.find(c => String(c.id) === String(s.customerId));
                    const age = calculateAge(s.date);
                    return (
                      <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className={cn("px-6 py-4 text-sm font-black text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>{customer?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-black tracking-widest">{s.invoiceNumber || s.receiptNumber || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            age > 30 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {age} {language === 'en' ? 'Days' : 'দিন'}
                          </span>
                        </td>
                        <td className={cn("px-6 py-4 text-sm font-black text-brand-primary", redEyeActive && "blur-sm")}>
                          {formatCurrency(s.cashSale + s.chequeSale + s.creditSale, currency)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-current bg-opacity-10",
                            s.type === 'sale' ? "bg-[#4F378B] text-[#4F378B]" : "bg-emerald-600 text-emerald-600"
                          )}>
                            {s.type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!filteredSales || filteredSales.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-bold italic">
                        {language === 'en' ? 'No transactions found for current filters' : 'ফিল্টার অনুযায়ী কোনো লেনদেন পাওয়া যায়নি'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between mt-10 bg-[#EADDFF] dark:bg-[#4F378B] bg-opacity-20">
              <h4 className="stat-label text-[#21005D] dark:text-[#EADDFF]">
                {language === 'en' ? 'Daily Sales Report (Non-Credit)' : 'দৈনিক বিক্রি রিপোর্ট (নন-ক্রেডিট)'}
              </h4>
              <button
                onClick={handlePrintDailySales}
                className="flex items-center gap-2 px-5 py-2 bg-white dark:bg-[#1D1B20] hover:brightness-95 rounded-full text-xs font-black transition-all border border-black/5"
              >
                <Printer className="w-4 h-4" />
                {language === 'en' ? 'Print' : 'প্রিন্ট'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 text-left">
                    <th className="px-6 py-4 stat-label">{t.date}</th>
                    <th className="px-6 py-4 stat-label">{t.description}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Invoice' : 'ইনভয়েস'}</th>
                    <th className="px-6 py-4 stat-label">{t.cash}</th>
                    <th className="px-6 py-4 stat-label">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {sales?.filter(s => {
                    const sDate = new Date(s.date).toISOString().split('T')[0];
                    return s.type === 'direct' && 
                      (!dateRange.start || sDate >= dateRange.start) && 
                      (!dateRange.end || sDate <= dateRange.end);
                  }).map((s) => (
                    <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-black text-[#1D1B20] dark:text-[#E6E1E5] capitalize">{s.description || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-black tracking-widest">{s.invoiceNumber || 'N/A'}</td>
                      <td className={cn("px-6 py-4 text-sm font-black text-brand-primary", redEyeActive && "blur-sm")}>
                        {formatCurrency(s.cashSale, currency)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDailySale(s);
                            }}
                            className="p-3 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-full transition-all active:scale-95 translate-y-0"
                            title={language === 'en' ? 'Edit' : 'এডিট'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDailySale(s.id!);
                            }}
                            className="p-3 text-rose-600 bg-rose-100 hover:bg-rose-200 rounded-full transition-all active:scale-95"
                            title={language === 'en' ? 'Delete' : 'ডিলিট'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-black/5 dark:bg-white/5">
                  <tr>
                    <td colSpan={3} className="px-6 py-5 stat-label text-right">{language === 'en' ? 'Total Daily Sales' : 'মোট দৈনিক বিক্রি'}</td>
                    <td colSpan={2} className={cn("px-6 py-5 text-lg font-black text-brand-primary", redEyeActive && "blur-sm")}>
                      {formatCurrency(sales?.filter(s => {
                        const sDate = new Date(s.date).toISOString().split('T')[0];
                        return s.type === 'direct' && 
                          (!dateRange.start || sDate >= dateRange.start) && 
                          (!dateRange.end || sDate <= dateRange.end);
                      }).reduce((acc, s) => acc + (s.cashSale || 0), 0) || 0, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

            <div className="surface-container overflow-hidden p-0 shadow-soft mt-10">
            <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/5">
              <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em]">
                {language === 'en' ? 'Node Portfolio Summary' : 'মাসিক কাস্টমার সংক্ষিপ্ত বিবরণ'}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 text-left">
                    <th className="px-10 py-5 stat-label">{language === 'en' ? 'Entity' : 'কাস্টমার'}</th>
                    <th className="px-10 py-5 stat-label">{language === 'en' ? 'Total Sales' : 'মোট বিক্রি'}</th>
                    <th className="px-10 py-5 stat-label">{language === 'en' ? 'Total Collection' : 'মোট কালেকশন'}</th>
                    <th className="px-10 py-5 stat-label">{language === 'en' ? 'Net Balance' : 'বাকি'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {customers?.filter(c => selectedCustomer === 'all' || String(c.id) === String(selectedCustomer)).map((c, i) => {
                    const customerSales = sales?.filter(s => String(s.customerId) === String(c.id)) || [];
                    const customerDebit = customerSales.filter(s => s.type === 'sale' || s.type === 'direct').reduce((acc, s) => acc + ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0)), 0);
                    const customerCredit = customerSales.filter(s => s.type === 'payment').reduce((acc, s) => acc + ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0)), 0);
                    
                    return (
                      <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className={cn("px-10 py-5 text-sm font-black text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>{c.name}</td>
                        <td className={cn("px-10 py-5 text-xs text-slate-500 font-bold", redEyeActive && "blur-sm")}>{formatCurrency(customerDebit, currency)}</td>
                        <td className={cn("px-10 py-5 text-xs text-slate-500 font-bold", redEyeActive && "blur-sm")}>{formatCurrency(customerCredit, currency)}</td>
                        <td className="px-10 py-5">
                          <span className={cn(
                            "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none",
                            (customerDebit - customerCredit) > 0 ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            redEyeActive && "blur-sm"
                          )}>
                            {formatCurrency(customerDebit - customerCredit, currency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FEF7FF] dark:bg-[#1D1B20] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-black text-[#1D1B20] dark:text-[#E6E1E5] mb-3 uppercase tracking-tight">
              {language === 'en' ? 'Confirm Removal' : 'ডিলিট নিশ্চিত করুন'}
            </h3>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed text-sm">
              {language === 'en' 
                ? 'This action will permanently purge the selected record from the secure ledger.' 
                : 'আপনি কি এই রেকর্ডটি মুছে ফেলতে নিশ্চিত? এই কাজটি আর ফিরিয়ে আনা যাবে না।'}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsDeleting(false)}
                className="flex-1 py-4 bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition active:scale-95"
              >
                {t.cancel}
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-4 bg-[#B3261E] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
              >
                {language === 'en' ? 'Execute Purge' : 'ডিলিট করুন'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Reports;
