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

export interface CompanySettings {
  id?: number;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  website?: string;
}

export type Language = 'en' | 'bn';
export type Theme = 'light' | 'dark';
export type Currency = {
  code: string;
  symbol: string;
  name: string;
};
