# 📋 Nova Imperium - Définition Collaborative des Statistiques

## 🎯 Objectif
Définir ensemble les statistiques pour tous les bâtiments et unités du système Nova Imperium (ConstructionPanelZustand.tsx + RecruitmentPanelZustand.tsx).

## 🏗️ BÂTIMENTS (18 total)

### 🏜️ Terre en friche (wasteland)
1. **Avant-poste** 🏗️ - Structure d'observation et de défense basique
2. **Camp d'exploration** ⛺ - Base temporaire pour l'exploration  
3. **Tour d'observation** 🗼 - Tour pour surveiller les environs

### 🌾 Terre fertile (fertile_land)
4. **Ferme** 🚜 - Production agricole intensive
5. **Grenier** 🌾 - Stockage et conservation des récoltes

### 🌲 Forêt (forest)
6. **Scierie** 🪚 - Production de bois optimisée
7. **Poste de chasse** 🏹 - Chasse au gibier forestier
8. **Temple druidique** 🌳 - Temple en harmonie avec la nature
9. **Maison de l'herboriste** 🌿 - Préparation de remèdes naturels

### ⛰️ Montagnes (mountains)
10. **Mine** ⛏️ - Extraction de minerais précieux
11. **Forge** 🔨 - Transformation des minerais en outils

### 🏔️ Collines (hills)
12. **Carrière** 🪨 - Extraction de pierre de construction

### 🦎 Marécage (swamp)
13. **Laboratoire d'alchimie** 🧪 - Recherche et création de potions magiques

### ⛩️ Plaines sacrées (sacred_plains)
14. **Autel sacré** ⛩️ - Centre spirituel et de recueillement

### 🕳️ Grottes (caves)
15. **Entrepôt souterrain** 🕳️ - Stockage sécurisé et protégé

### 🏛️ Ruines antiques (ancient_ruins)
16. **Site archéologique** 🏛️ - Fouilles et recherche de connaissances anciennes

### 🌸 Prairie enchantée (enchanted_meadow)
17. **Puits de mana** 💫 - Source d'énergie magique pure

## ⚔️ UNITÉS (15 total)

### 👥 Civil (4 unités)
1. **Colon** 👥 - Fonde de nouvelles colonies et développe les territoires
2. **Ouvrier** 👷 - Construit des améliorations et récolte des ressources  
3. **Érudit** 📚 - Spécialiste de la recherche et des connaissances (requis: library)
4. **Marchand** 💰 - Expert en commerce et négociation (requis: market)

### 🔍 Exploration (1 unité)
5. **Éclaireur** 🕵️ - Unité rapide pour exploration et reconnaissance

### ⚔️ Militaire (4 unités)
6. **Guerrier** ⚔️ - Unité de combat de base, polyvalente (requis: barracks)
7. **Lancier** 🗡️ - Infanterie défensive, efficace contre cavalerie (requis: barracks)
8. **Archer** 🏹 - Unité à distance, efficace contre infanterie (requis: barracks)
9. **Épéiste** 🗡️ - Guerrier expérimenté avec armure et épée (requis: barracks + forge)

### 🎯 Siège (1 unité)
10. **Catapulte** 🎯 - Machine de siège pour attaquer les fortifications (requis: barracks + forge)

### 🧙 Magique (3 unités)
11. **Mage** 🧙 - Unité magique puissante, coûteuse à maintenir (requis: library + mana_well)
12. **Druide** 🍃 - Maître de la nature et des sorts de soutien (requis: druidic_temple)
13. **Alchimiste** 🧪 - Expert en potions et transmutations (requis: alchemist_lab)

### ⛪ Spirituel (1 unité)
14. **Prêtre** ⛪ - Unité de soutien spirituel et soins (requis: sacred_altar)

## 📊 Statistiques à Définir pour Chaque Élément

### Pour les BÂTIMENTS :
- **Coût en PA** (Points d'Action)
- **Coût matériaux** (or, bois, pierre, fer, mana, nourriture)
- **Durée de construction** (en tours)
- **Production par tour** (ressources générées)

### Pour les UNITÉS :
- **Coût en PA** (Points d'Action)
- **Coût matériaux** (or, nourriture, fer, bois, pierre, mana)
- **Durée de recrutement** (en tours)
- **Stats de combat** (attaque, défense, santé, mouvement)

## 💡 Ressources Disponibles
- 💰 Or
- 🌾 Nourriture  
- 🪵 Bois
- 🪨 Pierre
- ⚙️ Fer
- ✨ Mana
- ⚡ Points d'Action

## 🚀 État Actuel
- ✅ 18 bâtiments transférés vers Zustand avec stats vides
- ✅ 15 unités transférées vers Zustand avec stats vides
- ✅ Interface collaborative prête (boutons "Voir détails")
- ✅ Logique de dépendance terrain conservée
- ✅ Migration progressive sécurisée activable sans risque

## 📋 Prochaines Étapes
1. Définir ensemble les statistiques de chaque bâtiment/unité
2. Implémenter les stats définies dans les systèmes Zustand
3. Activer les nouveaux panneaux via switch conditionnel
4. Valider le fonctionnement complet
5. Finaliser la migration