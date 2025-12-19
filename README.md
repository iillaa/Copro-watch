# Gestionnaire de Visites Médicales (Offline SPA)

Une application web autonome (Single Page Application) conçue pour la gestion des visites médicales périodiques en entreprise. Elle est optimisée pour fonctionner **hors ligne**, sans serveur, avec une base de données locale sécurisée et un système de sauvegarde robuste.

## 🌟 Fonctionnalités Clés

### 📊 Tableau de Bord Intelligent

- **Vue d'ensemble** : Affiche les visites à venir (15 jours), les retards critiques et les cas positifs en cours de traitement.
- **Statistiques** : Indicateurs visuels rapides pour l'état de la flotte.

### 👥 Gestion des Travailleurs & Départements

- **Base de données complète** : Ajout, modification et archivage des travailleurs.
- **Organisation** : Gestion par Départements (SWAG, BMPJ, etc.) et Lieux de travail.
- **Recherche** : Filtrage instantané pour retrouver un dossier.

### 🧪 Cycle d'Examen Médical Complet

- **Workflow Automatisé** :
  1.  Création d'examen -> Commande Labo (Copro-parasitologie).
  2.  Saisie des résultats (Positif/Négatif/En cours).
  3.  **Si Négatif** : Génération automatique du certificat d'aptitude et calcul de la prochaine échéance (+6 mois).
  4.  **Si Positif** : Protocole de traitement, marquage "Inapte", et planification automatique de la contre-visite (+7/10 jours).
- **Analyses d'Eau** : Module dédié pour le suivi de la qualité de l'eau (Chlore, pH, Bactério) avec historique complet.

### 🛡️ Sécurité & Sauvegarde (Nouveau Système v1.0)

L'application dispose d'un système de sauvegarde "Fail-Safe" pour éviter toute perte de données :

- **Sauvegarde Automatique** : Un fichier `backup-auto.json` est généré/mis à jour automatiquement toutes les **10 modifications** (paramétrable).
- **Sauvegarde Manuelle** : Un fichier `backup-manuel.json` distinct est créé lorsque vous cliquez sur "Sauvegarder" dans les paramètres.
- **Restauration Intelligente** : Lors de l'importation d'un dossier de sauvegarde, l'application compare les dates des fichiers Auto et Manuel et charge automatiquement **le plus récent** pour éviter d'écraser des données récentes avec une vieille sauvegarde.

---

## 🚀 Installation & Déploiement

Choisissez la méthode qui correspond à votre matériel.

### Option A : Version Portable (Fichier Unique) - Recommandé pour PC 💻

C'est la méthode la plus flexible. Elle compile toute l'application (code, base de données, design) en un **seul fichier HTML** que vous pouvez transporter sur une clé USB.

1.  **Générer le fichier** :
    ```bash
    npm run build:file
    ```
2.  **Récupérer** : Le fichier se trouve dans `dist/index-standalone.html`.
3.  **Utiliser** : Copiez ce fichier sur n'importe quel ordinateur. Double-cliquez pour l'ouvrir dans Chrome/Edge/Firefox. Aucune installation n'est requise.

### Option B : Application Android (APK) 📱

Pour une utilisation sur tablette ou téléphone.

1.  **Compiler** : Suivez les instructions du fichier `ANDROID_BUILD_INSTRUCTIONS.md` (commande `./gradlew assembleRelease`).
2.  **Installer** : Transférez le fichier `.apk` sur votre appareil et installez-le.
3.  **Permissions** : Au premier lancement, autorisez l'accès au stockage pour permettre les sauvegardes automatiques.

### Option C : Serveur Web Classique 🌐

Si vous souhaitez héberger l'application sur un réseau local.

1.  **Compiler** : `npm run build`
2.  **Déployer** : Copiez le contenu du dossier `dist/` sur votre serveur web.

---

## 📖 Guide d'Utilisation Quotidienne

1.  **Le Matin** :
    - Ouvrez l'application.
    - Consultez le **Tableau de bord** : Traitez en priorité les alertes "À faire (15 jours)" et les "Cas Positifs".
2.  **Lors d'une Visite** :
    - Recherchez le travailleur.
    - Cliquez sur **"Nouvel Examen"**.
    - Imprimez la demande d'analyse ou le certificat directement.
3.  **Gestion de l'Eau** :
    - Allez dans l'onglet "Analyses d'eau" pour saisir les relevés quotidiens.
4.  **Fin de Semaine** :
    - Allez dans **Paramètres**.
    - Cliquez sur **"Sauvegarder les données (Export)"**.
    - Stockez le fichier JSON généré sur un support externe (Clé USB ou Drive) par sécurité.

---

## 🛠️ Développement & Technique

Pour les développeurs souhaitant modifier le code source.

### Prérequis

- Node.js (v18+)
- Android Studio (pour la compilation mobile)

### Commandes Utiles

| Commande             | Description                                                                                            |
| :------------------- | :----------------------------------------------------------------------------------------------------- |
| `npm install`        | Installe toutes les dépendances du projet.                                                             |
| `npm run dev`        | Lance le serveur de développement local (avec rechargement à chaud).                                   |
| `npm run build`      | Compile l'application pour le web (dossier `dist/`).                                                   |
| `npm run build:file` | **Crée la version portable** (`index-standalone.html`). Combine le build web + l'injection des assets. |
| `npx cap sync`       | Synchronise le code web avec le projet Android natif.                                                  |
| `npm run lint`       | Vérifie la qualité du code (ESLint).                                                                   |

### Structure du Projet

- `src/components` : Interface utilisateur (Tableaux, Formulaires).
- `src/services` : Logique métier.
  - `db.js` : Gestion de la base de données IndexedDB (Workers, Exams).
  - `backup.js` : **Cœur du système de sauvegarde** (Auto/Manuel, Permissions Android, Logique Smart Import).
  - `logic.js` : Règles métiers (Calcul des dates, Statuts, Aptitude).

## Histoire du Projet

Ce projet a été développé en plusieurs phases, démontrant l'évolution des outils de développement IA :

1. **Phase initiale** : Commencé avec **Google Gemini CLI** pour la création des fonctionnalités de base
2. **Phase de transition** : Migré vers **GitHub Copilot** pour le développement et l'amélioration du code
3. **Phase de finalisation** : Perfectionné par **BlackBox** utilisant **MiniMax M2 + Gemini 3 pro** pour les dernières retouches, finitions du UI et optimisations des fonctions

Cette approche multi-outils a permis de créer une application robuste et complète, en tirant parti des forces uniques de chaque plateforme d'IA.
