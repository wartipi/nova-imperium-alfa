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
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [serverStep,     setServerStep]     = useState<number | null>(null);

  // Réinitialiser isSyncing et serverStep à chaque nouvelle action
  useEffect(() => {
    setIsSyncing(false);
    setServerStep(null);
  }, [activeAction?.id]);

  // Écouter la vérité serveur du step courant (émis par GameCanvas à chaque step confirmé)
  useEffect(() => {
    const handler = (e: Event) => {
      const { effectiveStep } = (e as CustomEvent<{ effectiveStep: number }>).detail ?? {};
      if (typeof effectiveStep === 'number') setServerStep(effectiveStep);
    };
    window.addEventListener('nova:step-progress', handler);
    return () => window.removeEventListener('nova:step-progress', handler);
  }, []);

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
      setIsSyncing(true);
      fetchCurrentAction()
        .then(({ action }) => {
          const isStillInProgress = action?.status === "in_progress";
          if (isStillInProgress) {
            // L'action n'est pas encore terminée côté serveur — recheck dans 2s
            setTimeout(sync, 2000);
          } else {
            syncedRef.current = true;
            setIsSyncing(false);
            // Complétion détectée : notifier les panneaux et afficher le message
            window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
            window.dispatchEvent(new CustomEvent('nova:ap-refresh'));
            const label = COMPLETION_LABELS[activeAction.type] ?? "✅ Action terminée";
            setCompletedMsg(label);
            // LOT 2 — Pour les déplacements, différer setActiveAction(null) de 800ms
            // afin de laisser GameCanvas (finalSyncTimerRef + doFinalSync) appliquer
            // la position finale avant que l'effet de polling ne soit nettoyé.
            const delay = activeAction.type === 'move' ? 800 : 0;
            setTimeout(() => setActiveAction(null), delay);
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

  // LOT 3 — Temps restant calculé directement à chaque render (pas via le state now
  // qui peut avoir jusqu'à 1s de retard). Le ticker setNow déclenche toujours le re-render
  // chaque seconde, mais la valeur affichée est toujours fraîche au moment du rendu.
  const msLeft  = Math.max(0, new Date(activeAction.expectedEndTime).getTime() - Date.now());
  const meta    = getActionMeta(activeAction.type);

  // ─── Calcul step par step (move uniquement) ──────────────────────────────────
  // Déduit msPerAP de startTime/expectedEndTime/totalCost — miroir de resolveMoveStep serveur.
  // Pas de constante codée en dur : dérivé des données action réelles.
  const stepDetail = (() => {
    if (activeAction.type !== "move") return null;
    const path = activeAction.path ?? [];
    if (path.length < 2) return null;

    const startMs  = new Date(activeAction.startTime).getTime();
    const endMs    = new Date(activeAction.expectedEndTime).getTime();
    const totalDur = endMs - startMs;
    const isAdminInstant = totalDur === 0;

    if (isAdminInstant) return null; // admin : déplacement immédiat, pas de détail

    const msPerAP = activeAction.totalCost > 0 ? totalDur / activeAction.totalCost : 0;

    // Bornes cumulées par step : boundaries[i] = ms depuis startTime pour entrer en étape i
    // path[0] = départ (coût ignoré), path[1..n-1] = étapes
    const boundaries: number[] = [0];
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      acc += path[i].cost * msPerAP;
      boundaries.push(acc);
    }

    const totalSteps   = path.length - 1; // nombre de tuiles à traverser
    const msElapsed = Date.now() - startMs;
    // Utiliser le step confirmé par le serveur (via nova:step-progress) si disponible,
    // sinon fallback sur l'estimation temporelle locale.
    let currentStep = 0;
    if (serverStep !== null) {
      currentStep = Math.min(serverStep, totalSteps);
    } else {
      for (let i = boundaries.length - 1; i >= 0; i--) {
        if (msElapsed >= boundaries[i]) { currentStep = i; break; }
      }
    }
    const isLastStep   = currentStep >= totalSteps;
    const nextStepIdx  = Math.min(currentStep + 1, path.length - 1);
    const msUntilNext  = isLastStep
      ? 0
      : Math.max(0, boundaries[nextStepIdx] - msElapsed);

    return {
      currentStep,
      totalSteps,
      nextTile: isLastStep ? null : path[nextStepIdx],
      msUntilNext,
      isLastStep,
    };
  })();

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

      {/* Détail step par step — uniquement pour les déplacements non-instantanés */}
      {stepDetail && (
        <div className="border-t border-amber-200 pt-1 mt-1 mb-1 space-y-0.5">
          <div className="flex justify-between text-amber-700">
            <span>Tuile</span>
            <span className="font-medium">
              {stepDetail.currentStep} / {stepDetail.totalSteps}
            </span>
          </div>
          {stepDetail.isLastStep ? (
            <div className="text-amber-600 italic text-center">Arrivée imminente…</div>
          ) : (
            <>
              <div className="flex justify-between text-amber-700">
                <span>Prochaine tuile</span>
                <span className="font-medium">
                  ({stepDetail.nextTile!.worldX}, {stepDetail.nextTile!.worldY})
                  {" "}<span className="text-amber-500 font-normal">{stepDetail.nextTile!.terrain}</span>
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {stepDetail && !stepDetail.isLastStep && (
        <div className="flex justify-between text-amber-700 mb-1">
          <span>Avant prochaine case</span>
          <span className="font-medium">{formatDuration(stepDetail.msUntilNext)}</span>
        </div>
      )}

      <div className="flex justify-between text-amber-700 mb-1">
        <span>Temps restant total</span>
        <span className="font-medium">
          {msLeft > 0 ? formatDuration(msLeft) : (isSyncing ? "Finalisation…" : "< 2s")}
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
