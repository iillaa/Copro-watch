# Plan de Refonte - Module Analyses d'Eau

## Analyse de l'Existant

### Structure Actuelle
- **Pattern actuel** : Workplace-centric (lieux de travail)
- **Pattern cible** : Department-centric (services/départements)
- **Composants existants** : WaterAnalyses, WaterAnalysesOverview, WaterAnalysesHistory, WaterAnalysisForm
- **Pattern de référence** : WorkerList → WorkerDetail (parfaitement structuré)

### Données Existantes
- **Departments** : SWAG, BMPJ, SD INGHAR, BPFA, SWASS, AUTRES
- **Workplaces** : Cuisine, Foyer, Autres (non utilisés dans la nouvelle version)
- **Water Analyses** : Structure avec structure_id (à migrer vers department_id)

## Plan d'Implémentation

### Phase 1: Base de Données & Logique Métier

#### 1.1 Services/db.js
- ✅ Vérifier que les fonctions saveWaterAnalysis/deleteWaterAnalysis appellent registerWaterAnalysisChange
- ✅ Confirmer la présence du store water_analyses
- 🔄 Vérifier la structure des données (department_id au lieu de structure_id)

#### 1.2 Services/backup.js
- ✅ Fonction registerWaterAnalysisChange existe déjà
- ✅ Compteur de backup fonctionne comme registerExamChange

#### 1.3 Services/logic.js
- 🔄 Créer `getServiceWaterStatus(departmentId, allAnalyses)`
- 🔄 Implémenter la logique de statut par mois :
  - **OK (Vert)** : Analyse "Potable" pour le mois courant
  - **ALERTE (Rouge)** : Dernière analyse "Non Potable" du mois
  - **En Attente (Jaune)** : Analyse "pending" sans résultat
  - **À Faire (Gris)** : Aucune analyse ce mois-ci

### Phase 2: Interface Liste Principale

#### 2.1 Réécriture WaterAnalyses.jsx
- 🔄 Style : Copie conforme de WorkerList.jsx
- 🔄 Contenu : Liste des Services (Departments)
- 🔄 Colonnes : 
  - Nom du Service
  - Date dernier prélèvement
  - Statut (badge coloré)
  - Actions (bouton "Détails")
- 🔄 Comportement : Clic → Navigation vers WaterServiceDetail
- 🔄 Filtre : Barre de recherche par nom de service

### Phase 3: Interface Détail Service

#### 3.1 Création WaterServiceDetail.jsx
- 🔄 Style : Similaire à WorkerDetail.jsx
- 🔄 En-tête : Nom du Service + Bouton "Nouvelle Analyse"
- 🔄 Corps : Tableau historique analyses (Date, Résultat, Notes, Supprimer)
- 🔄 Formulaire modal pré-sélectionné (pas de choix de service)

### Phase 4: Nettoyage & Cohérence

#### 4.1 Dashboard.jsx
- 🔄 Retirer tous widgets/alertes concernant l'eau
- 🔄 Conserver uniquement le suivi médical

#### 4.2 WaterAnalysisForm.jsx
- 🔄 Adapter pour DEPARTMENT_ID au lieu de STRUCTURE_ID
- 🔄 Retirer sélection de lieu (pré-sélectionné par le service)

#### 4.3 WaterAnalysesHistory.jsx
- 🔄 Adapter pour afficher par service
- 🔄 Conserver la structure de tableau existante

## Flux de Données Cible

```
Liste Services → Clic Service → Détail Service → 
Nouvelle Analyse → Sauvegarde → Retour Liste 
→ Mise à jour Statut en temps réel
```

## Mapping Existant → Nouveau

| Ancien (Workplace) | Nouveau (Department) |
|-------------------|---------------------|
| structure_id | department_id |
| Kitchen/Foyer | SWAG/BMPJ/etc. |
| WaterAnalysesOverview | WaterAnalyses (Liste) |
| - | WaterServiceDetail (Nouveau) |
| Vue par lieu | Vue par service |

## Fichiers à Créer/Modifier

### Créés
- `/src/components/WaterServiceDetail.jsx` (nouveau)

### Modifiés
- `/src/components/WaterAnalyses.jsx` (réécriture complète)
- `/src/services/logic.js` (ajout fonctions service)
- `/src/components/WaterAnalysisForm.jsx` (adaptation)
- `/src/components/WaterAnalysesHistory.jsx` (adaptation)
- `/src/components/Dashboard.jsx` (nettoyage)

### Conservés (existants)
- `/src/services/db.js` (structure OK)
- `/src/services/backup.js` (fonctionnalité OK)

## Critères de Succès

1. ✅ Fonction registerWaterAnalysisChange opérationnelle
2. ✅ Logique métier getServiceWaterStatus fonctionnelle
3. ✅ Interface liste conforme au pattern WorkerList
4. ✅ Interface détail conforme au pattern WorkerDetail
5. ✅ Flux complet : Liste → Détail → Ajout → Retour avec mise à jour statut
6. ✅ Dashboard nettoyé (uniquement médical)
7. ✅ Code propre et cohérent avec l'existant
