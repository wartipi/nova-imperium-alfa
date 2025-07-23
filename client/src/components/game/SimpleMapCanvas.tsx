import React, { useRef, useEffect } from 'react';

interface SimpleMapCanvasProps {
  className?: string;
}

export function SimpleMapCanvas({ className = "w-full h-full" }: SimpleMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Configurer le canvas
    canvas.width = canvas.offsetWidth || 1200;
    canvas.height = canvas.offsetHeight || 800;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('🎮 Rendu carte simple Nova Imperium');

    const render = () => {
      // Fond océan
      ctx.fillStyle = '#191970';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grille hexagonale
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 1;

      const hexSize = 25;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Dessiner la grille hexagonale
      for (let x = -15; x <= 15; x++) {
        for (let y = -10; y <= 10; y++) {
          const screenX = centerX + x * hexSize * 1.5;
          const screenY = centerY + y * hexSize * Math.sqrt(3) + (x % 2) * hexSize * Math.sqrt(3) / 2;

          if (screenX > -hexSize && screenX < canvas.width + hexSize && 
              screenY > -hexSize && screenY < canvas.height + hexSize) {
            
            // Dessiner hexagone
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3;
              const px = screenX + hexSize * Math.cos(angle);
              const py = screenY + hexSize * Math.sin(angle);
              if (i === 0) {
                ctx.moveTo(px, py);
              } else {
                ctx.lineTo(px, py);
              }
            }
            ctx.closePath();
            ctx.stroke();

            // Variation de couleur selon la position
            if (Math.abs(x) < 3 && Math.abs(y) < 3) {
              ctx.fillStyle = '#228B2240'; // Vert pour terre
              ctx.fill();
            }
          }
        }
      }

      // Position centrale (avatar)
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
      ctx.fill();

      // Informations de la carte
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Nova Imperium - Carte 2500x750', centerX, 40);
      ctx.fillText('Position: Centre (1250, 375)', centerX, canvas.height - 40);

      // Quelques îles simulées
      const islands = [
        { x: centerX - 200, y: centerY - 100, size: 40 },
        { x: centerX + 150, y: centerY + 80, size: 30 },
        { x: centerX - 100, y: centerY + 120, size: 25 }
      ];

      islands.forEach(island => {
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(island.x, island.y, island.size, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    render();
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className={className}
      style={{ display: 'block' }}
    />
  );
}