import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  sendPasswordResetEmail,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch or create profile
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
          console.error("Error fetching profile:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      
      const newProfile: UserProfile = {
        name,
        email,
        avatar: '',
        updatedAt: new Date().toISOString()
      } as any;
      
      await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
      setProfile(newProfile);
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
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Test connection as required by integration instructions
  useEffect(() => {
    async function testConnection() {
      try {
        await getDoc(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

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
