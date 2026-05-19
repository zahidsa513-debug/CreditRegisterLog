import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, User, Phone, MapPin, ChevronRight, 
  Printer, Mail, Store, FileText, Camera, 
  Trash2, Edit2, X, Download, ExternalLink,
  Info, Calendar, CreditCard, DollarSign,
  UploadCloud, Navigation, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency, compressImage } from '../lib/utils';
import { Customer, Language, Sale } from '../types';
import { getWhatsAppLink } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { markForSync } from '../lib/sync';

import { trackFeatureUsage } from '../lib/analytics';
import { useSettings } from '../context/SettingsContext';

const CustomerProfile = ({ redEyeActive }: { redEyeActive?: boolean }) => {
  const { language, currency } = useSettings();
  const t = translations[language];
  const customers = useLiveQuery(() => db.customers.toArray());
  const areas = useLiveQuery(() => db.areas.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    setShowAllTransactions(false);
  }, [selectedCustomer?.id]);

  const customerTransactions = sales?.filter(s => String(s.customerId) === String(selectedCustomer?.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  
  const displayedTransactions = showAllTransactions ? customerTransactions : customerTransactions.slice(0, 5);

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleEdit = (customer: Customer) => {
    setEditFormData(customer);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editFormData.id && editFormData.name) {
      try {
        await db.customers.update(editFormData.id, editFormData);
        await markForSync('customers', editFormData.id);
        setSelectedCustomer({ ...selectedCustomer, ...editFormData } as Customer);
        setIsEditing(false);
      } catch (error) {
        console.error("Update failed", error);
        alert(language === 'en' ? "Failed to update profile" : "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে");
      }
    }
  };

  const handleLocationFetch = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setEditFormData({
          ...editFormData,
          location: { lat: latitude, lng: longitude },
          address: editFormData.address || `${language === 'en' ? 'Location' : 'অবস্থান'}: ${coordsStr}`
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Error fetching location", error);
        setIsLocating(false);
        alert(language === 'en' ? "Could not fetch location" : "লোকেশন পাওয়া যায়নি");
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'licensePhoto' | 'shopImage' | 'customerPhoto' | 'documents') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const processFile = async (file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          resolve(compressed);
        };
        reader.readAsDataURL(file);
      });
    };

    if (field === 'documents') {
      const newDocs: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await processFile(files[i]);
        newDocs.push(compressed);
      }
      setEditFormData({ 
        ...editFormData, 
        documents: [...(editFormData.documents || []), ...newDocs] 
      });
    } else {
      const compressed = await processFile(files[0]);
      setEditFormData({ ...editFormData, [field]: compressed });
    }
  };

  const removePhoto = (field: 'licensePhoto' | 'shopImage' | 'customerPhoto') => {
    setEditFormData({ ...editFormData, [field]: '' });
  };

  const handleDelete = async (id: number) => {
    if (confirm(language === 'en' ? 'Are you sure you want to delete this customer?' : 'আপনি কি নিশ্চিত যে আপনি এই কাস্টমারকে ডিলিট করতে চান?')) {
      await db.customers.delete(id);
      await db.sales.where('customerId').equals(id).delete();
      setSelectedCustomer(null);
    }
  };

  const printFullProfile = async (customer: Customer) => {
    const doc = new jsPDF() as any;
    const companySettingsList = await db.settings.toArray();
    const company = companySettingsList.length > 0 ? companySettingsList[0] : {
      companyName: 'CREDIT REGISTERPRO',
      phone: '',
      email: '',
      address: '',
      website: '',
      logo: ''
    };

    const area = areas?.find(a => String(a.id) === String(customer.areaId));
    const customerSales = sales?.filter(s => String(s.customerId) === String(customer.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
    
    // Page Settings
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // --- BRANDING COLORS ---
    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo-600
    const secondaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
    const successColor: [number, number, number] = [16, 185, 129]; // Emerald-500
    const accentColor: [number, number, number] = [244, 63, 94]; // Rose-500

    // --- HEADER ---
    doc.setFillColor(...secondaryColor); // Dark Header
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    if (company.logo) {
      try {
        doc.addImage(company.logo, 'PNG', 14, 10, 25, 25);
      } catch (e) {
        console.error("Logo error", e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(company.companyName.toUpperCase(), company.logo ? 45 : 14, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(company.address || 'Business Logistics & Digital Ledger', company.logo ? 45 : 14, 30);
    doc.text(`${company.phone ? 'Tel: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, company.logo ? 45 : 14, 35);
    if (company.website) doc.text(company.website, company.logo ? 45 : 14, 40);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(language === 'en' ? 'KYC BUSINESS PROFILE' : 'ব্যবাসায়িক কেওয়াইসি প্রোফাইল', pageWidth - 14, 25, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`CERTIFICATE ID: #CRP-${customer.id}-${new Date().getTime().toString().substr(-6)}`, pageWidth - 14, 32, { align: 'right' });
    doc.text(`GENERATION DATE: ${new Date().toLocaleString()}`, pageWidth - 14, 37, { align: 'right' });

    // --- CUSTOMER IDENTITY SECTION ---
    let currentY = 65;
    
    // Profile Picture Box
    if (customer.customerPhoto) {
      try {
        doc.setDrawColor(230);
        doc.setLineWidth(0.5);
        doc.roundedRect(pageWidth - 54, currentY - 5, 40, 40, 3, 3, 'D');
        doc.addImage(customer.customerPhoto, 'JPEG', pageWidth - 53, currentY - 4, 38, 38);
      } catch (e) {
        console.error("Error adding customer photo:", e);
      }
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'en' ? 'IDENTITY & SHOP INFORMATION' : 'পরিচয় ও দোকানের তথ্য', 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      margin: { right: customer.customerPhoto ? 60 : 14 },
      body: [
        [language === 'en' ? 'Legal Owner Name' : 'মালিকের পূর্ণ নাম', customer.ownerName || customer.name],
        [language === 'en' ? 'Trade Name / Shop' : 'দোকান বা প্রতিষ্ঠানের নাম', customer.shopName || 'N/A'],
        [language === 'en' ? 'Contact Number' : 'ফোন নাম্বার', customer.phone],
        [language === 'en' ? 'Email Address' : 'ইমেইল এড্রেস', customer.email || 'N/A'],
        [language === 'en' ? 'Assigned Area' : 'নির্ধারিত এলাকা', area?.name || 'N/A'],
        [language === 'en' ? 'Verified Address' : 'যাচাইকৃত ঠিকানা', customer.address || 'N/A'],
        [language === 'en' ? 'Coordinates (LAT/LNG)' : 'ভৌগোলিক স্থানাঙ্ক', customer.location ? `${customer.location.lat}, ${customer.location.lng}` : 'N/A'],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [230, 230, 230] },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 50 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- FINANCIAL SUMMARY ---
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'en' ? 'FINANCIAL STANDING' : 'আর্থিক অবস্থা', 14, currentY);
    
    const balance = (customer.debit || 0) - (customer.credit || 0);
    autoTable(doc, {
      startY: currentY + 5,
      body: [
        [language === 'en' ? 'TOTAL PURCHASES (DEBIT)' : 'মোট ক্রয় (ডেবিট)', formatCurrency(customer.debit || 0, currency)],
        [language === 'en' ? 'TOTAL RECEIVED (CREDIT)' : 'মোট পরিশোধ (ক্রেডিট)', formatCurrency(customer.credit || 0, currency)],
        [language === 'en' ? 'CURRENT OUTSTANDING' : 'বর্তমান বকেয়া', { content: formatCurrency(balance, currency), styles: { fontStyle: 'bold', textColor: balance > 0 ? accentColor : successColor } }],
      ],
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 6 },
      columnStyles: { 0: { cellWidth: 70, fillColor: [248, 250, 252], fontStyle: 'bold' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- TRANSACTION HISTORY ---
    if (customerSales.length > 0) {
      if (currentY + 40 > pageHeight) { doc.addPage(); currentY = 20; }
      
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'en' ? 'RECENT LEDGER ENTRIES' : 'সাম্প্রতিক লেনদেন সমূহ', 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [[
          language === 'en' ? 'DATE' : 'তারিখ',
          language === 'en' ? 'REF/DOC #' : 'রেফ নং',
          language === 'en' ? 'NARRATION' : 'বিবরণ',
          language === 'en' ? 'ENTRY' : 'ধরণ',
          language === 'en' ? 'AMOUNT' : 'পরিমাণ'
        ]],
        body: customerSales.slice(0, 20).map(s => [
          new Date(s.date).toLocaleDateString(),
          s.invoiceNumber || s.receiptNumber || s.billNumber || '-',
          s.description || 'Verified Batch Entry',
          s.type === 'sale' ? (language === 'en' ? 'DEBIT' : 'ডেবিট') : (language === 'en' ? 'CREDIT' : 'ক্রেডিট'),
          formatCurrency(s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0)), currency)
        ]),
        theme: 'striped',
        headStyles: { fillColor: secondaryColor, textColor: 255, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- ATTACHMENTS & VERIFICATION ---
    const attachments = [
      { img: customer.shopImage, label: language === 'en' ? 'SHOP PREMISES PICTURE' : 'দোকানের ছবি' },
      { img: customer.licensePhoto, label: language === 'en' ? 'GOVERNMENT LICENSE / TRADE ID' : 'ট্রেড লাইসেন্স / পরিচয়পত্র' },
      ...(customer.documents || []).map((d, index) => ({ img: d, label: `${language === 'en' ? 'SUPPORTING DOCUMENT' : 'সহায়ক দলিল'} #${index + 1}` }))
    ].filter(a => a.img);

    if (attachments.length > 0) {
      doc.addPage();
      currentY = 25;
      doc.setTextColor(...primaryColor);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'en' ? 'DOCUMENTARY EVIDENCE' : 'কাগজপত্র ও প্রমাণাদি', 14, currentY);
      
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(14, currentY + 2, 80, currentY + 2);
      
      currentY += 15;
      
      for (const attachment of attachments) {
        if (currentY + 110 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(11);
        doc.setTextColor(...secondaryColor);
        doc.setFont('helvetica', 'bold');
        doc.text(attachment.label, 14, currentY);
        
        try {
          if (attachment.img?.startsWith('data:image')) {
            doc.addImage(attachment.img, 'JPEG', 14, currentY + 5, 182, 95, undefined, 'FAST');
            currentY += 110;
          } else {
            doc.setFont('helvetica', 'italic');
            doc.text('[Non-Image File or Link Attached]', 14, currentY + 10);
            currentY += 20;
          }
        } catch (e) {
          console.error("Error adding attachment:", e);
          currentY += 10;
        }
      }
    }

    // --- FINAL FOOTER BARS ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer Line
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
      
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text(`This document is electronically generated and holds a record of the merchant's financial standing as per ${company.companyName} records.`, 14, pageHeight - 11);
      doc.text(`Page ${i} of ${pageCount} | System Verified | Confidential`, pageWidth - 14, pageHeight - 11, { align: 'right' });
    }

    doc.save(`${customer.name.replace(/\s+/g, '_')}_Full_Profile.pdf`);
    trackFeatureUsage('customer_full_profile_print');
  };

  const generateLedger = async (customer: Customer) => {
    const doc = new jsPDF();
    const customerSales = sales?.filter(s => String(s.customerId) === String(customer.id)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text('CUSTOMER TRANSACTION LEDGER', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer: ${customer.name}`, 14, 30);
    doc.text(`Shop: ${customer.shopName || 'N/A'}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);

    const ledgerData = customerSales.map(s => {
      const totalAmount = s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0));
      return [
        new Date(s.date).toLocaleDateString(),
        s.description || (s.type === 'sale' ? 'Sale' : 'Payment'),
        s.type === 'sale' ? formatCurrency(totalAmount, currency) : '',
        s.type === 'payment' ? formatCurrency(totalAmount, currency) : '',
        s.invoiceNumber || s.receiptNumber || '-'
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['DATE', 'DESCRIPTION', 'DEBIT (+)', 'CREDIT (-)', 'REF #']],
      body: ledgerData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    const finalBalance = (customer.debit || 0) - (customer.credit || 0);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL OUTSTANDING BALANCE: ${formatCurrency(finalBalance, currency)}`, 14, (doc as any).lastAutoTable.finalY + 10);

    doc.save(`${customer.name}_Ledger.pdf`);
  };

  const sendWhatsAppReminder = (customer: Customer) => {
    const balance = (customer.debit || 0) - (customer.credit || 0);
    const message = language === 'en'
      ? `Hello ${customer.name}, this is a friendly reminder that your current outstanding balance at CreditRegistry is ${formatCurrency(balance, currency)}. Please arrange for payment at your earliest convenience. Thank you!`
      : `আসসালামু আলাইকুম ${customer.name}, ক্রেডিট-রেজিস্ট্রি থেকে জানানো হচ্ছে যে আপনার বর্তমান বকেয়া পরিমাণ ${formatCurrency(balance, currency)}। অতি দ্রুত পরিশোধের জন্য অনুরোধ করা হলো। ধন্যবাদ।`;
    
    const link = getWhatsAppLink(customer.phone, message);
    window.open(link, '_blank');
  };

  if (selectedCustomer) {
    const area = areas?.find(a => String(a.id) === String(selectedCustomer.areaId));
    const balance = (selectedCustomer.debit || 0) - (selectedCustomer.credit || 0);

    return (
      <div className="space-y-10 pb-16">
        <div className="flex flex-col md:flex-row md:items-center gap-6 surface-container p-6 shadow-soft">
          <button 
            onClick={() => setSelectedCustomer(null)}
            className="p-4 bg-black/5 dark:bg-white/5 hover:bg-brand-primary/10 text-slate-500 hover:text-brand-primary rounded-full transition-all active:scale-90"
          >
            <ChevronRight className="w-7 h-7 rotate-180" />
          </button>
          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-brand-primary/5 text-brand-primary rounded-3xl flex items-center justify-center font-black text-3xl shadow-inner overflow-hidden border-2 border-brand-primary/20">
                {selectedCustomer.customerPhoto ? (
                  <img src={selectedCustomer.customerPhoto} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                ) : selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <h2 className={cn("text-3xl font-display font-black tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>{selectedCustomer.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#21005D] bg-[#EADDFF] px-3 py-1 rounded-full">{selectedCustomer.shopName || 'Retailer'}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-70">ID: #{selectedCustomer.id} • Registered Oct 24</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => sendWhatsAppReminder(selectedCustomer)}
              className="px-6 py-4 bg-emerald-600 text-white rounded-full hover:brightness-110 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Phone className="w-5 h-5" /> WhatsApp
            </button>
            <button 
              onClick={() => generateLedger(selectedCustomer)}
              className="px-6 py-4 bg-[#F3EDF7] dark:bg-[#2B2930] text-[#6750A4] dark:text-[#D0BCFF] rounded-full hover:brightness-95 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 active:scale-95"
            >
              <FileText className="w-5 h-5" /> Ledger
            </button>
            <button 
              onClick={() => printFullProfile(selectedCustomer)}
              className="px-6 py-4 bg-brand-primary text-white rounded-full hover:brightness-110 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-brand-primary/20 active:scale-95"
            >
              <Printer className="w-5 h-5" /> Full Profile
            </button>
            <button 
              onClick={() => handleEdit(selectedCustomer)}
              className="p-4 bg-brand-primary/5 dark:bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary/20 transition-all active:scale-95"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="surface-container p-10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-full -mr-24 -mt-24 blur-3xl" />
              
              <div className="text-center mb-10 relative z-10">
                <div className="relative inline-block mb-8">
                  <div className="w-48 h-48 rounded-[3rem] bg-[#F3EDF7] dark:bg-[#21005D]/20 p-2 border-4 border-[#D0BCFF] dark:border-[#4F378B] shadow-2xl relative">
                    {selectedCustomer.customerPhoto ? (
                      <img 
                        src={selectedCustomer.customerPhoto} 
                        alt="customer" 
                        className="w-full h-full rounded-[2.5rem] object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-primary text-white rounded-[2.5rem] flex items-center justify-center text-7xl font-display font-black">
                        {selectedCustomer.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#21005D] text-white rounded-3xl flex items-center justify-center border-4 border-white dark:border-[#1D1B20] shadow-2xl rotate-12 scale-110">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  </div>
                </div>
                <h3 className={cn("text-3xl font-display font-black tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]", redEyeActive && "blur-sm")}>{selectedCustomer.name}</h3>
                <p className="text-brand-primary font-black text-[10px] uppercase tracking-[0.3em] mt-2 opacity-80">{selectedCustomer.shopName || 'STORE OWNER'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                  <p className="stat-label">Balance</p>
                  <p className={cn("text-2xl font-black mt-2", balance > 0 ? "text-rose-600" : "text-emerald-600", redEyeActive && "blur-sm")}>
                    {formatCurrency(balance, currency)}
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                  <p className="stat-label">Cluster</p>
                  <p className="text-sm font-black text-brand-primary mt-3 truncate uppercase tracking-widest">
                    {area?.name || 'GENERIC'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <a href={`tel:${selectedCustomer.phone}`} className="flex items-center gap-5 p-5 bg-[#F3EDF7] dark:bg-[#2B2930] rounded-3xl border border-transparent hover:border-brand-primary/20 transition-all group active:scale-95">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#4F378B] flex items-center justify-center text-brand-primary dark:text-[#D0BCFF] shadow-soft group-hover:scale-110 transition-transform">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="stat-label lowercase">Primary Contact</p>
                    <p className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5]">{selectedCustomer.phone}</p>
                  </div>
                </a>
                <a href={`mailto:${selectedCustomer.email}`} className="flex items-center gap-5 p-5 bg-[#F3EDF7] dark:bg-[#2B2930] rounded-3xl border border-transparent hover:border-brand-primary/20 transition-all group active:scale-95">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#4F378B] flex items-center justify-center text-brand-primary dark:text-[#D0BCFF] shadow-soft group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="stat-label lowercase">Digital Link</p>
                    <p className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5] truncate">{selectedCustomer.email || 'N/A'}</p>
                  </div>
                </a>
              </div>
            </motion.div>

            {selectedCustomer.location && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="surface-container p-10 mt-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <h4 className="stat-label flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500" /> Logistics Hub
                  </h4>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedCustomer.location.lat},${selectedCustomer.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline flex items-center gap-2"
                  >
                    Satellite View <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="aspect-[16/9] bg-[#F3EDF7] dark:bg-[#2B2930] rounded-[2rem] flex flex-col items-center justify-center text-center p-8 border border-brand-primary/10 shadow-inner">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6 shadow-soft">
                    <Navigation className="w-10 h-10 text-rose-500 animate-pulse" />
                  </div>
                  <p className="stat-label mb-2">GPS Verification Matrix</p>
                  <p className="text-sm font-mono text-slate-500 tracking-widest">{selectedCustomer.location.lat.toFixed(6)}, {selectedCustomer.location.lng.toFixed(6)}</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-10">
            {/* Transaction History Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="surface-container overflow-hidden p-0 shadow-soft"
            >
              <div className="p-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/5">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-[#EADDFF] text-[#21005D] rounded-3xl">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-display font-black tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]">{t.transactionHistory}</h4>
                    <p className="stat-label text-slate-500">
                      {showAllTransactions ? 'ENTERPRISE AUDIT TRAIL' : 'LATEST OPERATIONAL ENTRIES'}
                    </p>
                  </div>
                </div>
                {customerTransactions.length > 5 && (
                  <button 
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                    className="px-6 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-[#E6E1E5] rounded-full transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 active:scale-95"
                  >
                    {showAllTransactions ? t.showLess : t.viewAllTransactions}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-black/5 dark:bg-white/5">
                      <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.date}</th>
                      <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.description}</th>
                      <th className="px-10 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.type}</th>
                      <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {displayedTransactions.length > 0 ? (
                      displayedTransactions.map((s, idx) => {
                        const totalAmount = s.totalAmount || ((s.cashSale || 0) + (s.chequeSale || 0) + (s.creditSale || 0));
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={s.id || idx}
                            className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="px-10 py-6 whitespace-nowrap">
                              <span className="text-sm font-black text-[#49454F] dark:text-[#E6E1E5]">
                                {new Date(s.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-10 py-6">
                              <p className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5] truncate max-w-[250px]">
                                {s.description || '-'}
                              </p>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                                {s.invoiceNumber || s.receiptNumber || s.billNumber || '#CRP-BATCH-DATA'}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-2 shadow-sm",
                                s.type === 'sale' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                              )}>
                                {s.type === 'sale' ? t.due : t.collection}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-right whitespace-nowrap">
                              <span className={cn(
                                "text-lg font-black",
                                s.type === 'sale' ? "text-rose-600" : "text-emerald-600",
                                redEyeActive && "blur-sm"
                              )}>
                                {s.type === 'sale' ? '+' : '-'}{formatCurrency(totalAmount, currency)}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-10 py-24 text-center">
                          <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-slate-300" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 opacity-60 italic">{t.noHistoryFound}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="surface-container p-12"
            >
              <div className="flex items-center gap-5 mb-12">
                <div className="p-4 bg-brand-primary/10 text-brand-primary rounded-3xl">
                  <Info className="w-8 h-8" />
                </div>
                <h4 className="text-3xl font-display font-black tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]">Corporate Intelligence</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3 p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                  <h5 className="stat-label">System Legal Name</h5>
                  <p className={cn("text-xl font-black text-[#49454F] dark:text-[#E6E1E5] uppercase tracking-tight", redEyeActive && "blur-sm")}>{selectedCustomer.ownerName || selectedCustomer.name}</p>
                </div>
                <div className="space-y-3 p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                  <h5 className="stat-label">Network Entry Point</h5>
                  <p className="text-xl font-black text-[#49454F] dark:text-[#E6E1E5] uppercase tracking-tight">Enterprise Node - verified</p>
                </div>
                <div className="md:col-span-2 space-y-3 p-8 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 relative overflow-hidden shadow-inner">
                  <h5 className="stat-label">Verified Logistics Coordinates</h5>
                  <p className="text-2xl font-black text-[#49454F] dark:text-[#E6E1E5] leading-relaxed mt-4 uppercase tracking-tight">{selectedCustomer.address || 'NO COORDINATES RECORDED'}</p>
                  <MapPin className="absolute -right-8 -bottom-8 w-40 h-40 text-brand-primary opacity-5 pointer-events-none" />
                </div>
              </div>

              <div className="mt-16">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <Camera className="w-6 h-6 text-brand-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 opacity-60">Architectural Assets</h4>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {selectedCustomer.licensePhoto && (
                    <motion.div whileHover={{ scale: 1.05, rotate: -2 }} className="group relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-[#1D1B20]">
                      <img src={selectedCustomer.licensePhoto} className="w-full h-full object-cover" alt="License" />
                      <div className="absolute inset-0 bg-[#21005D]/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4 text-center">
                        <Download className="w-8 h-8 text-white mb-3" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">IDENTIFICATION<br/>MATRIX</span>
                      </div>
                    </motion.div>
                  )}
                  {selectedCustomer.documents?.map((doc, idx) => (
                    <motion.div key={idx} whileHover={{ scale: 1.05, rotate: 2 }} className="group relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-[#1D1B20]">
                      <img src={doc} className="w-full h-full object-cover" alt={`doc-${idx}`} />
                      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4 text-center">
                        <Download className="w-8 h-8 text-white mb-3" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">ASSET ENTITY<br/>#{idx + 1}</span>
                      </div>
                    </motion.div>
                  ))}
                  {(!selectedCustomer.licensePhoto && !selectedCustomer.documents?.length) && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-black/5 dark:border-white/5 rounded-[3rem]">
                      <UploadCloud className="w-20 h-20 mb-6 opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">Repository currently empty</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#FEF7FF] dark:bg-[#1D1B20] w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl my-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-display font-bold text-[#1D1B20] dark:text-[#E6E1E5]">{t.editCustomer}</h3>
                </div>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#49454F] dark:text-[#CAC4D0]" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Shop Section */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] flex items-center gap-3">
                      <Store className="w-4 h-4" /> {language === 'en' ? 'Shop Information' : 'দোকানের তথ্য'}
                    </h4>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">Shop Name</label>
                      <input 
                        type="text" 
                        value={editFormData.shopName}
                        onChange={e => setEditFormData({...editFormData, shopName: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border-none focus:ring-2 focus:ring-brand-primary outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">{language === 'en' ? 'Area' : 'এলাকা'}</label>
                      <div className="relative">
                        <select 
                          required
                          value={editFormData.areaId}
                          onChange={e => setEditFormData({...editFormData, areaId: Number(e.target.value)})}
                          className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border-none focus:ring-2 focus:ring-brand-primary outline-none text-sm appearance-none transition-all"
                        >
                          {areas?.map(area => (
                            <option key={area.id} value={area.id}>{area.name}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">Address</label>
                      <textarea 
                        value={editFormData.address}
                        onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border-none focus:ring-2 focus:ring-brand-primary outline-none text-sm min-h-[120px] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">{language === 'en' ? 'Shop Front Picture' : 'দোকানের সামনের ছবি'}</label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 flex flex-col items-center justify-center p-6 bg-black/5 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl hover:border-brand-primary transition-all cursor-pointer group relative overflow-hidden h-32">
                          {editFormData.shopImage ? (
                            <>
                              <img src={editFormData.shopImage} className="absolute inset-0 w-full h-full object-cover" alt="shop front" />
                              <div className="absolute inset-0 bg-brand-primary/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                              </div>
                            </>
                          ) : (
                            <>
                              <Camera className="w-8 h-8 text-slate-300 group-hover:text-brand-primary mb-2 transition-colors" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Upload' : 'আপলোড'}</span>
                            </>
                          )}
                          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => handleFileUpload(e, 'shopImage')} />
                        </label>
                        {editFormData.shopImage && (
                          <button 
                            type="button" 
                            onClick={() => removePhoto('shopImage')}
                            className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={handleLocationFetch}
                      disabled={isLocating}
                      className="w-full py-4 px-6 bg-black/5 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest font-black text-slate-600 dark:text-slate-400 hover:border-brand-primary transition-all"
                    >
                      {isLocating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-primary border-t-transparent" />
                      ) : (
                        <Navigation className="w-4 h-4 text-brand-primary" />
                      )}
                      {editFormData.location ? 'Location Synced' : 'Sync Coordinates'}
                    </button>
                  </div>

                  {/* Owner Section */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] flex items-center gap-3">
                      <User className="w-4 h-4" /> {language === 'en' ? 'Owner Information' : 'মালিকের তথ্য'}
                    </h4>

                    {/* Customer Photo Upload */}
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">{language === 'en' ? 'Customer Profile Photo' : 'কাস্টমারের প্রোফাইল ছবি'}</label>
                       <div className="flex items-center gap-4">
                         <label className="shrink-0 w-24 h-24 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-primary transition-all cursor-pointer group relative overflow-hidden">
                           {editFormData.customerPhoto ? (
                             <>
                               <img src={editFormData.customerPhoto} className="absolute inset-0 w-full h-full object-cover" alt="customer" />
                               <div className="absolute inset-0 bg-brand-primary/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Camera className="w-8 h-8 text-white" />
                               </div>
                             </>
                           ) : (
                             <div className="flex flex-col items-center justify-center h-full">
                               <Camera className="w-8 h-8 text-slate-300 group-hover:text-brand-primary mb-1 transition-colors" />
                               <span className="text-[8px] font-black text-slate-400 uppercase">Profile</span>
                             </div>
                           )}
                           <input type="file" className="hidden" accept="image/*" capture="user" onChange={e => handleFileUpload(e, 'customerPhoto')} />
                         </label>
                         {editFormData.customerPhoto && (
                           <button 
                             type="button" 
                             onClick={() => removePhoto('customerPhoto')}
                             className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-colors"
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                         )}
                         <div className="flex-1">
                           <p className="text-[10px] text-slate-400 italic">
                             {language === 'en' ? 'High-fidelity portrait required for system verification.' : 'সিস্টেম ভেরিফিকেশনের জন্য ছবি প্রয়োজন।'}
                           </p>
                         </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">Owner Name</label>
                      <input 
                        type="text" 
                        value={editFormData.name}
                        onChange={e => setEditFormData({...editFormData, name: e.target.value, ownerName: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border-none focus:ring-2 focus:ring-brand-primary outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">Phone</label>
                      <input 
                        type="tel" 
                        value={editFormData.phone}
                        onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border-none focus:ring-2 focus:ring-brand-primary outline-none text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-tight">Email</label>
                      <input 
                        type="email" 
                        value={editFormData.email}
                        onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border-none focus:ring-2 focus:ring-brand-primary outline-none text-sm transition-all"
                      />
                    </div>
                    {/* Documents Section */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-widest">{language === 'en' ? 'License & Documents' : 'লাইসেন্স এবং ডকুমেন্টস'}</label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col items-center justify-center p-4 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-primary transition-all cursor-pointer group relative overflow-hidden">
                          {editFormData.licensePhoto ? (
                            <div className="relative w-full h-12">
                              <img src={editFormData.licensePhoto} className="w-full h-full object-cover rounded-xl" alt="license" />
                              <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-white rounded-full shadow-sm" />
                              <button 
                                type="button" 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); removePhoto('licensePhoto'); }}
                                className="absolute -bottom-1 -right-1 p-1 bg-rose-600 text-white rounded-md shadow-lg"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-slate-300 group-hover:text-brand-primary mb-1" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">License</span>
                            </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'licensePhoto')} />
                        </label>

                        <label className="flex flex-col items-center justify-center p-4 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-primary transition-all cursor-pointer group">
                          <UploadCloud className="w-5 h-5 text-slate-300 group-hover:text-brand-primary mb-1" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {editFormData.documents?.length ? `${editFormData.documents.length} Assets` : 'Archive'}
                          </span>
                          <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={e => handleFileUpload(e, 'documents')} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 active:scale-95 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all">Synchronize Entry</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-black tracking-tight text-[#1D1B20] dark:text-[#E6E1E5]">{t.customerProfile}</h2>
          <p className="text-slate-500 font-medium mt-1">{language === 'en' ? 'Authorized personnel access only. Select a record node.' : 'অনুমোদিত ব্যক্তিরা শুধুমাত্র এক্সেস করতে পারবেন। একটি রেকর্ড নোড সিলেক্ট করুন।'}</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-primary transition-colors" />
        <input 
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#F3EDF7] dark:bg-[#2B2930] text-[#1D1B20] dark:text-[#E6E1E5] border-none pl-14 pr-6 py-5 rounded-[2rem] shadow-inner outline-none focus:ring-2 focus:ring-brand-primary transition-all font-bold text-base"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCustomers?.map((customer) => {
          const area = areas?.find(a => String(a.id) === String(customer.areaId));
          const balance = (customer.debit || 0) - (customer.credit || 0);
          
          return (
            <motion.div 
              key={customer.id}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => setSelectedCustomer(customer)}
              className="surface-container rounded-[3rem] p-8 shadow-soft hover:shadow-premium transition-all cursor-pointer group border-2 border-transparent hover:border-brand-primary/20"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="shrink-0 transition-transform group-hover:rotate-6">
                  {customer.shopImage ? (
                    <img src={customer.shopImage} className="w-20 h-20 rounded-[2rem] object-cover ring-4 ring-white dark:ring-black/20 shadow-xl" alt="shop" />
                  ) : (
                    <div className="w-20 h-20 bg-brand-primary/10 text-brand-primary rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner uppercase tracking-tighter">
                      {customer.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn("font-display font-black text-[#1C1B1F] dark:text-[#E6E1E5] truncate text-xl leading-tight mb-2 group-hover:text-brand-primary transition-colors", redEyeActive && "blur-sm")}>{customer.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] px-3 py-1 bg-brand-primary/5 rounded-full truncate">{customer.shopName || 'Independent'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 bg-black/5 dark:bg-white/5 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Balance</span>
                    <span className={cn("text-lg font-black", balance > 0 ? "text-[#B3261E]" : "text-emerald-500", redEyeActive && "blur-sm")}>
                      {formatCurrency(balance, currency)}
                    </span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-brand-primary transition-all group-hover:translate-x-1" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 px-2">
                    <MapPin className="w-4 h-4 text-brand-primary opacity-40" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{area?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3 px-2">
                    <Phone className="w-4 h-4 text-brand-primary opacity-40" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{customer.phone}</span>
                  </div>
                </div>

                <button className="w-full py-4 bg-brand-primary/5 dark:bg-white/5 group-hover:bg-brand-primary text-brand-primary dark:text-brand-primary group-hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-brand-primary/20">
                  {language === 'en' ? 'De-encrypt Record' : 'রেকর্ড দেখুন'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCustomers?.length === 0 && (
        <div className="py-32 text-center bg-black/5 dark:bg-white/5 rounded-[4rem] border-4 border-dashed border-black/5 dark:border-white/5">
          <div className="w-24 h-24 bg-white dark:bg-black/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Search className="w-10 h-10 text-slate-300/50" />
          </div>
          <h3 className="text-xl font-display font-black text-slate-400 uppercase tracking-[0.4em] mb-3">{t.search}</h3>
          <p className="text-slate-400 font-medium italic">No nodes identified in current search trajectory</p>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
