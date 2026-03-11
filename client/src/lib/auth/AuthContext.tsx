import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  currentUser: string | null;
  role: 'admin' | 'player';
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'player'>('player');

  useEffect(() => {
    const savedAuth = localStorage.getItem('nova_imperium_auth');
    if (savedAuth) {
      try {
        const { user, role: savedRole, token, timestamp } = JSON.parse(savedAuth);
        // Session invalide si : trop ancienne, sans token, ou sans role (session pré-migration)
        if (!token || !savedRole || Date.now() - timestamp >= 24 * 60 * 60 * 1000) {
          localStorage.removeItem('nova_imperium_auth');
          return;
        }
        setIsAuthenticated(true);
        setCurrentUser(user);
        setRole(savedRole);
      } catch {
        localStorage.removeItem('nova_imperium_auth');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password: password.trim() })
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (!data.success || !data.user?.role) return false;

      const { user, token } = data;

      setIsAuthenticated(true);
      setCurrentUser(user.username);
      setRole(user.role);

      localStorage.setItem('nova_imperium_auth', JSON.stringify({
        user: user.username,
        role: user.role,
        token,
        timestamp: Date.now()
      }));

      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRole('player');
    localStorage.removeItem('nova_imperium_auth');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      currentUser,
      role
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
