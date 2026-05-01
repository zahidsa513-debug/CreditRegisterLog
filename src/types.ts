export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  designation?: string;
  location?: string;
  monthlyTarget?: number;
}

export interface Area {
  id?: number;
  name: string;
  target: number;
  color: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  areaId: number;
  debit: number;
  credit: number;
  ownerName?: string;
  shopName?: string;
  email?: string;
  address?: string;
  location?: { lat: number; lng: number };
  licensePhoto?: string;
  shopImage?: string;
  customerPhoto?: string;
  documents?: string[];
}

export interface Sale {
  id?: number;
  date: Date;
  customerId?: number;
  description: string;
  cashSale: number;
  chequeSale: number;
  creditSale: number;
  totalAmount?: number;
  signature?: string; // Data URL
  type: 'sale' | 'payment' | 'direct';
  receiptNumber?: string;
  invoiceNumber?: string;
  billNumber?: string;
}

export interface Expense {
  id?: number;
  date: Date;
  description: string;
  category: string;
  amount: number;
}

export interface CompanySettings {
  id?: number;
  userId?: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  website?: string;
  autoBackup?: boolean;
  securityPin?: string;
  isPinEnabled?: boolean;
  language?: Language;
  theme?: Theme;
  currency?: string;
  targetAmount?: number;
}

export interface Check {
  id?: string;
  checkNumber: string;
  bankName: string;
  amount: number;
  dueDate: Date;
  notes?: string;
  userId: string;
  createdAt: Date;
  isCleared: boolean;
  customerId?: number;
  customerName?: string;
  imageUrl?: string;
}

export type Language = 'en' | 'bn' | 'es';
export type Theme = 'light' | 'dark';
export type Currency = {
  code: string;
  symbol: string;
  name: string;
};
