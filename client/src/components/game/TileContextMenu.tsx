import { useEffect, useRef } from "react";

// ─── TileContextMenu ──────────────────────────────────────────────────────────
// Menu contextuel de case (clic droit depuis GameCanvas sur une tuile hexagonale).
//
// Actions disponibles :
//   - Infos (ℹ️) — toujours visible, ouvre TileInfoPanel
//   - Se déplacer ici (🚶) — visible si onMove est non nul (case walkable et accessible)
//
// Les services ville (banque, marché) sont accessibles via AvatarActionMenu uniquement.
// ─────────────────────────────────────────────────────────────────────────────

export interface TileContextMenuProps {
  screenX:       number;
  screenY:       number;
  hexX:          number;
  hexY:          number;
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

  const hasAnyAction = Boolean(onMove);

  // Clamping pour rester dans le viewport
  const menuW      = 230;
  const baseH      = 56;
  const rowH       = 52;
  const noActH     = 44;
  const actionCount = [Boolean(onMove)].filter(Boolean).length;
  const menuH      = baseH + (hasAnyAction ? actionCount * rowH : noActH);
  const clampedX = Math.min(screenX, window.innerWidth  - menuW - 8);
  const clampedY = Math.min(screenY, window.innerHeight - menuH - 8);

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

      {/* Corps — actions de déplacement */}
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

        {!hasAnyAction && (
          <div className="px-3 py-2 text-xs text-stone-400 italic">
            Aucun service disponible sur ce terrain.
          </div>
        )}
      </div>
    </div>
  );
}
