import { doc, setDoc, deleteDoc, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db as dexieDb } from '../db/db';
import { db as firestoreDb, auth } from './firebase';

export async function syncToCloud() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. Sync Areas
    const areas = await dexieDb.areas.toArray();
    for (const area of areas) {
      await setDoc(doc(firestoreDb, 'areas', `${user.uid}_${area.id}`), {
        ...area,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Sync Customers
    const customers = await dexieDb.customers.toArray();
    for (const customer of customers) {
      await setDoc(doc(firestoreDb, 'customers', `${user.uid}_${customer.id}`), {
        ...customer,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Sync Sales
    const sales = await dexieDb.sales.toArray();
    for (const sale of sales) {
      // Date objects need to be converted to ISO strings for Firestore if not using Timestamps
      await setDoc(doc(firestoreDb, 'sales', `${user.uid}_${sale.id}`), {
        ...sale,
        date: sale.date instanceof Date ? sale.date.toISOString() : sale.date,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
    }

    // 4. Sync Settings
    const settings = await dexieDb.settings.toArray();
    if (settings.length > 0) {
      await setDoc(doc(firestoreDb, 'settings', user.uid), {
        ...settings[0],
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Sync Expenses
    const expenses = await dexieDb.expenses.toArray();
    for (const exp of expenses) {
      await setDoc(doc(firestoreDb, 'expenses', `${user.uid}_${exp.id}`), {
        ...exp,
        date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
    }

    console.log("Cloud backup successful");
  } catch (error) {
    console.error("Cloud backup failed:", error);
    throw error;
  }
}

export async function restoreFromCloud() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Restore Areas
    const areasSnap = await getDocs(query(collection(firestoreDb, 'areas'), where('userId', '==', user.uid)));
    const areas = areasSnap.docs.map(d => {
      const { userId, updatedAt, ...rest } = d.data();
      return rest;
    });
    if (areas.length > 0) {
      await dexieDb.areas.clear();
      await dexieDb.areas.bulkAdd(areas as any);
    }

    // Restore Customers
    const customersSnap = await getDocs(query(collection(firestoreDb, 'customers'), where('userId', '==', user.uid)));
    const customers = customersSnap.docs.map(d => {
      const { userId, updatedAt, ...rest } = d.data();
      return rest;
    });
    if (customers.length > 0) {
      await dexieDb.customers.clear();
      await dexieDb.customers.bulkAdd(customers as any);
    }

    // Restore Sales
    const salesSnap = await getDocs(query(collection(firestoreDb, 'sales'), where('userId', '==', user.uid)));
    const sales = salesSnap.docs.map(d => {
        const data = d.data();
        const { userId, updatedAt, ...rest } = data;
        return {
            ...rest,
            date: new Date(data.date)
        };
    });
    if (sales.length > 0) {
      await dexieDb.sales.clear();
      await dexieDb.sales.bulkAdd(sales as any);
    }

    // Restore Expenses
    const expensesSnap = await getDocs(query(collection(firestoreDb, 'expenses'), where('userId', '==', user.uid)));
    const expenses = expensesSnap.docs.map(d => {
        const data = d.data();
        const { userId, updatedAt, ...rest } = data;
        return {
            ...rest,
            date: new Date(data.date)
        };
    });
    if (expenses.length > 0) {
      await dexieDb.expenses.clear();
      await dexieDb.expenses.bulkAdd(expenses as any);
    }

    // Restore Settings
    const settingsSnap = await getDocs(query(collection(firestoreDb, 'settings'), where('userId', '==', user.uid)));
    if (!settingsSnap.empty) {
      const { userId, updatedAt, ...rest } = settingsSnap.docs[0].data();
      await dexieDb.settings.clear();
      await dexieDb.settings.add(rest as any);
    }
    
    console.log("Cloud restore successful");
  } catch (error) {
    console.error("Cloud restore failed:", error);
    throw error;
  }
}
