import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useAuth } from "../../lib/auth/AuthContext";
import { useFactions } from "../../lib/stores/useFactions";
import {
  type TreatyDTO,
  type TreatyType,
  type TreatyTypeInfo,
  apiFetchMyTreaties,
  apiFetchAllTreaties,
  apiFetchTreatyTypes,
  apiCreateTreaty,
  apiSignTreaty,
  apiBreakTreaty,
} from "../../lib/api/treatiesApi";

type MilitarySupportLevel = "full" | "partial" | "emergency_only";

export function TreatiesPanel() {
  const { actionPoints, spendActionPoints, getCompetenceLevel } = usePlayer();
  const { isAdmin } = useAuth();
  const { factions, playerFaction } = useFactions();

  const myFactionId = playerFaction !== null ? Number(playerFaction) : null;
  const myFaction = myFactionId !== null ? factions.find((f) => Number(f.id) === myFactionId) : null;
  const otherFactions = factions.filter((f) => Number(f.id) !== myFactionId && f.isActive);

  const [treaties, setTreaties] = useState<TreatyDTO[]>([]);
  const [treatyTypes, setTreatyTypes] = useState<TreatyTypeInfo[]>([]);
  const [selectedTreatyType, setSelectedTreatyType] = useState<TreatyType>("alliance_militaire");
  const [treatyTitle, setTreatyTitle] = useState("");
  const [treatyTerms, setTreatyTerms] = useState("");
  const [selectedFactionIds, setSelectedFactionIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "create" | "active" | "history">("overview");

  const [militaryProps, setMilitaryProps] = useState({
    mutualDefense: true,
    sharedIntelligence: false,
    jointOperations: false,
    resourceSharing: 0,
    militarySupport: "partial" as MilitarySupportLevel,
  });

  const currentTreatyType = treatyTypes.find((t) => t.type === selectedTreatyType);
  const treatyCost = currentTreatyType?.cost ?? 15;
  const treatyKnowledgeLevel = getCompetenceLevel("connaissance_des_traites");
  const canCreateTreaties = isAdmin || treatyKnowledgeLevel >= 1;
  const hasFaction = myFactionId !== null;

  useEffect(() => {
    loadTreaties();
    loadTreatyTypes();
    const interval = setInterval(loadTreaties, 10000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadTreaties = async () => {
    try {
      const data = isAdmin ? await apiFetchAllTreaties() : await apiFetchMyTreaties();
      setTreaties(data);
    } catch (err) {
      console.error("Erreur chargement traités:", err);
    }
  };

  const loadTreatyTypes = async () => {
    try {
      const data = await apiFetchTreatyTypes();
      setTreatyTypes(data as TreatyTypeInfo[]);
    } catch (err) {
      console.error("Erreur chargement types traités:", err);
    }
  };

  const getTypeColor = (type: TreatyType) => {
    switch (type) {
      case "alliance_militaire": return "text-red-600";
      case "accord_commercial": return "text-yellow-600";
      case "pacte_non_agression": return "text-blue-600";
      case "defense_mutuelle": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  const getStatusColor = (status: TreatyDTO["status"]) => {
    switch (status) {
      case "proposed": return "text-orange-500";
      case "active": return "text-green-500";
      case "expired": return "text-gray-400";
      case "broken": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusText = (status: TreatyDTO["status"]) => {
    switch (status) {
      case "proposed": return "Proposé";
      case "active": return "Actif";
      case "expired": return "Expiré";
      case "broken": return "Rompu";
      default: return status;
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const hasSigned = (treaty: TreatyDTO) =>
    myFactionId !== null && treaty.signatures.some((s) => s.factionId === myFactionId);

  const createTreaty = async () => {
    if (!treatyTitle.trim() || !treatyTerms.trim() || selectedFactionIds.length === 0) return;
    if (!isAdmin && actionPoints < treatyCost) {
      setError(`Pas assez de Points d'Action (${treatyCost} PA requis)`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let properties: Record<string, unknown> = {};
      if (selectedTreatyType === "alliance_militaire") {
        properties = { alliance_militaire: militaryProps };
      }

      await apiCreateTreaty(treatyTitle, selectedTreatyType, treatyTerms, selectedFactionIds, properties);

      if (!isAdmin) spendActionPoints(treatyCost);

      setActiveTab("overview");
      setTreatyTitle("");
      setTreatyTerms("");
      setSelectedFactionIds([]);
      setMilitaryProps({ mutualDefense: true, sharedIntelligence: false, jointOperations: false, resourceSharing: 0, militarySupport: "partial" });
      await loadTreaties();
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la création du traité");
    } finally {
      setIsLoading(false);
    }
  };

  const signTreaty = async (treatyId: string) => {
    setError(null);
    try {
      await apiSignTreaty(treatyId);
      await loadTreaties();
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la signature");
    }
  };

  const breakTreaty = async (treatyId: string) => {
    setError(null);
    try {
      await apiBreakTreaty(treatyId);
      await loadTreaties();
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la rupture");
    }
  };

  const toggleFaction = (fid: number) => {
    setSelectedFactionIds((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Traités & Accords</h4>
        <div className="text-xs text-gray-600">
          Points d'Action : {isAdmin ? "∞" : `${actionPoints} ⚡`}
        </div>
        {myFaction && (
          <div className="text-xs text-blue-600 font-medium">
            Faction : {myFaction.name}
          </div>
        )}
        {isAdmin && (
          <div className="text-xs text-green-600 font-medium">
            Mode Admin : vue de tous les traités
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex space-x-1 bg-gray-100 p-1 rounded">
        <Button size="sm" variant={activeTab === "overview" ? "default" : "outline"} onClick={() => setActiveTab("overview")}>
          📊 Vue d'ensemble
        </Button>
        <Button size="sm" variant={activeTab === "create" ? "default" : "outline"} onClick={() => setActiveTab("create")}>
          ✍️ Créer
        </Button>
        <Button size="sm" variant={activeTab === "active" ? "default" : "outline"} onClick={() => setActiveTab("active")}>
          ✅ Actifs
        </Button>
        <Button size="sm" variant={activeTab === "history" ? "default" : "outline"} onClick={() => setActiveTab("history")}>
          📜 Historique
        </Button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-300 rounded p-3">
            <div className="text-sm font-medium mb-2">📊 Statistiques</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Traités actifs : {treaties.filter((t) => t.status === "active").length}</div>
              <div>Traités proposés : {treaties.filter((t) => t.status === "proposed").length}</div>
              <div>Traités rompus/expirés : {treaties.filter((t) => t.status === "broken" || t.status === "expired").length}</div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-300 rounded p-3">
            <div className="text-sm font-medium mb-2">🎯 Types disponibles</div>
            <div className="grid grid-cols-2 gap-2">
              {treatyTypes.map((type) => (
                <div key={type.type} className="flex items-center space-x-2">
                  <span className="text-lg">{type.icon}</span>
                  <div>
                    <div className="text-xs font-medium">{type.name}</div>
                    <div className="text-xs text-gray-500">{type.cost} PA</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <div className="bg-blue-50 border border-blue-300 rounded p-4 space-y-4">
          <div className="text-sm font-medium">✍️ Créer un nouveau traité</div>

          {!hasFaction && !isAdmin && (
            <div className="bg-red-50 border border-red-300 rounded p-3 text-xs text-red-600">
              Vous devez appartenir à une faction pour créer un traité.
            </div>
          )}

          {!canCreateTreaties && hasFaction && (
            <div className="bg-red-50 border border-red-300 rounded p-3">
              <div className="text-sm font-medium text-red-700 mb-2">⚠️ Compétence requise</div>
              <div className="text-xs text-red-600">
                Apprenez la compétence "Connaissance des Traités" (niveau 1 minimum) dans l'arbre Politique.
              </div>
            </div>
          )}

          {(canCreateTreaties && hasFaction) && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Type de traité</label>
                <select
                  value={selectedTreatyType}
                  onChange={(e) => setSelectedTreatyType(e.target.value as TreatyType)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  {treatyTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.icon} {type.name} ({type.cost} PA)
                    </option>
                  ))}
                </select>
                {currentTreatyType && (
                  <div className="text-xs text-gray-600 mt-1">{currentTreatyType.description}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Titre</label>
                <input
                  type="text"
                  value={treatyTitle}
                  onChange={(e) => setTreatyTitle(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="Titre du traité"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Factions impliquées</label>
                {otherFactions.length === 0 ? (
                  <div className="text-xs text-gray-500">Aucune autre faction disponible.</div>
                ) : (
                  <div className="space-y-1">
                    {otherFactions.map((faction) => (
                      <label key={faction.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedFactionIds.includes(Number(faction.id))}
                          onChange={() => toggleFaction(Number(faction.id))}
                          className="w-3 h-3"
                        />
                        <span className="text-xs">{faction.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedTreatyType === "alliance_militaire" && (
                <div className="bg-red-50 border border-red-300 rounded p-3">
                  <div className="text-xs font-medium mb-2">⚔️ Configuration Alliance Militaire</div>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={militaryProps.mutualDefense}
                        onChange={(e) => setMilitaryProps({ ...militaryProps, mutualDefense: e.target.checked })}
                        className="w-3 h-3" />
                      <span className="text-xs">Défense mutuelle automatique</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={militaryProps.sharedIntelligence}
                        onChange={(e) => setMilitaryProps({ ...militaryProps, sharedIntelligence: e.target.checked })}
                        className="w-3 h-3" />
                      <span className="text-xs">Partage de renseignements</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={militaryProps.jointOperations}
                        onChange={(e) => setMilitaryProps({ ...militaryProps, jointOperations: e.target.checked })}
                        className="w-3 h-3" />
                      <span className="text-xs">Opérations conjointes</span>
                    </label>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Partage de ressources ({militaryProps.resourceSharing}%)
                      </label>
                      <input type="range" min="0" max="50" value={militaryProps.resourceSharing}
                        onChange={(e) => setMilitaryProps({ ...militaryProps, resourceSharing: parseInt(e.target.value) })}
                        className="w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Niveau de soutien</label>
                      <select value={militaryProps.militarySupport}
                        onChange={(e) => setMilitaryProps({ ...militaryProps, militarySupport: e.target.value as "full" | "partial" | "emergency_only" })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs">
                        <option value="emergency_only">Urgence uniquement</option>
                        <option value="partial">Partiel</option>
                        <option value="full">Complet</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1">Termes et conditions</label>
                <textarea
                  value={treatyTerms}
                  onChange={(e) => setTreatyTerms(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-20"
                  placeholder="Détails des termes du traité..."
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={createTreaty}
                  disabled={
                    !treatyTitle.trim() ||
                    !treatyTerms.trim() ||
                    selectedFactionIds.length === 0 ||
                    isLoading ||
                    (!isAdmin && actionPoints < treatyCost)
                  }
                  size="sm"
                  className="flex-1"
                >
                  {isLoading ? "Création..." : `Créer (${isAdmin ? "gratuit" : `${treatyCost} PA`})`}
                </Button>
                <Button onClick={() => setActiveTab("overview")} size="sm" variant="outline">
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "active" && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {treaties.filter((t) => t.status === "proposed").length > 0 && (
            <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide px-1">
              En attente de signature
            </div>
          )}
          {treaties.filter((t) => t.status === "proposed").map((treaty) => (
            <div key={treaty.id} className="bg-yellow-50 border border-yellow-300 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{treatyTypes.find((t) => t.type === treaty.type)?.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{treaty.title}</div>
                    <div className={`text-xs ${getTypeColor(treaty.type as TreatyType)}`}>
                      {treatyTypes.find((t) => t.type === treaty.type)?.name}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(treaty.status)}`}>
                  {getStatusText(treaty.status)}
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-1">
                Parties : {treaty.parties.map((p) => p.name).join(", ")}
              </div>
              <div className="text-xs text-gray-700 mb-1">{treaty.terms}</div>
              <div className="text-xs text-gray-500 mb-1">Créé le {formatDate(treaty.createdAt)}</div>
              <div className="text-xs text-gray-600 mb-2">
                Signatures : {treaty.signatures.length}/{treaty.parties.length}
              </div>
              {hasFaction && !hasSigned(treaty) && (
                <Button onClick={() => signTreaty(treaty.id)} size="sm" variant="outline" className="mt-1">
                  Signer
                </Button>
              )}
            </div>
          ))}

          {treaties.filter((t) => t.status === "active").length > 0 && (
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide px-1 mt-2">
              Traités actifs
            </div>
          )}
          {treaties.filter((t) => t.status === "active").map((treaty) => (
            <div key={treaty.id} className="bg-green-50 border border-green-300 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{treatyTypes.find((t) => t.type === treaty.type)?.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{treaty.title}</div>
                    <div className={`text-xs ${getTypeColor(treaty.type as TreatyType)}`}>
                      {treatyTypes.find((t) => t.type === treaty.type)?.name}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(treaty.status)}`}>
                  {getStatusText(treaty.status)}
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-1">
                Parties : {treaty.parties.map((p) => p.name).join(", ")}
              </div>
              <div className="text-xs text-gray-700 mb-1">{treaty.terms}</div>
              <div className="text-xs text-gray-500">Créé le {formatDate(treaty.createdAt)}</div>

              {treaty.type === "alliance_militaire" && Boolean(treaty.properties.alliance_militaire) && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                  <div className="font-medium mb-1">⚔️ Configuration :</div>
                  <div className="space-y-0.5">
                    {(treaty.properties.alliance_militaire as { mutualDefense?: boolean }).mutualDefense && <div>• Défense mutuelle active</div>}
                    {(treaty.properties.alliance_militaire as { sharedIntelligence?: boolean }).sharedIntelligence && <div>• Partage de renseignements</div>}
                    {(treaty.properties.alliance_militaire as { jointOperations?: boolean }).jointOperations && <div>• Opérations conjointes</div>}
                  </div>
                </div>
              )}

              {hasFaction && (
                <Button
                  onClick={() => breakTreaty(treaty.id)}
                  size="sm"
                  variant="outline"
                  className="mt-2 text-red-600 border-red-300"
                >
                  Rompre le traité
                </Button>
              )}
            </div>
          ))}
          {treaties.filter((t) => t.status === "active" || t.status === "proposed").length === 0 && (
            <div className="text-center text-gray-500 py-8">Aucun traité actif ou en attente</div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {treaties.filter((t) => ["broken", "expired"].includes(t.status)).map((treaty) => (
            <div key={treaty.id} className="bg-gray-50 border border-gray-300 rounded p-3 opacity-75">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{treatyTypes.find((t) => t.type === treaty.type)?.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{treaty.title}</div>
                    <div className="text-xs text-gray-500">
                      {treatyTypes.find((t) => t.type === treaty.type)?.name}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(treaty.status)}`}>
                  {getStatusText(treaty.status)}
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-1">
                Parties : {treaty.parties.map((p) => p.name).join(", ")}
              </div>
              <div className="text-xs text-gray-500">Créé le {formatDate(treaty.createdAt)}</div>
            </div>
          ))}

          {treaties.filter((t) => ["broken", "expired"].includes(t.status)).length === 0 && (
            <div className="text-center text-gray-500 py-8">Aucun traité rompu ou expiré</div>
          )}
        </div>
      )}
    </div>
  );
}
