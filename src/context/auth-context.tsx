
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '@/lib/types';

const ADMIN_EMAIL = 'likithknml@gmail.com';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isAppUser: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // First check for hardcoded super admin
        if (user.email === ADMIN_EMAIL) {
          setRole('ADMIN');
        } else {
          // Fetch role from Firestore
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              setRole(data.role as UserRole || 'CUSTOMER');
            } else {
              setRole('CUSTOMER'); // Default for new self-signup users
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
            setRole('CUSTOMER');
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = useMemo(() => role === 'ADMIN', [role]);
  const isManager = useMemo(() => role === 'MANAGER', [role]);
  const isAppUser = useMemo(() => isAdmin || isManager, [isAdmin, isManager]);

  const logout = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading, 
      logout, 
      isAdmin, 
      isManager, 
      isAppUser 
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
