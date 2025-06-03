'use client';

import { createContext, useState, useEffect, useContext } from 'react';

interface AuthContextType {
  userId: number | null;
  login: (userId: number) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Check for a session (e.g., from cookies) on component mount
    const storedUserId = document.cookie.replace(/(?:(?:^|.*;\s*)userId\s*=\s*([^;]*).*$)|^.*$/, "$1");
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
  }, []);

  const login = (newUserId: number) => {
    setUserId(newUserId);
    // In a real app, you might store a more robust token
    document.cookie = `userId=${newUserId}; max-age=${60 * 60 * 24 * 7}; path=/; httpOnly`;
  };

  const logout = () => {
    setUserId(null);
    document.cookie = 'userId=; max-age=0; path=/; httpOnly';
  };

  const isAuthenticated = !!userId;

  return (
    <AuthContext.Provider value={{ userId, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};