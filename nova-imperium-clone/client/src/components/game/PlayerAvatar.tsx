import { useEffect, useRef } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useMap } from "../../lib/stores/useMap";

interface PlayerAvatarProps {
  gameEngineRef: React.MutableRefObject<any>;
}

export function PlayerAvatar({ gameEngineRef }: PlayerAvatarProps) {
  const { avatarPosition, avatarRotation, isMoving, selectedCharacter } = usePlayer();
  const { selectedHex } = useMap();
  
  // Avatar sprite data - 8-bit style pixel art
  const createAvatarSprite = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 16;
    canvas.height = 16;
    
    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 16, 16);
    
    // Get character colors based on selected character
    const getCharacterColors = () => {
      if (!selectedCharacter) return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
      
      switch (selectedCharacter.id) {
        case 'knight': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#C0C0C0' };
        case 'wizard': return { skin: '#FFDBAC', hair: '#FFFFFF', clothes: '#800080' };
        case 'archer': return { skin: '#FFDBAC', hair: '#228B22', clothes: '#8B4513' };
        case 'priest': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#FFFFFF' };
        case 'rogue': return { skin: '#FFDBAC', hair: '#000000', clothes: '#2F4F4F' };
        case 'merchant': return { skin: '#FFDBAC', hair: '#DAA520', clothes: '#8B0000' };
        case 'scholar': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#000080' };
        case 'noble': return { skin: '#FFDBAC', hair: '#FFD700', clothes: '#8B008B' };
        case 'peasant': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#654321' };
        default: return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
      }
    };
    
    const colors = getCharacterColors();
    
    // Draw 8-bit character sprite
    ctx.fillStyle = colors.skin;
    // Head
    ctx.fillRect(6, 2, 4, 4);
    
    ctx.fillStyle = colors.hair;
    // Hair
    ctx.fillRect(5, 1, 6, 3);
    
    ctx.fillStyle = '#000000';
    // Eyes
    ctx.fillRect(6, 3, 1, 1);
    ctx.fillRect(9, 3, 1, 1);
    
    ctx.fillStyle = colors.clothes;
    // Body
    ctx.fillRect(6, 6, 4, 6);
    
    ctx.fillStyle = colors.skin;
    // Arms
    ctx.fillRect(4, 7, 2, 4);
    ctx.fillRect(10, 7, 2, 4);
    
    // Legs
    ctx.fillRect(6, 12, 1, 3);
    ctx.fillRect(9, 12, 1, 3);
    
    ctx.fillStyle = '#8B4513';
    // Feet
    ctx.fillRect(5, 15, 2, 1);
    ctx.fillRect(9, 15, 2, 1);
    
    return canvas;
  };
  
  // Animation frames for walking
  const createWalkingFrames = () => {
    const frames = [];
    for (let i = 0; i < 4; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 16;
      canvas.height = 16;
      
      const colors = getCharacterColors();
      
      const getCharacterColors = () => {
        if (!selectedCharacter) return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
        
        switch (selectedCharacter.id) {
          case 'knight': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#C0C0C0' };
          case 'wizard': return { skin: '#FFDBAC', hair: '#FFFFFF', clothes: '#800080' };
          case 'archer': return { skin: '#FFDBAC', hair: '#228B22', clothes: '#8B4513' };
          case 'priest': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#FFFFFF' };
          case 'rogue': return { skin: '#FFDBAC', hair: '#000000', clothes: '#2F4F4F' };
          case 'merchant': return { skin: '#FFDBAC', hair: '#DAA520', clothes: '#8B0000' };
          case 'scholar': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#000080' };
          case 'noble': return { skin: '#FFDBAC', hair: '#FFD700', clothes: '#8B008B' };
          case 'peasant': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#654321' };
          default: return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
        }
      };
      
      // Draw base character
      ctx.fillStyle = colors.skin;
      ctx.fillRect(6, 2, 4, 4);
      
      ctx.fillStyle = colors.hair;
      ctx.fillRect(5, 1, 6, 3);
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(6, 3, 1, 1);
      ctx.fillRect(9, 3, 1, 1);
      
      ctx.fillStyle = colors.clothes;
      ctx.fillRect(6, 6, 4, 6);
      
      ctx.fillStyle = colors.skin;
      ctx.fillRect(4, 7, 2, 4);
      ctx.fillRect(10, 7, 2, 4);
      
      // Animated legs based on frame
      const legOffset = i % 2 === 0 ? 0 : 1;
      ctx.fillRect(6, 12 + legOffset, 1, 3 - legOffset);
      ctx.fillRect(9, 12 - legOffset, 1, 3 + legOffset);
      
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(5, 15, 2, 1);
      ctx.fillRect(9, 15, 2, 1);
      
      frames.push(canvas);
    }
    return frames;
  };
  
  return null; // This component doesn't render anything directly
}

// Add avatar rendering to GameEngine
export function addAvatarToGameEngine(gameEngine: any, avatarPosition: any, isMoving: boolean, selectedCharacter: any) {
  if (!gameEngine) return;
  
  // Create avatar sprite
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 16;
  canvas.height = 16;
  
  // Get character colors
  const getCharacterColors = () => {
    if (!selectedCharacter) return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
    
    switch (selectedCharacter.id) {
      case 'knight': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#C0C0C0' };
      case 'wizard': return { skin: '#FFDBAC', hair: '#FFFFFF', clothes: '#800080' };
      case 'archer': return { skin: '#FFDBAC', hair: '#228B22', clothes: '#8B4513' };
      case 'priest': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#FFFFFF' };
      case 'rogue': return { skin: '#FFDBAC', hair: '#000000', clothes: '#2F4F4F' };
      case 'merchant': return { skin: '#FFDBAC', hair: '#DAA520', clothes: '#8B0000' };
      case 'scholar': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#000080' };
      case 'noble': return { skin: '#FFDBAC', hair: '#FFD700', clothes: '#8B008B' };
      case 'peasant': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#654321' };
      default: return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
    }
  };
  
  const colors = getCharacterColors();
  
  // Draw 8-bit character sprite
  ctx.fillStyle = colors.skin;
  ctx.fillRect(6, 2, 4, 4); // Head
  
  ctx.fillStyle = colors.hair;
  ctx.fillRect(5, 1, 6, 3); // Hair
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(6, 3, 1, 1); // Left eye
  ctx.fillRect(9, 3, 1, 1); // Right eye
  
  ctx.fillStyle = colors.clothes;
  ctx.fillRect(6, 6, 4, 6); // Body
  
  ctx.fillStyle = colors.skin;
  ctx.fillRect(4, 7, 2, 4); // Left arm
  ctx.fillRect(10, 7, 2, 4); // Right arm
  
  // Animated legs if moving
  if (isMoving) {
    const frame = Math.floor(Date.now() / 200) % 2;
    const legOffset = frame === 0 ? 0 : 1;
    ctx.fillRect(6, 12 + legOffset, 1, 3 - legOffset);
    ctx.fillRect(9, 12 - legOffset, 1, 3 + legOffset);
  } else {
    ctx.fillRect(6, 12, 1, 3); // Left leg
    ctx.fillRect(9, 12, 1, 3); // Right leg
  }
  
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(5, 15, 2, 1); // Left foot
  ctx.fillRect(9, 15, 2, 1); // Right foot
  
  return canvas;
}