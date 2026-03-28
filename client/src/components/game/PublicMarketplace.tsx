import React, { useState, useEffect, useCallback } from "react";
import {
  fetchMarketGuild, fetchMarketOrders, fetchMarketTrades,
  placeMarketOrder, cancelMarketOrder, fillMarketOrder, updateMarketFee,
  type MarketGuild, type MarketOrder, type MarketTrade,
  type ResourceType, type OrderSide, RESOURCE_LABELS, ALL_RESOURCES,
} from "../../lib/api/marketApi";

interface PublicMarketplaceProps {
  playerId: string;
  onClose: () => void;
}

export function PublicMarketplace({ playerId, onClose }: PublicMarketplaceProps) {

  // ─── États ────────────────────────────────────────────────────────────────────
  interface CityOption { cityId: number; name: string; hasGuild: boolean }
  const [rmCities, setRmCities]     = useState<CityOption[]>([]);
  const [rmCityId, setRmCityId]     = useState<number | null>(null);
  const [rmGuild, setRmGuild]       = useState<MarketGuild | null>(null);
  const [rmOrders, setRmOrders]     = useState<MarketOrder[]>([]);
  const [rmTrades, setRmTrades]     = useState<MarketTrade[]>([]);
  const [rmLoading, setRmLoading]   = useState(false);
  const [rmMsg, setRmMsg]           = useState<string | null>(null);
  const [rmOrderForm, setRmOrderForm] = useState({
    side: 'sell' as OrderSide,
    resourceType: 'wood' as ResourceType,
    pricePerUnit: 10,
    quantity: 1,
  });
  const [rmFillQty, setRmFillQty]   = useState<Record<number, number>>({});
  const [rmFeeInput, setRmFeeInput] = useState<string>('');

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  const rmGetAuth = (): Record<string, string> => {
    const saved = localStorage.getItem("nova_imperium_auth");
    if (!saved) return {};
    const { token } = JSON.parse(saved);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Chargement des villes ────────────────────────────────────────────────────
  const rmFetchCities = useCallback(async () => {
    try {
      const resp = await fetch("/api/cities/me", { headers: rmGetAuth() });
      if (!resp.ok) return;
      const data = await resp.json();
      const opts: CityOption[] = (data ?? []).map((c: any) => ({
        cityId:   c.cityId ?? c.id,
        name:     c.name,
        hasGuild: Array.isArray(c.buildings) && c.buildings.includes("guilde_des_marchands"),
      }));
      setRmCities(opts);
      const first = opts.find(o => o.hasGuild);
      if (first && rmCityId === null) setRmCityId(first.cityId);
    } catch { /* silencieux */ }
  }, []);

  // ─── Chargement du marché d'une ville ────────────────────────────────────────
  const rmLoadMarket = useCallback(async (cityId: number) => {
    setRmLoading(true);
    setRmMsg(null);
    try {
      const [guildData, orders, trades] = await Promise.all([
        fetchMarketGuild(cityId),
        fetchMarketOrders(cityId),
        fetchMarketTrades(cityId),
      ]);
      setRmGuild(guildData.guild);
      setRmOrders(orders);
      setRmTrades(trades);
    } catch (e: any) {
      setRmMsg(e.message ?? "Erreur de chargement");
      setRmGuild(null);
      setRmOrders([]);
      setRmTrades([]);
    } finally {
      setRmLoading(false);
    }
  }, []);

  useEffect(() => { rmFetchCities(); }, []);
  useEffect(() => { if (rmCityId !== null) rmLoadMarket(rmCityId); }, [rmCityId]);

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const rmPlaceOrder = async () => {
    if (!rmCityId) return;
    try {
      const result = await placeMarketOrder(rmCityId, rmOrderForm);
      setRmMsg(`✅ Ordre #${result.orderId} créé — escrow prélevé.`);
      rmLoadMarket(rmCityId);
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  const rmCancelOrder = async (orderId: number) => {
    if (!rmCityId) return;
    try {
      await cancelMarketOrder(rmCityId, orderId);
      setRmMsg(`✅ Ordre #${orderId} annulé — escrow retourné.`);
      rmLoadMarket(rmCityId);
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  const rmFillOrder = async (orderId: number) => {
    if (!rmCityId) return;
    const qty = rmFillQty[orderId] ?? 1;
    try {
      const r = await fillMarketOrder(rmCityId, orderId, qty);
      setRmMsg(`✅ Fill #${orderId} — ${qty} unités — ${r.totalGold}g (frais: ${r.feeAmount}g)`);
      rmLoadMarket(rmCityId);
    } catch (e: any) { setRmMsg(`❌ ${e.message}`); }
  };

  const rmUpdateFee = async () => {
    if (!rmCityId) return;
    const bps = parseInt(rmFeeInput, 10);
    if (isNaN(bps)) { setRmMsg("❌ Valeur invalide"); return; }
    try {
      await updateMarketFee(rmCityId, bps);
      setRmMsg(`✅ Commission en attente : ${bps} bps — active dans 24 h`);
      rmLoadMarket(rmCityId);
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
              <p className="text-sm text-amber-700">Carnet d'ordres · Guilde des Marchands requise</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-700 hover:text-amber-900 text-3xl font-bold hover:bg-amber-200 rounded px-2"
            style={{ userSelect: 'none', pointerEvents: 'auto' }}
            title="Fermer le marché"
          >
            ×
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-hidden flex flex-col bg-emerald-50">

          {/* Sélecteur de ville */}
          <div className="p-4 border-b border-emerald-200 bg-emerald-100 flex items-center gap-4 flex-shrink-0">
            <label className="font-semibold text-emerald-900 text-sm whitespace-nowrap">Marché de :</label>
            <select
              value={rmCityId ?? ""}
              onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setRmCityId(v); }}
              className="px-3 py-1.5 border border-emerald-400 rounded-lg text-sm bg-white flex-1 max-w-xs"
            >
              <option value="">— Sélectionner une ville —</option>
              {rmCities.map(c => (
                <option key={c.cityId} value={c.cityId} disabled={!c.hasGuild}>
                  {c.name}{c.hasGuild ? "" : " (pas de guilde)"}
                </option>
              ))}
            </select>
            {rmCityId && (
              <button
                onClick={() => rmLoadMarket(rmCityId)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm"
                style={{ pointerEvents: "auto" }}
              >🔄 Rafraîchir</button>
            )}
          </div>

          {/* Feedback */}
          {rmMsg && (
            <div className={`px-4 py-2 text-sm font-medium flex-shrink-0 ${
              rmMsg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {rmMsg}
            </div>
          )}

          {/* Contenu principal */}
          {!rmCityId ? (
            <div className="flex-1 flex items-center justify-center text-emerald-700 text-center p-8">
              <div>
                <div className="text-4xl mb-4">🏪</div>
                <p className="text-lg font-semibold mb-2">Sélectionnez une ville</p>
                <p className="text-sm">Choisissez une ville disposant de la Guilde des Marchands pour accéder au carnet d'ordres.</p>
              </div>
            </div>

          ) : rmLoading ? (
            <div className="flex-1 flex items-center justify-center text-emerald-700">Chargement...</div>

          ) : !rmGuild ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-lg font-semibold text-red-800 mb-2">Guilde des Marchands requise</p>
                <p className="text-sm text-red-700">Cette ville n'a pas de Guilde des Marchands. Construisez-la pour débloquer le marché des ressources.</p>
              </div>
            </div>

          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Info guilde + commission */}
              <div className="bg-white border border-emerald-200 rounded-lg p-3 flex flex-wrap gap-4 items-center text-sm">
                <span className="font-semibold text-emerald-900">Tier {rmGuild.tier}</span>
                <span className="text-emerald-800">
                  Commission active : <strong>{rmGuild.activeFeeBps} bps</strong> ({(rmGuild.activeFeeBps / 100).toFixed(2)}%)
                </span>
                {rmGuild.pendingFeeBps != null && (
                  <span className="text-amber-700">
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

        </div>
      </div>
    </div>
  );
}
