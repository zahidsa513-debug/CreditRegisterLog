import Dexie, { type Table } from 'dexie';
import { Area, Customer, Sale } from '../types';

export class CreditRegistryDB extends Dexie {
  areas!: Table<Area>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;

  constructor() {
    super('CreditRegistryDB');
    this.version(1).stores({
      areas: '++id, name',
      customers: '++id, name, areaId',
      sales: '++id, date, customerId',
    });
  }
}

export const db = new CreditRegistryDB();
