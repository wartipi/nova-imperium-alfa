import React from "react";

// Composant de confirmation canonique Nova Imperium.
// Référence standard pour toutes les futures confirmations UI du jeu.
// Remplace window.confirm(...) — ne pas utiliser window.confirm dans les panneaux jeu.

export interface NovaConfirmLine {
  label: string;
  value: string;
}

interface NovaConfirmModalProps {
  isOpen:         boolean;
  title:          string;
  lines?:         NovaConfirmLine[];
  note?:          string;
  confirmLabel?:  string;
  cancelLabel?:   string;
  onConfirm:      () => void;
  onCancel:       () => void;
}

export function NovaConfirmModal({
  isOpen,
  title,
  lines = [],
  note,
  confirmLabel = "Confirmer",
  cancelLabel  = "Annuler",
  onConfirm,
  onCancel,
}: NovaConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center"
      style={{ zIndex: 10000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titre */}
        <h3 className="text-amber-900 font-bold text-lg mb-4">{title}</h3>

        {/* Lignes de détails */}
        {lines.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3 space-y-1">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-amber-700">{l.label}</span>
                <span className="text-amber-900 font-semibold">{l.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        {note && (
          <p className="text-xs text-amber-700 italic mb-4">{note}</p>
        )}

        {/* Boutons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 border border-amber-600 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-sm font-medium"
            style={{ pointerEvents: "auto" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-sm font-semibold"
            style={{ pointerEvents: "auto" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
