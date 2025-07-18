import { useState, useEffect } from 'react';
import { X, Package, Sparkles, Scroll, Shield, Gem, Sword } from 'lucide-react';

interface UniqueItem {
  id: string;
  name: string;
  type: 'carte' | 'objet_magique' | 'artefact' | 'relique' | 'document' | 'equipement_legendaire';
  rarity: 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';
  description: string;
  effects?: string[];
  requirements?: string[];
  value: number;
  tradeable: boolean;
  ownerId: string;
  createdAt: number;
  metadata?: { [key: string]: any };
}

interface UniqueItemsPanelProps {
  playerId: string;
  onClose: () => void;
}

export function UniqueItemsPanel({ playerId, onClose }: UniqueItemsPanelProps) {
  const [inventory, setInventory] = useState<UniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UniqueItem | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [playerId]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`/api/unique-items/${playerId}`);
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'inventaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemIcon = (type: UniqueItem['type']) => {
    switch (type) {
      case 'carte': return <Scroll className="w-4 h-4" />;
      case 'objet_magique': return <Sparkles className="w-4 h-4" />;
      case 'artefact': return <Gem className="w-4 h-4" />;
      case 'relique': return <Shield className="w-4 h-4" />;
      case 'document': return <Scroll className="w-4 h-4" />;
      case 'equipement_legendaire': return <Sword className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getRarityColor = (rarity: UniqueItem['rarity']) => {
    switch (rarity) {
      case 'commun': return 'text-gray-500 border-gray-300';
      case 'rare': return 'text-blue-500 border-blue-300';
      case 'epique': return 'text-purple-500 border-purple-300';
      case 'legendaire': return 'text-orange-500 border-orange-300';
      case 'mythique': return 'text-red-500 border-red-300';
      default: return 'text-gray-500 border-gray-300';
    }
  };

  const getTypeLabel = (type: UniqueItem['type']) => {
    switch (type) {
      case 'carte': return 'Carte';
      case 'objet_magique': return 'Objet Magique';
      case 'artefact': return 'Artefact';
      case 'relique': return 'Relique';
      case 'document': return 'Document';
      case 'equipement_legendaire': return 'Équipement Légendaire';
      default: return 'Objet';
    }
  };

  const getRarityLabel = (rarity: UniqueItem['rarity']) => {
    switch (rarity) {
      case 'commun': return 'Commun';
      case 'rare': return 'Rare';
      case 'epique': return 'Épique';
      case 'legendaire': return 'Légendaire';
      case 'mythique': return 'Mythique';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-amber-50 rounded-lg p-6 w-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-amber-800">Chargement de l'inventaire...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-amber-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-amber-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <h2 className="text-xl font-bold">Inventaire d'Objets Uniques</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-amber-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-4rem)]">
          {/* Liste des objets */}
          <div className="w-1/2 border-r border-amber-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-amber-800 mb-4">
                Objets possédés ({inventory.length})
              </h3>
              
              {inventory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                  <p className="text-amber-600">Aucun objet unique dans votre inventaire</p>
                  <p className="text-amber-500 text-sm mt-2">
                    Explorez le monde ou participez à des échanges pour obtenir des objets uniques
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedItem?.id === item.id
                          ? 'bg-amber-100 border-amber-400'
                          : `bg-white hover:bg-amber-50 ${getRarityColor(item.rarity)}`
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full bg-amber-100 ${getRarityColor(item.rarity)}`}>
                            {getItemIcon(item.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-amber-900">{item.name}</h4>
                            <p className="text-sm text-amber-600">
                              {getTypeLabel(item.type)} • {getRarityLabel(item.rarity)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-800 font-bold">{item.value}⚡</div>
                          {item.tradeable && (
                            <div className="text-xs text-green-600">Échangeable</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Détails de l'objet sélectionné */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-4">
              {selectedItem ? (
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-3 rounded-full bg-amber-100 ${getRarityColor(selectedItem.rarity)}`}>
                      {getItemIcon(selectedItem.type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-amber-900">{selectedItem.name}</h3>
                      <p className="text-amber-600">
                        {getTypeLabel(selectedItem.type)} • {getRarityLabel(selectedItem.rarity)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">Description</h4>
                      <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">
                        {selectedItem.description}
                      </p>
                    </div>

                    {selectedItem.effects && selectedItem.effects.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-2">Effets</h4>
                        <ul className="space-y-1">
                          {selectedItem.effects.map((effect, index) => (
                            <li key={index} className="text-green-700 bg-green-50 p-2 rounded flex items-center space-x-2">
                              <Sparkles className="w-4 h-4" />
                              <span>{effect}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedItem.requirements && selectedItem.requirements.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-2">Prérequis</h4>
                        <ul className="space-y-1">
                          {selectedItem.requirements.map((requirement, index) => (
                            <li key={index} className="text-red-700 bg-red-50 p-2 rounded flex items-center space-x-2">
                              <Shield className="w-4 h-4" />
                              <span>{requirement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-3 bg-amber-100 rounded-lg">
                      <div>
                        <span className="text-amber-700 font-medium">Valeur d'échange:</span>
                        <span className="text-amber-900 font-bold ml-2">{selectedItem.value}⚡</span>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs ${
                          selectedItem.tradeable 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {selectedItem.tradeable ? 'Échangeable' : 'Non échangeable'}
                        </div>
                      </div>
                    </div>

                    {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-2">Informations supplémentaires</h4>
                        <div className="bg-amber-50 p-3 rounded-lg">
                          {Object.entries(selectedItem.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1">
                              <span className="text-amber-600 capitalize">{key.replace('_', ' ')}:</span>
                              <span className="text-amber-800">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                  <p className="text-amber-600">Sélectionnez un objet pour voir ses détails</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}