import { useState, useEffect } from 'react';
import { Package, Sparkles, Scroll, Shield, Gem, Sword, ChevronDown, ChevronUp } from 'lucide-react';

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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}