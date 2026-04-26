import Dexie, { type Table } from 'dexie';
import { Area, Customer, Sale, UserProfile } from '../types';

export class CreditRegistryDB extends Dexie {
  areas!: Table<Area>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  profiles!: Table<UserProfile>;

  constructor() {
    super('CreditRegistryDB');
    this.version(3).stores({
      areas: '++id, name',
      customers: '++id, name, areaId, shopName, ownerName',
      sales: '++id, date, customerId, invoiceNumber, receiptNumber',
      profiles: '++id, email'
    });
  }
}

export const db = new CreditRegistryDB();
