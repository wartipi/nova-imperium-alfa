import { useState, useEffect } from 'react';
import { Package, Sparkles, Scroll, Shield, Gem, Sword, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { SimpleMapViewer } from './SimpleMapViewer';

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

interface PlayerInventoryProps {
  playerId: string;
}

export function PlayerInventory({ playerId }: PlayerInventoryProps) {
  const [inventory, setInventory] = useState<UniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewingMap, setViewingMap] = useState<UniqueItem | null>(null);

  useEffect(() => {
    fetchInventory();
    // Rafraîchir l'inventaire toutes les 10 secondes
    const interval = setInterval(fetchInventory, 10000);
    return () => clearInterval(interval);
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
      case 'carte': return <Scroll className="w-3 h-3" />;
      case 'objet_magique': return <Sparkles className="w-3 h-3" />;
      case 'artefact': return <Gem className="w-3 h-3" />;
      case 'relique': return <Shield className="w-3 h-3" />;
      case 'document': return <Scroll className="w-3 h-3" />;
      case 'equipement_legendaire': return <Sword className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  const getRarityColor = (rarity: UniqueItem['rarity']) => {
    switch (rarity) {
      case 'commun': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epique': return 'text-purple-500';
      case 'legendaire': return 'text-orange-500';
      case 'mythique': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-amber-700 mt-1">
        <div>INVENTAIRE</div>
        <div className="text-amber-600 animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="text-xs text-amber-700 mt-1">
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-amber-200 rounded px-1 py-0.5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-1">
          <Package className="w-3 h-3" />
          <span>INVENTAIRE ({inventory.length})</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </div>
      
      {isExpanded && (
        <div className="mt-1 max-h-32 overflow-y-auto">
          {inventory.length === 0 ? (
            <div className="text-amber-600 text-xs italic">Aucun objet unique</div>
          ) : (
            <div className="space-y-1">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-1 bg-amber-50 rounded border hover:bg-amber-100 transition-colors"
                  title={`${item.name} - ${item.description}`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className={`${getRarityColor(item.rarity)}`}>
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-amber-900 font-medium truncate text-xs">
                        {item.name}
                        {item.metadata?.mapData && <span className="text-green-600 ml-1">📍</span>}
                      </div>
                      <div className={`text-xs ${getRarityColor(item.rarity)}`}>
                        {item.rarity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="text-amber-800 font-bold text-xs">{item.value}⚡</div>
                    {item.tradeable && (
                      <div className="text-green-600 text-xs" title="Échangeable">💎</div>
                    )}
                    {item.type === 'carte' && (
                      <button
                        onClick={() => {
                          console.log('Carte cliquée:', item);
                          console.log('Metadata:', item.metadata);
                          console.log('MapData dans metadata:', item.metadata?.mapData);
                          console.log('ID de la carte:', item.id);
                          console.log('Nom de la carte:', item.name);
                          setViewingMap(item);
                        }}
                        className={`text-xs ${item.metadata?.mapData ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                        title={item.metadata?.mapData ? "Carte visualisable" : "Carte d'inventaire (non visualisable)"}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Modal pour visualiser une carte */}
      {viewingMap && viewingMap.type === 'carte' && viewingMap.metadata?.mapData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-amber-900">{viewingMap.name}</h3>
              <button
                onClick={() => setViewingMap(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <SimpleMapViewer
                mapData={{
                  id: viewingMap.id,
                  name: viewingMap.name,
                  ...viewingMap.metadata.mapData
                }}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-2">{viewingMap.description}</p>
              <div className="flex justify-between">
                <span>Valeur: {viewingMap.value} ⚡</span>
                <span>Rareté: {viewingMap.rarity}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de debug si pas de mapData */}
      {viewingMap && viewingMap.type === 'carte' && !viewingMap.metadata?.mapData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-900">Carte non visualisable</h3>
              <button
                onClick={() => setViewingMap(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-2">La carte "{viewingMap.name}" n'a pas de données cartographiques détaillées.</p>
              <p className="mb-2">Seules les cartes créées via l'action "Cartographier" peuvent être visualisées.</p>
              <div className="bg-amber-50 p-2 rounded text-xs">
                <strong>Carte actuelle:</strong>
                <div>• ID: {viewingMap.id}</div>
                <div>• Nom: {viewingMap.name}</div>
                <div>• Type: {viewingMap.type}</div>
                <div>• Créée le: {new Date(viewingMap.createdAt).toLocaleString()}</div>
                <div>• A mapData: {viewingMap.metadata?.mapData ? 'Oui' : 'Non'}</div>
              </div>
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                <strong>Cherchez une carte avec un nom comme:</strong>
                <div>"Carte-Region-X-Y" créée récemment</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}