import React, { useState } from 'react';
import { City } from '../../lib/game/types';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { useCustomAlert } from '../ui/CustomAlert';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiRenameCityDisplayName } from '../../lib/api/citiesApi';

interface CityRenameModalProps {
  city: City;
  onClose: () => void;
  onSuccess: () => void;
}

export function CityRenameModal({ city, onClose, onSuccess }: CityRenameModalProps) {
  const [newName, setNewName] = useState(city.displayName || city.name);
  const [isLoading, setIsLoading] = useState(false);

  const { playerName } = usePlayer();
  const { hydrateCitiesFromServer } = useNovaImperium();
  const { showAlert } = useCustomAlert();
  const { isAdmin } = useAuth();

  // Vérification de propriété — conservée côté client (interface uniquement).
  // Un administrateur passe toujours : la route serveur vérifie uniquement le rôle.
  const canRename = () => {
    if (!isAdmin && city.playerName && city.playerName !== playerName) {
      return { canRename: false, reason: "Vous n'êtes pas propriétaire de cette ville" };
    }
    return { canRename: true, reason: "" };
  };

  const handleRename = async () => {
    const validation = canRename();
    if (!validation.canRename) {
      await showAlert({
        title: "Renommage Impossible",
        message: validation.reason,
        type: "error"
      });
      return;
    }

    // Validation du nom côté client (interface)
    if (!newName.trim() || newName.length < 3 || newName.length > 25) {
      await showAlert({
        title: "Nom Invalide",
        message: "Le nom doit contenir entre 3 et 25 caractères",
        type: "warning"
      });
      return;
    }

    const cleanName = newName.trim().replace(/[^a-zA-Z0-9À-ÿ\s\-']/g, '');
    if (cleanName !== newName.trim()) {
      await showAlert({
        title: "Caractères Interdits",
        message: "Seuls les lettres, chiffres, espaces, tirets et apostrophes sont autorisés",
        type: "warning"
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRenameCityDisplayName(Number(city.id), cleanName);
      await hydrateCitiesFromServer();

      showAlert({
        title: "Ville Renommée",
        message: `La ville a été renommée "${cleanName}" avec succès !`,
        type: "success"
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Erreur lors du renommage:', error);
      await showAlert({
        title: "Erreur",
        message: (error as Error).message || "Une erreur inattendue s'est produite",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validation = canRename();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-amber-50 border-4 border-amber-600 rounded-lg w-full max-w-md shadow-2xl">
        {/* En-tête */}
        <div className="bg-amber-700 text-white p-4 rounded-t-md">
          <h3 className="text-lg font-bold flex items-center gap-2">
            🏰 Renommer la Ville
          </h3>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <div className="mb-4">
            <div className="text-sm text-amber-700 mb-2">
              <strong>Ville actuelle :</strong> {city.displayName || city.name}
            </div>
            <div className="text-sm text-amber-700 mb-4">
              <strong>Position :</strong> ({city.x}, {city.y})
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-amber-900 font-medium mb-2">
              Nouveau nom :
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-amber-300 rounded focus:border-amber-500 focus:outline-none"
              placeholder="Nom de la ville (3-25 caractères)"
              maxLength={25}
              disabled={isLoading}
            />
            <div className="text-xs text-amber-600 mt-1">
              {newName.length}/25 caractères
            </div>
          </div>

          <div className="bg-amber-100 border border-amber-300 rounded p-3 mb-4">
            <h4 className="font-medium text-amber-900 mb-2">Prérequis :</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li className={(isAdmin || city.playerName === playerName) ? "text-green-700" : "text-red-700"}>
                • Être propriétaire de la ville
              </li>
            </ul>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleRename}
              disabled={isLoading || !validation.canRename || newName.trim().length < 3}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Renommage...' : 'Renommer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
