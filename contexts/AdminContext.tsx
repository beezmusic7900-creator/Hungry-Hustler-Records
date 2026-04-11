import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

interface AdminContextType {
  isAdmin: boolean;
  checkingAdmin: boolean;
  recheckAdmin: (accessToken?: string) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const recheckAdmin = useCallback(async (accessToken?: string): Promise<boolean> => {
    const token = accessToken || session?.access_token;
    if (!token) {
      setIsAdmin(false);
      return false;
    }
    try {
      setCheckingAdmin(true);
      console.log('[AdminContext] Checking admin status via edge function');
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn('[AdminContext] Admin check HTTP error:', res.status, text.slice(0, 200));
        setIsAdmin(false);
        return false;
      }
      const data = await res.json();
      console.log('[AdminContext] Admin check result:', data);
      const result = data.isAdmin === true;
      setIsAdmin(result);
      return result;
    } catch (e) {
      console.log('[AdminContext] Admin check failed:', e);
      setIsAdmin(false);
      return false;
    } finally {
      setCheckingAdmin(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.access_token) {
      recheckAdmin();
    } else {
      setIsAdmin(false);
    }
  // recheckAdmin is stable (wrapped in useCallback) — including it would cause
  // an infinite loop because recheckAdmin depends on session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <AdminContext.Provider value={{ isAdmin, checkingAdmin, recheckAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
}
