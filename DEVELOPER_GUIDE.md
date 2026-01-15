# GUIDE DU DÉVELOPPEUR & MAINTENANCE

Ce document sert de référence pour comprendre quel fichier modifier selon la fonctionnalité visée.
_Utile pour : Humains et IA._

---

## 🏥 GESTION DES TRAVAILLEURS (Copro Watch)

### 1. La Liste Principale

**Je veux modifier :** Le tableau des travailleurs, la recherche, les filtres par service, ou les colonnes affichées.

- 📂 **Fichier :** `src/components/WorkerList.jsx`
- **Rôle :** C'est le cœur de l'application. Il gère l'affichage de la grille, le mode "Sélection Multiple", et appelle les barres d'outils.

### 2. La Fiche Individuelle

**Je veux modifier :** L'historique médical d'un patient, ses informations personnelles, ou les boutons d'actions individuelles (Imprimer, Modifier).

- 📂 **Fichier :** `src/components/WorkerDetail.jsx`
- **Rôle :** Affiche le détail d'un travailleur. Contient la liste de ses examens passés et le calcul de son statut actuel.

### 3. Les Formulaires (Saisie)

**Je veux modifier :** Les champs à remplir pour un nouveau travailleur.

- 📂 **Fichier :** `src/components/AddWorkerForm.jsx`

**Je veux modifier :** Les champs d'une visite médicale (Poids, Tension, Décision, Date).

- 📂 **Fichier :** `src/components/ExamForm.jsx`

### 4. Actions de Masse (Batch)

**Je veux modifier :** La barre flottante qui apparaît quand on sélectionne plusieurs personnes.

- 📂 **Fichier :** `src/components/BulkActionsToolbar.jsx`

**Je veux modifier :** La fenêtre qui demande la date pour planifier plusieurs rendez-vous.

- 📂 **Fichier :** `src/components/BatchScheduleModal.jsx`

**Je veux modifier :** La fenêtre de choix des documents PDF (Convocations, Listes).

- 📂 **Fichier :** `src/components/BatchPrintModal.jsx`

---

## 💧 QUALITÉ DE L'EAU (Module Water)

### 1. Tableau de Bord Principal

**Je veux modifier :** La liste des Services (Cuisine, Réservoir...), les cartes de statistiques (KPI en haut), ou ajouter un bouton général.

- 📂 **Fichier :** `src/components/WaterAnalyses.jsx`
- **Rôle :** Page d'accueil du module Eau. C'est ici que se trouve le bouton "Nouvelle Analyse" et "Imprimer Demande".

### 2. Vue "Workflow" (Tâches)

**Je veux modifier :** Les colonnes "À faire", "En cours", "Alertes".

- 📂 **Fichier :** `src/components/WaterAnalysesOverview.jsx`
- **Rôle :** Vue alternative pour gérer les tâches urgentes.

### 3. Historique Global

**Je veux modifier :** La grande liste de toutes les analyses passées (archives), ou les filtres par mois/résultat.

- 📂 **Fichier :** `src/components/WaterAnalysesHistory.jsx`
- **Rôle :** Base de données visuelle de tout l'historique eau.

### 4. Détail d'un Service

**Je veux modifier :** La page qui s'ouvre quand on clique sur "Historique" d'un service précis (avec les graphiques).

- 📂 **Fichier :** `src/components/WaterServiceDetail.jsx`

### 5. Formulaire d'Analyse

**Je veux modifier :** Les champs de saisie pour une analyse d'eau (Chlore, Coliformes, Date, Lieu).

- 📂 **Fichier :** `src/components/WaterAnalysisForm.jsx`

---

## 🖨️ MOTEUR D'IMPRESSION (Smart PDF)

**Je veux modifier :**

- La mise en page des PDF (Logos, Textes, Signatures).
- La logique d'affichage ("Apte" en vert, "Inapte" en rouge).
- Le contenu des Convocations ou des Demandes d'Analyses d'eau.

- 📂 **Fichier :** `src/services/pdfGenerator.js`
- **Rôle :** Contient toute la logique de dessin `jspdf`. C'est ici qu'on change le texte des documents.

---

## ⚙️ NOYAU & DONNÉES

### Base de Données

**Je veux modifier :** La structure des données, ajouter une table, ou changer comment les données sont sauvegardées.

- 📂 **Fichier :** `src/services/db.js`
- **Tech :** Utilise `Dexie.js` (IndexedDB).

### Logique Métier

**Je veux modifier :** Le calcul des dates d'échéance (ex: changer 6 mois en 1 an), les couleurs des statuts, ou le formatage des dates.

- 📂 **Fichier :** `src/services/logic.js`
- **Rôle :** "Cerveau" de l'application qui contient les règles médicales.

### Sauvegarde & Excel

**Je veux modifier :** L'exportation des données ou le système de backup JSON.

- 📂 **Fichier :** `src/services/backup.js` (JSON)
- 📂 **Fichier :** `src/services/excelExport.js` (Excel)

---

## 🎨 STYLE & NAVIGATION

- **Navigation Principale (Menu) :** `src/components/Dashboard.jsx` (Gère les onglets Travailleurs / Eau / Paramètres).
- **Styles Globaux :** `src/index.css` (Couleurs, variables CSS, polices).
- **Icônes :** Utilise la librairie `react-icons/fa` (FontAwesome).
