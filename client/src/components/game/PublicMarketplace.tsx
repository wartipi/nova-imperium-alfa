import React, { useState, useEffect, useCallback } from "react";
import {
  fetchMarketGuild, fetchMarketOrders, fetchMarketTrades,
  placeMarketOrder, cancelMarketOrder, fillMarketOrder, updateMarketFee,
  type MarketGuild, type MarketOrder, type MarketTrade,
  type ResourceType, type OrderSide, RESOURCE_LABELS, ALL_RESOURCES,
} from "../../lib/api/marketApi";
import { getPlayerTransport, type PlayerTransportDTO } from "../../lib/api/economyApi";

interface PublicMarketplaceProps {
  playerId: string;
  onClose: () => void;
}

// ─── État d'accès physique ─────────────────────────────────────────────────────
interface AccessState {
  status:   "loading" | "allowed" | "denied" | "error";
  cityId:   number | null;
  hasGuild: boolean;
  feeBps:   number;
  reason:   string | null;
  isAdmin:  boolean;
}

export function PublicMarketplace({ playerId, onClose }: PublicMarketplaceProps) {

  // ─── Accès physique ───────────────────────────────────────────────────────────
  const [access, setAccess] = useState<AccessState>({
    status: "loading", cityId: null, hasGuild: false, feeBps: 500, reason: null, isAdmin: false,
  });

  // ─── Marché ───────────────────────────────────────────────────────────────────
  const [rmGuild,   setRmGuild]   = useState<MarketGuild | null>(null);
  const [rmOrders,  setRmOrders]  = useState<MarketOrder[]>([]);
  const [rmTrades,  setRmTrades]  = useState<MarketTrade[]>([]);
  const [rmLoading, setRmLoading] = useState(false);
  const [rmMsg,     setRmMsg]     = useState<string | null>(null);
  const [rmOrderForm, setRmOrderForm] = useState({
    side: 'sell' as OrderSide,
    resourceType: 'wood' as ResourceType,
    pricePerUnit: 10,
    quantity: 1,
  });
  const [rmFillQty, setRmFillQty]   = useState<Record<number, number>>({});
  const [rmFeeInput, setRmFeeInput] = useState<string>('');

  // ─── Banque & Inventaire transport ────────────────────────────────────────────
  const [hasBankAccess, setHasBankAccess] = useState(false);
  const [transport,     setTransport]     = useState<PlayerTransportDTO | null>(null);

  // ─── Boîte de règlement du marché ─────────────────────────────────────────────
  const [marketBox, setMarketBox] = useState<Record<string, number> | null>(null);
  const [boxMsg,    setBoxMsg]    = useState<string | null>(null);

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  const rmGetAuth = (): Record<string, string> => {
    const saved = localStorage.getItem("nova_imperium_auth");
    if (!saved) return {};
    const { token } = JSON.parse(saved);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Accès banque (parallèle au marché) ──────────────────────────────────────
  const checkBankAccess = useCallback(async () => {
    try {
      const resp = await fetch("/api/economy/bank-access-check", { headers: rmGetAuth() });
      if (!resp.ok) { setHasBankAccess(false); return; }
      const data = await resp.json();
      setHasBankAccess(data.allowed === true);
    } catch { setHasBankAccess(false); }
  }, []);

  // ─── Inventaire transport ─────────────────────────────────────────────────────
  const loadTransport = useCallback(async () => {
    try {
      const t = await getPlayerTransport();
      setTransport(t);
    } catch { setTransport(null); }
  }, []);

  // ─── Boîte de règlement ───────────────────────────────────────────────────────
  const loadMarketBox = useCallback(async () => {
    try {
      const resp = await fetch("/api/market/box", { headers: rmGetAuth() });
      if (!resp.ok) { setMarketBox(null); return; }
      const data = await resp.json();
      setMarketBox(data);
    } catch { setMarketBox(null); }
  }, []);

  const claimToTransport = async () => {
    setBoxMsg(null);
    try {
      const resp = await fetch("/api/market/box/collect-transport", {
        method: "POST", headers: { ...rmGetAuth(), "Content-Type": "application/json" },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setBoxMsg("✅ Récupéré dans l'inventaire.");
      loadMarketBox();
      loadTransport();
    } catch (e: any) { setBoxMsg(`❌ ${e.message}`); }
  };

  const claimToBank = async () => {
    setBoxMsg(null);
    try {
      const resp = await fetch("/api/market/box/collect-bank", {
        method: "POST", headers: { ...rmGetAuth(), "Content-Type": "application/json" },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setBoxMsg("✅ Déposé à la banque.");
      loadMarketBox();
    } catch (e: any) { setBoxMsg(`❌ ${e.message}`); }
  };

  // ─── Vérification d'accès physique au montage ─────────────────────────────────
  const checkAccess = useCallback(async () => {
    setAccess(a => ({ ...a, status: "loading" }));
    try {
      const resp = await fetch("/api/market/access-check", { headers: rmGetAuth() });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setAccess({ status: "error", cityId: null, hasGuild: false, feeBps: 500, reason: body.error ?? "Erreur serveur", isAdmin: false });
        return;
      }
      const data = await resp.json();
      if (data.allowed) {
        setAccess({ status: "allowed", cityId: data.cityId, hasGuild: data.hasGuild ?? false, feeBps: data.feeBps ?? 500, reason: null, isAdmin: data.isAdmin ?? false });
      } else {
        setAccess({ status: "denied", cityId: null, hasGuild: false, feeBps: 500, reason: data.reason, isAdmin: false });
      }
    } catch (e: any) {
      setAccess({ status: "error", cityId: null, hasGuild: false, feeBps: 500, reason: e.message ?? "Erreur réseau", isAdmin: false });
    }
  }, []);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  // ─── Chargement du carnet (déclenché une fois l'accès confirmé) ───────────────
  const rmLoadMarket = useCallback(async (cityId: number) => {
    setRmLoading(true);
    setRmMsg(null);
    try {
      // Pour cityId=0 (admin sans position), utilise 0 — les routes renvoient le global.
      const safeId = cityId > 0 ? cityId : 0;
      const [guildData, orders, trades] = await Promise.all([
        safeId > 0 ? fetchMarketGuild(safeId) : Promise.resolve({ guild: null, hasGuild: false, feeBps: 0 }),
        fetchMarketOrders(safeId > 0 ? safeId : 1),
        fetchMarketTrades(safeId > 0 ? safeId : 1),
      ]);
      setRmGuild((guildData as any).guild ?? null);
      setRmOrders(orders);
      setRmTrades(trades);
    } catch (e: any) {
      setRmMsg(e.message ?? "Erreur de chargement");
      setRmOrders([]);
      setRmTrades([]);
    } finally {
      setRmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access.status === "allowed" && access.cityId !== null) {
      rmLoadMarket(access.cityId);
      checkBankAccess();
      loadTransport();
      loadMarketBox();
    }
  }, [access.status, access.cityId]);

  // ─── SSE marché — invalidation cross-client ───────────────────────────────────
  // Ouvert uniquement si l'accès est confirmé.
  // Recharge le carnet via les routes REST existantes à chaque signal serveur.
  // Garde anti-spam 300 ms pour éviter les rafraîchissements concurrents.
  useEffect(() => {
    if (access.status !== "allowed" || access.cityId === null) return;
    let token: string;
    try {
      const saved = localStorage.getItem("nova_imperium_auth");
      if (!saved) return;
      token = JSON.parse(saved).token;
      if (!token) return;
    } catch { return; }

    const sse = new EventSource(`/api/market/stream?token=${encodeURIComponent(token)}`);
    let lastRefresh = 0;

    sse.addEventListener("market_invalidated", () => {
      const now = Date.now();
      if (now - lastRefresh < 300) return;
      lastRefresh = now;
      rmLoadMarket(access.cityId!);
      loadTransport();
      loadMarketBox();
    });

    return () => { sse.close(); };
  }, [access.status, access.cityId, rmLoadMarket, loadTransport]);

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const rmPlaceOrder = async () => {
    const cityId = access.cityId ?? 0;
    try {
      const result = await placeMarketOrder(cityId > 0 ? cityId : 1, rmOrderForm);
      setRmMsg(`✅ Ordre #${result.orderId} créé — escrow prélevé.`);
      rmLoadMarket(cityId);
      loadTransport();
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  const rmCancelOrder = async (orderId: number) => {
    const cityId = access.cityId ?? 0;
    try {
      await cancelMarketOrder(cityId > 0 ? cityId : 1, orderId);
      setRmMsg(`✅ Ordre #${orderId} annulé — escrow retourné.`);
      rmLoadMarket(cityId);
      loadTransport();
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  const rmFillOrder = async (orderId: number) => {
    const cityId = access.cityId ?? 0;
    const qty = rmFillQty[orderId] ?? 1;
    try {
      const r = await fillMarketOrder(cityId > 0 ? cityId : 1, orderId, qty);
      setRmMsg(`✅ Fill #${orderId} — ${qty} unités — ${r.totalGold}g (frais: ${r.feeAmount}g)`);
      rmLoadMarket(cityId);
      loadTransport();
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  const rmUpdateFee = async () => {
    const cityId = access.cityId ?? 0;
    const bps = parseInt(rmFeeInput, 10);
    if (isNaN(bps)) { setRmMsg("❌ Valeur invalide"); return; }
    try {
      await updateMarketFee(cityId > 0 ? cityId : 1, bps);
      setRmMsg(`✅ Commission en attente : ${bps} bps — active dans 24 h`);
      rmLoadMarket(cityId);
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-amber-50 border-4 border-amber-800 rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-6xl flex flex-col"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b-2 border-amber-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏪</span>
            <div>
              <h2 className="text-2xl font-bold text-amber-900">Marché des Ressources</h2>
              <p className="text-sm text-amber-700">Service central · Accès via terminal physique</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasBankAccess && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('nova:open-panel', { detail: { panel: 'treasury' } }))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold transition-colors"
                style={{ pointerEvents: 'auto' }}
                title="Accéder à la banque"
              >
                <span>🏦</span>
                <span>Banque</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-amber-700 hover:text-amber-900 text-3xl font-bold hover:bg-amber-200 rounded px-2"
              style={{ userSelect: 'none', pointerEvents: 'auto' }}
              title="Fermer le marché"
            >
              ×
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-hidden flex flex-col bg-emerald-50">

          {/* Feedback */}
          {rmMsg && (
            <div className={`px-4 py-2 text-sm font-medium flex-shrink-0 ${
              rmMsg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {rmMsg}
            </div>
          )}

          {/* ─── États d'accès ──────────────────────────────────────────────── */}

          {access.status === "loading" && (
            <div className="flex-1 flex items-center justify-center text-emerald-700">
              Vérification de présence physique…
            </div>
          )}

          {(access.status === "denied" || access.status === "error") && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4">🔒</div>
                <p className="text-lg font-bold text-red-800 mb-3">Accès refusé</p>
                <p className="text-sm text-red-700 mb-4">
                  {access.reason ?? "Vous devez vous trouver physiquement sur une case contenant la Guilde des Marchands pour accéder au marché."}
                </p>
                <p className="text-xs text-amber-700 mb-4 italic">
                  Déplacez votre avatar sur une ville équipée d'une Guilde des Marchands, puis revenez ici.
                </p>
                <button
                  onClick={checkAccess}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm"
                  style={{ pointerEvents: "auto" }}
                >
                  🔄 Vérifier à nouveau
                </button>
              </div>
            </div>
          )}

          {access.status === "allowed" && (
            <>
              {/* Bannière point d'accès */}
              <div className="px-4 pt-3 pb-1 flex-shrink-0">
                {access.hasGuild && rmGuild ? (
                  <div className="bg-white border border-emerald-200 rounded-lg p-2.5 flex flex-wrap gap-4 items-center text-sm">
                    <span className="font-semibold text-emerald-900">🏦 Guilde Tier {rmGuild.tier}</span>
                    <span className="text-emerald-800">
                      Commission : <strong>{rmGuild.activeFeeBps} bps</strong> ({(rmGuild.activeFeeBps / 100).toFixed(2)}%)
                    </span>
                    {rmGuild.pendingFeeBps != null && (
                      <span className="text-amber-700 text-xs">
                        En attente : {rmGuild.pendingFeeBps} bps — actif le {new Date(rmGuild.pendingFeeAppliesAt!).toLocaleString()}
                      </span>
                    )}
                    <div className="flex gap-2 ml-auto items-center">
                      <input
                        type="number" min={0} max={600}
                        placeholder="bps"
                        value={rmFeeInput}
                        onChange={e => setRmFeeInput(e.target.value)}
                        className="w-20 px-2 py-1 border border-emerald-300 rounded text-sm"
                      />
                      <button
                        onClick={rmUpdateFee}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-sm"
                        style={{ pointerEvents: "auto" }}
                      >
                        Changer commission
                      </button>
                    </div>
                  </div>
                ) : (
                  // Cette branche n'est accessible qu'aux admins (cityId=0, hasGuild=false).
                  // Un joueur normal ne peut jamais atteindre status=allowed sans guilde :
                  // resolveAccessPoint() exige guilde_des_marchands à sa position, sinon 403.
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex flex-wrap gap-4 items-center text-sm">
                    <span className="font-semibold text-amber-900">⚙️ Vue administrateur</span>
                    <span className="text-amber-800">
                      Frais réseau par défaut : <strong>500 bps</strong> (5%) — aucune guilde active à ce point d'accès
                    </span>
                    <span className="text-amber-600 text-xs ml-auto">
                      Mode admin — accès global sans contrainte de position
                    </span>
                    <button
                      onClick={checkAccess}
                      className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded text-xs"
                      style={{ pointerEvents: "auto" }}
                      title="Vérifier à nouveau"
                    >
                      🔄
                    </button>
                  </div>
                )}
              </div>

              {/* Contenu marché */}
              {rmLoading ? (
                <div className="flex-1 flex items-center justify-center text-emerald-700">Chargement du carnet…</div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                  {/* ─── Inventaire joueur ────────────────────────────────── */}
                  {transport && (
                    <div className="bg-white border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                          🎒 Inventaire
                        </h4>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          transport.usedUnits >= transport.maxUnits
                            ? "bg-red-100 text-red-700"
                            : transport.usedUnits >= transport.maxUnits * 0.8
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {transport.usedUnits} / {transport.maxUnits} u.
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {/* Or */}
                        {transport.gold > 0 && (
                          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-xs">
                            <span>💰</span>
                            <span className="text-yellow-800 font-semibold">{transport.gold}</span>
                            <span className="text-yellow-600 truncate">Or</span>
                          </div>
                        )}
                        {/* Ressources */}
                        {ALL_RESOURCES.map(r => {
                          const qty = (transport as any)[r] as number;
                          if (!qty) return null;
                          return (
                            <div key={r} className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs">
                              <span className="text-stone-700 font-semibold">{qty}</span>
                              <span className="text-stone-500 truncate">{RESOURCE_LABELS[r]}</span>
                            </div>
                          );
                        })}
                        {transport.gold === 0 && transport.usedUnits === 0 && (
                          <span className="col-span-5 text-xs text-gray-400 italic">Inventaire vide</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── Boîte de règlement ───────────────────────────────── */}
                  {marketBox && (() => {
                    const MB_RESOURCES = ['food','wood','stone','iron','copper','coal','oil','herbs','fur'] as const;
                    const hasContent = (marketBox.gold ?? 0) > 0
                      || MB_RESOURCES.some(r => (marketBox[r] ?? 0) > 0);
                    return (
                      <div className="bg-white border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                            📦 Boîte de règlement
                          </h4>
                          {hasContent && (
                            <div className="flex gap-2">
                              <button
                                onClick={claimToTransport}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                                style={{ pointerEvents: "auto" }}
                                title="Récupérer dans l'inventaire (vérifie la capacité)"
                              >
                                🎒 Récupérer
                              </button>
                              <button
                                onClick={claimToBank}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
                                style={{ pointerEvents: "auto" }}
                                title="Déposer à la banque (sans limite de capacité)"
                              >
                                🏦 Banque
                              </button>
                            </div>
                          )}
                        </div>
                        {boxMsg && (
                          <div className={`text-xs px-2 py-1 rounded mb-2 ${
                            boxMsg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>{boxMsg}</div>
                        )}
                        {hasContent ? (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                            {(marketBox.gold ?? 0) > 0 && (
                              <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-xs">
                                <span>💰</span>
                                <span className="text-yellow-800 font-semibold">{marketBox.gold}</span>
                                <span className="text-yellow-600 truncate">Or</span>
                              </div>
                            )}
                            {MB_RESOURCES.map(r => {
                              const qty = marketBox[r] ?? 0;
                              if (!qty) return null;
                              return (
                                <div key={r} className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded px-2 py-1 text-xs">
                                  <span className="text-purple-800 font-semibold">{qty}</span>
                                  <span className="text-purple-600 truncate">{RESOURCE_LABELS[r as ResourceType]}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">En attente du marché — vide</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Formulaire nouvel ordre */}
                  <div className="bg-white border border-emerald-200 rounded-lg p-4">
                    <h4 className="font-bold text-emerald-900 mb-3">Poster un ordre</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <select
                        value={rmOrderForm.side}
                        onChange={e => setRmOrderForm(f => ({ ...f, side: e.target.value as OrderSide }))}
                        className="px-2 py-1.5 border border-emerald-300 rounded text-sm"
                      >
                        <option value="sell">🔻 Vendre</option>
                        <option value="buy">🔺 Acheter</option>
                      </select>
                      <select
                        value={rmOrderForm.resourceType}
                        onChange={e => setRmOrderForm(f => ({ ...f, resourceType: e.target.value as ResourceType }))}
                        className="px-2 py-1.5 border border-emerald-300 rounded text-sm"
                      >
                        {ALL_RESOURCES.map(r => <option key={r} value={r}>{RESOURCE_LABELS[r]}</option>)}
                      </select>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-emerald-700 whitespace-nowrap">Qté</label>
                        <input
                          type="number" min={1}
                          value={rmOrderForm.quantity}
                          onChange={e => setRmOrderForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-emerald-700 whitespace-nowrap">Prix/u</label>
                        <input
                          type="number" min={1}
                          value={rmOrderForm.pricePerUnit}
                          onChange={e => setRmOrderForm(f => ({ ...f, pricePerUnit: parseInt(e.target.value) || 1 }))}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded text-sm"
                        />
                      </div>
                      <button
                        onClick={rmPlaceOrder}
                        className={`py-1.5 px-4 rounded text-white text-sm font-semibold ${
                          rmOrderForm.side === "sell" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                        style={{ pointerEvents: "auto" }}
                      >
                        {rmOrderForm.side === "sell" ? "Vendre" : "Acheter"} → Escrow
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {rmOrderForm.side === "sell"
                        ? `Escrow : ${rmOrderForm.quantity} × ${RESOURCE_LABELS[rmOrderForm.resourceType]} débité immédiatement.`
                        : `Escrow : ${rmOrderForm.quantity * rmOrderForm.pricePerUnit} or débité immédiatement.`}
                    </p>
                  </div>

                  {/* Carnet d'ordres */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Ordres VENTE */}
                    <div className="bg-white border border-red-200 rounded-lg p-3">
                      <h4 className="font-bold text-red-800 mb-2 text-sm">
                        Ordres VENTE ({rmOrders.filter(o => o.side === "sell").length})
                      </h4>
                      {rmOrders.filter(o => o.side === "sell").length === 0
                        ? <p className="text-xs text-gray-400 italic">Aucun ordre de vente</p>
                        : rmOrders.filter(o => o.side === "sell").map(o => (
                          <div key={o.id} className="border border-red-100 rounded p-2 mb-2 text-xs">
                            <div className="flex justify-between font-semibold">
                              <span>{RESOURCE_LABELS[o.resourceType as ResourceType]}</span>
                              <span className="text-red-700">{o.pricePerUnit} g/u</span>
                            </div>
                            <div className="text-gray-600">Qté : {o.quantityRemaining}/{o.quantityTotal} — {o.playerName}</div>
                            <div className="flex gap-2 mt-1.5 items-center">
                              <input
                                type="number" min={1} max={o.quantityRemaining}
                                value={rmFillQty[o.id] ?? o.quantityRemaining}
                                onChange={e => setRmFillQty(q => ({ ...q, [o.id]: parseInt(e.target.value) || 1 }))}
                                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              />
                              <button
                                onClick={() => rmFillOrder(o.id)}
                                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                style={{ pointerEvents: "auto" }}
                              >Acheter</button>
                              {o.playerId === playerId && (
                                <button
                                  onClick={() => rmCancelOrder(o.id)}
                                  className="px-2 py-0.5 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs"
                                  style={{ pointerEvents: "auto" }}
                                >Annuler</button>
                              )}
                            </div>
                          </div>
                        ))
                      }
                    </div>

                    {/* Ordres ACHAT */}
                    <div className="bg-white border border-blue-200 rounded-lg p-3">
                      <h4 className="font-bold text-blue-800 mb-2 text-sm">
                        Ordres ACHAT ({rmOrders.filter(o => o.side === "buy").length})
                      </h4>
                      {rmOrders.filter(o => o.side === "buy").length === 0
                        ? <p className="text-xs text-gray-400 italic">Aucun ordre d'achat</p>
                        : rmOrders.filter(o => o.side === "buy").map(o => (
                          <div key={o.id} className="border border-blue-100 rounded p-2 mb-2 text-xs">
                            <div className="flex justify-between font-semibold">
                              <span>{RESOURCE_LABELS[o.resourceType as ResourceType]}</span>
                              <span className="text-blue-700">{o.pricePerUnit} g/u</span>
                            </div>
                            <div className="text-gray-600">Qté : {o.quantityRemaining}/{o.quantityTotal} — {o.playerName}</div>
                            <div className="flex gap-2 mt-1.5 items-center">
                              <input
                                type="number" min={1} max={o.quantityRemaining}
                                value={rmFillQty[o.id] ?? o.quantityRemaining}
                                onChange={e => setRmFillQty(q => ({ ...q, [o.id]: parseInt(e.target.value) || 1 }))}
                                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              />
                              <button
                                onClick={() => rmFillOrder(o.id)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                style={{ pointerEvents: "auto" }}
                              >Vendre</button>
                              {o.playerId === playerId && (
                                <button
                                  onClick={() => rmCancelOrder(o.id)}
                                  className="px-2 py-0.5 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs"
                                  style={{ pointerEvents: "auto" }}
                                >Annuler</button>
                              )}
                            </div>
                          </div>
                        ))
                      }
                    </div>

                  </div>

                  {/* Historique des trades */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <h4 className="font-bold text-gray-800 mb-2 text-sm">Historique ({rmTrades.length} trades)</h4>
                    {rmTrades.length === 0
                      ? <p className="text-xs text-gray-400 italic">Aucun trade effectué</p>
                      : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {rmTrades.map(t => (
                            <div key={t.id} className="flex gap-3 text-xs text-gray-700 border-b border-gray-100 pb-1">
                              <span className="text-gray-400">{new Date(t.executedAt).toLocaleString()}</span>
                              <span className="font-semibold">{t.quantity}× {RESOURCE_LABELS[t.resourceType as ResourceType]}</span>
                              <span>@ {t.pricePerUnit}g/u = {t.totalGold}g</span>
                              <span className="text-gray-400">frais: {t.feeAmount}g</span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
