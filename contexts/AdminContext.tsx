import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPost } from '@/utils/api';

interface AdminContextType {
  isAdmin: boolean;
  checkingAdmin: boolean;
  recheckAdmin: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const recheckAdmin = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setIsAdmin(false);
      return false;
    }
    try {
      setCheckingAdmin(true);
      console.log('[AdminContext] Checking admin status for user:', user.email);
      const data = await authenticatedPost<{ isAdmin: boolean }>('/api/admin/check', {});
      console.log('[AdminContext] Admin check result:', data);
      const result = data.isAdmin === true;
      setIsAdmin(result);
      return result;
    } catch (error) {
      console.log('[AdminContext] Admin check failed (non-admin user):', error);
      setIsAdmin(false);
      return false;
    } finally {
      setCheckingAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      recheckAdmin();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin, checkingAdmin, recheckAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
