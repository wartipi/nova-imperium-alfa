import { useEffect, useRef } from "react";

// ─── TileContextMenu ──────────────────────────────────────────────────────────
// Menu contextuel de case (V1 — affinage bâtiments réels).
// Ouvert par clic droit depuis GameCanvas sur une tuile hexagonale.
//
// Logique de résolution des actions disponibles (dans GameCanvas, pas ici) :
//   1. Lookup prioritaire dans novaImperiums (villes du joueur) :
//      → buildings exacts → hasMarket / hasBank déterminés précisément
//   2. Fallback si colonie d'un autre joueur :
//      → hasMarket = true, hasBank = true (conservative ; le serveur valide)
//   3. Aucune colonie → hasMarket = false, hasBank = false
//
// Ce composant reçoit hasMarket/hasBank déjà résolus et les affiche.
// Extensibilité : ajouter d'autres actions en ajoutant des props booléens + entrées dans ACTIONS.
// ─────────────────────────────────────────────────────────────────────────────

export interface TileContextMenuProps {
  screenX:       number;
  screenY:       number;
  hexX:          number;
  hexY:          number;
  hasMarket:     boolean;
  hasBank:       boolean;
  locationName:  string | null;
  // Infos — toujours disponible, ouvre TileInfoPanel
  onOpenInfo:    () => void;
  // Déplacement — non null si la case est walkable, accessible et ≠ position actuelle
  onMove:        (() => void) | null;
  onClose:       () => void;
}

export function TileContextMenu({
  screenX,
  screenY,
  hexX,
  hexY,
  hasMarket,
  hasBank,
  locationName,
  onOpenInfo,
  onMove,
  onClose,
}: TileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermeture sur clic extérieur ou touche Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const hasAnyAction = Boolean(onMove) || hasMarket || hasBank;

  // Clamping pour rester dans le viewport
  const menuW      = 230;
  const baseH      = 56;
  const rowH       = 52;
  const noActH     = 44;
  const actionCount = [Boolean(onMove), hasMarket, hasBank].filter(Boolean).length;
  const menuH      = baseH + (hasAnyAction ? actionCount * rowH : noActH);
  const clampedX = Math.min(screenX, window.innerWidth  - menuW - 8);
  const clampedY = Math.min(screenY, window.innerHeight - menuH - 8);

  const handleAction = (panel: string) => {
    window.dispatchEvent(new CustomEvent("nova:open-panel", { detail: { panel } }));
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-stone-900 border border-amber-700 rounded-lg shadow-2xl text-white select-none"
      style={{
        left:          clampedX,
        top:           clampedY,
        width:         menuW,
        zIndex:        10000,
        pointerEvents: "auto",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* En-tête case */}
      <div className="px-3 py-2 border-b border-amber-800/60 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-amber-400">
            {locationName ?? "Terrain"}
          </p>
          <p className="text-xs text-stone-400">
            case ({hexX}, {hexY})
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenInfo}
            className="text-stone-400 hover:text-amber-300 text-xs px-1.5 py-0.5 rounded hover:bg-stone-700/60 transition-colors flex items-center gap-1"
            title="Infos de la case"
          >
            <span>ℹ️</span>
            <span>Infos</span>
          </button>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-200 text-lg leading-none px-1"
            title="Fermer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Corps — actions par case */}
      <div className="py-1">
        {onMove && (
          <button
            onClick={onMove}
            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-green-900/40 transition-colors"
            style={{ pointerEvents: "auto" }}
          >
            <span className="text-base mt-0.5">🚶</span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-green-200">Se déplacer ici</span>
              <span className="text-xs text-stone-400">Ouvrir la confirmation</span>
            </span>
          </button>
        )}

        {hasMarket && (
          <button
            onClick={() => handleAction("marketplace")}
            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-amber-800/40 transition-colors"
            style={{ pointerEvents: "auto" }}
          >
            <span className="text-base mt-0.5">🏪</span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-amber-100">Accéder au marché</span>
              <span className="text-xs text-stone-400">Guilde des Marchands</span>
            </span>
          </button>
        )}

        {hasBank && (
          <button
            onClick={() => handleAction("treasury")}
            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-amber-800/40 transition-colors"
            style={{ pointerEvents: "auto" }}
          >
            <span className="text-base mt-0.5">🏦</span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-amber-100">Accéder à la banque</span>
              <span className="text-xs text-stone-400">Banque</span>
            </span>
          </button>
        )}

        {!hasAnyAction && (
          <div className="px-3 py-2 text-xs text-stone-400 italic">
            Aucun service disponible sur ce terrain.
          </div>
        )}
      </div>
    </div>
  );
}
