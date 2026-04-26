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
  Printer
} from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';

const Reports = ({ language, currency }: { language: 'en' | 'bn', currency: string }) => {
  const t = translations[language];
  const areas = useLiveQuery(() => db.areas.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');

  const calculateAge = (date: Date | string) => {
    const start = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredSales = sales?.filter(s => {
    const customer = customers?.find(c => c.id === s.customerId);
    const dateMatch = (!dateRange.start || s.date >= dateRange.start) && (!dateRange.end || s.date <= dateRange.end);
    const areaMatch = selectedArea === 'all' || customer?.areaId === Number(selectedArea);
    const customerMatch = selectedCustomer === 'all' || s.customerId === Number(selectedCustomer);
    return dateMatch && areaMatch && customerMatch;
  });

  const printPDF = () => {
    const doc = new jsPDF();
    const title = language === 'en' ? 'Credit Registry - Customer Summary' : 'ক্রেডিট রেজিস্ট্রি - গ্রাহকের সংক্ষিপ্ত বিবরণ';
    
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = customers?.map(c => {
      const area = areas?.find(a => a.id === c.areaId);
      return [
        c.name,
        area?.name || 'N/A',
        formatCurrency(c.debit, currency),
        formatCurrency(c.credit, currency),
        formatCurrency(c.debit - c.credit, currency)
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [[t.customers, t.areas, t.totalDebit, t.totalCredit, t.balance]],
      body: tableData || [],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Credit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.reports}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{language === 'en' ? 'Export data and generate insights' : 'ডেটা রপ্তানি করুন এবং অন্তর্দৃষ্টি তৈরি করুন'}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={printPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">{t.printReport}</span>
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold cursor-pointer hover:bg-slate-50 transition shadow-sm active:scale-95">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs uppercase tracking-wider">{t.import}</span>
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">{t.export}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filter Options
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Area</label>
                <div className="relative">
                  <select 
                    value={selectedArea}
                    onChange={e => setSelectedArea(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none appearance-none font-bold text-xs"
                  >
                    <option value="all">All Areas</option>
                    {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Customer</label>
                <div className="relative">
                  <select 
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none appearance-none font-bold text-xs"
                  >
                    <option value="all">All Customers</option>
                    {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</label>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none font-bold text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Date</label>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none font-bold text-xs" 
                />
              </div>

              <button className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold text-xs mt-2 active:scale-95 transition-transform uppercase tracking-widest">
                Apply Filters
              </button>
            </div>
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl">
            <Share2 className="w-6 h-6 mb-4 text-indigo-500" />
            <h4 className="font-bold text-base leading-tight">Instant Reports</h4>
            <p className="text-slate-400 text-[11px] mt-2 leading-relaxed">Share PDF invoices or collection reports via WhatsApp automatically.</p>
            <button className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-[11px] mt-5 hover:bg-indigo-700 transition uppercase tracking-widest">
              Share Now
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {language === 'en' ? 'Transaction Age Report' : 'বকেয়া বয়স রিপোর্ট'}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-left">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Customer' : 'কাস্টমার'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Bill / Receipt' : 'বিল / রিসিট'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Date' : 'তারিখ'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Age (Days)' : 'বয়স (দিন)'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Amount' : 'পরিমাণ'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Type' : 'ধরণ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSales?.map((s, i) => {
                    const customer = customers?.find(c => c.id === s.customerId);
                    const age = calculateAge(s.date);
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 text-sm font-bold text-slate-900 dark:text-white">{customer?.name || 'Unknown'}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">{s.invoiceNumber || s.receiptNumber || 'N/A'}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-bold",
                            age > 30 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {age} {language === 'en' ? 'Days' : 'দিন'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm font-bold">
                          {formatCurrency(s.cashSale + s.chequeSale + s.creditSale, currency)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter",
                            s.type === 'sale' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {s.type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!filteredSales || filteredSales.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                        {language === 'en' ? 'No transactions found for current filters' : 'ফিল্টার অনুযায়ী কোনো লেনদেন পাওয়া যায়নি'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between mt-8">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {language === 'en' ? 'Monthly Customer Summary' : 'মাসিক কাস্টমার সংক্ষিপ্ত বিবরণ'}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-left">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Customer' : 'কাস্টমার'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Total Sales' : 'মোট বিক্রি'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Total Collection' : 'মোট কালেকশন'}</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Balance' : 'বাকি'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers?.filter(c => selectedCustomer === 'all' || c.id === Number(selectedCustomer)).map((c, i) => {
                    const customerSales = sales?.filter(s => s.customerId === c.id) || [];
                    const customerDebit = customerSales.filter(s => s.type === 'sale').reduce((acc, s) => acc + (s.cashSale + s.chequeSale + s.creditSale), 0);
                    const customerCredit = customerSales.filter(s => s.type === 'payment').reduce((acc, s) => acc + (s.cashSale + s.chequeSale + s.creditSale), 0);
                    
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 text-sm font-bold text-slate-900 dark:text-white">{c.name}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">{formatCurrency(customerDebit, currency)}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">{formatCurrency(customerCredit, currency)}</td>
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-bold",
                            (customerDebit - customerCredit) > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
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
        </div>
      </div>
    </div>
  );
};

export default Reports;
