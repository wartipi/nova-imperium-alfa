import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  currentUser: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Utilisateurs autorisés (dans une vraie application, ceci serait dans une base de données)
const AUTHORIZED_USERS = {
  'admin': 'nova2025',
  'joueur1': 'imperium123',
  'maitre': 'pandem456'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const savedAuth = localStorage.getItem('nova_imperium_auth');
    if (savedAuth) {
      try {
        const { user, timestamp } = JSON.parse(savedAuth);
        // Session valide pendant 24 heures
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setIsAuthenticated(true);
          setCurrentUser(user);
        } else {
          localStorage.removeItem('nova_imperium_auth');
        }
      } catch (error) {
        localStorage.removeItem('nova_imperium_auth');
      }
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (AUTHORIZED_USERS[trimmedUsername] === trimmedPassword) {
      setIsAuthenticated(true);
      setCurrentUser(trimmedUsername);
      
      // Sauvegarder la session
      localStorage.setItem('nova_imperium_auth', JSON.stringify({
        user: trimmedUsername,
        timestamp: Date.now()
      }));
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('nova_imperium_auth');
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      login, 
      logout, 
      currentUser 
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