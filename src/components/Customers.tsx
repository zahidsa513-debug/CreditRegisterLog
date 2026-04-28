import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, Search, User, Phone, MapPin, ChevronRight, 
  Printer, Mail, Store, FileText, Camera, UploadCloud,
  Navigation, CheckCircle2, X, Trash2, Edit2
} from 'lucide-react';
import { db } from '../db/db';
import { translations } from '../translations';
import { cn, formatCurrency } from '../lib/utils';
import { Customer, Sale } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Customers = ({ language, currency }: { language: 'en' | 'bn', currency: string }) => {
  const t = translations[language];
  const customers = useLiveQuery(() => db.customers.toArray());
  const areas = useLiveQuery(() => db.areas.toArray());
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const initialCustomerState: Partial<Customer> = { 
    name: '', 
    phone: '', 
    areaId: 0, 
    debit: 0, 
    credit: 0,
    shopName: '',
    ownerName: '',
    email: '',
    address: '',
    location: undefined,
    licensePhoto: '',
    shopImage: '',
    documents: []
  };

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>(initialCustomerState);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      await db.customers.delete(id);
      // Also delete related sales? Usually better to keep them or archive, but for simplicity:
      await db.sales.where('customerId').equals(id).delete();
      setDeleteId(null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomer.name && newCustomer.areaId) {
      if (editingCustomer) {
        await db.customers.update(editingCustomer.id!, newCustomer);
      } else {
        await db.customers.add(newCustomer as Customer);
      }
      setNewCustomer(initialCustomerState);
      setEditingCustomer(null);
      setIsModalOpen(false);
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer(customer);
    setIsModalOpen(true);
  };

  const handleLocationFetch = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewCustomer({
          ...newCustomer,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'licensePhoto' | 'shopImage' | 'documents') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'licensePhoto') {
          setNewCustomer({ ...newCustomer, licensePhoto: reader.result as string });
        } else if (field === 'shopImage') {
          setNewCustomer({ ...newCustomer, shopImage: reader.result as string });
        } else {
          setNewCustomer({ 
            ...newCustomer, 
            documents: [...(newCustomer.documents || []), reader.result as string] 
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const printCustomerStatement = async (customerId: number) => {
    const customer = await db.customers.get(customerId);
    const sales = await db.sales.where('customerId').equals(customerId).toArray();
    if (!customer) return;

    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(language === 'en' ? 'Customer Statement' : 'কাস্টমার স্টেটমেন্ট', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${language === 'en' ? 'Date' : 'তারিখ'}: ${new Date().toLocaleDateString()}`, 14, 30);

    // Profile Info
    doc.setDrawColor(230);
    doc.line(14, 35, 196, 35);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`${language === 'en' ? 'Customer Name' : 'গ্রাহকের নাম'}: ${customer.name}`, 14, 45);
    doc.text(`${language === 'en' ? 'Shop Name' : 'দোকানের নাম'}: ${customer.shopName || 'N/A'}`, 14, 52);
    doc.text(`${language === 'en' ? 'Phone' : 'ফোন'}: ${customer.phone}`, 14, 59);
    doc.text(`${language === 'en' ? 'Address' : 'ঠিকানা'}: ${customer.address || 'N/A'}`, 14, 66);
    
    doc.text(`${language === 'en' ? 'Debit' : 'ডেবিট'}: ${formatCurrency(customer.debit, currency)}`, 140, 45);
    doc.text(`${language === 'en' ? 'Credit' : 'ক্রেডিট'}: ${formatCurrency(customer.credit, currency)}`, 140, 52);
    doc.text(`${language === 'en' ? 'Balance' : 'বাকি'}: ${formatCurrency(customer.debit - customer.credit, currency)}`, 140, 59);

    // Table
    const tableData = sales.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.description,
      s.invoiceNumber || s.receiptNumber || 'N/A',
      formatCurrency(s.cashSale + s.chequeSale + s.creditSale, currency),
      s.type === 'sale' ? (language === 'en' ? 'Sale' : 'বিক্রি') : (language === 'en' ? 'Collection' : 'সংগ্রহ')
    ]);

    autoTable(doc, {
      startY: 75,
      head: [[
        language === 'en' ? 'Date' : 'তারিখ',
        language === 'en' ? 'Description' : 'বিবরণ',
        language === 'en' ? 'Invoice/Receipt' : 'ইনভয়েস/রিসিট',
        language === 'en' ? 'Amount' : 'পরিমাণ',
        language === 'en' ? 'Type' : 'ধরণ'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 }
    });

    doc.save(`${customer.name}_statement.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.customers}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{language === 'en' ? 'Manage detailed profiles and transaction history' : 'বিস্তারিত প্রোফাইল এবং লেনদেনের ইতিহাস পরিচালনা করুন'}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {t.addCustomer}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
        <input 
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-11 pr-5 py-3 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.customers}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.areas}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.balance}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers?.map((customer) => {
                const area = areas?.find(a => a.id === customer.areaId);
                const balance = (customer.debit || 0) - (customer.credit || 0);
                return (
                  <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {customer.shopImage ? (
                          <img 
                            src={customer.shopImage} 
                            alt={customer.shopName} 
                            className="w-9 h-9 rounded-lg object-cover border border-slate-100 dark:border-slate-800"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold font-display text-sm">
                            {customer.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">{customer.name} <span className="text-[10px] text-slate-400 font-normal">({customer.shopName || 'No Shop'})</span></p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center">
                            <Phone className="w-3 h-3 mr-1 opacity-70" /> {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
                        <MapPin className="w-3 h-3 mr-1 text-indigo-500 opacity-70" />
                        {area?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-bold",
                        balance > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}>
                        {formatCurrency(balance, currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(customer);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title={t.editCustomer}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(customer.id!);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            printCustomerStatement(customer.id!);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <div className="p-1.5 text-slate-300 group-hover:text-indigo-500 rounded-lg transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-display font-bold">{editingCustomer ? t.editCustomer : t.addCustomer}</h3>
                <p className="text-slate-500 text-sm">{language === 'en' ? 'Complete shop and owner details' : 'দোকান এবং মালিকের বিস্তারিত তথ্য পূরণ করুন'}</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCustomer(null);
                  setNewCustomer(initialCustomerState);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shop Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <Store className="w-3 h-3" /> {language === 'en' ? 'Shop Information' : 'দোকানের তথ্য'}
                  </h4>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Shop Name' : 'দোকানের নাম'}</label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        required
                        type="text" 
                        value={newCustomer.shopName}
                        onChange={e => setNewCustomer({...newCustomer, shopName: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Ex: Rahman Traders"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Area' : 'এলাকা'}</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <select 
                        required
                        value={newCustomer.areaId}
                        onChange={e => setNewCustomer({...newCustomer, areaId: Number(e.target.value)})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none"
                      >
                        <option value={0}>Select Area</option>
                        {areas?.map(area => (
                          <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Address' : 'ঠিকানা'}</label>
                    <textarea 
                      value={newCustomer.address}
                      onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px]"
                      placeholder="Street address, City..."
                    />
                  </div>

                  <div className="space-y-2 pb-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Shop Front Picture' : 'দোকানের সামনের ছবি'}</label>
                    <label className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 transition-all cursor-pointer group relative overflow-hidden">
                      {newCustomer.shopImage ? (
                        <>
                          <img src={newCustomer.shopImage} className="absolute inset-0 w-full h-full object-cover" alt="shop front" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
                          <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors uppercase tracking-widest">{language === 'en' ? 'Capture/Upload Shop' : 'দোকানের ছবি তুলুন/আপলোড দিন'}</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => handleFileUpload(e, 'shopImage')} />
                    </label>
                  </div>

                  <button 
                    type="button"
                    onClick={handleLocationFetch}
                    disabled={isLocating}
                    className="w-full py-3 px-4 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition-all"
                  >
                    {isLocating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                    ) : (
                      <Navigation className="w-4 h-4 text-indigo-500" />
                    )}
                    {newCustomer.location 
                      ? (language === 'en' ? 'Location Saved 🎉' : 'লোকেশন সেভ হয়েছে 🎉')
                      : (language === 'en' ? 'Tag Current Location' : 'বর্তমান লোকেশন যুক্ত করুন')}
                  </button>
                </div>

                {/* Owner Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> {language === 'en' ? 'Owner Information' : 'মালিকের তথ্য'}
                  </h4>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Owner Name' : 'মালিকের নাম'}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        required
                        type="text" 
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({...newCustomer, name: e.target.value, ownerName: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Owner Full Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Phone Number' : 'ফোন নাম্বার'}</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        required
                        type="tel" 
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="+880..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Email' : 'ইমেইল'}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="email" 
                        value={newCustomer.email}
                        onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'License & Documents' : 'লাইসেন্স এবং ডকুমেন্টস'}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all cursor-pointer group">
                        {newCustomer.licensePhoto ? (
                          <div className="relative w-full h-12">
                            <img src={newCustomer.licensePhoto} className="w-full h-full object-cover rounded" alt="license" />
                            <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-white rounded-full" />
                          </div>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 mb-1" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">License</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'licensePhoto')} />
                      </label>

                      <label className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all cursor-pointer group">
                        <UploadCloud className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {newCustomer.documents?.length ? `${newCustomer.documents.length} Docs` : 'Documents'}
                        </span>
                        <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={e => handleFileUpload(e, 'documents')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-4 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition active:scale-95 text-sm"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-8 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 text-sm"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl scale-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{language === 'en' ? 'Confirm Delete' : 'ডিলিট নিশ্চিত করুন'}</h3>
            <p className="text-slate-500 text-sm mb-8">{language === 'en' ? 'This will permanently delete the customer and all related transactions.' : 'এটি স্থায়ীভাবে কাস্টমার এবং সকল লেনদেন মুছে ফেলবে।'}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-100 dark:shadow-none"
              >
                {language === 'en' ? 'Delete' : 'মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
