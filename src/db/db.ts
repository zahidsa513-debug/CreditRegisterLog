import Dexie, { type Table } from 'dexie';
import { Area, Customer, Sale, UserProfile, CompanySettings, Check, Expense } from '../types';

export class CreditRegistryDB extends Dexie {
  areas!: Table<Area>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  expenses!: Table<Expense>;
  profiles!: Table<UserProfile>;
  settings!: Table<CompanySettings>;
  checks!: Table<Check>;

  constructor() {
    super('CreditRegistryDB');
    this.version(8).stores({
      areas: '++id, name',
      customers: '++id, name, areaId, shopName, ownerName',
      sales: '++id, date, customerId, invoiceNumber, receiptNumber, type',
      expenses: '++id, date, category',
      profiles: '++id, email',
      settings: '++id',
      checks: '++id, checkNumber, dueDate, userId'
    });
  }
}

export const db = new CreditRegistryDB();
