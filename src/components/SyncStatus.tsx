import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSync } from '../hooks/useSync';
import { cn } from '../lib/utils';
import { translations } from '../translations';
import { useSettings } from '../context/SettingsContext';

const SyncStatus = ({ className }: { className?: string }) => {
  const { isOnline, isSyncing, unsyncedCount, performSync } = useSync();
  const { language } = useSettings();
  const t = translations[language];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn(
        "flex items-center justify-between px-3 py-2 rounded-xl border transition-all",
        !isOnline ? "bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/20" : 
        isSyncing ? "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/20" :
        unsyncedCount > 0 ? "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20" :
        "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20"
      )}>
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
          ) : !isOnline ? (
            <CloudOff className="w-4 h-4 text-rose-500" />
          ) : unsyncedCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <Cloud className="w-4 h-4 text-emerald-500" />
          )}
          
          <div className="flex flex-col">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              !isOnline ? "text-rose-600" : isSyncing ? "text-indigo-600" : unsyncedCount > 0 ? "text-amber-600" : "text-emerald-600"
            )}>
              {!isOnline ? "Offline" : isSyncing ? "Syncing..." : unsyncedCount > 0 ? "Unsynced" : "Synced"}
            </span>
            {unsyncedCount > 0 && (
              <span className="text-[9px] text-slate-500 font-bold">{unsyncedCount} items pending</span>
            )}
          </div>
        </div>

        {isOnline && !isSyncing && unsyncedCount > 0 && (
          <button 
            onClick={() => performSync(true)}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-indigo-600"
            title="Manual Sync"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 bg-rose-500 rounded-lg text-white text-[9px] font-bold uppercase tracking-widest text-center shadow-lg shadow-rose-500/20">
              Working Offline Mode
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyncStatus;
