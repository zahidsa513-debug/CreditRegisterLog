import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  FileText, 
  Plus, 
  DollarSign, 
  BarChart2, 
  Download,
  Users,
  Target,
  ArrowUpRight,
  TrendingDown,
  Edit2,
  Trash2,
  Check,
  X,
  History,
  Sparkles,
  MessageSquare,
  ChevronDown,
  Loader2,
  Wallet,
  Receipt,
  MessageCircle,
  BarChart as BarChartIcon
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatCurrency, cn, getWhatsAppLink } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { translations } from '../translations';

import { useSettings } from '../context/SettingsContext';

const MyProgress = ({ redEyeActive }: { redEyeActive?: boolean }) => {
  const { language, currency, target: monthlyTarget } = useSettings();
  const [entryType, setEntryType] = useState<'sale' | 'expense'>('sale');
  const [amountInput, setAmountInput] = useState('');
  const [creditInput, setCreditInput] = useState('');
  const [chequeInput, setChequeInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('General');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [editingId, setEditingId] = useState<{id: number, type: 'sale' | 'expense'} | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  
  const [meetingMonth, setMeetingMonth] = useState(new Date().getMonth());
  const [meetingYear, setMeetingYear] = useState(new Date().getFullYear());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [sheetFilterType, setSheetFilterType] = useState<'all' | 'day' | 'month'>('all');
  const [sheetFilterValue, setSheetFilterValue] = useState(new Date().toISOString().split('T')[0]);

  const t = translations[language];

  // Fetch data
  const customers = useLiveQuery(() => db.customers.toArray());
  const allSales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray());
  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray());

  const directSales = allSales?.filter(s => s.type === 'direct') || [];

  const totals = React.useMemo(() => {
    if (!allSales || !customers || !allExpenses) return { today: 0, month: 0, totalCredit: 0, monthExpenses: 0 };
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const month = now.getMonth();
    const year = now.getFullYear();

    const todaySales = allSales.filter(s => {
      const d = new Date(s.date);
      return d.toISOString().split('T')[0] === todayStr;
    }).reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);

    const monthSales = allSales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);

    const monthExpenses = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).reduce((acc, e) => acc + e.amount, 0);

    const totalCredit = customers.reduce((acc, c) => acc + ((c.debit || 0) - (c.credit || 0)), 0);

    return { today: todaySales, month: monthSales, monthExpenses, totalCredit };
  }, [allSales, allExpenses, customers]);

  const monthlyReportData = React.useMemo(() => {
    if (!allSales || !customers) return null;

    const filtered = allSales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === meetingMonth && d.getFullYear() === meetingYear;
    });

    const totalSales = filtered.reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);
    const totalCash = filtered.reduce((acc, s) => acc + (s.cashSale || 0), 0);
    const totalCredit = filtered.reduce((acc, s) => acc + (s.creditSale || 0), 0);
    const totalCheque = filtered.reduce((acc, s) => acc + (s.chequeSale || 0), 0);
    
    // Group by day for the chart
    const daysInMonth = new Date(meetingYear, meetingMonth + 1, 0).getDate();
    const dailyData = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const daySales = filtered.filter(s => new Date(s.date).getDate() === i)
        .reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);
      dailyData.push({ day: i, amount: daySales });
    }

    return { totalSales, totalCash, totalCredit, totalCheque, dailyData, count: filtered.length };
  }, [allSales, customers, meetingMonth, meetingYear]);

  const chartData = React.useMemo(() => {
    if (!allSales || !allExpenses) return [];
    
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const sales = allSales.filter(s => new Date(s.date).toISOString().split('T')[0] === dateStr)
        .reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);
      
      const expenses = allExpenses.filter(e => new Date(e.date).toISOString().split('T')[0] === dateStr)
        .reduce((acc, e) => acc + e.amount, 0);

      data.push({
        name: date.toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { weekday: 'short' }),
        sales,
        expenses
      });
    }
    return data;
  }, [allSales, allExpenses, language]);

  const topProducts = React.useMemo(() => {
    if (!allSales) return [];
    const counts: Record<string, number> = {};
    allSales.filter(s => s.type === 'direct').forEach(s => {
      const desc = s.description || 'General Sale';
      counts[desc] = (counts[desc] || 0) + (s.totalAmount || s.cashSale);
    });
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allSales]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = parseFloat(amountInput);
    if (isNaN(totalAmount) || totalAmount <= 0) return;

    const creditAmount = parseFloat(creditInput) || 0;
    const chequeAmount = parseFloat(chequeInput) || 0;
    const cashAmount = totalAmount - creditAmount - chequeAmount;

    setIsSubmitting(true);
    try {
      if (editingId) {
        if (editingId.type === 'sale') {
          await db.sales.update(editingId.id, {
            date: new Date(selectedDate),
            description: descriptionInput || 'Daily Direct Sale',
            cashSale: cashAmount,
            chequeSale: chequeAmount,
            creditSale: creditAmount,
            totalAmount: totalAmount
          });
        } else {
          await db.expenses.update(editingId.id, {
            date: new Date(selectedDate),
            description: descriptionInput || 'General Expense',
            category: categoryInput,
            amount: totalAmount
          });
        }
        setEditingId(null);
      } else {
        if (entryType === 'sale') {
          await db.sales.add({
            date: new Date(selectedDate),
            description: descriptionInput || 'Daily Direct Sale',
            cashSale: cashAmount,
            chequeSale: chequeAmount,
            creditSale: creditAmount,
            totalAmount: totalAmount,
            type: 'direct'
          });
        } else {
          await db.expenses.add({
            date: new Date(selectedDate),
            description: descriptionInput || 'General Expense',
            category: categoryInput,
            amount: totalAmount
          });
        }
      }
      setAmountInput('');
      setCreditInput('');
      setChequeInput('');
      setDescriptionInput('');
    } catch (error) {
      console.error("Failed to add/update entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (entry: any, type: 'sale' | 'expense') => {
    setEditingId({ id: entry.id!, type });
    setEntryType(type);
    setSelectedDate(new Date(entry.date).toISOString().split('T')[0]);
    setAmountInput((entry.totalAmount || entry.amount || 0).toString());
    if (type === 'sale') {
      setCreditInput((entry.creditSale || 0).toString());
      setChequeInput((entry.chequeSale || 0).toString());
    }
    setDescriptionInput(entry.description || '');
    if (type === 'expense') setCategoryInput(entry.category || 'General');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEntry = async (id: number, type: 'sale' | 'expense') => {
    if (confirm(language === 'en' ? 'Delete this entry?' : 'এই এন্ট্রিটি ডিলিট করতে চান?')) {
      if (type === 'sale') await db.sales.delete(id);
      else await db.expenses.delete(id);
    }
  };

  const generateMeetingAnalysis = async () => {
    if (!monthlyReportData) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiAnalysis("AI API Key is missing. Please check your configuration.");
        setIsAnalyzing(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const monthName = new Date(meetingYear, meetingMonth).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
      
      const statsSummary = `
        Business Stats for ${monthName} ${meetingYear}:
        - Total Sales: ${monthlyReportData.totalSales}
        - Cash Collections: ${monthlyReportData.totalCash}
        - Credit Issued: ${monthlyReportData.totalCredit}
        - Cheque Sales: ${monthlyReportData.totalCheque}
      `;

      const prompt = `Analyze these business stats and provide a professional meeting script in ${language === 'en' ? 'English' : 'Bengali'}: ${statsSummary}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setAiAnalysis(response.text || "Analysis failed.");
    } catch (error) {
      setAiAnalysis("Error generating analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateExecutiveReport = async () => {
    const doc = new jsPDF() as any;
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    const pageWidth = doc.internal.pageSize.width;

    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: '',
      logo: ''
    };

    // Premium Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 55, 'F');
    
    let textX = 14;
    // Add Logo if exists
    if (company.logo) {
      try {
        doc.addImage(company.logo, 'PNG', 14, 10, 25, 25);
        textX = 45;
      } catch (err) {
        console.error('Failed to add logo to PDF:', err);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(company.companyName.toUpperCase(), textX, 22);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    let headerY = 28;
    if (company.address) {
      doc.text(company.address, textX, headerY);
      headerY += 4;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, textX, headerY);
      headerY += 4;
    }
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Official Analysis Report | Date Range: ${reportStartDate} to ${reportEndDate}`, pageWidth / 2, 48, { align: 'center' });
    
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1.5);
    doc.line(pageWidth/2 - 40, 38, pageWidth/2 + 40, 38);

    const salesInRange = allSales?.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    }) || [];

    const expensesInRange = allExpenses?.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    }) || [];

    const totalSales = salesInRange.reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);
    const totalExpenses = expensesInRange.reduce((acc, e) => acc + e.amount, 0);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('I. FINANCIAL KEY PERFORMANCE INDICATORS', 14, 68);

    autoTable(doc, {
      startY: 72,
      head: [['KPI DEFINITION', 'AGGREGATE VALUE', 'STATUS']],
      body: [
        ['GROSS REVENUE', formatCurrency(totalSales, currency), 'VERIFIED'],
        ['OPERATING EXPENSES', formatCurrency(totalExpenses, currency), 'AUDITED'],
        [{ content: 'NET OPERATING PROFIT', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalSales - totalExpenses, currency), styles: { fontStyle: 'bold' } }, 'FINAL'],
        ['PROFITABILITY MARGIN', `${totalSales > 0 ? (((totalSales - totalExpenses)/totalSales)*100).toFixed(1) : 0}%`, 'GOOD']
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 10 },
      styles: { cellPadding: 6, fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('II. TOP PERFORMANCE SEGMENTS', 14, finalY);

    // Top Products for Report
    const counts: Record<string, number> = {};
    salesInRange.filter(s => s.type === 'direct').forEach(s => {
      const desc = s.description || 'General Sale';
      counts[desc] = (counts[desc] || 0) + (s.totalAmount || s.cashSale);
    });
    const topRepProducts = Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['REVENUE STREAM / PRODUCT', 'CONTRIBUTION VALUE']],
      body: topRepProducts.map(p => [p.name, formatCurrency(p.total, currency)]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`EXECUTIVE_SUMMARY_${reportStartDate}.pdf`);
  };

  const activitySheetData = React.useMemo(() => {
    const combined = [
      ...(allSales?.filter(s => s.type === 'direct').map(s => ({ ...s, entryType: 'sale' as const })) || []),
      ...(allExpenses?.map(e => ({ ...e, entryType: 'expense' as const })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sheetFilterType === 'all') return combined;

    return combined.filter(item => {
      const itemDate = new Date(item.date);
      if (sheetFilterType === 'day') {
        return itemDate.toISOString().split('T')[0] === sheetFilterValue;
      }
      if (sheetFilterType === 'month') {
        const [year, month] = sheetFilterValue.split('-').map(Number);
        return itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month;
      }
      return true;
    });
  }, [allSales, allExpenses, sheetFilterType, sheetFilterValue]);

  const activityTotals = React.useMemo(() => {
    return activitySheetData.reduce((acc, item) => {
      const amount = item.entryType === 'sale' ? (item.totalAmount || 0) : (item.amount || 0);
      if (item.entryType === 'sale') acc.sales += amount;
      else acc.expenses += amount;
      return acc;
    }, { sales: 0, expenses: 0 });
  }, [activitySheetData]);

  const generateDailyActivityPdf = async () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.width;
    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: '',
      logo: ''
    };
    
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    let textX = 14;
    if (company.logo) {
      try {
        doc.addImage(company.logo, 'PNG', 14, 8, 24, 24);
        textX = 42;
      } catch (err) {
        console.error('Failed to add logo to PDF:', err);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(company.companyName.toUpperCase(), textX, 15);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    let headerY = 22;
    if (company.address) {
      doc.text(company.address, textX, headerY);
      headerY += 4;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, textX, headerY);
      headerY += 4;
    }

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    let filterLabel = language === 'en' ? 'Full History' : 'পুরো ইতিহাস';
    if (sheetFilterType === 'day') filterLabel = `${language === 'en' ? 'Date' : 'তারিখ'}: ${sheetFilterValue}`;
    if (sheetFilterType === 'month') filterLabel = `${language === 'en' ? 'Month' : 'মাস'}: ${sheetFilterValue}`;

    doc.text(`Scope: ${filterLabel} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 40, { align: 'center' });

    autoTable(doc, {
      startY: 50,
      head: [[
        language === 'en' ? 'DATE' : 'তারিখ', 
        language === 'en' ? 'TYPE' : 'ধরণ', 
        language === 'en' ? 'DETAILS' : 'বিস্তারিত',
        language === 'en' ? 'CASH' : 'নগদ',
        language === 'en' ? 'CREDIT' : 'বাকি',
        language === 'en' ? 'CHEQUE' : 'চেক',
        language === 'en' ? 'TOTAL' : 'মোট'
      ]],
      body: activitySheetData.map(item => [
        new Date(item.date).toLocaleDateString(),
        item.entryType.toUpperCase(),
        item.description,
        item.entryType === 'sale' ? formatCurrency(item.cashSale || 0, currency) : '-',
        item.entryType === 'sale' ? formatCurrency(item.creditSale || 0, currency) : '-',
        item.entryType === 'sale' ? formatCurrency(item.chequeSale || 0, currency) : '-',
        formatCurrency(item.entryType === 'sale' ? (item.totalAmount || 0) : (item.amount || 0), currency)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: { 
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      },
      foot: [
        [
          '', '', '',
          '', 
          '', 
          language === 'en' ? 'TOTAL SALES' : 'মোট বিক্রি', 
          formatCurrency(activityTotals.sales, currency)
        ],
        [
          '', '', '',
          '', 
          '', 
          language === 'en' ? 'TOTAL EXPENSES' : 'মোট খরচ', 
          formatCurrency(activityTotals.expenses, currency)
        ],
        [
          '', '', '',
          '', 
          '', 
          language === 'en' ? 'NET POSITION' : 'নিট পজিশন / সর্বমোট', 
          formatCurrency(activityTotals.sales - activityTotals.expenses, currency)
        ]
      ],
      footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' }
    });

    doc.save(`Activity_Report_${sheetFilterValue}.pdf`);
  };

  const generateCreditRecoveryList = async () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.width;
    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: '',
      logo: ''
    };

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    let textX = 14;
    if (company.logo) {
      try {
        doc.addImage(company.logo, 'PNG', 14, 8, 24, 24);
        textX = 42;
      } catch (err) {
        console.error('Failed to add logo to PDF:', err);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(company.companyName.toUpperCase(), textX, 15);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    let headerY = 22;
    if (company.address) {
      doc.text(company.address, textX, headerY);
      headerY += 4;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, textX, headerY);
      headerY += 4;
    }

    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text('PRIORITY CREDIT RECOVERY LIST', pageWidth / 2, 35, { align: 'center' });
    
    const overdueList = (customers || [])
      .map(c => ({ name: c.name, phone: c.phone, bal: c.debit - c.credit }))
      .filter(c => c.bal > 0)
      .sort((a, b) => b.bal - a.bal);

    autoTable(doc, {
      startY: 25,
      head: [['Customer', 'Phone', 'Outstanding']],
      body: overdueList.map(c => [c.name, c.phone, formatCurrency(c.bal, currency)]),
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72] }
    });

    doc.save('Recovery_Priority_List.pdf');
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-display font-black tracking-tight"
          >
            My <span className="text-indigo-600">Progress</span> Pro
          </motion.h2>
          <p className="text-slate-400 font-medium">Business Intelligence & Operations</p>
        </div>
        
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button 
            onClick={() => setEntryType('sale')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              entryType === 'sale' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
            )}
          >
            {language === 'en' ? 'Sales' : 'বিক্রি'}
          </button>
          <button 
            onClick={() => setEntryType('expense')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              entryType === 'expense' ? "bg-white dark:bg-slate-700 text-rose-600 shadow-sm" : "text-slate-400"
            )}
          >
            {language === 'en' ? 'Expenses' : 'খরচ'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-4 space-y-6"
        >
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                 <span className="text-[10px] font-black uppercase text-indigo-200">Target Achievement</span>
                 <Target className="w-5 h-5 text-indigo-300" />
               </div>
               <div className="flex items-end gap-2 mb-4">
                 <h4 className="text-4xl font-black">{Math.round(Math.min(100, (totals.month / (monthlyTarget || 1)) * 100))}%</h4>
                 <span className="text-[10px] font-bold text-indigo-200 mb-1 tracking-widest uppercase">reached</span>
               </div>
               <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-6">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totals.month / (monthlyTarget || 1)) * 100)}%` }}
                    className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Achieved</p>
                   <p className={cn("text-lg font-black", redEyeActive && "blur-sm")}>{formatCurrency(totals.month, currency)}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Remaining</p>
                   <p className={cn("text-lg font-black text-emerald-300", redEyeActive && "blur-sm")}>{formatCurrency(Math.max(0, monthlyTarget - totals.month), currency)}</p>
                 </div>
               </div>
             </div>
             <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft">
            <form onSubmit={handleAddEntry} className="space-y-6">
            <div className="space-y-4">
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold"
                required
              />
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{currency}</div>
                <input 
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={language === 'en' ? "Total Sales" : 'মোট বিক্রি'}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-3xl focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {entryType === 'sale' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Credit' : 'বাকি'}</label>
                    <input 
                      type="number"
                      value={creditInput}
                      onChange={(e) => setCreditInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-rose-50 dark:bg-rose-900/10 border-none rounded-xl font-bold text-rose-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Cheque' : 'চেক'}</label>
                    <input 
                      type="number"
                      value={chequeInput}
                      onChange={(e) => setChequeInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-indigo-50 dark:bg-indigo-900/10 border-none rounded-xl font-bold text-indigo-600"
                    />
                  </div>
                </div>
              )}

              {entryType === 'sale' && amountInput && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{language === 'en' ? 'Calculated Cash' : 'হিসাবকৃত নগদ'}</span>
                    <span className="text-sm font-black text-emerald-700">
                      {formatCurrency(parseFloat(amountInput) - (parseFloat(creditInput) || 0) - (parseFloat(chequeInput) || 0), currency)}
                    </span>
                  </div>
                </div>
              )}

              <input 
                type="text"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder={language === 'en' ? 'Description' : 'বিবরণ'}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl"
              />
              {entryType === 'expense' && (
                <select 
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold"
                >
                  <option>Rent</option>
                  <option>Electricity</option>
                  <option>Salary</option>
                  <option>Transport</option>
                  <option>General</option>
                </select>
              )}
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 rounded-2xl text-white font-black shadow-xl transition-all flex items-center justify-center gap-2",
                entryType === 'sale' ? "bg-indigo-600 shadow-indigo-500/20" : "bg-rose-600 shadow-rose-500/20",
                isSubmitting && "opacity-50"
              )}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? (language === 'en' ? 'Update Record' : 'আপডেট করুন') : (language === 'en' ? 'Save Record' : 'সেভ করুন')}
            </button>
            {editingId && (
               <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setAmountInput('');
                  setCreditInput('');
                  setChequeInput('');
                  setDescriptionInput('');
                }}
                className="w-full py-3 text-xs font-black text-slate-400 uppercase tracking-widest"
               >
                 Cancel Editing
               </button>
            )}
          </form>
        </div>
      </motion.div>

        {/* Dash */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft">
              <span className="text-[10px] font-black uppercase text-slate-400">Monthly Profitability</span>
              <h4 className={cn("text-4xl font-black text-indigo-600 mt-2", redEyeActive && "blur-sm")}>{formatCurrency(totals.month - totals.monthExpenses, currency)}</h4>
            </div>
            <div className="bg-rose-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-500/20 relative overflow-hidden">
               <span className="text-[10px] font-black uppercase text-rose-100">Total Outstanding</span>
               <h4 className={cn("text-4xl font-black mt-2", redEyeActive && "blur-sm")}>{formatCurrency(totals.totalCredit, currency)}</h4>
               <Wallet className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-soft h-[300px]">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">{language === 'en' ? 'Top Selling Products' : 'জনপ্রিয় পণ্য'}</h4>
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xs">{i+1}</div>
                    <span className="text-sm font-bold">{p.name}</span>
                  </div>
                  <span className={cn("text-sm font-black text-slate-400", redEyeActive && "blur-sm")}>{formatCurrency(p.total, currency)}</span>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">No sales data yet.</p>}
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-soft h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                  <Area type="monotone" dataKey="sales" fill="#6366f1" stroke="#6366f1" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="expenses" fill="#f43f5e" stroke="#f43f5e" fillOpacity={0.1} />
                  <RechartsTooltip />
               </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-3xl font-black mb-4">Executive Reporting</h3>
            <p className="text-slate-400 mb-8">Generate advanced PDF reports with profitability analysis.</p>
            <div className="flex gap-4 mb-8">
              <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="bg-slate-800 rounded-xl px-4 py-2 border-none text-sm" />
              <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="bg-slate-800 rounded-xl px-4 py-2 border-none text-sm" />
            </div>
            <button onClick={generateExecutiveReport} className="bg-indigo-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Executive PDF
            </button>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-indigo-400" />
                <h4 className="font-black">Meeting Expert Box</h4>
              </div>
              {aiAnalysis && (
                <button 
                  onClick={async () => {
                    const doc = new jsPDF() as any;
                    const pageWidth = doc.internal.pageSize.width;
                    const companySettingsList = await db.settings.toArray();
                    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
                      companyName: 'CREDIT REGISTRY PRO',
                      phone: '',
                      email: '',
                      address: '',
                      website: '',
                      logo: ''
                    };
                    
                    // Professional Header
                    doc.setFillColor(15, 23, 42);
                    doc.rect(0, 0, pageWidth, 50, 'F');

                    let textX = 14;
                    if (company.logo) {
                      try {
                        doc.addImage(company.logo, 'PNG', 14, 8, 24, 24);
                        textX = 42;
                      } catch (err) {
                        console.error('Failed to add logo to PDF:', err);
                      }
                    }

                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(22);
                    doc.setFont("helvetica", "bold");
                    doc.text(company.companyName.toUpperCase(), textX, 15);
                    
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(200, 200, 200);
                    let headerY = 22;
                    if (company.address) {
                      doc.text(company.address, textX, headerY);
                      headerY += 4;
                    }
                    if (company.phone || company.email) {
                      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, textX, headerY);
                    }

                    doc.setFontSize(14);
                    doc.setTextColor(255, 255, 255);
                    doc.text('AI BUSINESS STRATEGY ANALYSIS', pageWidth / 2, 45, { align: 'center' });
                    
                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(11);
                    const splitText = doc.splitTextToSize(aiAnalysis, 180);
                    doc.text(splitText, 15, 65);
                    
                    doc.save(`AI_Business_Insights_${new Date().toISOString().split('T')[0]}.pdf`);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Download AI Report"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                </button>
              )}
            </div>
            {aiAnalysis ? (
              <div className="prose prose-invert prose-sm"><Markdown>{aiAnalysis}</Markdown></div>
            ) : (
              <button 
                onClick={generateMeetingAnalysis} 
                className="w-full py-4 bg-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest"
              >
                {isAnalyzing ? "Analyzing..." : "Generate Meeting Script"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <div>
             <h3 className="text-2xl font-black">{language === 'en' ? 'Daily Data Sheet' : 'ডেইলি ডাটা শিট'}</h3>
             <p className="text-xs text-slate-400 mt-1 font-bold">Manage your daily sales and expenses records</p>
           </div>
           
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                 {(['all', 'day', 'month'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSheetFilterType(type)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        sheetFilterType === type ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
                      )}
                    >
                      {type}
                    </button>
                 ))}
              </div>
              
              {sheetFilterType !== 'all' && (
                <input 
                  type={sheetFilterType === 'day' ? 'date' : 'month'}
                  value={sheetFilterValue}
                  onChange={(e) => setSheetFilterValue(e.target.value)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold w-40"
                />
              )}

              <button onClick={generateDailyActivityPdf} className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                <Download className="w-5 h-5" />
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
              <span className="text-[10px] font-black uppercase text-emerald-600 mb-1 block">Selected Revenue</span>
              <span className={cn("text-xl font-black text-emerald-700", redEyeActive && "blur-sm")}>{formatCurrency(activityTotals.sales, currency)}</span>
           </div>
           <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800/30">
              <span className="text-[10px] font-black uppercase text-rose-600 mb-1 block">Selected Expenses</span>
              <span className={cn("text-xl font-black text-rose-700", redEyeActive && "blur-sm")}>{formatCurrency(activityTotals.expenses, currency)}</span>
           </div>
           <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
              <span className="text-[10px] font-black uppercase text-indigo-600 mb-1 block">Net Position</span>
              <span className={cn("text-xl font-black text-indigo-700", redEyeActive && "blur-sm")}>{formatCurrency(activityTotals.sales - activityTotals.expenses, currency)}</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400">{language === 'en' ? 'Date' : 'তারিখ'}</th>
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400">{language === 'en' ? 'Details' : 'বিস্তারিত'}</th>
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 text-center">{language === 'en' ? 'Cash' : 'নগদ'}</th>
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 text-center">{language === 'en' ? 'Credit' : 'বাকি'}</th>
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 text-center">{language === 'en' ? 'Cheque' : 'চেক'}</th>
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 text-right">{language === 'en' ? 'Amount' : 'পরিমাণ'}</th>
                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {activitySheetData.slice(0, 50).map((item, idx) => (
                <tr key={`${item.entryType}-${item.id || idx}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 text-xs font-bold text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.description}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        item.entryType === 'sale' ? "text-indigo-500" : "text-rose-500"
                      )}>{item.entryType === 'sale' ? (language === 'en' ? 'Direct Sale' : 'সরাসরি বিক্রি') : (item.category || (language === 'en' ? 'Expense' : 'খরচ'))}</span>
                    </div>
                  </td>
                  <td className="py-4 text-center text-xs font-black text-slate-400">
                    {item.entryType === 'sale' ? formatCurrency(item.cashSale || 0, currency) : '-'}
                  </td>
                  <td className="py-4 text-center text-xs font-black text-slate-400">
                    {item.entryType === 'sale' ? formatCurrency(item.creditSale || 0, currency) : '-'}
                  </td>
                  <td className="py-4 text-center text-xs font-black text-slate-400">
                    {item.entryType === 'sale' ? formatCurrency(item.chequeSale || 0, currency) : '-'}
                  </td>
                  <td className="py-4 text-right">
                    <span className={cn(
                      "text-sm font-black",
                      item.entryType === 'sale' ? "text-emerald-600" : "text-rose-600",
                      redEyeActive && "blur-sm"
                    )}>
                      {item.entryType === 'sale' ? '+' : '-'}{formatCurrency(item.entryType === 'sale' ? (item.totalAmount || 0) : (item.amount || 0), currency)}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => startEdit(item, item.entryType)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => deleteEntry(item.id!, item.entryType)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!allSales || (allSales.filter(s => s.type === 'direct').length === 0 && (!allExpenses || allExpenses.length === 0))) && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-sm italic">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-soft">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black">Credit Recovery Radar</h3>
          <button onClick={generateCreditRecoveryList} className="text-xs font-black text-rose-600 flex items-center gap-2">
            <Download className="w-4 h-4" /> Download Recovery PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              {(customers || [])
                .map(c => ({...c, bal: c.debit - c.credit}))
                .filter(c => c.bal > 0)
                .sort((a,b) => b.bal - a.bal)
                .slice(0, 10).map(c => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-5 font-bold">{c.name}</td>
                  <td className="py-5 font-black text-rose-600">{formatCurrency(c.bal, currency)}</td>
                  <td className="py-5 text-right">
                    <a 
                      href={getWhatsAppLink(c.phone, `Payment reminder from Credit Register. Balance: ${formatCurrency(c.bal, currency)}`)}
                      target="_blank"
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-xl inline-block"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MyProgress;
