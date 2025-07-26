import { useState, useEffect } from 'react';
import { Package, MapPin, Eye, ShoppingCart, Filter, Search, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import InteractiveMapViewer from './InteractiveMapViewer';

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

interface MarketOffer {
  id: string;
  item: UniqueItem;
  sellerId: string;
  sellerName: string;
  price: number;
  currency: 'gold' | 'resources';
  description: string;
  createdAt: number;
}

interface MapMarketplaceProps {
  playerId: string;
  onClose: () => void;
}

export function PublicMarketplace({ playerId, onClose }: MapMarketplaceProps) {
  const [marketOffers, setMarketOffers] = useState<MarketOffer[]>([]);
  const [playerMaps, setPlayerMaps] = useState<UniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [viewingMap, setViewingMap] = useState<UniqueItem | null>(null);
  const [sellPrice, setSellPrice] = useState<{ [itemId: string]: number }>({});

  useEffect(() => {
    fetchMarketData();
    fetchPlayerMaps();
  }, [playerId]);

  const fetchMarketData = async () => {
    try {
      // Simuler les offres du marché pour l'instant
      // TODO: Implémenter l'API réelle du marché
      const mockOffers: MarketOffer[] = [
        {
          id: 'offer_1',
          item: {
            id: 'map_demo_1',
            name: 'Carte-Region-25-15-avec-ressources-1753000000',
            type: 'carte',
            rarity: 'epique',
            description: 'Carte détaillée de la région (25,15) - 21 hexagones (5 ressources incluses)',
            value: 500,
            tradeable: true,
            ownerId: 'other_player',
            createdAt: Date.now() - 86400000,
            metadata: {
              mapData: {
                region: { centerX: 25, centerY: 15, radius: 3 },
                includesResources: true,
                hexCount: 21,
                resourcesCount: 5
              }
            }
          },
          sellerId: 'other_player',
          sellerName: 'Explorateur_Nord',
          price: 450,
          currency: 'gold',
          description: 'Carte complète avec emplacements de ressources précieux !',
          createdAt: Date.now() - 43200000
        }
      ];
      setMarketOffers(mockOffers);
    } catch (error) {
      console.error('Erreur lors du chargement du marché:', error);
    }
  };

  const fetchPlayerMaps = async () => {
    try {
      const response = await fetch(`/api/unique-items/${playerId}`);
      const allItems = await response.json();
      const maps = allItems.filter((item: UniqueItem) => item.type === 'carte');
      setPlayerMaps(maps);
    } catch (error) {
      console.error('Erreur lors du chargement des cartes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'commun': return 'text-gray-500 border-gray-300';
      case 'rare': return 'text-blue-500 border-blue-300';
      case 'epique': return 'text-purple-500 border-purple-300';
      case 'legendaire': return 'text-orange-500 border-orange-300';
      case 'mythique': return 'text-red-500 border-red-300';
      default: return 'text-gray-500 border-gray-300';
    }
  };

  const handleSellMap = async (item: UniqueItem) => {
    const price = sellPrice[item.id];
    if (!price || price <= 0) {
      alert('Veuillez entrer un prix valide');
      return;
    }

    // TODO: Implémenter la mise en vente réelle
    alert(`Carte "${item.name}" mise en vente pour ${price} or !`);
  };

  const handleBuyMap = async (offer: MarketOffer) => {
    // TODO: Implémenter l'achat réel
    alert(`Achat de "${offer.item.name}" pour ${offer.price} or !`);
  };

  const filteredOffers = marketOffers.filter(offer => {
    const matchesSearch = offer.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRarity = rarityFilter === 'all' || offer.item.rarity === rarityFilter;
    return matchesSearch && matchesRarity;
  });

  const tradableMaps = playerMaps.filter(map => map.tradeable);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="bg-white p-6">
          <div>Chargement du marché...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="bg-gradient-to-b from-amber-50 to-amber-100 border-2 border-amber-800 shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-amber-800" />
              <h2 className="text-2xl font-bold text-amber-900">Marché Publique</h2>
            </div>
            <button
              onClick={onClose}
              className="text-amber-700 hover:text-amber-900 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-amber-300">
            <button
              onClick={() => setActiveTab('buy')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'buy'
                  ? 'text-amber-900 border-b-2 border-amber-800'
                  : 'text-amber-600 hover:text-amber-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Acheter ({filteredOffers.length})
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'sell'
                  ? 'text-amber-900 border-b-2 border-amber-800'
                  : 'text-amber-600 hover:text-amber-800'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Vendre ({tradableMaps.length})
            </button>
          </div>

          {/* Filters for Buy tab */}
          {activeTab === 'buy' && (
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-amber-600" />
                <input
                  type="text"
                  placeholder="Rechercher des cartes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-amber-300 rounded bg-white text-amber-900"
                />
              </div>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="px-4 py-2 border border-amber-300 rounded bg-white text-amber-900"
              >
                <option value="all">Toutes les raretés</option>
                <option value="commun">Commun</option>
                <option value="rare">Rare</option>
                <option value="epique">Épique</option>
                <option value="legendaire">Légendaire</option>
                <option value="mythique">Mythique</option>
              </select>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'buy' ? (
              // Buy Tab Content
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredOffers.length > 0 ? (
                  filteredOffers.map((offer) => (
                    <Card key={offer.id} className={`p-4 border-2 ${getRarityColor(offer.item.rarity)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-900 mb-1">{offer.item.name}</h3>
                          <p className="text-sm text-amber-700 mb-2">{offer.item.description}</p>
                          <div className="text-xs text-amber-600">
                            Vendeur: {offer.sellerName} • 
                            {offer.item.metadata?.mapData?.hexCount || 0} hexagones •
                            {offer.item.metadata?.mapData?.resourcesCount || 0} ressources
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className={`w-4 h-4 ${getRarityColor(offer.item.rarity)}`} />
                          <span className={`text-xs font-semibold ${getRarityColor(offer.item.rarity)}`}>
                            {offer.item.rarity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-bold text-green-600">
                          {offer.price} 🥇
                        </div>
                        <div className="flex gap-2">
                          {offer.item.metadata?.mapData && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingMap(offer.item)}
                              className="text-amber-700 border-amber-300"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Voir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleBuyMap(offer)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Acheter
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 text-amber-700">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune carte disponible sur le marché</p>
                    <p className="text-sm mt-2">Revenez plus tard ou ajustez vos filtres</p>
                  </div>
                )}
              </div>
            ) : (
              // Sell Tab Content
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tradableMaps.length > 0 ? (
                  tradableMaps.map((map) => (
                    <Card key={map.id} className={`p-4 border-2 ${getRarityColor(map.rarity)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-900 mb-1">{map.name}</h3>
                          <p className="text-sm text-amber-700 mb-2">{map.description}</p>
                          <div className="text-xs text-amber-600">
                            Valeur estimée: {map.value} 🥇 •
                            {map.metadata?.mapData?.hexCount || 0} hexagones •
                            {map.metadata?.mapData?.resourcesCount || 0} ressources
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className={`w-4 h-4 ${getRarityColor(map.rarity)}`} />
                          <span className={`text-xs font-semibold ${getRarityColor(map.rarity)}`}>
                            {map.rarity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="number"
                          placeholder="Prix de vente"
                          value={sellPrice[map.id] || ''}
                          onChange={(e) => setSellPrice(prev => ({
                            ...prev,
                            [map.id]: parseInt(e.target.value) || 0
                          }))}
                          className="flex-1 px-3 py-2 border border-amber-300 rounded text-amber-900"
                          min="1"
                        />
                        <div className="flex gap-2">
                          {map.metadata?.mapData && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingMap(map)}
                              className="text-amber-700 border-amber-300"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Voir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleSellMap(map)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Vendre
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 text-amber-700">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Vous n'avez aucune carte à vendre</p>
                    <p className="text-sm mt-2">Créez des cartes avec la compétence Cartographie</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Map Viewer Modal */}
      {viewingMap && viewingMap.metadata?.mapData && (
        <InteractiveMapViewer
          mapData={viewingMap.metadata.mapData}
          onClose={() => setViewingMap(null)}
        />
      )}
    </div>
  );
}