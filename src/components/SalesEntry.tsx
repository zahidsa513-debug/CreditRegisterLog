import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import { 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  User as UserIcon, 
  FileText, 
  DollarSign, 
  Eraser,
  CheckCircle2,
  Hash,
  Printer
} from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Sale } from '../types';

const SalesEntry = ({ language, theme, currency }: { language: 'en' | 'bn', theme: 'light' | 'dark', currency: string }) => {
  const t = translations[language];
  const customers = useLiveQuery(() => db.customers.toArray());
  const sigPad = useRef<any>(null);
  
  const [formData, setFormData] = useState<Partial<Sale>>({
    date: new Date(),
    customerId: 0,
    description: '',
    cashSale: 0,
    chequeSale: 0,
    creditSale: 0,
    type: 'sale',
    receiptNumber: ''
  });

  const [isSuccess, setIsSuccess] = useState(false);

  const amountToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = num.toString();
    if (numStr.length > 9) return 'overflow';
    let n: any = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[parseInt(n[1][0])] + ' ' + a[parseInt(n[1][1])]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[parseInt(n[2][0])] + ' ' + a[parseInt(n[2][1])]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[parseInt(n[3][0])] + ' ' + a[parseInt(n[3][1])]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[parseInt(n[4][0])] + ' ' + a[parseInt(n[4][1])]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[parseInt(n[5][0])] + ' ' + a[parseInt(n[5][1])]) + 'Only ' : '';
    return str;
  };

  const generateReceipt = (sale: Sale, customer: any, prevBalance: number) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 148] // A5 Landscape
    });

    const totalPaid = sale.cashSale + sale.chequeSale + sale.creditSale;
    const remainingBalance = prevBalance - totalPaid;

    // Header
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(79, 70, 229);
    doc.text('MONEY RECEIPT', 105, 20, { align: 'center' });

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('CREDIT REGISTRY PRO', 200, 10, { align: 'right' });

    // Main Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`${t.receiptNumber}: ${sale.receiptNumber || 'N/A'}`, 15, 45);
    doc.text(`${t.date}: ${new Date(sale.date).toLocaleDateString()}`, 200, 45, { align: 'right' });

    doc.line(15, 50, 200, 50);

    doc.setFont('helvetica', 'normal');
    doc.text(`${t.receivedFrom}:`, 15, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, 50, 65);

    doc.setFont('helvetica', 'normal');
    doc.text(`${t.description}:`, 15, 75);
    doc.text(sale.description || 'General Payment', 50, 75);

    doc.line(15, 85, 200, 85);

    // Amounts
    doc.setFont('helvetica', 'bold');
    doc.text('PARTICULARS', 15, 95);
    doc.text('AMOUNT', 200, 95, { align: 'right' });
    doc.line(15, 98, 200, 98);

    doc.setFont('helvetica', 'normal');
    doc.text(t.previousBalance, 15, 108);
    doc.text(formatCurrency(prevBalance, currency), 200, 108, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Amount Received', 15, 118);
    doc.text(formatCurrency(totalPaid, currency), 200, 118, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.line(15, 122, 200, 122);
    doc.text(t.newBalance, 15, 132);
    doc.text(formatCurrency(remainingBalance, currency), 200, 132, { align: 'right' });

    // In Words
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`${t.amountInWords}: ${amountToWords(totalPaid)}`, 15, 142);

    // Signature Area
    if (sale.signature) {
      doc.addImage(sale.signature, 'PNG', 160, 110, 40, 20);
    }
    doc.line(160, 135, 200, 135);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(t.authorizedSignature, 180, 140, { align: 'center' });

    doc.save(`Receipt_${sale.receiptNumber || sale.id}.pdf`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return;

    const signature = sigPad.current?.isEmpty() ? undefined : sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    
    // Get customer for balance before update
    const customer = await db.customers.get(formData.customerId);
    if (!customer) return;

    const prevBalance = customer.debit - customer.credit;
    
    const saleData = {
      ...formData,
      date: new Date(formData.date || new Date()),
      signature
    } as Sale;

    const id = await db.sales.add(saleData);
    saleData.id = id as number;

    // Update customer totals
    const debitIncr = (formData.cashSale || 0) + (formData.chequeSale || 0) + (formData.creditSale || 0);
    await db.customers.update(customer.id!, {
      debit: (customer.debit || 0) + (formData.type === 'sale' ? debitIncr : 0),
      credit: (customer.credit || 0) + (formData.type === 'payment' ? debitIncr : 0)
    });

    if (formData.type === 'payment') {
      generateReceipt(saleData, customer, prevBalance);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setFormData({
        date: new Date(),
        customerId: 0,
        description: '',
        cashSale: 0,
        chequeSale: 0,
        creditSale: 0,
        type: 'sale',
        receiptNumber: ''
      });
      sigPad.current?.clear();
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.newSale}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{language === 'en' ? 'Record daily transactions efficiently' : 'দক্ষতার সাথে দৈনিক লেনদেন রেকর্ড করুন'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'sale' })}
                className={cn(
                  "py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  formData.type === 'sale' ? "bg-white dark:bg-slate-700 text-rose-600 shadow-sm" : "text-slate-500"
                )}
              >
                {t.due}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'payment' })}
                className={cn(
                  "py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  formData.type === 'payment' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500"
                )}
              >
                {t.collection}
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3 text-indigo-500" /> {t.date}
              </label>
              <input 
                required
                type="date"
                value={formData.date?.toISOString().split('T')[0]}
                onChange={e => setFormData({...formData, date: new Date(e.target.value)})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="w-3 h-3 text-indigo-500" /> {t.customers}
              </label>
              <select 
                required
                value={formData.customerId}
                onChange={e => setFormData({...formData, customerId: Number(e.target.value)})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium appearance-none text-sm"
              >
                <option value={0}>Select Customer</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3 h-3 text-indigo-500" /> {t.receiptNumber}
              </label>
              <input 
                type="text"
                value={formData.receiptNumber}
                onChange={e => setFormData({...formData, receiptNumber: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                placeholder={language === 'en' ? 'Manual Receipt #' : 'রশিদ নং (ঐচ্ছিক)'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3 text-indigo-500" /> {t.description}
              </label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium resize-none text-sm"
                rows={3}
                placeholder="Details of the sale..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t.cash}</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</div>
                  <input 
                    type="number"
                    value={formData.cashSale || ''}
                    onChange={e => setFormData({...formData, cashSale: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t.cheque}</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</div>
                  <input 
                    type="number"
                    value={formData.chequeSale || ''}
                    onChange={e => setFormData({...formData, chequeSale: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t.credit}</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</div>
                  <input 
                    type="number"
                    value={formData.creditSale || ''}
                    onChange={e => setFormData({...formData, creditSale: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.signature}</label>
                <button 
                  type="button" 
                  onClick={() => sigPad.current?.clear()}
                  className="text-[10px] flex items-center gap-1 text-rose-500 font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-0.5 rounded transition-colors"
                >
                  <Eraser className="w-3 h-3" /> {t.clear}
                </button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden h-32">
                <SignatureCanvas 
                  ref={sigPad}
                  penColor={theme === 'dark' ? '#f1f5f9' : '#0f172a'}
                  canvasProps={{ className: 'w-full h-full' }} 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSuccess}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95",
                isSuccess 
                  ? "bg-emerald-500 text-white shadow-emerald-200" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
              )}
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {language === 'en' ? 'Entry Saved' : 'এন্ট্রি সংরক্ষিত'}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t.save}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SalesEntry;
