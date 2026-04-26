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
}

export interface Sale {
  id?: number;
  date: Date;
  customerId: number;
  description: string;
  cashSale: number;
  chequeSale: number;
  creditSale: number;
  signature?: string; // Data URL
  type: 'sale' | 'payment';
  receiptNumber?: string;
}

export type Language = 'en' | 'bn';
export type Theme = 'light' | 'dark';
export type Currency = {
  code: string;
  symbol: string;
  name: string;
};
