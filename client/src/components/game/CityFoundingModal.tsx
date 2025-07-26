import React, { useState } from 'react';
import { useCustomAlert } from '../ui/CustomAlert';

interface CityFoundingModalProps {
  onClose: () => void;
  onConfirm: (cityName: string) => void;
  position: { x: number; y: number };
}

export function CityFoundingModal({ onClose, onConfirm, position }: CityFoundingModalProps) {
  const [cityName, setCityName] = useState('');
  const { showAlert } = useCustomAlert();

  const handleConfirm = () => {
    // Validation du nom
    if (!cityName.trim() || cityName.length < 3 || cityName.length > 25) {
      showAlert({
        title: "Nom Invalide",
        message: "Le nom doit contenir entre 3 et 25 caractères",
        type: "warning"
      });
      return;
    }
    
    const cleanName = cityName.trim().replace(/[^a-zA-Z0-9À-ÿ\s\-']/g, '');
    if (cleanName !== cityName.trim()) {
      showAlert({
        title: "Caractères Interdits",
        message: "Seuls les lettres, chiffres, espaces, tirets et apostrophes sont autorisés",
        type: "warning"
      });
      return;
    }

    onConfirm(cleanName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-amber-50 border-4 border-amber-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* En-tête */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-800 mb-2">🏘️ Fonder une Colonie</h2>
          <p className="text-amber-700">
            Position : ({position.x}, {position.y})
          </p>
        </div>

        {/* Formulaire */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-amber-800 mb-2">
              Nom de la colonie :
            </label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Entrez le nom de votre colonie..."
              className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg bg-white text-amber-900 placeholder-amber-500 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
              maxLength={25}
              autoFocus
            />
            <div className="text-xs text-amber-600 mt-1">
              {cityName.length}/25 caractères
            </div>
          </div>

          {/* Règles */}
          <div className="bg-amber-100 border border-amber-400 rounded p-3">
            <h4 className="font-bold text-amber-800 mb-2">📋 Règles de nommage :</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Entre 3 et 25 caractères</li>
              <li>• Lettres, chiffres, espaces, tirets et apostrophes uniquement</li>
              <li>• Évitez les noms offensants ou inappropriés</li>
            </ul>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!cityName.trim() || cityName.length < 3}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              🏗️ Fonder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}