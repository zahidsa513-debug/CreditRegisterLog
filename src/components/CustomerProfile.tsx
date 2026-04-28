import React, { useState } from 'react';
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
import { cn, formatCurrency } from '../lib/utils';
import { Customer } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CustomerProfile = ({ language, currency }: { language: 'en' | 'bn', currency: string }) => {
  const t = translations[language];
  const customers = useLiveQuery(() => db.customers.toArray());
  const areas = useLiveQuery(() => db.areas.toArray());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});

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
      await db.customers.update(editFormData.id, editFormData);
      setSelectedCustomer({ ...selectedCustomer, ...editFormData } as Customer);
      setIsEditing(false);
    }
  };

  const handleLocationFetch = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditFormData({
          ...editFormData,
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
          setEditFormData({ ...editFormData, licensePhoto: reader.result as string });
        } else if (field === 'shopImage') {
          setEditFormData({ ...editFormData, shopImage: reader.result as string });
        } else {
          setEditFormData({ 
            ...editFormData, 
            documents: [...(editFormData.documents || []), reader.result as string] 
          });
        }
      };
      reader.readAsDataURL(file);
    }
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
      companyName: 'CREDIT REGISTRY PRO',
      phone: '',
      email: '',
      address: '',
      website: ''
    };

    const area = areas?.find(a => a.id === customer.areaId);
    
    // Header Pad
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text(company.companyName.toUpperCase(), 14, 15);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let headerY = 22;
    if (company.address) {
      doc.text(company.address, 14, headerY);
      headerY += 5;
    }
    if (company.phone || company.email) {
      doc.text(`${company.phone ? 'Phone: ' + company.phone : ''} ${company.email ? ' | Email: ' + company.email : ''}`, 14, headerY);
      headerY += 5;
    }
    if (company.website) {
      doc.text(company.website, 14, headerY);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(language === 'en' ? 'Customer Profile Data' : 'কাস্টমার প্রোফাইল ডাটা', 105, 50, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`${language === 'en' ? 'Shop Name' : 'দোকানের নাম'}: ${customer.shopName || 'N/A'}`, 20, 65);
    doc.text(`${language === 'en' ? 'Owner Name' : 'মালিকের নাম'}: ${customer.name}`, 20, 75);
    doc.text(`${language === 'en' ? 'Area' : 'এলাকা'}: ${area?.name || 'N/A'}`, 20, 85);
    doc.text(`${language === 'en' ? 'Phone' : 'ফোন'}: ${customer.phone}`, 20, 95);
    doc.text(`${language === 'en' ? 'Email' : 'ইমেইল'}: ${customer.email || 'N/A'}`, 20, 105);
    doc.text(`${language === 'en' ? 'Address' : 'ঠিকানা'}: ${customer.address || 'N/A'}`, 20, 115);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${language === 'en' ? 'Current Balance' : 'বর্তমান ব্যালেন্স'}: ${formatCurrency((customer.debit || 0) - (customer.credit || 0), currency)}`, 20, 135);

    doc.save(`${customer.name}_profile.pdf`);
  };

  if (selectedCustomer) {
    const area = areas?.find(a => a.id === selectedCustomer.areaId);
    const balance = (selectedCustomer.debit || 0) - (selectedCustomer.credit || 0);

    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-soft">
          <button 
            onClick={() => setSelectedCustomer(null)}
            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-display font-black tracking-tight">{selectedCustomer.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">{selectedCustomer.shopName || 'Retailer'}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: #{selectedCustomer.id}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleEdit(selectedCustomer)}
              className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button 
              onClick={() => printFullProfile(selectedCustomer)}
              className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden p-8"
            >
              <div className="text-center mb-10">
                <div className="relative inline-block mb-6">
                  {selectedCustomer.shopImage ? (
                    <img 
                      src={selectedCustomer.shopImage} 
                      alt="shop" 
                      className="w-40 h-40 rounded-[2.5rem] object-cover ring-8 ring-slate-50 dark:ring-slate-800/50"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[2.5rem] flex items-center justify-center text-5xl font-display font-black shadow-xl">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-xl">
                    <Store className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-black tracking-tight">{selectedCustomer.name}</h3>
                <p className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em] mt-1">{selectedCustomer.shopName || 'Store Owner'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50">
                  <p className="stat-label">Balance</p>
                  <p className={cn("text-xl font-black mt-1", balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                    {formatCurrency(balance, currency)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50">
                  <p className="stat-label">Area</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white mt-2 truncate">
                    {area?.name || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <a href={`tel:${selectedCustomer.phone}`} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-indigo-200 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-700/50 group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">{selectedCustomer.phone}</p>
                </a>
                {selectedCustomer.email && (
                  <a href={`mailto:${selectedCustomer.email}`} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-indigo-200 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-700/50 group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-300 truncate">{selectedCustomer.email}</p>
                  </a>
                )}
              </div>
            </motion.div>

            {selectedCustomer.location && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h4 className="stat-label flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" /> Location
                  </h4>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedCustomer.location.lat},${selectedCustomer.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    View Map <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="aspect-[16/10] bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-slate-100 dark:border-slate-800/50">
                  <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-rose-500 animate-bounce" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GPS Coordinates</p>
                  <p className="text-xs font-mono text-slate-500">{selectedCustomer.location.lat.toFixed(6)}, {selectedCustomer.location.lng.toFixed(6)}</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft p-10"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                  <Info className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-display font-black tracking-tight">Personal Details</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/30">
                  <h5 className="stat-label">Full Legal Name</h5>
                  <p className="text-lg font-black text-slate-800 dark:text-white uppercase">{selectedCustomer.ownerName || selectedCustomer.name}</p>
                </div>
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/30">
                  <h5 className="stat-label">Registration Date</h5>
                  <p className="text-lg font-black text-slate-800 dark:text-white uppercase">Dec 12, 2023</p>
                </div>
                <div className="md:col-span-2 space-y-1.5 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/30 relative overflow-hidden">
                  <h5 className="stat-label">Verified Address</h5>
                  <p className="text-lg font-black text-slate-800 dark:text-white leading-relaxed mt-2 uppercase">{selectedCustomer.address || 'No address provided'}</p>
                  <MapPin className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200 dark:text-slate-700 opacity-20 pointer-events-none" />
                </div>
              </div>

              <div className="mt-16">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Identity & Proofs</h4>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedCustomer.licensePhoto && (
                    <motion.div whileHover={{ scale: 1.05 }} className="group relative aspect-square rounded-3xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
                      <img src={selectedCustomer.licensePhoto} className="w-full h-full object-cover" alt="License" />
                      <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center">
                        <Download className="w-6 h-6 text-white mb-2" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">License</span>
                      </div>
                    </motion.div>
                  )}
                  {selectedCustomer.documents?.map((doc, idx) => (
                    <motion.div key={idx} whileHover={{ scale: 1.05 }} className="group relative aspect-square rounded-3xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
                      <img src={doc} className="w-full h-full object-cover" alt={`doc-${idx}`} />
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center">
                        <Download className="w-6 h-6 text-white mb-2" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Document {idx + 1}</span>
                      </div>
                    </motion.div>
                  ))}
                  {(!selectedCustomer.licensePhoto && !selectedCustomer.documents?.length) && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                      <UploadCloud className="w-16 h-16 mb-4 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40 italic">System storage empty</p>
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
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl my-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-display font-bold">{t.editCustomer}</h3>
                </div>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shop Section */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                      <Store className="w-3 h-3" /> {language === 'en' ? 'Shop Information' : 'দোকানের তথ্য'}
                    </h4>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Shop Name</label>
                      <input 
                        type="text" 
                        value={editFormData.shopName}
                        onChange={e => setEditFormData({...editFormData, shopName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">{language === 'en' ? 'Area' : 'এলাকা'}</label>
                      <select 
                        required
                        value={editFormData.areaId}
                        onChange={e => setEditFormData({...editFormData, areaId: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none"
                      >
                        {areas?.map(area => (
                          <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Address</label>
                      <textarea 
                        value={editFormData.address}
                        onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-tight">{language === 'en' ? 'Shop Front Picture' : 'দোকানের সামনের ছবি'}</label>
                      <label className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 transition-all cursor-pointer group relative overflow-hidden h-32">
                        {editFormData.shopImage ? (
                          <>
                            <img src={editFormData.shopImage} className="absolute inset-0 w-full h-full object-cover" alt="shop front" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="w-8 h-8 text-white" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{language === 'en' ? 'Upload' : 'আপলোড'}</span>
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
                      {editFormData.location ? 'Location Updated' : 'Update Location'}
                    </button>
                  </div>

                  {/* Owner Section */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-3 h-3" /> {language === 'en' ? 'Owner Information' : 'মালিকের তথ্য'}
                    </h4>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Owner Name</label>
                      <input 
                        type="text" 
                        value={editFormData.name}
                        onChange={e => setEditFormData({...editFormData, name: e.target.value, ownerName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Phone</label>
                      <input 
                        type="tel" 
                        value={editFormData.phone}
                        onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Email</label>
                      <input 
                        type="email" 
                        value={editFormData.email}
                        onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    {/* Documents Section */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'en' ? 'License & Documents' : 'লাইসেন্স এবং ডকুমেন্টস'}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all cursor-pointer group">
                          {editFormData.licensePhoto ? (
                            <div className="relative w-full h-12">
                              <img src={editFormData.licensePhoto} className="w-full h-full object-cover rounded" alt="license" />
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
                            {editFormData.documents?.length ? `${editFormData.documents.length} Docs` : 'Documents'}
                          </span>
                          <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={e => handleFileUpload(e, 'documents')} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-8 py-4 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg text-sm transition active:scale-95">Update Profile</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{t.customerProfile}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{language === 'en' ? 'Select a customer to view complete profile data' : 'সম্পূর্ণ প্রোফাইল ডাটা দেখতে একটি কাস্টমার সিলেক্ট করুন'}</p>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers?.map((customer) => {
          const area = areas?.find(a => a.id === customer.areaId);
          const balance = (customer.debit || 0) - (customer.credit || 0);
          
          return (
            <motion.div 
              key={customer.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedCustomer(customer)}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="shrink-0">
                  {customer.shopImage ? (
                    <img src={customer.shopImage} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800" alt="shop" />
                  ) : (
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                      {customer.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate text-lg leading-tight mb-0.5">{customer.name}</h4>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest truncate">{customer.shopName || 'No Shop'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</span>
                  <span className={cn("text-sm font-black", balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                    {formatCurrency(balance, currency)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-xs font-bold text-slate-500">{area?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-xs font-bold text-slate-500">{customer.phone}</span>
                  </div>
                </div>

                <button className="w-full py-3 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300">
                  {language === 'en' ? 'View Full Profile' : 'পুরো প্রোফাইল দেখুন'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCustomers?.length === 0 && (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">{t.search}</h3>
          <p className="text-slate-400 text-sm italic">No matching customers found</p>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
