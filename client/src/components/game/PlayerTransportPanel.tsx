import { useState, useEffect, useCallback } from "react";
import {
  getPlayerTransport,
  getPlayerCurrentCity,
  postDepositTransportToCity,
  type PlayerTransportDTO,
  type PlayerCurrentCityDTO,
  type T1Mats,
} from "../../lib/api/economyApi";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { CompetenceTree } from "./CompetenceTree";

// ─── Matériaux ────────────────────────────────────────────────────────────────

type MatKey = 'fracten'|'common_metals'|'leather_fur'|'food'|'wood'|'stone'|'coal'|'oil'|'herbs';
const MAT_ROWS: Array<[MatKey, string, string]> = [
  ['fracten','Ⓕ','Fracten'],['common_metals','⚒️','Métaux communs'],['leather_fur','🦺','Cuir & Fourrure'],
  ['food','🌿','Nourriture'],['wood','🪵','Bois'],['stone','🪨','Pierre'],
  ['coal','🖤','Charbon'],['oil','🛢️','Pétrole'],['herbs','🌱','Herbes'],
];

// ─── Slots d'équipement ───────────────────────────────────────────────────────

const EQUIPMENT_SLOTS = [
  { icon: '⚔️',  label: 'Arme principale' },
  { icon: '🛡️',  label: 'Armure' },
  { icon: '💍',  label: 'Accessoire 1' },
  { icon: '📿',  label: 'Accessoire 2' },
  { icon: '🐴',  label: 'Monture' },
];

// ─── Types des onglets ────────────────────────────────────────────────────────

type Tab = 'resume' | 'inventaire' | 'equipement' | 'avatar' | 'competences';

// ─── Composant principal ──────────────────────────────────────────────────────

export function PlayerTransportPanel() {
  // ── Onglet actif ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('resume');

  // ── Données joueur ─────────────────────────────────────────────────────────
  const {
    selectedCharacter,
    level,
    experience,
    experienceToNextLevel,
    actionPoints,
    maxActionPoints,
    getExperienceProgress,
    avatars,
    currentAvatarId,
    createAvatar,
    switchToAvatar,
    getCurrentAvatar,
    canCreateNewAvatar,
  } = usePlayer();
  const { reputation, getReputationLevel } = useReputation();

  // ── Gestion avatars (locale à ce panneau) ─────────────────────────────────
  const [newAvatarName, setNewAvatarName] = useState('');

  // ── Transport ──────────────────────────────────────────────────────────────
  const [transport,   setTransport]   = useState<PlayerTransportDTO | null>(null);
  const [currentCity, setCurrentCity] = useState<PlayerCurrentCityDTO | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const [depositQty,  setDepositQty]  = useState<Partial<Record<MatKey, number>>>({});
  const [depositing,  setDepositing]  = useState(false);
  const [depositMsg,  setDepositMsg]  = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, c] = await Promise.all([getPlayerTransport(), getPlayerCurrentCity()]);
      setTransport(t);
      setCurrentCity(c);
    } catch (err: any) {
      setError(err.message ?? "Erreur chargement transport");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const h = () => loadAll();
    window.addEventListener('nova:logistic-refresh', h);
    return () => window.removeEventListener('nova:logistic-refresh', h);
  }, [loadAll]);

  useEffect(() => {
    setDepositQty({});
    setDepositMsg(null);
  }, [currentCity?.cityId]);

  const handleDeposit = async () => {
    if (!currentCity?.cityId) return;
    const mats: T1Mats = {};
    let total = 0;
    for (const [k] of MAT_ROWS) {
      const v = depositQty[k] ?? 0;
      if (v > 0) { (mats as any)[k] = v; total += v; }
    }
    if (total === 0) { setDepositMsg("⚠️ Saisissez au moins une quantité > 0"); return; }
    setDepositing(true);
    setDepositMsg(null);
    try {
      const result = await postDepositTransportToCity(mats);
      const parts = MAT_ROWS
        .filter(([k]) => (result.deposited as any)[k] > 0)
        .map(([k, icon]) => `${icon}${(result.deposited as any)[k]}`);
      setDepositMsg(`✅ Déposé dans ${result.cityName} : ${parts.join(" ")}`);
      setDepositQty({});
      window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
    } catch (err: any) {
      const raw = err.message ?? "Erreur de dépôt";
      let msg = `❌ ${raw}`;
      if (raw.includes("WAREHOUSE_REQUIRED"))          msg = "❌ Cette ville n'a pas d'entrepôt — construisez-en un d'abord";
      if (raw.includes("WAREHOUSE_CAPACITY_EXCEEDED")) msg = "❌ Capacité de l'entrepôt dépassée — libérez de l'espace";
      if (raw.includes("INSUFFICIENT_TRANSPORT"))      msg = "❌ Stock de transport insuffisant";
      setDepositMsg(msg);
    } finally {
      setDepositing(false);
    }
  };

  const active = transport
    ? MAT_ROWS.filter(([k]) => ((transport as any)[k] ?? 0) > 0)
    : [];
  const onQtyChange = (key: MatKey, raw: string) => {
    const v = parseInt(raw, 10);
    setDepositQty(prev => ({ ...prev, [key]: isNaN(v) || v < 0 ? 0 : v }));
  };
  const maxQty = (key: MatKey) => Math.max(0, (transport?.[key] ?? 0));

  // ─── Onglets ────────────────────────────────────────────────────────────────
  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'resume',      label: '👤 Résumé' },
    { id: 'inventaire',  label: '🎒 Inventaire' },
    { id: 'equipement',  label: '⚔️ Équipement' },
    { id: 'avatar',      label: '👥 Avatar' },
    { id: 'competences', label: '🎯 Compétences' },
  ];

  return (
    <div className="space-y-3">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">👤 Joueur / Inventaire</h4>
        {activeTab === 'inventaire' && (
          <button
            onClick={loadAll}
            disabled={loading}
            className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "…" : "↻"}
          </button>
        )}
      </div>

      {/* ── Barre d'onglets ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-amber-300 pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "text-xs px-2 py-1 rounded-t font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-amber-700 text-amber-50"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Résumé joueur
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'resume' && (
        <div className="space-y-3">

          {/* Identité */}
          <div className="bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
            <div className="text-3xl">{selectedCharacter?.image ?? '🛡️'}</div>
            <div>
              <div className="font-bold text-amber-900 text-sm">
                {getCurrentAvatar()?.name ?? 'Avatar Principal'}
              </div>
              <div className="text-xs text-amber-600">
                {selectedCharacter?.name ?? 'Classe inconnue'} · Niveau {level}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {/* XP */}
            <div className="bg-white border border-amber-200 rounded-lg p-2">
              <div className="text-xs text-amber-600 mb-1">Expérience</div>
              <div className="text-sm font-bold text-amber-900">{experience} / {experienceToNextLevel} XP</div>
              <div className="h-1.5 bg-amber-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, getExperienceProgress() * 100)}%` }}
                />
              </div>
            </div>

            {/* Points d'action */}
            <div className="bg-white border border-amber-200 rounded-lg p-2">
              <div className="text-xs text-amber-600 mb-1">Points d'action</div>
              <div className={[
                "text-sm font-bold",
                actionPoints > maxActionPoints * 0.5 ? "text-green-700" : "text-orange-600",
              ].join(" ")}>
                {actionPoints} / {maxActionPoints}
              </div>
              <div className="h-1.5 bg-amber-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (actionPoints / Math.max(1, maxActionPoints)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Réputation / Honneur */}
          <div className="bg-white border border-amber-200 rounded-lg p-2">
            <div className="text-xs text-amber-600 mb-1">Réputation</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-900">{reputation}</span>
              <span className="text-xs text-amber-500 italic">{getReputationLevel().name}</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Inventaire de transport (inchangé)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inventaire' && (
        <div className="space-y-3">
          <p className="text-xs text-amber-500 italic">
            Ressources physiquement portées · Approvisionnez via la Banque.
          </p>

          {loading ? (
            <p className="text-xs text-amber-500">Chargement…</p>
          ) : error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : transport ? (
            <>
              {/* ── Inventaire courant ──────────────────────────────────────── */}
              <div className="bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-300 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-amber-700 font-medium">Capacité</span>
                  <span className={[
                    "font-bold",
                    transport.usedUnits >= transport.maxUnits ? "text-red-600" : "text-green-700",
                  ].join(" ")}>
                    {transport.usedUnits} / {transport.maxUnits} · {transport.freeUnits} libres
                  </span>
                </div>
                <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      transport.usedUnits >= transport.maxUnits
                        ? "bg-red-500"
                        : transport.usedUnits > transport.maxUnits * 0.7
                          ? "bg-orange-400"
                          : "bg-green-500",
                    ].join(" ")}
                    style={{ width: `${Math.min(100, (transport.usedUnits / transport.maxUnits) * 100)}%` }}
                  />
                </div>

                {active.length === 0 ? (
                  <p className="text-xs text-amber-400 italic text-center py-1">Sac vide</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {active.map(([k, icon, label]) => (
                      <div key={k} className="bg-white border border-amber-200 rounded p-1.5 flex items-center gap-1.5">
                        <span>{icon}</span>
                        <div>
                          <div className="text-xs text-amber-500 leading-tight">{label}</div>
                          <div className="font-bold text-amber-900 text-sm leading-tight">
                            {(transport as any)[k]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Dépôt en ville ─────────────────────────────────────────── */}
              <div className="border border-amber-200 rounded-lg p-3 bg-white space-y-2">
                <h5 className="text-sm font-semibold text-amber-900">📥 Déposer dans la ville actuelle</h5>

                {currentCity?.cityId ? (
                  <p className="text-xs text-green-700 font-medium">
                    📍 Vous êtes à : <span className="font-bold">{currentCity.cityName}</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-500 italic">
                    {currentCity?.reason ?? "Rendez-vous sur une ville pour déposer des ressources."}
                  </p>
                )}

                {currentCity?.cityId && active.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {active.map(([k, icon, label]) => (
                        <div key={k} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded p-1">
                          <span className="text-sm">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-amber-500 truncate">{label}</div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={maxQty(k)}
                                value={depositQty[k] ?? 0}
                                onChange={e => onQtyChange(k, e.target.value)}
                                className="w-14 text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white"
                              />
                              <span className="text-xs text-amber-400">/ {maxQty(k)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={depositing}
                      className={[
                        "w-full mt-1 py-1 rounded text-xs font-bold transition",
                        depositing
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-amber-600 hover:bg-amber-700 text-white",
                      ].join(" ")}
                    >
                      {depositing ? "⏳ Dépôt…" : "📥 Déposer dans la ville"}
                    </button>
                  </>
                )}

                {currentCity?.cityId && active.length === 0 && (
                  <p className="text-xs text-amber-400 italic">Sac vide — rien à déposer.</p>
                )}

                {depositMsg && (
                  <p className="text-xs font-medium mt-1 text-amber-800">{depositMsg}</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — Équipement (slots placeholders)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'equipement' && (
        <div className="space-y-2">
          <p className="text-xs text-amber-500 italic">
            Système d'équipement en développement — emplacements réservés.
          </p>
          <div className="space-y-1.5">
            {EQUIPMENT_SLOTS.map(slot => (
              <div
                key={slot.label}
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5"
              >
                <span className="text-xl">{slot.icon}</span>
                <div className="flex-1">
                  <div className="text-xs text-amber-500">{slot.label}</div>
                  <div className="text-xs text-amber-300 italic">— Emplacement vide —</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — Personnalisation / gestion avatar
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'avatar' && (
        <div className="space-y-3">

          {/* Liste des avatars */}
          <div className="space-y-1.5">
            <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">
              Avatars disponibles
            </div>
            {avatars.map(avatar => (
              <div
                key={avatar.id}
                className={[
                  "flex items-center justify-between p-2 rounded-lg border transition-colors",
                  avatar.id === currentAvatarId
                    ? "bg-amber-200 border-amber-500 text-amber-900"
                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer",
                ].join(" ")}
                onClick={() => {
                  if (avatar.id !== currentAvatarId) switchToAvatar(avatar.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{avatar.character.image}</span>
                  <div>
                    <div className="text-sm font-semibold">{avatar.name}</div>
                    <div className="text-xs opacity-70">
                      {avatar.character.name} · Niv.{avatar.level}
                    </div>
                  </div>
                </div>
                {avatar.id === currentAvatarId && (
                  <span className="text-xs text-green-600 font-bold">● Actuel</span>
                )}
              </div>
            ))}
          </div>

          {/* Créer un nouvel avatar */}
          {canCreateNewAvatar() ? (
            <div className="border border-amber-200 rounded-lg p-3 bg-white space-y-2">
              <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide">
                Créer un nouvel avatar
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newAvatarName}
                  onChange={e => setNewAvatarName(e.target.value)}
                  placeholder="Nom de l'avatar"
                  className="flex-1 text-xs px-2 py-1 border border-amber-300 rounded bg-white text-amber-900"
                  maxLength={20}
                />
                <button
                  onClick={() => {
                    if (newAvatarName.trim() && selectedCharacter) {
                      createAvatar(newAvatarName.trim(), selectedCharacter);
                      setNewAvatarName('');
                    }
                  }}
                  disabled={!newAvatarName.trim() || !selectedCharacter}
                  className="text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-3 py-1 rounded font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-500 italic text-center py-2 border border-amber-200 rounded-lg bg-amber-50">
              Maximum 2 avatars par joueur atteint.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — Compétences
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'competences' && (
        <div className="space-y-3">
          <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">
            Arbre de Compétences
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-2 max-h-[60vh] overflow-y-auto">
            <CompetenceTree />
          </div>
        </div>
      )}

    </div>
  );
}
