import { doc, setDoc, getDoc, collection, writeBatch, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db as dexieDb } from '../db/db';
import { db as firestoreDb, auth } from './firebase';

export async function syncToCloud() {
  const user = auth.currentUser;
  if (!user) return;

  const tables = ['areas', 'customers', 'sales', 'expenses', 'settings', 'checks'] as const;
  
  for (const table of tables) {
    const unsyncedItems = await (dexieDb as any)[table].where('synced').equals(0).toArray();
    
    // Also include items with no synced flag yet (for backward compatibility)
    const legacyItems = await (dexieDb as any)[table].filter((i: any) => i.synced === undefined).toArray();
    const itemsToSync = [...unsyncedItems, ...legacyItems];

    if (itemsToSync.length === 0) continue;

    for (const item of itemsToSync) {
      try {
        const docId = table === 'settings' ? user.uid : `${user.uid}_${item.id}`;
        const docRef = doc(firestoreDb, table, docId);
        
        // Conflict resolution: Check if remote version is newer
        const remoteSnap = await getDoc(docRef);
        if (remoteSnap.exists()) {
          const remoteData = remoteSnap.data();
          if (remoteData.updatedAt && item.updatedAt && new Date(remoteData.updatedAt) > new Date(item.updatedAt)) {
            // Remote is newer, skip uploading this one (or we could merge, but for now skip)
            console.log(`Conflict detected for ${table}/${item.id}: remote is newer. Skipping upload.`);
            await (dexieDb as any)[table].update(item.id, { synced: 1 });
            continue;
          }
        }

        await setDoc(docRef, {
          ...item,
          date: item.date instanceof Date ? item.date.toISOString() : (item.date || new Date().toISOString()),
          dueDate: item.dueDate instanceof Date ? item.dueDate.toISOString() : item.dueDate,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          userId: user.uid,
          updatedAt: item.updatedAt || new Date().toISOString(),
          synced: 1
        });

        // Mark as synced in local DB
        await (dexieDb as any)[table].update(item.id, { synced: 1 });
      } catch (err) {
        console.error(`Error syncing ${table} item ${item.id}:`, err);
      }
    }
  }
}

export async function restoreFromCloud() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const tables = ['areas', 'customers', 'sales', 'expenses', 'settings', 'checks'] as const;

    for (const table of tables) {
      const snap = await getDocs(query(collection(firestoreDb, table), where('userId', '==', user.uid)));
      
      const items = snap.docs.map(d => {
        const data = d.data();
        const { userId, ...rest } = data;
        
        // Convert dates back
        if (rest.date) rest.date = new Date(rest.date);
        if (rest.dueDate) rest.dueDate = new Date(rest.dueDate);
        if (rest.createdAt) rest.createdAt = new Date(rest.createdAt);
        
        return { ...rest, synced: 1 };
      });

      if (items.length > 0) {
        await (dexieDb as any)[table].clear();
        await (dexieDb as any)[table].bulkAdd(items);
      }
    }
    
    console.log("Cloud restore successful");
  } catch (error) {
    console.error("Cloud restore failed:", error);
    throw error;
  }
}

// Utility to mark item for sync
export async function markForSync(table: string, id: number | string) {
    await (dexieDb as any)[table].update(id, { 
        synced: 0, 
        updatedAt: new Date().toISOString() 
    });
}
