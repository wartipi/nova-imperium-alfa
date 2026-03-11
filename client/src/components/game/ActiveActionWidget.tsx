import React, { useEffect, useState } from "react";
import { usePlayerActions } from "../../lib/stores/usePlayerActions";
import { fetchCurrentAction, cancelCurrentAction } from "../../lib/api/playerActionsApi";

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function ActiveActionWidget() {
  const { activeAction, setActiveAction } = usePlayerActions();
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeAction || activeAction.status !== "in_progress") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [activeAction]);

  useEffect(() => {
    if (!activeAction || activeAction.status !== "in_progress") return;

    const msLeft = new Date(activeAction.expectedEndTime).getTime() - Date.now();

    const sync = () => {
      fetchCurrentAction()
        .then(({ action }) => {
          setActiveAction(action?.status === "in_progress" ? action : null);
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

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelCurrentAction();
      setActiveAction(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation";
      console.error("[ActiveActionWidget] Annulation échouée:", msg);
    } finally {
      setCancelling(false);
    }
  };

  if (!activeAction || activeAction.status !== "in_progress") {
    return (
      <div className="mt-2 text-xs text-amber-600 italic">
        Aucune action en cours
      </div>
    );
  }

  const msLeft = Math.max(0, new Date(activeAction.expectedEndTime).getTime() - now);
  const dest = `(${activeAction.endWorldX}, ${activeAction.endWorldY})`;

  return (
    <div className="mt-2 border border-amber-400 rounded bg-amber-50 p-2 text-xs">
      <div className="text-amber-800 font-semibold mb-1 uppercase tracking-wide">
        Action en cours
      </div>
      <div className="flex justify-between text-amber-700 mb-0.5">
        <span>Type</span>
        <span className="font-medium">{activeAction.type}</span>
      </div>
      <div className="flex justify-between text-amber-700 mb-0.5">
        <span>Destination</span>
        <span className="font-medium">{dest}</span>
      </div>
      <div className="flex justify-between text-amber-700 mb-0.5">
        <span>Coût</span>
        <span className="font-medium">{activeAction.totalCost} AP</span>
      </div>
      <div className="flex justify-between text-amber-700 mb-1">
        <span>Temps restant</span>
        <span className="font-medium">{msLeft > 0 ? formatDuration(msLeft) : "Finalisation…"}</span>
      </div>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="w-full mt-1 py-0.5 px-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {cancelling ? "Annulation…" : "Annuler l'action"}
      </button>
    </div>
  );
}
