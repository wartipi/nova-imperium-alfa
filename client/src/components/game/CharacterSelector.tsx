import { useState } from "react";
import { Button } from "../ui/button";

interface CharacterSelectorProps {
  onSelect: (character: CharacterOption) => void;
  onClose: () => void;
}

export interface CharacterOption {
  id: string;
  name: string;
  description: string;
  image: string;
  bonus: string;
}

export function CharacterSelector({ onSelect, onClose }: CharacterSelectorProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterOption | null>(null);

  const characters: CharacterOption[] = [
    {
      id: "emperor",
      name: "Empereur Auguste",
      description: "Leader sage et expérimenté",
      image: "👑",
      bonus: "+10% revenus d'or"
    },
    {
      id: "warrior-king",
      name: "Roi Guerrier",
      description: "Combattant redoutable",
      image: "⚔️",
      bonus: "+2 force pour toutes les unités"
    },
    {
      id: "scholar",
      name: "Érudit Royal",
      description: "Maître des sciences",
      image: "🎓",
      bonus: "+15% vitesse de recherche"
    },
    {
      id: "merchant",
      name: "Marchand Prince",
      description: "Expert en commerce",
      image: "💰",
      bonus: "+20% revenus commerciaux"
    },
    {
      id: "architect",
      name: "Architecte Impérial",
      description: "Bâtisseur légendaire",
      image: "🏗️",
      bonus: "+15% vitesse de construction"
    },
    {
      id: "diplomat",
      name: "Diplomate Royal",
      description: "Négociateur habile",
      image: "🤝",
      bonus: "+1 relation avec tous les voisins"
    }
  ];

  const handleConfirm = () => {
    if (selectedCharacter) {
      onSelect(selectedCharacter);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-4 border-amber-800 rounded-lg shadow-2xl p-8 w-96 max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Choisissez votre Chef</h2>
          <p className="text-sm text-amber-700">Sélectionnez le leader de votre civilisation</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {characters.map((character) => (
            <div
              key={character.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedCharacter?.id === character.id
                  ? 'border-amber-600 bg-amber-300 shadow-lg'
                  : 'border-amber-400 bg-amber-50 hover:bg-amber-100'
              }`}
              onClick={() => setSelectedCharacter(character)}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">{character.image}</div>
                <div className="font-bold text-sm text-amber-900">{character.name}</div>
                <div className="text-xs text-amber-700 mt-1">{character.description}</div>
                <div className="text-xs text-green-700 mt-2 font-medium">{character.bonus}</div>
              </div>
            </div>
          ))}
        </div>

        {selectedCharacter && (
          <div className="bg-amber-50 border-2 border-amber-600 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-6xl mb-2">{selectedCharacter.image}</div>
              <div className="font-bold text-lg text-amber-900">{selectedCharacter.name}</div>
              <div className="text-sm text-amber-700 mt-1">{selectedCharacter.description}</div>
              <div className="text-sm text-green-700 mt-2 font-bold">{selectedCharacter.bonus}</div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <Button
            onClick={onClose}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-900 border-2 border-amber-600"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCharacter}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-800 disabled:opacity-50"
          >
            Confirmer
          </Button>
        </div>
      </div>
    </div>
  );
}