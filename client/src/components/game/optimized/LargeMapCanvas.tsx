/**
 * Canvas Optimisé pour Cartes Massives - Nova Imperium
 * Composant de rendu haute performance pour cartes 10000x3000
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useMap } from "../../../lib/stores/useMap";
import { usePlayer } from "../../../lib/stores/usePlayer";

interface LargeMapCanvasProps {
  className?: string;
}

export const LargeMapCanvas: React.FC<LargeMapCanvasProps> = ({ className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const { mapData, isLargeMap, largeMapManager, initializeLargeMapManager } = useMap();
  const { avatarPosition } = usePlayer();

  // Initialisation du gestionnaire de carte massive
  useEffect(() => {
    if (canvasRef.current && isLargeMap && !largeMapManager && !isInitialized) {
      console.log('🚀 Initialisation du canvas pour carte massive');
      initializeLargeMapManager(canvasRef.current);
      setIsInitialized(true);
    }
  }, [canvasRef.current, isLargeMap, largeMapManager, isInitialized]);

  // Rendu continu
  useEffect(() => {
    if (!largeMapManager || !isInitialized) return;

    let animationFrameId: number;
    
    const renderLoop = async () => {
      await largeMapManager.render();
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [largeMapManager, isInitialized]);

  // Centrer sur l'avatar quand il bouge
  useEffect(() => {
    if (largeMapManager && avatarPosition && isInitialized) {
      largeMapManager.moveTo(avatarPosition.x, avatarPosition.y, 1);
    }
  }, [avatarPosition?.x, avatarPosition?.y, largeMapManager, isInitialized]);

  // Gestion des événements de souris pour le pan et zoom
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsPanning(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning || !largeMapManager) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;
    
    // Convertir le mouvement de souris en mouvement de carte
    const panSpeed = 2;
    largeMapManager.pan(-deltaX * panSpeed, -deltaY * panSpeed);
    
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [isPanning, lastMousePos, largeMapManager]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!largeMapManager) return;
    
    event.preventDefault();
    
    // Zoom avec la molette
    const zoomFactor = 1.1;
    const currentStats = largeMapManager.getStats();
    const currentZoom = 1; // TODO: obtenir le zoom actuel du manager
    
    const newZoom = event.deltaY > 0 ? currentZoom / zoomFactor : currentZoom * zoomFactor;
    largeMapManager.setZoom(newZoom);
  }, [largeMapManager]);

  const handleClick = useCallback(async (event: React.MouseEvent) => {
    if (!largeMapManager || isPanning) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Obtenir la tuile cliquée
    const tile = await largeMapManager.handleClick(x, y);
    if (tile) {
      console.log(`🖱️ Clic sur tuile: (${tile.x}, ${tile.y}) - ${tile.terrain}`);
      // TODO: Intégrer avec le système de sélection existant
    }
  }, [largeMapManager, isPanning]);

  // Affichage des statistiques de performance
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    if (!largeMapManager) return;

    const interval = setInterval(() => {
      setStats(largeMapManager.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [largeMapManager]);

  // Interface de fallback pour cartes normales
  if (!isLargeMap) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-800 text-white`}>
        <p>Carte normale - utiliser GameCanvas standard</p>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-gray-900`}>
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        style={{ 
          imageRendering: 'pixelated',
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
      />
      
      {/* Overlay d'informations de performance */}
      {stats && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded text-xs font-mono">
          <div>Carte: {stats.mapSize}</div>
          <div>Chunks: {stats.loadedChunks}</div>
          <div>Tuiles: {stats.totalTiles.toLocaleString()}</div>
          <div>Mémoire: {stats.memoryUsage}</div>
          <div>Position: ({Math.round(stats.currentPosition.x)}, {Math.round(stats.currentPosition.y)})</div>
          <div>Viewport: {Math.round(stats.viewportSize.width)}x{Math.round(stats.viewportSize.height)}</div>
        </div>
      )}

      {/* Contrôles de navigation */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => largeMapManager?.setZoom(1)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm"
        >
          Reset Zoom
        </button>
        <button
          onClick={() => largeMapManager?.clearCache()}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
        >
          Clear Cache
        </button>
      </div>

      {/* Indicateur de chargement */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Initialisation de la carte massive...</p>
          </div>
        </div>
      )}
    </div>
  );
};