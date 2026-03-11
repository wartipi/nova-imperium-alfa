import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/AuthContext';
import { Button } from '../ui/button';

export function UserProfilePanel() {
  const { currentUser, logout, role } = useAuth();
  const isAdmin = role === 'admin';
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const getUserRole = () => {
    if (currentUser === 'admin') return 'Administrateur';
    if (currentUser === 'maitre') return 'Maître de Jeu';
    return 'Joueur';
  };

  const getUserColor = () => {
    if (currentUser === 'admin') return 'bg-red-500';
    if (currentUser === 'maitre') return 'bg-purple-500';
    return 'bg-blue-500';
  };

  const canAccessAdmin = () => {
    return currentUser === 'admin' || currentUser === 'maitre';
  };

  return (
    <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 ${getUserColor()} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
            {currentUser?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-amber-900">{currentUser}</div>
            <div className="text-xs text-amber-700">{getUserRole()}</div>
          </div>
        </div>
        <Button
          onClick={logout}
          size="sm"
          variant="outline"
          className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 border-amber-600"
        >
          🚪 Déconnexion
        </Button>
      </div>

      {/* Admin Panel */}
      {canAccessAdmin() && (
        <div className="mt-2 pt-2 border-t border-amber-300">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="text-xs text-amber-700 hover:text-amber-900 flex items-center space-x-1"
          >
            <span>⚙️</span>
            <span>Panneau Admin</span>
            <span>{showAdminPanel ? '▼' : '▶'}</span>
          </button>
          
          {showAdminPanel && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700">Mode Admin</span>
                <span className={`text-xs px-2 py-1 rounded ${isAdmin ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                  {isAdmin ? 'Actif' : 'Inactif'}
                </span>
              </div>
              
              <div className="text-xs text-amber-600">
                {isAdmin ? '👁️ Vision complète de la carte' : '🔒 Vision limitée normale'}
              </div>
              
              {currentUser === 'admin' && (
                <div className="pt-1 border-t border-amber-400">
                  <div className="text-xs text-amber-700">Privilèges Admin:</div>
                  <div className="text-xs text-amber-600">• Contrôle total du jeu</div>
                  <div className="text-xs text-amber-600">• Accès à tous les systèmes</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}