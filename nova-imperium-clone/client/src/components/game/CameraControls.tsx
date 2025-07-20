import { useEffect } from 'react';
import { useGameEngine } from '../../lib/contexts/GameEngineContext';
import { usePlayer } from '../../lib/stores/usePlayer';

export function CameraControls() {
  const { gameEngine } = useGameEngine();
  const { avatarPosition } = usePlayer();

  useEffect(() => {
    if (!gameEngine) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key);
      
      // Prevent default browser behavior for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }

      const moveDistance = 100; // Distance de déplacement de la caméra (doublée)
      
      switch (event.key) {
        case 'ArrowUp':
          console.log('Moving camera up');
          gameEngine.moveCamera(0, -moveDistance);
          break;
        case 'ArrowDown':
          console.log('Moving camera down');
          gameEngine.moveCamera(0, moveDistance);
          break;
        case 'ArrowLeft':
          console.log('Moving camera left');
          gameEngine.moveCamera(-moveDistance, 0);
          break;
        case 'ArrowRight':
          console.log('Moving camera right');
          gameEngine.moveCamera(moveDistance, 0);
          break;
        case ' ': // Barre d'espace pour recentrer sur l'avatar
          console.log('Centering camera on avatar');
          gameEngine.centerCameraOnAvatar();
          break;
      }
    };

    // Centrer la caméra sur l'avatar au début
    gameEngine.centerCameraOnAvatar();

    // Ajouter l'écouteur d'événements avec capture pour intercepter avant autres éléments
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [gameEngine]);

  // Centrer la caméra quand l'avatar se déplace
  useEffect(() => {
    if (gameEngine && avatarPosition) {
      gameEngine.centerCameraOnAvatar();
    }
  }, [gameEngine, avatarPosition]);

  return null;
}