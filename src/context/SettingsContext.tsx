import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../db/db';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb, auth } from '../lib/firebase';
import { CompanySettings, Language, Theme } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  throw new Error(errorJson);
}

interface SettingsContextType {
  settings: CompanySettings | null;
  language: Language;
  theme: Theme;
  currency: string;
  target: number;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [currency, setCurrency] = useState('BDT');
  const [target, setTarget] = useState(260000);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Dexie first (Zero-lag)
  useEffect(() => {
    const loadLocalSettings = async () => {
      // Priority: LocalStorage (Fastest) > Dexie > Default
      const cachedLang = localStorage.getItem('app_language') as Language;
      const cachedTheme = localStorage.getItem('app_theme') as Theme;
      const cachedCurrency = localStorage.getItem('app_currency');
      
      if (cachedLang) setLanguage(cachedLang);
      if (cachedTheme) setTheme(cachedTheme);
      if (cachedCurrency) setCurrency(cachedCurrency);

      const localSettings = await db.settings.toArray();
      if (localSettings.length > 0) {
        const s = localSettings[0];
        setSettings(s);
        // Dexie overrides LS if available (LS is just for immediate paint)
        setLanguage(s.language || cachedLang || 'en');
        setTheme(s.theme || cachedTheme || 'light');
        setCurrency(s.currency || cachedCurrency || 'BDT');
        setTarget(s.targetAmount || 260000);
      }
      setIsLoaded(true);
    };
    loadLocalSettings();
  }, []);

  // Sync from Firestore if logged in
  useEffect(() => {
    const syncFromFirestore = async () => {
      if (!user) return;
      try {
        const docRef = doc(firestoreDb, 'settings', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const remoteSettings = docSnap.data() as CompanySettings;
          // Update local Dexie
          await db.settings.clear();
          await db.settings.add(remoteSettings);
          
          setSettings(remoteSettings);
          if (remoteSettings.language) {
            setLanguage(remoteSettings.language);
            localStorage.setItem('app_language', remoteSettings.language);
          }
          if (remoteSettings.theme) {
            setTheme(remoteSettings.theme);
            localStorage.setItem('app_theme', remoteSettings.theme);
          }
          if (remoteSettings.currency) {
            setCurrency(remoteSettings.currency);
            localStorage.setItem('app_currency', remoteSettings.currency);
          }
          setTarget(remoteSettings.targetAmount || 260000);
        }
      } catch (error) {
        console.error("Error syncing settings from Firestore:", error);
        handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
      }
    };
    if (user) syncFromFirestore();
  }, [user]);

  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    const updated = {
      ...(settings || {
        companyName: '',
        email: '',
        phone: '',
        address: '',
        language: 'en',
        theme: 'light',
        currency: 'BDT',
        targetAmount: 260000
      }),
      ...newSettings
    };

    // 1. Update State
    setSettings(updated);
    if (newSettings.language) {
      setLanguage(newSettings.language);
      localStorage.setItem('app_language', newSettings.language);
    }
    if (newSettings.theme) {
      setTheme(newSettings.theme);
      localStorage.setItem('app_theme', newSettings.theme);
    }
    if (newSettings.currency) {
      setCurrency(newSettings.currency);
      localStorage.setItem('app_currency', newSettings.currency);
    }
    if (newSettings.targetAmount !== undefined) setTarget(newSettings.targetAmount);

    // 2. Update Dexie
    await db.settings.clear();
    await db.settings.add(updated);

    // 3. Update Firestore if user logged in
    if (user) {
      try {
        await setDoc(doc(firestoreDb, 'settings', user.uid), {
          ...updated,
          userId: user.uid,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving settings to Firestore:", error);
        handleFirestoreError(error, OperationType.WRITE, `settings/${user.uid}`);
      }
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      language,
      theme,
      currency,
      target,
      updateSettings,
      isLoaded
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
