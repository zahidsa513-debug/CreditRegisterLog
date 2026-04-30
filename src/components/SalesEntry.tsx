import React, { useState, useRef, useEffect } from 'react';
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
  Printer,
  TrendingUp,
  Edit2
} from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Sale, Language, Theme } from '../types';

import { useSettings } from '../context/SettingsContext';
import { trackFeatureUsage } from '../lib/analytics';

const SalesEntry = ({ editingSale, setEditingSale }: { editingSale?: Sale | null, setEditingSale?: (sale: Sale | null) => void }) => {
  const { language, theme, currency } = useSettings();
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
    totalAmount: 0,
    type: 'sale',
    receiptNumber: '',
    invoiceNumber: '',
    billNumber: ''
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalSale, setOriginalSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (editingSale) {
      handleEdit(editingSale as Sale);
      if (setEditingSale) setEditingSale(null);
    }
  }, [editingSale]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dailySalesList = useLiveQuery(() => 
    db.sales
      .where('date')
      .between(today, tomorrow)
      .toArray()
  , [today, tomorrow]);

  React.useEffect(() => {
    if (formData.type === 'sale') {
      const calculatedCredit = (formData.totalAmount || 0) - (formData.cashSale || 0) - (formData.chequeSale || 0);
      if (formData.creditSale !== Math.max(0, calculatedCredit)) {
        setFormData(prev => ({ ...prev, creditSale: Math.max(0, calculatedCredit) }));
      }
    } else if (formData.type === 'direct') {
      const targetCash = formData.totalAmount || 0;
      if (formData.cashSale !== targetCash || formData.creditSale !== 0 || formData.chequeSale !== 0 || formData.customerId !== undefined) {
        setFormData(prev => ({ 
          ...prev, 
          cashSale: targetCash, 
          creditSale: 0, 
          chequeSale: 0, 
          customerId: undefined 
        }));
      }
    }
  }, [formData.totalAmount, formData.cashSale, formData.chequeSale, formData.type, formData.creditSale, formData.customerId]);

  const handleEdit = (sale: Sale) => {
    setFormData({
      ...sale,
      date: new Date(sale.date)
    });
    setEditingId(sale.id || null);
    setOriginalSale(JSON.parse(JSON.stringify(sale))); // Keep a copy for balance delta calculation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    const saleToDelete = await db.sales.get(id);
    if (!saleToDelete) return;

    const confirmMsg = t.confirmDelete;

    if (window.confirm(confirmMsg)) {
      try {
        // Revert customer balance
        if (saleToDelete.customerId) {
          const customer = await db.customers.get(saleToDelete.customerId);
          if (customer) {
            const amountDelta = (saleToDelete.cashSale || 0) + (saleToDelete.chequeSale || 0) + (saleToDelete.creditSale || 0);
            await db.customers.update(customer.id!, {
              debit: (customer.debit || 0) - (saleToDelete.type === 'sale' ? (saleToDelete.creditSale || 0) : 0),
              credit: (customer.credit || 0) - (saleToDelete.type === 'payment' ? amountDelta : 0)
            });
          }
        }
        await db.sales.delete(id);
      } catch (error) {
        console.error("Failed to delete sale:", error);
      }
    }
  };

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

  const generateReceipt = async (sale: Sale, customer: any, prevBalance: number) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 148] // A5 Landscape
    });

    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: ''
    };

    const totalPaid = sale.cashSale + sale.chequeSale + sale.creditSale;
    const remainingBalance = prevBalance - totalPaid;

    // Header Pad
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text(company.companyName.toUpperCase(), 15, 15);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let headerY = 22;
    if (company.address) {
      doc.text(company.address, 15, headerY);
      headerY += 4;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, 15, headerY);
      headerY += 4;
    }
    if (company.website) {
      doc.text(company.website, 15, headerY);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(148, 163, 184);
    doc.text('MONEY RECEIPT', 200, 20, { align: 'right' });

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
    if (formData.type !== 'direct' && !formData.customerId) {
      alert(language === 'en' ? 'Please select a customer' : 'অনুগ্রহ করে একজন কাস্টমার নির্বাচন করুন');
      return;
    }

    const signature = sigPad.current?.isEmpty() ? undefined : sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    
    // Get customer for balance before update
    let customer = null;
    if (formData.customerId) {
        customer = await db.customers.get(formData.customerId);
    }
    
    const prevBalance = customer ? customer.debit - customer.credit : 0;
    
    const saleData = {
      ...formData,
      date: new Date(formData.date || new Date()),
      signature
    } as Sale;

    if (editingId) {
      if (originalSale && originalSale.customerId) {
        const oldCustomer = await db.customers.get(originalSale.customerId);
        if (oldCustomer) {
            // Revert old values
            const oldAmount = (originalSale.cashSale || 0) + (originalSale.chequeSale || 0) + (originalSale.creditSale || 0);
            await db.customers.update(oldCustomer.id!, {
                debit: (oldCustomer.debit || 0) - (originalSale.type === 'sale' ? (originalSale.creditSale || 0) : 0),
                credit: (oldCustomer.credit || 0) - (originalSale.type === 'payment' ? oldAmount : 0)
            });
        }
      }
      await db.sales.update(editingId, saleData);
      setEditingId(null);
      setOriginalSale(null);
    } else {
      const id = await db.sales.add(saleData);
      saleData.id = id as number;
    }

    // Apply new values to customer totals
    if (formData.customerId) {
      const customerForNewValues = await db.customers.get(formData.customerId);
      if (customerForNewValues) {
        const debitIncr = (formData.cashSale || 0) + (formData.chequeSale || 0) + (formData.creditSale || 0);
        await db.customers.update(customerForNewValues.id!, {
          debit: (customerForNewValues.debit || 0) + (formData.type === 'sale' ? (formData.creditSale || 0) : 0),
          credit: (customerForNewValues.credit || 0) + (formData.type === 'payment' ? debitIncr : 0)
        });
      }
    }

    if (formData.type === 'payment' && customer && !editingId) {
      await generateReceipt(saleData, customer, prevBalance);
    }

    trackFeatureUsage(`sale_entry_${formData.type}`);
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
        totalAmount: 0,
        type: 'sale',
        receiptNumber: '',
        invoiceNumber: '',
        billNumber: ''
      });
      setEditingId(null);
      sigPad.current?.clear();
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.newSale}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t.monitorDescription || 'Record daily transactions efficiently'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'sale' })}
                className={cn(
                  "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  formData.type === 'sale' ? "bg-white dark:bg-slate-700 text-rose-600 shadow-sm" : "text-slate-500"
                )}
              >
                {t.due}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'direct' })}
                className={cn(
                  "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  formData.type === 'direct' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500"
                )}
              >
                {t.todaySales}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'payment' })}
                className={cn(
                  "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  formData.type === 'payment' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500"
                )}
              >
                {t.collection}
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 text-indigo-600">
                {editingId && (
                  <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[8px]">
                    {t.editingMode}
                  </span>
                )}
                <Calendar className="w-3 h-3" /> {t.date}
              </label>
              <input 
                required
                type="date"
                value={formData.date instanceof Date && !isNaN(formData.date.getTime()) ? formData.date.toISOString().split('T')[0] : ''}
                onChange={e => setFormData({...formData, date: new Date(e.target.value)})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
              />
            </div>

            {formData.type !== 'direct' && (
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
            )}

            {formData.type === 'payment' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-3 h-3 text-indigo-500" /> {t.moneyReceiptNumber}
                </label>
                <input 
                  required
                  type="text"
                  value={formData.receiptNumber}
                  onChange={e => setFormData({...formData, receiptNumber: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                  placeholder={t.mrPlaceholder}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3 text-indigo-500" /> {t.salesInvoiceNumber}
                  </label>
                  <input 
                    required
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                    placeholder="INV-..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3 h-3 text-indigo-500" /> {t.billNumber}
                  </label>
                  <input 
                    type="text"
                    value={formData.billNumber}
                    onChange={e => setFormData({...formData, billNumber: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                    placeholder="B-..."
                  />
                </div>
              </div>
            )}

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
            {formData.type !== 'payment' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {t.totalSalesAmount}
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</div>
                  <input 
                    required
                    type="number"
                    value={formData.totalAmount || ''}
                    onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg text-indigo-700 dark:text-indigo-400"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{formData.type === 'payment' ? t.cashReceived : t.cash}</label>
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
              {formData.type === 'sale' && (
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
              )}
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
                  {t.entrySaved}
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-12">
        <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800 bg-opacity-50">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            {t.todayTransactionHistory}
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dailySalesList?.length || 0} Entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-left">
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.date}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.type}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.description}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.amount}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dailySalesList?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-3.5 text-[11px] text-slate-500 font-medium">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-opacity-10",
                      s.type === 'sale' ? "bg-rose-500 text-rose-600" : 
                      s.type === 'payment' ? "bg-emerald-500 text-emerald-600" : 
                      "bg-indigo-500 text-indigo-600"
                    )}>
                      {s.type === 'sale' ? t.due : s.type === 'payment' ? t.collection : t.todaySales}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize max-w-[200px] truncate">{s.description || 'No description'}</td>
                  <td className="px-6 py-3.5 text-sm font-black text-slate-900 dark:text-white">
                    {formatCurrency((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0), currency)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(s);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-90"
                        title={t.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id!);
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-90"
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!dailySalesList || dailySalesList.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                    {t.noHistoryFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesEntry;
