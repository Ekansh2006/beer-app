import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UseUserRoleResult {
  isAdmin: boolean;
  isAuthenticated: boolean;
  user: FirebaseUser | null;
  loading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('[useUserRole] Mount: initializing auth state listener');
    mountedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log('[useUserRole] onAuthStateChanged fired', { hasUser: !!u, email: u?.email ?? null });
      setLoading(true);
      setUser(u ?? null);

      try {
        if (u?.email) {
          const email = u.email.toLowerCase();
          if (email === 'admin@gmail.com') {
            const adminDocRef = doc(db, 'admins', email);
            const adminSnap = await getDoc(adminDocRef);
            const exists = adminSnap.exists();
            console.log('[useUserRole] Admin doc exists?', exists);
            setIsAdmin(exists);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('[useUserRole] Error checking admin role', err);
        setIsAdmin(false);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      console.log('[useUserRole] Unmount: cleaning up auth listener');
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const isAuthenticated = useMemo<boolean>(() => !!user, [user]);

  return {
    isAdmin,
    isAuthenticated,
    user,
    loading,
  };
}

export default useUserRole;
