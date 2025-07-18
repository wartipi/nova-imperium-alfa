import React from 'react';
import { useAuth } from '../../lib/auth/AuthContext';
import { Button } from '../ui/button';

export function UserProfilePanel() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {currentUser?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">{currentUser}</div>
            <div className="text-xs text-gray-500">Joueur connecté</div>
          </div>
        </div>
        <Button
          onClick={logout}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          🚪 Déconnexion
        </Button>
      </div>
    </div>
  );
}