import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
import { markForSync } from '../lib/sync';

import { useSettings } from '../context/SettingsContext';
import { trackFeatureUsage } from '../lib/analytics';

import SignaturePad from './SignaturePad';

const SalesEntry = ({ editingSale, setEditingSale }: { editingSale?: Sale | null, setEditingSale?: (sale: Sale | null) => void }) => {
  const { language, theme, currency, settings } = useSettings();
  const t = translations[language];
  const customers = useLiveQuery(() => db.customers.toArray());
  const [signature, setSignature] = useState<string | null>(null);

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
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<{sale: Sale, customer: any, prevBalance: number, company: any} | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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
            await markForSync('customers', customer.id!);
          }
        }
        await db.sales.delete(id);
        // Deletion sync is harder without a 'deleted' flag, 
        // usually we'd add isDeleted: true instead of actual delete for sync.
        // For now, we'll just delete locally and the cloud won't know unless we use a tombstone.
        // I'll skip markForSync for delete for now as our sync logic doesn't handle deletions yet.
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

  const handlePrintReceipt = async (sale: Sale) => {
    if (sale.type !== 'payment') return;
    
    setIsPrinting(true);
    try {
      const customer = await db.customers.get(sale.customerId!);
      if (!customer) throw new Error("Customer not found");

      const companySettingsList = await db.settings.toArray();
      const company = companySettingsList.length > 0 ? companySettingsList[0] : {
        companyName: 'CREDIT REGISTRY PRO',
        phone: '',
        email: '',
        address: '',
        website: ''
      };

      // Calculate previous balance for this specific sale
      const previousSales = await db.sales
        .where('customerId')
        .equals(sale.customerId!)
        .and(s => s.date < sale.date || (s.date.getTime() === sale.date.getTime() && s.id! < sale.id!))
        .toArray();
      
      const prevBal = previousSales.reduce((acc, curr) => {
        const amt = (curr.cashSale || 0) + (curr.chequeSale || 0) + (curr.creditSale || 0);
        if (curr.type === 'sale') return acc + (curr.creditSale || 0);
        if (curr.type === 'payment') return acc - amt;
        return acc;
      }, 0);

      setPrintData({ sale, customer, prevBalance: prevBal, company });
      
      // Wait for React to render the hidden receipt
      setTimeout(async () => {
        if (receiptRef.current) {
          const canvas = await html2canvas(receiptRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a5'
          });
          
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Money_Receipt_${sale.receiptNumber || sale.id}.pdf`);
          setPrintData(null);
          setIsPrinting(false);
          trackFeatureUsage('receipt_printed_html2canvas');
        }
      }, 500);
    } catch (error) {
      console.error("Print error:", error);
      setIsPrinting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.type !== 'direct' && !formData.customerId) {
      alert(t.selectCustomer);
      return;
    }

    // Get customer for balance before update
    let customer = null;
    if (formData.customerId) {
        customer = await db.customers.get(formData.customerId);
    }
    
    const prevBalance = customer ? customer.debit - customer.credit : 0;

    const saleData = {
      ...formData,
      date: new Date(formData.date || new Date()),
      signature: signature || undefined
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
            await markForSync('customers', oldCustomer.id!);
        }
      }
      await db.sales.update(editingId, saleData);
      await markForSync('sales', editingId);
      setEditingId(null);
      setOriginalSale(null);
    } else {
      const id = await db.sales.add(saleData);
      saleData.id = id as number;
      await markForSync('sales', id as number);
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
        await markForSync('customers', customerForNewValues.id!);
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
      setSignature(null);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-display font-bold tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]">{t.newSale}</h2>
          <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest opacity-80">{t.monitorDescription || 'Record daily transactions efficiently'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="surface-container p-8 space-y-6">
            <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'sale' })}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  formData.type === 'sale' ? "bg-white dark:bg-[#4F378B] text-brand-primary shadow-soft" : "text-slate-500"
                )}
              >
                {t.due}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'direct' })}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  formData.type === 'direct' ? "bg-white dark:bg-[#4F378B] text-brand-primary shadow-soft" : "text-slate-500"
                )}
              >
                {t.todaySales}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'payment' })}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  formData.type === 'payment' ? "bg-white dark:bg-[#4F378B] text-brand-primary shadow-soft" : "text-slate-500"
                )}
              >
                {t.collection}
              </button>
            </div>

            <div className="space-y-2">
              <label className="stat-label flex items-center gap-2 text-brand-primary">
                {editingId && (
                  <span className="bg-[#EADDFF] text-[#21005D] px-2 py-0.5 rounded-full text-[8px] font-black">
                    {t.editingMode}
                  </span>
                )}
                <Calendar className="w-4 h-4" /> {t.date}
              </label>
              <input 
                required
                type="date"
                value={formData.date instanceof Date && !isNaN(formData.date.getTime()) ? formData.date.toISOString().split('T')[0] : ''}
                onChange={e => setFormData({...formData, date: new Date(e.target.value)})}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm"
              />
            </div>

            {formData.type !== 'direct' && (
              <div className="space-y-2">
                <label className="stat-label flex items-center gap-2 text-brand-primary">
                  <UserIcon className="w-4 h-4" /> {t.customers}
                </label>
                <select 
                  required
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: Number(e.target.value)})}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold appearance-none text-sm"
                >
                  <option value={0}>{t.selectCustomer}</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.type === 'payment' ? (
              <div className="space-y-2">
                <label className="stat-label flex items-center gap-2 text-brand-primary">
                  <Hash className="w-4 h-4" /> {t.moneyReceiptNumber}
                </label>
                <input 
                  required
                  type="text"
                  value={formData.receiptNumber}
                  onChange={e => setFormData({...formData, receiptNumber: e.target.value})}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm"
                  placeholder={t.mrPlaceholder}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="stat-label flex items-center gap-2 text-brand-primary">
                    <FileText className="w-4 h-4" /> {t.salesInvoiceNumber}
                  </label>
                  <input 
                    required
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                    className="w-full px-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm"
                    placeholder="INV-..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="stat-label flex items-center gap-2 text-brand-primary">
                    <Hash className="w-4 h-4" /> {t.billNumber}
                  </label>
                  <input 
                    type="text"
                    value={formData.billNumber}
                    onChange={e => setFormData({...formData, billNumber: e.target.value})}
                    className="w-full px-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm"
                    placeholder="B-..."
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="stat-label flex items-center gap-2 text-brand-primary">
                <FileText className="w-4 h-4" /> {t.description}
              </label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold resize-none text-sm min-h-[120px]"
                rows={3}
                placeholder={t.detailsPlaceholder || 'Details...'}
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="surface-container p-8 space-y-6">
            {formData.type !== 'payment' && (
              <div className="space-y-2">
                <label className="stat-label text-brand-primary">
                  {t.totalSalesAmount}
                </label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black">{currency}</div>
                  <input 
                    required
                    type="number"
                    value={formData.totalAmount || ''}
                    onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})}
                    className="w-full pl-14 pr-5 py-5 rounded-[1.5rem] bg-[#EADDFF] dark:bg-[#4F378B] border-none focus:ring-4 focus:ring-brand-primary/20 outline-none font-black text-2xl text-[#21005D] dark:text-[#EADDFF] shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="stat-label">{formData.type === 'payment' ? t.cashReceived : t.cash}</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currency}</div>
                  <input 
                    type="number"
                    value={formData.cashSale || ''}
                    onChange={e => setFormData({...formData, cashSale: Number(e.target.value)})}
                    className="w-full pl-14 pr-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="stat-label">{t.cheque}</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currency}</div>
                  <input 
                    type="number"
                    value={formData.chequeSale || ''}
                    onChange={e => setFormData({...formData, chequeSale: Number(e.target.value)})}
                    className="w-full pl-14 pr-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-lg"
                  />
                </div>
              </div>
              {formData.type === 'sale' && (
                <div className="space-y-2">
                  <label className="stat-label">{t.credit}</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currency}</div>
                    <input 
                      type="number"
                      value={formData.creditSale || ''}
                      onChange={e => setFormData({...formData, creditSale: Number(e.target.value)})}
                      className="w-full pl-14 pr-5 py-3.5 rounded-2xl bg-[#F3EDF7] dark:bg-[#2B2930] border-none focus:ring-2 focus:ring-brand-primary outline-none font-bold text-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <SignaturePad 
                onSave={(sig) => setSignature(sig)}
                onClear={() => setSignature(null)}
              />
            </div>

            <button 
              type="submit"
              disabled={isSuccess}
              className={cn(
                "w-full py-5 rounded-full font-black text-lg transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95",
                isSuccess 
                  ? "bg-emerald-600 text-white shadow-emerald-600/20" 
                  : "bg-[#6750A4] hover:bg-[#4F378B] text-white shadow-black/20"
              )}
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  {t.entrySaved}
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  {t.save}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="surface-container overflow-hidden mt-12">
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <h3 className="stat-label flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-primary" />
            {t.todayTransactionHistory}
          </h3>
          <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">{dailySalesList?.length || 0} Entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-left">
                <th className="px-6 py-4 stat-label">{t.date}</th>
                <th className="px-6 py-4 stat-label">{t.type}</th>
                <th className="px-6 py-4 stat-label">{t.description}</th>
                <th className="px-6 py-4 stat-label">{t.amount}</th>
                <th className="px-6 py-4 stat-label text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {dailySalesList?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s) => (
                <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5 text-[11px] text-slate-500 font-bold">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-opacity-10",
                      s.type === 'sale' ? "bg-rose-500 text-rose-600 border border-rose-500/20" : 
                      s.type === 'payment' ? "bg-emerald-500 text-emerald-600 border border-emerald-500/20" : 
                      "bg-brand-primary text-brand-primary border border-brand-primary/20"
                    )}>
                      {s.type === 'sale' ? t.due : s.type === 'payment' ? t.collection : t.todaySales}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-[#1D1B20] dark:text-[#E6E1E5] capitalize max-w-[200px] truncate">{s.description || t.noDescription || 'No description'}</td>
                  <td className="px-6 py-5 text-base font-black text-brand-primary">
                    {formatCurrency((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0), currency)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {s.type === 'payment' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintReceipt(s);
                          }}
                          disabled={isPrinting}
                          className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-full transition-all active:scale-90"
                          title={t.printReceipt}
                        >
                          {isPrinting && printData?.sale.id === s.id ? (
                            <Printer className="w-5 h-5 animate-pulse" />
                          ) : (
                            <Printer className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(s);
                        }}
                        className="p-3 text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all active:scale-90"
                        title={t.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id!);
                        }}
                        className="p-3 text-rose-600 hover:bg-rose-100 rounded-full transition-all active:scale-90"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-bold italic">
                    {t.noHistoryFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Receipt Template for html2canvas */}
      {printData && (
        <div className="fixed left-[-9999px] top-[-9999px]">
          <div 
            ref={receiptRef}
            className="w-[210mm] min-h-[148mm] bg-white text-slate-900 p-12 font-sans relative overflow-hidden"
            style={{ width: '210mm', height: '148mm' }}
          >
            {/* Branding Background Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50" />
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-8 mb-8">
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-indigo-600 mb-2 uppercase">
                    {printData.company.companyName}
                  </h1>
                  <div className="flex flex-col text-sm text-slate-500 font-bold uppercase tracking-wider">
                    <span>{printData.company.address || 'Business Logistics & Ledger'}</span>
                    <span>{printData.company.phone ? `Phone: ${printData.company.phone}` : ''} {printData.company.email ? ` | Email: ${printData.company.email}` : ''}</span>
                    {printData.company.website && <span>{printData.company.website}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-300 uppercase tracking-[0.2em]">Money Receipt</h2>
                  <div className="mt-4 inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">
                    #{printData.sale.receiptNumber || printData.sale.id}
                  </div>
                </div>
              </div>

              {/* Transaction Content */}
              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.date}</p>
                      <p className="text-lg font-bold text-slate-900">{new Date(printData.sale.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.receivedFrom}</p>
                      <p className="text-2xl font-black text-indigo-900">{printData.customer.name}</p>
                      <p className="text-sm text-slate-500 font-medium">{printData.customer.phone}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.description}</p>
                      <p className="text-lg font-bold text-slate-700">{printData.sale.description || 'Professional Payment Receipt'}</p>
                    </div>
                  </div>
                </div>

                {/* Ledger Summary */}
                <div className="mt-12">
                  <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-6">
                    <div className="text-center px-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.previousBalance}</p>
                      <p className="text-xl font-bold text-slate-600">{formatCurrency(printData.prevBalance, currency)}</p>
                    </div>
                    <div className="text-center px-4 border-l border-r border-slate-100">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t.cashReceived}</p>
                      <p className="text-2xl font-black text-emerald-600">{formatCurrency((printData.sale.cashSale || 0) + (printData.sale.chequeSale || 0) + (printData.sale.creditSale || 0), currency)}</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{t.newBalance}</p>
                      <p className="text-xl font-bold text-indigo-600">{formatCurrency(printData.prevBalance - ((printData.sale.cashSale || 0) + (printData.sale.chequeSale || 0) + (printData.sale.creditSale || 0)), currency)}</p>
                    </div>
                  </div>
                </div>

                {/* Amount in Words */}
                <div className="bg-slate-50 p-6 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">{t.amountInWords}</p>
                   <p className="text-sm font-bold text-slate-700 italic">
                     {amountToWords((printData.sale.cashSale || 0) + (printData.sale.chequeSale || 0) + (printData.sale.creditSale || 0))}
                   </p>
                </div>
              </div>

              {/* Footer / Signature */}
              <div className="mt-12 flex justify-between items-end">
                <div className="text-[10px] text-slate-400 font-bold max-w-[250px]">
                  * This is a computer generated document. Securely logged in Credit Registry System.
                </div>
                <div className="flex flex-col items-center">
                  {printData.sale.signature && (
                    <img src={printData.sale.signature} alt="Signature" className="h-16 mb-2" />
                  )}
                  <div className="w-48 h-[1px] bg-slate-900 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{t.authorizedSignature}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesEntry;
