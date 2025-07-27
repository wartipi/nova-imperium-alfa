import React, { useState, useEffect } from "react";
import { ShoppingCart, Plus, Gavel, DollarSign, Clock, User, Search, Filter, X, Eye } from "lucide-react";
import { useResources } from '../../lib/stores/useResources';
import InteractiveMapViewer from './InteractiveMapViewer';

// Types pour le nouveau système de marketplace
interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  
  // Type d'item
  itemType: 'resource' | 'unique_item';
  
  // Pour les ressources
  resourceType?: string;
  quantity?: number;
  
  // Pour les objets uniques
  uniqueItemId?: string;
  uniqueItem?: {
    name: string;
    type: 'carte' | 'objet_magique' | 'artefact' | 'relique' | 'document' | 'equipement_legendaire';
    rarity: 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';
    description: string;
    effects?: string[];
    value: number;
    metadata?: {
      mapData?: any;
    };
  };
  
  // Type de vente (hybride)
  saleType: 'direct_sale' | 'auction';
  
  // Pour vente directe
  fixedPrice?: number;
  
  // Pour enchères
  startingBid?: number;
  currentBid?: number;
  currentBidder?: string;
  bidHistory?: Array<{
    playerId: string;
    playerName: string;
    amount: number;
    timestamp: number;
  }>;
  auctionEndTurn?: number;
  minBidIncrement?: number;
  
  // Métadonnées communes
  status: 'active' | 'sold' | 'expired' | 'cancelled';
  createdAt: number;
  description?: string;
  tags?: string[];
}

interface PublicMarketplaceProps {
  playerId: string;
  onClose: () => void;
}

// Interface pour objets uniques du joueur
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

export function PublicMarketplace({ playerId, onClose }: PublicMarketplaceProps) {
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [playerInventory, setPlayerInventory] = useState<UniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'resource' | 'unique_item'>('all');
  const [showSellModal, setShowSellModal] = useState(false);
  const [viewingMapItem, setViewingMapItem] = useState<MarketplaceItem | null>(null);
  
  // Accès direct aux stores pour l'intégration ressources
  const { resources, addResource, spendResources, hasResources } = useResources();



  // États pour la modal de vente
  const [sellForm, setSellForm] = useState({
    itemType: 'resource' as 'resource' | 'unique_item',
    saleType: 'direct_sale' as 'direct_sale' | 'auction',
    resourceType: 'wood',
    quantity: 1,
    price: 10,
    startingBid: 5,
    minBidIncrement: 1,
    description: '',
    tags: '',
    selectedUniqueItemId: '' // Pour sélectionner un objet unique du joueur
  });

  const currentTurn = 1; // TODO: Récupérer du GameManager

  // Charger les items du marketplace
  const loadMarketplaceItems = async () => {
    try {
      // Ne jamais afficher le loading après le premier chargement pour éviter les scintillements
      const isFirstLoad = marketItems.length === 0;
      if (isFirstLoad) {
        setLoading(true);
      }
      
      const response = await fetch('/api/marketplace/items');
      
      if (response.ok) {
        const items = await response.json();
        setMarketItems(items);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      // Seulement arrêter le loading si c'était le premier chargement
      if (marketItems.length === 0) {
        setLoading(false);
      }
    }
  };

  // Charger l'inventaire du joueur
  const loadPlayerInventory = async () => {
    try {
      setInventoryLoading(true);
      const response = await fetch(`/api/unique-items/${playerId}`);
      if (response.ok) {
        const items = await response.json();
        setPlayerInventory(items);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'inventaire:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceItems();
    loadPlayerInventory();
    // Plus de rafraîchissement automatique pour éviter complètement les scintillements
    // L'utilisateur peut utiliser le bouton 🔄 pour actualiser manuellement
  }, [playerId]);

  // Filtrer les items selon la recherche et les filtres
  const filteredItems = marketItems.filter(item => {
    // Filtre par type
    if (selectedFilter !== 'all' && item.itemType !== selectedFilter) return false;
    
    // Recherche textuelle
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      const searchableText = [
        item.resourceType,
        item.uniqueItem?.name,
        item.uniqueItem?.description,
        item.description,
        ...(item.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) return false;
    }
    
    return true;
  });

  // Acheter un item en vente directe avec intégration ressources COMPLÈTE
  const handlePurchase = async (itemId: string) => {
    try {
      // Trouver l'item d'abord pour vérifier le coût
      const item = marketItems.find(i => i.id === itemId);
      if (!item) {
        alert('❌ Objet non trouvé');
        return;
      }

      const cost = item.fixedPrice || 0;
      
      // Vérifier si on a assez d'or AVANT d'appeler l'API
      if (!hasResources({ gold: cost })) {
        const currentGold = resources.gold || 0;
        alert(`❌ Or insuffisant !\nCoût: ${cost} or\nDisponible: ${currentGold} or`);
        return;
      }

      // Appel API backend pour validation serveur
      const response = await fetch(`/api/marketplace/purchase-integrated/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerId,
          playerName: `Joueur_${playerId}`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // INTÉGRATION RÉELLE : Appliquer les changements au jeu immédiatement
        const goldDeducted = spendResources({ gold: cost });
        
        if (goldDeducted) {
          // Ajouter la ressource/objet à l'inventaire
          if (item.itemType === 'resource' && item.resourceType && item.quantity) {
            addResource(item.resourceType as any, item.quantity);
            alert(`✅ Achat réussi !\n💰 ${cost} or déduit\n📦 +${item.quantity} ${item.resourceType} ajouté !`);
          } else {
            // Pour les objets uniques, on pourrait ajouter à un inventaire d'objets
            alert(`✅ Achat réussi !\n💰 ${cost} or déduit\n🎯 ${item.uniqueItem?.name || 'Objet'} ajouté !`);
          }
          
          loadMarketplaceItems(); // Recharger la liste
        } else {
          alert('❌ Erreur lors de la déduction de l\'or');
        }
      } else {
        alert(`❌ Erreur: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Erreur achat:', error);
      alert('❌ Erreur lors de l\'achat');
    }
  };

  // Placer une enchère
  const handleBid = async (itemId: string, bidAmount: number) => {
    try {
      const response = await fetch(`/api/marketplace/bid/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName: `Joueur_${playerId}`,
          bidAmount
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Enchère placée !');
        loadMarketplaceItems();
      } else {
        alert(`Erreur: ${result.message || result.error}`);
      }
    } catch (error) {
      alert('Erreur lors de l\'enchère');
    }
  };

  // Créer une nouvelle vente
  const handleCreateSale = async () => {
    try {
      const endpoint = sellForm.saleType === 'direct_sale' 
        ? '/api/marketplace/direct-sale'
        : '/api/marketplace/auction';

      const body = {
        sellerId: playerId,
        sellerName: `Joueur_${playerId}`,
        itemType: sellForm.itemType,
        ...(sellForm.saleType === 'direct_sale' 
          ? { price: sellForm.price }
          : { 
              startingBid: sellForm.startingBid, 
              currentTurn,
              minBidIncrement: sellForm.minBidIncrement 
            }
        ),
        ...(sellForm.itemType === 'resource' 
          ? { resourceType: sellForm.resourceType, quantity: sellForm.quantity }
          : { uniqueItemId: sellForm.selectedUniqueItemId }),
        description: sellForm.description,
        tags: sellForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        alert(sellForm.saleType === 'direct_sale' ? 'Vente créée !' : 'Enchère créée !');
        setShowSellModal(false);
        setSellForm({
          itemType: 'resource',
          saleType: 'direct_sale',
          resourceType: 'wood',
          quantity: 1,
          price: 10,
          startingBid: 5,
          minBidIncrement: 1,
          description: '',
          tags: '',
          selectedUniqueItemId: ''
        });
        loadMarketplaceItems();
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } catch (error) {
      alert('Erreur lors de la création');
    }
  };

  // Rendu d'un item du marketplace
  const renderMarketItem = (item: MarketplaceItem) => {
    const isMyItem = item.sellerId === playerId;
    const isAuction = item.saleType === 'auction';
    
    return (
      <div key={item.id} className="bg-white border-2 border-amber-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Header avec type et vendeur */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-amber-900">
              {item.itemType === 'resource' 
                ? `${item.resourceType} (${item.quantity})`
                : (item.uniqueItem?.type === 'carte' 
                  ? `Carte de Région ${item.uniqueItem?.rarity || 'Inconnue'}` 
                  : (item.uniqueItem?.name || 'Objet unique'))
              }
            </h3>
            <p className="text-sm text-gray-600">
              Vendeur: {isMyItem ? 'Vous' : item.sellerName}
            </p>
          </div>
          <div className="text-right">
            {isAuction ? (
              <div className="text-green-700">
                <Gavel className="w-4 h-4 inline mr-1" />
                <span className="text-xs">ENCHÈRE</span>
              </div>
            ) : (
              <div className="text-blue-700">
                <DollarSign className="w-4 h-4 inline mr-1" />
                <span className="text-xs">VENTE DIRECTE</span>
              </div>
            )}
          </div>
        </div>

        {/* Description si disponible */}
        {item.description && (
          <p className="text-sm text-gray-700 mb-2">{item.description}</p>
        )}

        {/* Bouton Voir la carte pour les objets de type carte */}
        {item.itemType === 'unique_item' && item.uniqueItem?.type === 'carte' && item.uniqueItem?.metadata?.mapData && (
          <div className="mb-3">
            <button
              onClick={() => setViewingMapItem(item)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              Voir la carte (sans coordonnées)
            </button>
          </div>
        )}

        {/* Prix ou enchère */}
        <div className="mb-3">
          {isAuction ? (
            <div>
              <div className="flex justify-between text-sm">
                <span>Enchère actuelle:</span>
                <span className="font-bold">{item.currentBid || item.startingBid} or</span>
              </div>
              {item.currentBidder && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Meilleur enchérisseur:</span>
                  <span>{item.currentBidder === playerId ? 'Vous' : item.currentBidder}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-orange-600">
                <span>Se termine au tour:</span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {item.auctionEndTurn}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm">Prix:</span>
              <span className="font-bold text-lg text-green-600">{item.fixedPrice} or</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isMyItem && (
          <div className="space-y-2">
            {isAuction ? (
              <div className="flex space-x-2">
                <input
                  type="number"
                  min={(item.currentBid || item.startingBid || 0) + (item.minBidIncrement || 1)}
                  defaultValue={(item.currentBid || item.startingBid || 0) + (item.minBidIncrement || 1)}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  id={`bid-${item.id}`}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(`bid-${item.id}`) as HTMLInputElement;
                    const bidAmount = parseInt(input.value);
                    if (bidAmount > 0) {
                      handleBid(item.id, bidAmount);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Enchérir
                </button>
              </div>
            ) : (
              <button
                onClick={() => handlePurchase(item.id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
              >
                Acheter maintenant
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag, idx) => (
              <span key={idx} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-amber-50 border-4 border-amber-800 rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-6xl flex flex-col"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-amber-200">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-amber-800" />
            <h2 className="text-3xl font-bold text-amber-900">Marché Publique</h2>
            <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm">
              Version Hybride: Vente Directe + Enchères
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-amber-700 hover:text-amber-900 text-3xl font-bold hover:bg-amber-200 rounded px-2"
            style={{ userSelect: 'none', pointerEvents: 'auto' }}
            title="Fermer le marché"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b-2 border-amber-200">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'buy'
                ? 'bg-amber-200 text-amber-900 border-b-2 border-amber-600'
                : 'text-amber-700 hover:bg-amber-100'
            }`}
            style={{ userSelect: 'none', pointerEvents: 'auto' }}
          >
            🛒 Acheter
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'sell'
                ? 'bg-amber-200 text-amber-900 border-b-2 border-amber-600'
                : 'text-amber-700 hover:bg-amber-100'
            }`}
            style={{ userSelect: 'none', pointerEvents: 'auto' }}
          >
            💰 Vendre
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'buy' ? (
            <div className="h-full flex flex-col">
              {/* Barre de recherche et filtres */}
              <div className="p-4 border-b border-amber-200 bg-amber-25">
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher des objets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    onClick={loadMarketplaceItems}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors"
                    title="Actualiser le marché"
                    style={{ userSelect: 'none', pointerEvents: 'auto' }}
                  >
                    🔄
                  </button>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'resource' | 'unique_item')}
                    className="px-4 py-2 border border-amber-300 rounded-lg"
                  >
                    <option value="all">Tous les types</option>
                    <option value="resource">Ressources</option>
                    <option value="unique_item">Objets uniques</option>
                  </select>
                </div>
              </div>

              {/* Liste des items */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-amber-700">Chargement du marché...</div>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">
                      {searchQuery || selectedFilter !== 'all' 
                        ? 'Aucun objet trouvé avec ces critères'
                        : 'Le marché est actuellement vide'
                      }
                    </div>
                    <div className="text-sm text-amber-600 mt-2">
                      Allez dans l'onglet "Vendre" pour créer la première offre !
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map(renderMarketItem)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Onglet Vendre
            <div className="h-full flex flex-col">
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-amber-900 mb-2">Vendre vos objets</h3>
                  <p className="text-amber-700">Sélectionnez un objet de votre inventaire pour le mettre en vente</p>
                </div>
                
                {/* Mon inventaire d'objets uniques */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-amber-900">Mon inventaire</h4>
                    <button
                      onClick={loadPlayerInventory}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors"
                      title="Actualiser l'inventaire"
                    >
                      🔄
                    </button>
                  </div>
                  
                  {inventoryLoading ? (
                    <div className="text-center py-4 text-amber-700">Chargement de votre inventaire...</div>
                  ) : playerInventory.length === 0 ? (
                    <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="text-amber-600">Votre inventaire est vide</div>
                      <div className="text-sm text-amber-500 mt-1">Explorez le monde ou achetez des objets pour remplir votre inventaire</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playerInventory.map((item) => (
                        <div key={item.id} className="bg-white border border-amber-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-amber-900 truncate">{item.name}</h5>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.rarity === 'legendaire' ? 'bg-orange-100 text-orange-800' :
                              item.rarity === 'epique' ? 'bg-purple-100 text-purple-800' :
                              item.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.rarity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-amber-600">Valeur: {item.value} or</span>
                            <button
                              onClick={() => {
                                setSellForm({
                                  ...sellForm,
                                  itemType: 'unique_item',
                                  selectedUniqueItemId: item.id,
                                  price: Math.floor(item.value * 0.8) // Prix de vente suggéré
                                });
                                setShowSellModal(true);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Vendre
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton pour vendre des ressources */}
                <button
                  onClick={() => {
                    setSellForm({...sellForm, itemType: 'resource', selectedUniqueItemId: ''});
                    setShowSellModal(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 mb-6"
                  style={{ userSelect: 'none', pointerEvents: 'auto' }}
                >
                  <Plus className="w-5 h-5" />
                  Vendre des ressources
                </button>

                {/* Mes ventes actives */}
                <div className="mt-8">
                  <h4 className="font-bold text-amber-900 mb-4">Mes ventes actives</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketItems
                      .filter(item => item.sellerId === playerId)
                      .map(renderMarketItem)
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création de vente */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Créer une vente</h3>
              <button
                onClick={() => setShowSellModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type d'objet */}
              <div>
                <label className="block text-sm font-medium mb-1">Type d'objet</label>
                <select
                  value={sellForm.itemType}
                  onChange={(e) => setSellForm({...sellForm, itemType: e.target.value as 'resource' | 'unique_item'})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="resource">Ressource</option>
                  <option value="unique_item">Objet unique</option>
                </select>
              </div>

              {/* Type de vente */}
              <div>
                <label className="block text-sm font-medium mb-1">Type de vente</label>
                <select
                  value={sellForm.saleType}
                  onChange={(e) => setSellForm({...sellForm, saleType: e.target.value as 'direct_sale' | 'auction'})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="direct_sale">Vente directe (prix fixe)</option>
                  <option value="auction">Enchère (prix variable)</option>
                </select>
              </div>

              {/* Détails selon le type d'objet */}
              {sellForm.itemType === 'resource' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type de ressource</label>
                    <select
                      value={sellForm.resourceType}
                      onChange={(e) => setSellForm({...sellForm, resourceType: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="wood">Bois</option>
                      <option value="stone">Pierre</option>
                      <option value="iron">Fer</option>
                      <option value="gold">Or</option>
                      <option value="food">Nourriture</option>
                      <option value="leather">Cuir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={sellForm.quantity || 1}
                      onChange={(e) => setSellForm({...sellForm, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* Affichage de l'objet unique sélectionné */}
              {sellForm.itemType === 'unique_item' && sellForm.selectedUniqueItemId && (
                (() => {
                  const selectedItem = playerInventory.find(item => item.id === sellForm.selectedUniqueItemId);
                  return selectedItem ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-900 mb-2">Objet sélectionné:</h4>
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">{selectedItem.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedItem.rarity === 'legendaire' ? 'bg-orange-100 text-orange-800' :
                          selectedItem.rarity === 'epique' ? 'bg-purple-100 text-purple-800' :
                          selectedItem.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedItem.rarity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{selectedItem.description}</p>
                      <p className="text-sm text-amber-600">Valeur estimée: {selectedItem.value} or</p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                      Objet non trouvé dans votre inventaire
                    </div>
                  );
                })()
              )}

              {sellForm.itemType === 'unique_item' && !sellForm.selectedUniqueItemId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-600">
                  Veuillez sélectionner un objet de votre inventaire depuis l'onglet "Vendre"
                </div>
              )}

              {/* Prix selon le type de vente */}
              {sellForm.saleType === 'direct_sale' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Prix de vente (or)</label>
                  <input
                    type="number"
                    min="1"
                    value={sellForm.price || ''}
                    onChange={(e) => setSellForm({...sellForm, price: parseInt(e.target.value) || 10})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Enchère de départ (or)</label>
                    <input
                      type="number"
                      min="1"
                      value={sellForm.startingBid || ''}
                      onChange={(e) => setSellForm({...sellForm, startingBid: parseInt(e.target.value) || 5})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Incrément minimum (or)</label>
                    <input
                      type="number"
                      min="1"
                      value={sellForm.minBidIncrement || ''}
                      onChange={(e) => setSellForm({...sellForm, minBidIncrement: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
                <textarea
                  value={sellForm.description}
                  onChange={(e) => setSellForm({...sellForm, description: e.target.value})}
                  placeholder="Décrivez votre objet..."
                  className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={sellForm.tags}
                  onChange={(e) => setSellForm({...sellForm, tags: e.target.value})}
                  placeholder="ex: rare, puissant, magique"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Boutons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowSellModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateSale}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                >
                  {sellForm.saleType === 'direct_sale' ? 'Créer la vente' : 'Lancer l\'enchère'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualisation de carte */}
      {viewingMapItem && viewingMapItem.uniqueItem?.metadata?.mapData && (
        <InteractiveMapViewer
          mapData={viewingMapItem.uniqueItem.metadata.mapData}
          onClose={() => setViewingMapItem(null)}
          title={`Carte: ${viewingMapItem.uniqueItem.name}`}
          hideCoordinates={true}
        />
      )}
    </div>
  );
}