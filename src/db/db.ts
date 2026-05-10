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
    this.version(9).stores({
      areas: '++id, name, synced',
      customers: '++id, name, areaId, shopName, ownerName, synced',
      sales: '++id, date, customerId, invoiceNumber, receiptNumber, type, synced',
      expenses: '++id, date, category, synced',
      profiles: '++id, email, synced',
      settings: '++id, synced',
      checks: '++id, checkNumber, dueDate, userId, synced'
    });
  }
}

export const db = new CreditRegistryDB();
