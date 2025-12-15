


# Gestionnaire de Visites Médicales (Offline SPA)

Une application web autonome (Single Page Application) pour la gestion des visites médicales périodiques en entreprise. Conçue pour fonctionner hors ligne, sans serveur, avec une base de données locale sécurisée.

## Histoire du Projet

Ce projet a été développé en plusieurs phases, démontrant l'évolution des outils de développement IA :

1. **Phase initiale** : Commencé avec **Google Gemini CLI** pour la création des fonctionnalités de base
2. **Phase de transition** : Migré vers **GitHub Copilot** pour le développement et l'amélioration du code
3. **Phase de finalisation** : Perfectionné par **BlackBox** utilisant **MiniMax M2** pour les dernières retouches, finitions du UI et optimisations des fonctions

Cette approche multi-outils a permis de créer une application robuste et complète, en tirant parti des forces uniques de chaque plateforme d'IA.

## Fonctionnalités Clés

*   **Tableau de bord intelligent** : Vue d'ensemble des visites à venir (15 jours), retards, et cas positifs en cours.
*   **Gestion des Travailleurs** : Ajout, modification, et recherche par département/lieu de travail.
*   **Cycle d'Examen Complet** : 
    *   Création d'examen -> Commande Labo (Copro-parasitologie).
    *   Saisie des résultats (Positif/Négatif).
    *   Si **Négatif** : Génération automatique du certificat d'aptitude et calcul de la prochaine échéance (+6 mois).
    *   Si **Positif** : Protocole de traitement, marquage "Inapte" ou "Apte Partiel", et planification de contre-visite (+7/10 jours).
*   **Documents Imprimables** : Modèles automatiques pour les Convocations et les Certificats d'Aptitude.
*   **Base de Données Locale** : Toutes les données sont stockées dans le navigateur (IndexedDB). Rien n'est envoyé sur internet.
*   **Sauvegarde** : Export et Import des données (JSON) pour sécuriser vos dossiers ou changer d'ordinateur.

## Installation & Utilisation

### Option A : Utilisation Directe (Recommandé)
1.  Allez dans le dossier `dist`.
2.  Ouvrez le fichier `index.html` avec un navigateur récent (Chrome, Edge, Firefox).
3.  L'application est prête ! Les données seront sauvegardées automatiquement dans ce navigateur.

### Option B : Développement / Modification
1.  Assurez-vous d'avoir Node.js installé.
2.  Ouvrez un terminal dans le dossier du projet.
3.  Installez les dépendances :
    ```bash
    npm install
    ```
4.  Lancez le mode développement :
    ```bash
    npm run dev
    ```
5.  Pour recréer la version "Fichier Unique" (`dist/index.html`) :
    ```bash
    npm run build
    ``

## Utilisation Quotidienne

1.  **Matin** : Ouvrez l'application. Vérifiez le tableau de bord pour les "À faire (15 jours)".
2.  **Convocations** : Allez sur la fiche d'un travailleur "À faire", cliquez sur "Convocation" et imprimez.
3.  **Visite** : Quand le travailleur arrive, cliquez sur "Nouvel Examen".
4.  **Résultats** : Une fois les résultats du labo reçus, ouvrez l'examen en cours, saisissez le résultat.
    *   Si négatif : Validez pour imprimer le certificat.
    *   Si positif : Saisissez le traitement et la date de contre-visite.

## Sauvegarde
Pensez à faire un "Export" régulièrement (bouton en haut de la liste des travailleurs) et à stocker le fichier JSON en lieu sûr.

## Nouvelles fonctionnalités et améliorations
- **PWA (Progressive Web App):** L'application peut maintenant être installée sur un appareil et fonctionne mieux hors-ligne.
- **Export/Import chiffré:** Dans `Paramètres` vous pouvez maintenant exporter les données chiffrées (AES-GCM) avec un mot de passe et réimporter des sauvegardes chiffrées.
- **Tests et CI:** Des tests unitaires (Vitest) et une action GitHub CI ont été ajoutés. Les PRs seront validées automatiquement.
- **ESLint & Prettier:** Les règles de linting et de formatage sont installées; utilisez `npm run lint` et `npm run format`.
- **Responsive Sidebar:** La barre latérale est responsive et peut être masquée sur mobile.
- **Print Disabled:** Les templates d'impression ont été retirés temporairement (désactivés) par défaut — utilisez import/export JSON pour générer des documents si nécessaire.

### Standalone (Tap-to-run) vs Full `dist`

- **Tap-to-run single file:** Run `npm run build:file` to create `dist/index-standalone.html` — a single self-contained HTML file that does not try to register a service worker and inlines the icon. You can copy just this file to a device and open it directly (no server). This is the best choice when you want a single file to open on Android/PC.
- **Full `dist` to keep PWA:** If you want the PWA installability and service worker cache, copy the whole `dist/` directory and serve it with a local server on the device; opening `index.html` via `file://` will run the app but service workers won't be registered.

**Recommendation:** Use `index-standalone.html` for the lowest friction if you plan to just copy a file to devices and tap it. Use the full `dist` hosted on a local server to enable the PWA features.

## Auto Backup (no server)

You can configure the app to automatically export to a folder you choose when a number of exam changes is reached. This uses the File System Access API when available (Chrome/Chromium based browsers):

- Open `Paramètres` → pick a backup folder with the `Choose Backup Folder` button.
- Set the `Auto Export Threshold (exams)` number (default 10). Once the app detects that many changed/added exams, it will export the current JSON to `backup-auto.json` inside the chosen folder.
- If the browser doesn't support the File System Access API, the app will fall back to triggering a download of the JSON file (user chooses where to save it).

This lets you copy the folder to devices and keep a live `backup-auto.json` which updates automatically (whenever the threshold is reached). For full disaster recovery, continue to `Export` regularly and save copies on external drives or cloud storage.

### Notes about File System Access & `file://`

- Some browser features (the File System Access API, service workers) require a secure origin (HTTPS or `localhost`) and might not be available when opening `index.html` with the `file://` protocol. If `Choose Backup Folder` is not supported in your browser, the app will instead fallback to downloading backup files automatically.
- If you copy `dist/` to a tablet and open via file manager (file://), you will have the app; but browser support for writing to an adjacent file is limited. Choosing a folder and giving the app permission usually requires the app to be served on a secure origin.