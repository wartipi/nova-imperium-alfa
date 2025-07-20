import React, { useState } from 'react';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { CartographySystem, CartographyAction } from '../../lib/systems/CartographySystem';
import { SimpleMapViewer } from './SimpleMapViewer';

export const CartographyPanel: React.FC = () => {
  const gameState = useNovaImperium();
  const [selectedAction, setSelectedAction] = useState<CartographyAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<string>('');
  
  const cartographySystem = React.useMemo(() => 
    new CartographySystem(gameState), 
    [gameState]
  );
  
  const availableActions = cartographySystem.getAvailableActions();
  const cartographyInfo = cartographySystem.getCartographyInfo();

  const handleExecuteAction = async (actionId: string) => {
    setIsExecuting(true);
    setResult('');
    
    try {
      const actionResult = cartographySystem.executeAction(actionId);
      
      if (actionResult.success) {
        setResult(`✅ ${actionResult.message}`);
        
        // Si c'est une création de carte, l'ajouter aux objets
        if (actionResult.data && actionResult.data.id) {
          const mapItem = {
            id: actionResult.data.id,
            name: actionResult.data.name,
            type: 'carte',
            rarity: actionResult.data.rarity,
            description: actionResult.data.description,
            effects: ['navigation_locale'],
            requirements: ['cartography_level_1'],
            value: Math.floor(actionResult.data.region.tiles.length * 25),
            tradeable: true,
            ownerId: 'player',
            createdAt: Date.now(),
            metadata: {
              mapData: actionResult.data
            }
          };
          
          // Ajouter via API
          try {
            const response = await fetch('/api/unique-items/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mapItem)
            });
            
            if (response.ok) {
              console.log('Carte ajoutée aux objets:', mapItem.name);
            }
          } catch (apiError) {
            console.error('Erreur API pour carte:', apiError);
          }
        }
      } else {
        setResult(`❌ ${actionResult.message}`);
      }
    } catch (error) {
      setResult('❌ Erreur lors de l\'exécution');
      console.error('Erreur cartographie:', error);
    }
    
    setIsExecuting(false);
    setSelectedAction(null);
    
    // Effacer le message après 3 secondes
    setTimeout(() => setResult(''), 3000);
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-800 rounded-lg p-4 max-w-md">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-amber-900">Cartographie</h3>
        <div className="text-sm text-amber-700">
          Niveau: {cartographyInfo.level.toFixed(1)} | PA: {cartographyInfo.currentPA}
        </div>
      </div>

      {/* Actions disponibles */}
      <div className="space-y-2 mb-4">
        {availableActions.length === 0 ? (
          <div className="text-center text-amber-600 text-sm">
            Aucune action de cartographie disponible
          </div>
        ) : (
          availableActions.map(action => (
            <button
              key={action.id}
              disabled={!action.available || isExecuting}
              onClick={() => setSelectedAction(action)}
              className={`w-full p-2 rounded border-2 text-left text-sm transition-colors ${
                action.available
                  ? 'border-amber-600 bg-amber-100 hover:bg-amber-200 text-amber-900'
                  : 'border-gray-400 bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="font-semibold">{action.name}</div>
              <div className="text-xs">{action.description}</div>
              <div className="text-xs mt-1">
                Coût: {action.cost} PA
                {action.requirements.level && ` | Niveau ${action.requirements.level} requis`}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Confirmation d'action */}
      {selectedAction && (
        <div className="border-2 border-red-600 bg-red-50 rounded p-3 mb-4">
          <div className="font-semibold text-red-900 mb-2">Confirmer l'action</div>
          <div className="text-sm text-red-800 mb-3">
            {selectedAction.name} - Coût: {selectedAction.cost} PA
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExecuteAction(selectedAction.id)}
              disabled={isExecuting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {isExecuting ? 'En cours...' : 'Confirmer'}
            </button>
            <button
              onClick={() => setSelectedAction(null)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div className={`text-sm p-2 rounded mb-4 ${
          result.startsWith('✅') 
            ? 'bg-green-100 border border-green-400 text-green-800'
            : 'bg-red-100 border border-red-400 text-red-800'
        }`}>
          {result}
        </div>
      )}

      {/* Informations sur les compétences */}
      <div className="text-xs text-amber-600 border-t border-amber-300 pt-2">
        <div><strong>Exploration:</strong> {gameState.competences.exploration.toFixed(1)}</div>
        <div><strong>Cartographie:</strong> {gameState.competences.cartography.toFixed(1)}</div>
        <div className="mt-1 text-amber-500">
          Actions disponibles augmentent avec le niveau de compétence
        </div>
      </div>
    </div>
  );
};

export default CartographyPanel;