import React from 'react';
import { useRessources } from '../../lib/hooks/useRessources';
import { useTour } from '../../lib/hooks/useTour';
import { useGameContext } from '../../lib/contexts/GameContext';
import { 
  GamePanel, 
  MedievalButton, 
  ResourceBadge, 
  FlexGrid,
  StatusIndicator 
} from '../../lib/components/styled/StyledGameComponents';

/**
 * Composant moderne utilisant les nouveaux hooks et styled-components
 * Exemple d'implémentation des recommandations d'amélioration de structure
 */
export function ModernResourcePanel() {
  // Utilisation des hooks personnalisés au lieu du props drilling
  const {
    resources,
    resourceProduction,
    resourceStatus,
    spendResources,
    canAfford,
    applyProduction
  } = useRessources();

  const {
    currentTurn,
    gamePhase,
    isPaused,
    nextTurn,
    advancedEndTurn,
    togglePause
  } = useTour();

  // Context centralisé au lieu du props drilling
  const gameContext = useGameContext();

  // Exemple de coût pour une action
  const buildingCost = {
    gold: 100,
    wood: 50,
    stone: 30,
    action_points: 10
  };

  const handleBuildAction = () => {
    if (canAfford(buildingCost)) {
      if (spendResources(buildingCost)) {
        alert('Construction réussie !');
      }
    } else {
      alert('Ressources insuffisantes !');
    }
  };

  const handleProduction = () => {
    applyProduction();
    alert('Production appliquée !');
  };

  return (
    <GamePanel variant="primary">
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ 
          color: '#d69e2e', 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          Panneau des Ressources Moderne
          <StatusIndicator 
            status={gamePhase === 'playing' ? 'active' : 'inactive'} 
            size="medium" 
          />
        </h3>
      </div>

      {/* Affichage des ressources avec badges stylés */}
      <FlexGrid columns={3} gap="0.5rem" style={{ marginBottom: '1.5rem' }}>
        <ResourceBadge type="gold">
          {resources.gold || 0}
        </ResourceBadge>
        <ResourceBadge type="food">
          {resources.food || 0}
        </ResourceBadge>
        <ResourceBadge type="wood">
          {resources.wood || 0}
        </ResourceBadge>
        <ResourceBadge type="stone">
          {resources.stone || 0}
        </ResourceBadge>
        <ResourceBadge type="iron">
          {resources.iron || 0}
        </ResourceBadge>
        <ResourceBadge type="action">
          {resources.actionPoints}
        </ResourceBadge>
      </FlexGrid>

      {/* Informations sur la production */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(45, 55, 72, 0.5)', borderRadius: '8px' }}>
        <h4 style={{ color: '#a0aec0', marginBottom: '0.5rem' }}>Production par tour:</h4>
        <FlexGrid columns={5} gap="0.25rem">
          <span>⚡ +{resourceProduction.gold || 0}</span>
          <span>🍞 +{resourceProduction.food || 0}</span>
          <span>🪵 +{resourceProduction.wood || 0}</span>
          <span>🪨 +{resourceProduction.stone || 0}</span>
          <span>⚔️ +{resourceProduction.iron || 0}</span>
        </FlexGrid>
      </div>

      {/* État des ressources */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: '#a0aec0' }}>
        <p>Tour: {currentTurn} | État: {gamePhase} {isPaused && '(En pause)'}</p>
        {resourceStatus.criticalResources.length > 0 && (
          <p style={{ color: '#e53e3e' }}>
            ⚠️ Ressources critiques: {resourceStatus.criticalResources.join(', ')}
          </p>
        )}
        {resourceStatus.hasPositiveIncome && (
          <p style={{ color: '#38a169' }}>
            ✓ Revenus positifs détectés
          </p>
        )}
      </div>

      {/* Actions avec les nouveaux boutons stylés */}
      <FlexGrid columns={2} gap="1rem">
        <MedievalButton
          variant="primary"
          size="medium"
          onClick={handleBuildAction}
          disabled={!canAfford(buildingCost)}
        >
          Construire (100⚡ 50🪵 30🪨)
        </MedievalButton>
        
        <MedievalButton
          variant="success"
          size="medium"
          onClick={handleProduction}
        >
          Appliquer Production
        </MedievalButton>
        
        <MedievalButton
          variant="secondary"
          size="medium"
          onClick={advancedEndTurn}
          disabled={gamePhase !== 'playing'}
        >
          Fin de Tour Avancée
        </MedievalButton>
        
        <MedievalButton
          variant={isPaused ? 'success' : 'danger'}
          size="medium"
          onClick={togglePause}
        >
          {isPaused ? 'Reprendre' : 'Pause'}
        </MedievalButton>
      </FlexGrid>

      {/* Informations du contexte */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem', 
        backgroundColor: 'rgba(26, 32, 44, 0.5)', 
        borderRadius: '6px',
        fontSize: '0.75rem',
        color: '#718096'
      }}>
        <p>Utilise le contexte centralisé: {gameContext.gamePhase}</p>
        <p>Avatar PA: {gameContext.actionPoints}/{gameContext.maxActionPoints}</p>
      </div>
    </GamePanel>
  );
}

export default ModernResourcePanel;