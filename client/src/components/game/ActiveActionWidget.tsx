import React, { useEffect, useRef, useState } from "react";
import { usePlayerActions } from "../../lib/stores/usePlayerActions";
import { fetchCurrentAction, cancelCurrentAction } from "../../lib/api/playerActionsApi";

// ─── Labels lisibles par type d'action ───────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; icon: string; logistic: boolean }> = {
  move:                   { label: "Déplacement",              icon: "🚶", logistic: false },
  collect_harvest:        { label: "Collecte",                 icon: "🚜", logistic: true  },
  transfer_bank_to_city:  { label: "Transfert → Ville",        icon: "📦", logistic: true  },
  transfer_bank_to_player:{ label: "Transfert → Transport",    icon: "🎒", logistic: true  },
  build:                  { label: "Construction",             icon: "🏗️", logistic: true  },
};

const COMPLETION_LABELS: Record<string, string> = {
  collect_harvest:        "✅ Ressources collectées",
  transfer_bank_to_city:  "✅ Transfert arrivé en ville",
  transfer_bank_to_player:"✅ Ressources dans votre transport",
  build:                  "✅ Construction terminée",
  move:                   "✅ Déplacement terminé",
};

function getActionMeta(type: string) {
  return ACTION_LABELS[type] ?? { label: type, icon: "⚙️", logistic: false };
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours   > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ─── ActiveActionWidget ───────────────────────────────────────────────────────

export function ActiveActionWidget() {
  const { activeAction, setActiveAction } = usePlayerActions();
  const [cancelling,     setCancelling]     = useState(false);
  const [now,            setNow]            = useState(Date.now());
  const [completedMsg,   setCompletedMsg]   = useState<string | null>(null);

  // Ticker 1s pour le compte à rebours
  useEffect(() => {
    if (!activeAction || activeAction.status !== "in_progress") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [activeAction]);

  // Timer de complétion — se déclenche quand msLeft atteint 0
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!activeAction || activeAction.status !== "in_progress") return;
    syncedRef.current = false;

    const msLeft = new Date(activeAction.expectedEndTime).getTime() - Date.now();

    const sync = () => {
      if (syncedRef.current) return;
      fetchCurrentAction()
        .then(({ action }) => {
          const isStillInProgress = action?.status === "in_progress";
          if (isStillInProgress) {
            // L'action n'est pas encore terminée côté serveur — recheck dans 2s
            setTimeout(sync, 2000);
          } else {
            syncedRef.current = true;
            // Complétion détectée : notifier les panneaux et afficher le message
            window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
            const label = COMPLETION_LABELS[activeAction.type] ?? "✅ Action terminée";
            setCompletedMsg(label);
            setActiveAction(null);
            setTimeout(() => setCompletedMsg(null), 4000);
          }
        })
        .catch(() => {});
    };

    if (msLeft <= 0) {
      sync();
      return;
    }

    const timer = setTimeout(sync, msLeft);
    return () => clearTimeout(timer);
  }, [activeAction, setActiveAction]);

  // ─── Annulation ─────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelCurrentAction();
      setActiveAction(null);
      setCompletedMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation";
      console.error("[ActiveActionWidget] Annulation échouée:", msg);
    } finally {
      setCancelling(false);
    }
  };

  // ─── Message de complétion (transitoire 4s) ──────────────────────────────
  if (completedMsg) {
    return (
      <div className="mt-2 border border-green-400 rounded bg-green-50 p-2 text-xs">
        <p className="text-green-800 font-semibold text-center">{completedMsg}</p>
        <p className="text-green-600 text-center text-xs mt-0.5 italic">Stocks mis à jour</p>
      </div>
    );
  }

  // ─── Aucune action ───────────────────────────────────────────────────────
  if (!activeAction || activeAction.status !== "in_progress") {
    return (
      <div className="mt-2 text-xs text-amber-600 italic">
        Aucune action en cours
      </div>
    );
  }

  const msLeft  = Math.max(0, new Date(activeAction.expectedEndTime).getTime() - now);
  const meta    = getActionMeta(activeAction.type);

  return (
    <div className="mt-2 border border-amber-400 rounded bg-amber-50 p-2 text-xs">
      <div className="text-amber-800 font-semibold mb-1.5 flex items-center gap-1">
        <span>{meta.icon}</span>
        <span className="uppercase tracking-wide">{meta.label} en cours</span>
      </div>

      {/* Coordonnées uniquement pour les déplacements */}
      {!meta.logistic && (
        <div className="flex justify-between text-amber-700 mb-0.5">
          <span>Destination</span>
          <span className="font-medium">({activeAction.endWorldX}, {activeAction.endWorldY})</span>
        </div>
      )}

      {meta.logistic && (
        <div className="flex justify-between text-amber-700 mb-0.5">
          <span>Coût PA</span>
          <span className="font-medium">{activeAction.totalCost} AP</span>
        </div>
      )}

      {!meta.logistic && (
        <div className="flex justify-between text-amber-700 mb-0.5">
          <span>Coût</span>
          <span className="font-medium">{activeAction.totalCost} AP</span>
        </div>
      )}

      <div className="flex justify-between text-amber-700 mb-1">
        <span>Temps restant</span>
        <span className="font-medium">
          {msLeft > 0 ? formatDuration(msLeft) : "⏳ Finalisation…"}
        </span>
      </div>

      {/* Barre de progression */}
      {(() => {
        const total = new Date(activeAction.expectedEndTime).getTime() - new Date(activeAction.startTime).getTime();
        const elapsed = total - msLeft;
        const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
        return (
          <div className="w-full bg-amber-200 rounded-full h-1 mb-1.5">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        );
      })()}

      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="w-full mt-0.5 py-0.5 px-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {cancelling ? "Annulation…" : "Annuler"}
      </button>
    </div>
  );
}
