import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadUser() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setUser(data.user);
        setToken(storedToken);
      } catch (err) {
        console.warn('Session expired or invalid token', err);
        removeStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      showToast(`Welcome back, ${res.user.name || res.user.email}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to log in', 'error');
      throw err;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const res = await api.signup(email, password, name);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      showToast('Account created successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to sign up', 'error');
      throw err;
    }
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
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
