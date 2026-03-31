import { useEffect, useRef } from "react";

// ─── TileContextMenu ──────────────────────────────────────────────────────────
// Menu contextuel de case (V1 minimale).
// Ouvert par clic droit depuis GameCanvas sur une tuile hexagonale.
// Calcule les actions disponibles selon le contexte de la case :
//   - case avec colonie → Marché + Banque (le serveur valide via resolveAccessPoint)
//   - case sans colonie → info seulement, aucune action de service
//
// Les actions dispatche nova:open-panel { panel } — écouté par MedievalHUD.
// Extensibilité : ajouter de nouvelles entrées dans COLONY_ACTIONS ou créer
// un tableau NO_COLONY_ACTIONS pour les futures actions terrain.
// ─────────────────────────────────────────────────────────────────────────────

export interface TileContextMenuProps {
  screenX:    number;
  screenY:    number;
  hexX:       number;
  hexY:       number;
  hasColony:  boolean;
  colonyName: string | null;
  onClose:    () => void;
}

// Actions disponibles pour les cases avec colonie (V1)
const COLONY_ACTIONS = [
  {
    panel:   "marketplace",
    icon:    "🏪",
    label:   "Accéder au marché",
    detail:  "Requiert Guilde des Marchands",
  },
  {
    panel:   "treasury",
    icon:    "🏦",
    label:   "Accéder à la banque",
    detail:  "Requiert Banque",
  },
] as const;

export function TileContextMenu({
  screenX,
  screenY,
  hexX,
  hexY,
  hasColony,
  colonyName,
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

  // Clamping pour rester dans le viewport
  const menuW = 220;
  const menuH = hasColony ? 160 : 90;
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
        left:       clampedX,
        top:        clampedY,
        width:      menuW,
        zIndex:     10000,
        pointerEvents: "auto",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* En-tête case */}
      <div className="px-3 py-2 border-b border-amber-800/60 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-amber-400">
            {hasColony ? (colonyName ?? "Colonie") : "Terrain"}
          </p>
          <p className="text-xs text-stone-400">
            case ({hexX}, {hexY})
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-200 text-lg leading-none px-1"
          title="Fermer"
        >
          ×
        </button>
      </div>

      {/* Corps */}
      <div className="py-1">
        {hasColony ? (
          COLONY_ACTIONS.map((action) => (
            <button
              key={action.panel}
              onClick={() => handleAction(action.panel)}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-amber-800/40 transition-colors"
              style={{ pointerEvents: "auto" }}
            >
              <span className="text-base mt-0.5">{action.icon}</span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-amber-100">{action.label}</span>
                <span className="text-xs text-stone-400">{action.detail}</span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-stone-400 italic">
            Aucun service disponible sur ce terrain.
          </div>
        )}
      </div>
    </div>
  );
}
