import { doc, setDoc, getDoc, collection, writeBatch, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db as dexieDb } from '../db/db';
import { db as firestoreDb, auth } from './firebase';
import { compressImage } from './utils';

export async function syncToCloud() {
  const user = auth.currentUser;
  if (!user || !navigator.onLine) return; // Skip if offline

  const tables = ['areas', 'customers', 'sales', 'expenses', 'settings', 'checks', 'profiles'] as const;
  const BATCH_SIZE = 450; 
  const MAX_DOC_SIZE = 1000000; // ~1MB Firestore limit
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (const table of tables) {
    try {
      const unsyncedItems = await (dexieDb as any)[table].where('synced').equals(0).toArray();
      const legacyItems = await (dexieDb as any)[table].filter((i: any) => i.synced === undefined).toArray();
      const itemsToSync = [...unsyncedItems, ...legacyItems];

      if (itemsToSync.length === 0) continue;

      for (let i = 0; i < itemsToSync.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestoreDb);
        const chunk = itemsToSync.slice(i, i + BATCH_SIZE);
        const syncedIdsInThisBatch: (string | number)[] = [];

        for (const item of chunk) {
          try {
            const docId = table === 'settings' ? user.uid : (table === 'profiles' ? (item.uid || user.uid) : `${user.uid}_${item.id}`);
            const docRef = doc(firestoreDb, table, docId);
            
            let dataToSync: any = {
              ...item,
              userId: user.uid,
              updatedAt: item.updatedAt || new Date().toISOString(),
              synced: 1
            };

            // Emergency Re-compression for legacy oversized items
            const getDocSize = (obj: any) => JSON.stringify(obj).length;
            
            if (getDocSize(dataToSync) > MAX_DOC_SIZE) {
              console.log(`Item ${table}/${item.id} is too large (${getDocSize(dataToSync)} bytes). Attempting emergency compression.`);
              
              if (dataToSync.customerPhoto) dataToSync.customerPhoto = await compressImage(dataToSync.customerPhoto, 400, 400, 0.4);
              if (dataToSync.shopImage) dataToSync.shopImage = await compressImage(dataToSync.shopImage, 500, 500, 0.4);
              if (dataToSync.licensePhoto) dataToSync.licensePhoto = await compressImage(dataToSync.licensePhoto, 500, 500, 0.4);
              if (dataToSync.logo) dataToSync.logo = await compressImage(dataToSync.logo, 300, 300, 0.4);
              
              if (dataToSync.documents && Array.isArray(dataToSync.documents)) {
                 const newDocs = [];
                 for (const doc of dataToSync.documents) {
                   newDocs.push(await compressImage(doc, 500, 500, 0.3));
                 }
                 dataToSync.documents = newDocs;
              }

              // If still too large, we must truncate documents or remove them to prevent blocking the entire sync
              if (getDocSize(dataToSync) > MAX_DOC_SIZE && dataToSync.documents) {
                console.warn(`Item still too large after compression. Truncating documents list.`);
                while (getDocSize(dataToSync) > MAX_DOC_SIZE && dataToSync.documents.length > 0) {
                  dataToSync.documents.pop();
                }
              }
            }

            if (table === 'profiles' && !dataToSync.uid) dataToSync.uid = user.uid;

            if (item.date) {
              dataToSync.date = item.date instanceof Date ? item.date.toISOString() : item.date;
            } else if (table === 'sales' && !dataToSync.date) {
              dataToSync.date = new Date().toISOString();
            }

            if (item.dueDate) {
              dataToSync.dueDate = item.dueDate instanceof Date ? item.dueDate.toISOString() : item.dueDate;
            }
            if (item.createdAt) {
              dataToSync.createdAt = item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt;
            }

            delete dataToSync.id;
            delete dataToSync.synced;
            
            Object.keys(dataToSync).forEach(key => {
              if (dataToSync[key] === undefined) {
                delete dataToSync[key];
              }
            });

            batch.set(docRef, dataToSync);
            syncedIdsInThisBatch.push(item.id);
          } catch (err) {
            console.error(`Error preparing ${table} item ${item.id}:`, err);
          }
        }

        try {
          await batch.commit();
          // Update local status after successful batch commit
          for (const id of syncedIdsInThisBatch) {
            await (dexieDb as any)[table].update(id, { synced: 1 });
          }
          
          if (itemsToSync.length > BATCH_SIZE) {
            await sleep(200); // Throttling delay
          }
        } catch (batchErr) {
          console.error(`Failed to commit batch for ${table}:`, batchErr);
          break; // Stop syncing this table on batch error
        }
      }
    } catch (tableErr) {
      console.error(`Error syncing table ${table}:`, tableErr);
    }
  }
}

export async function restoreFromCloud() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const tables = ['areas', 'customers', 'sales', 'expenses', 'settings', 'checks', 'profiles'] as const;

    for (const table of tables) {
      const snap = await getDocs(query(collection(firestoreDb, table), where(table === 'profiles' ? 'uid' : 'userId', '==', user.uid)));
      
      const items = snap.docs.map(d => {
        const data = d.data();
        const { userId, ...rest } = data;
        
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

export async function markForSync(table: string, id: number | string) {
    await (dexieDb as any)[table].update(id, { 
        synced: 0, 
        updatedAt: new Date().toISOString() 
    });
}
