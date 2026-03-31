import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export type UserRole = 'admin' | 'it' | 'staff' | 'vendas' | 'driver' | 'kitchen' | 'customer' | null;

export const useRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRole() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
           console.error('Session Error:', error);
        }

        if (!mounted) return;

        // Try getting role from Supabase Auth explicitly
        if (session?.user) {
           setUser(session.user);
           const appRole = session.user.app_metadata?.role as UserRole;
           if (appRole) {
             setRole(appRole);
             setLoading(false);
             return;
           }
        } else {
           setUser(null);
        }

        // Fallback or development fallback check (since legacy Admin.tsx sets 'admin_role' in localStorage)
        const localRole = localStorage.getItem('admin_role') as UserRole;
        if (localRole) {
          setRole(localRole);
        } else {
          setRole(null);
        }

      } catch (err) {
        console.error('Role check failed', err);
        setRole(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
         setUser(session.user);
         const appRole = session.user.app_metadata?.role as UserRole;
         if (appRole) {
            setRole(appRole);
         } else {
            const localRole = localStorage.getItem('admin_role') as UserRole;
            setRole(localRole || null);
         }
      } else {
         setUser(null);
         const localRole = localStorage.getItem('admin_role') as UserRole;
         setRole(localRole || null);
      }
      setLoading(false);
    });

    // Provide a way to listen to localStorage changes from other tabs as an extra layer
    const handleStorageChange = (e: StorageEvent) => {
      if (!mounted) return;
      if (e.key === 'admin_role') {
         fetchRole(); // Refetch if admin_role changes
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { role, loading, user };
};
