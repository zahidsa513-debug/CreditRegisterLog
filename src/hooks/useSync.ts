import { useState, useEffect, useCallback } from 'react';
import { syncToCloud, markForSync } from '../lib/sync';
import { db } from '../db/db';
import { useAuth } from './useAuth';
import { useSettings } from '../context/SettingsContext';

export function useSync() {
  const { user } = useAuth();
  const { offlineMode } = useSettings();
  const [isOnline, setIsOnline] = useState(navigator.onLine && !offlineMode);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Update isOnline when offlineMode changes
  useEffect(() => {
    setIsOnline(navigator.onLine && !offlineMode);
  }, [offlineMode]);

  const checkUnsynced = useCallback(async () => {
    const tables = ['areas', 'customers', 'sales', 'expenses', 'settings', 'checks'] as const;
    let total = 0;
    for (const table of tables) {
      const count = await (db as any)[table].where('synced').equals(0).count();
      const legacyCount = await (db as any)[table].filter((i: any) => i.synced === undefined).count();
      total += count + legacyCount;
    }
    setUnsyncedCount(total);
  }, []);

  const performSync = useCallback(async (isManual: boolean = false) => {
    // If not manual, don't sync if in offline mode
    if (!user || !navigator.onLine || isSyncing) return;
    if (offlineMode && !isManual) return;
    
    setIsSyncing(true);
    try {
      await syncToCloud();
      setLastSync(new Date());
      await checkUnsynced();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, checkUnsynced, offlineMode]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(!offlineMode);
      if (!offlineMode) performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkUnsynced();

    // Periodic sync attempt every 5 minutes if online and not in offline mode
    const interval = setInterval(() => {
      if (navigator.onLine && !offlineMode) performSync();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [performSync, checkUnsynced, offlineMode]);

  return { 
    isOnline, 
    isSyncing, 
    lastSync, 
    unsyncedCount, 
    performSync,
    checkUnsynced 
  };
}
