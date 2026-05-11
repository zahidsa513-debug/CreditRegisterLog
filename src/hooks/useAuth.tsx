import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  sendPasswordResetEmail,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { db as dexieDb } from '../db/db';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Attach listener immediately for fastest possible auto-login
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Data isolation: If user changes, clear local Dexie DB
      const lastUid = localStorage.getItem('last_auth_uid');
      if (user && lastUid !== user.uid) {
        console.warn("User switch or initial login detected, clearing local data for isolation.");
        try {
          await dexieDb.clearAllData();
          // Clear immediate UI preferences from LS to start fresh
          localStorage.removeItem('app_language');
          localStorage.removeItem('app_currency');
          localStorage.removeItem('app_theme');
        } catch (e) {
          console.error("Failed to clear local DB on user change:", e);
        }
      }

      setUser(user);
      if (user) {
        localStorage.setItem('last_auth_uid', user.uid);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              name: user.displayName || 'User',
              email: user.email || '',
              avatar: user.photoURL || '',
              updatedAt: new Date().toISOString()
            } as any;
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Profile fetch issue (auto-login):", err);
        }
      } else {
        setProfile(null);
        localStorage.removeItem('last_auth_uid');
      }
      setLoading(false);
    });

    // 2. Specialized init for persistence and redirect checking (especially for APK/Webviews)
    const runAsyncInit = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Redirect sign-in detected and processed");
        }
      } catch (err: any) {
        console.error("Auth async init error:", err);
      }
    };

    runAsyncInit();

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed with popup, trying redirect:", error);
      // Fallback to redirect if popup is blocked or fails (common in WebViews/APKs)
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // These are user-driven or browser-driven blocks, popup is still the preferred way
        throw error;
      }
      
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error("Redirect login also failed:", redirectError);
        throw redirectError;
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      // Ensure fresh start for new user
      try {
        await dexieDb.clearAllData();
        localStorage.removeItem('app_language');
        localStorage.removeItem('app_currency');
        localStorage.removeItem('app_theme');
      } catch (e) {
        console.error("Cleanup before registration failed:", e);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      
      const newProfile: UserProfile = {
        name,
        email,
        avatar: '',
        updatedAt: new Date().toISOString()
      } as any;
      
      const path = `users/${userCredential.user.uid}`;
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
        setProfile(newProfile);
      } catch (err: any) {
        if (err?.message?.includes('offline') || err?.code === 'unavailable') {
          console.warn("Profile creation queued locally (offline)");
          setProfile(newProfile); // Set state anyway so app continues
          return;
        }
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear local data on logout for multi-user security
      try {
        await dexieDb.clearAllData();
        localStorage.removeItem('last_auth_uid');
        localStorage.removeItem('app_language');
        localStorage.removeItem('app_currency');
        localStorage.removeItem('app_theme');
      } catch (e) {
        console.error("Cleanup on logout failed:", e);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      login, 
      loginWithEmail, 
      registerWithEmail, 
      resetPassword, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
