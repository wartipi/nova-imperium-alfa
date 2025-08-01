import { useState } from "react";

interface CharacterSelectorProps {
  onSelect: (character: CharacterOption) => void;
  onClose: () => void;
}

export interface CharacterOption {
  id: string;
  name: string;
  description: string;
  image: string;
}

export function CharacterSelector({ onSelect, onClose }: CharacterSelectorProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterOption | null>(null);

  const characters: CharacterOption[] = [
    {
      id: "emperor",
      name: "Empereur Auguste",
      description: "Leader sage et expérimenté",
      image: "👑"
    },
    {
      id: "warrior-king",
      name: "Roi Guerrier",
      description: "Combattant redoutable",
      image: "⚔️"
    },
    {
      id: "scholar",
      name: "Érudit Royal",
      description: "Maître des sciences",
      image: "🎓"
    },
    {
      id: "merchant",
      name: "Marchand Prince",
      description: "Expert en commerce",
      image: "💰"
    },
    {
      id: "architect",
      name: "Architecte Impérial",
      description: "Bâtisseur légendaire",
      image: "🏗️"
    },
    {
      id: "diplomat",
      name: "Diplomate Royal",
      description: "Négociateur habile",
      image: "🤝"
    },
    {
      id: "knight",
      name: "Chevalier Noble",
      description: "Défenseur du royaume",
      image: "🛡️"
    },
    {
      id: "mage",
      name: "Mage Mystique",
      description: "Maître des arcanes",
      image: "🔮"
    },
    {
      id: "queen",
      name: "Reine Majestueuse",
      description: "Souveraine gracieuse",
      image: "👸"
    }
  ];

  const handleConfirm = () => {
    if (selectedCharacter) {
      onSelect(selectedCharacter);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]"
      onClick={(e) => {
        onClose();
      }}
    >
      <div 
        className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-4 border-amber-800 rounded-lg shadow-2xl p-8 w-96 max-h-[80vh] overflow-y-auto relative z-[1000]"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Choisissez votre Chef</h2>
          <p className="text-sm text-amber-700">Sélectionnez le leader de votre civilisation</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 relative z-[1001] ${
                selectedCharacter?.id === character.id
                  ? 'border-amber-600 bg-amber-300 shadow-lg'
                  : 'border-amber-400 bg-amber-50 hover:bg-amber-100'
              }`}
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setSelectedCharacter(character);
              }}
            >
              <div className="text-center">
                <div className="text-3xl mb-1">{character.image}</div>
                <div className="font-bold text-xs text-amber-900">{character.name}</div>
                <div className="text-xs text-amber-700 mt-1">{character.description}</div>
              </div>
            </button>
          ))}
        </div>

        {selectedCharacter && (
          <div className="bg-amber-50 border-2 border-amber-600 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-6xl mb-2">{selectedCharacter.image}</div>
              <div className="font-bold text-lg text-amber-900">{selectedCharacter.name}</div>
              <div className="text-sm text-amber-700 mt-1">{selectedCharacter.description}</div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-900 border-2 border-amber-600 px-4 py-2 rounded-md font-medium transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!selectedCharacter}
            data-selected={selectedCharacter ? 'true' : 'false'}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-800 disabled:opacity-50 px-4 py-2 rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed relative z-[1001]"
            style={{ pointerEvents: 'auto' }}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}