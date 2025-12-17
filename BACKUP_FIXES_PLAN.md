# Plan de correction du système d'autobackup

## Problèmes identifiés

### 1. Import Capacitor incorrect dans Settings.jsx
- `window.Capacitor.Plugins` n'existe pas dans les versions modernes de Capacitor
- Utilisation incorrecte de l'API Filesystem

### 2. Problème de gestion d'erreur silencieuse
- Les erreurs d'auto-backup sont masquées par des try/catch qui ne log pas les détails
- Pas de feedback utilisateur en cas d'échec

### 3. Problème Android : permissions et API
- L'app Android n'a probablement pas les bonnes permissions
- L'API Filesystem de Capacitor a changé entre les versions

### 4. Auto-import non fonctionnel
- `checkAndAutoImport` peut échouer silencieusement
- Pas de logs de debugging pour diagnostiquer

### 5. Counter d'autobackup
- Le counter peut être corrompu ou mal synchronisé
- Reset du counter après backup peut ne pas fonctionner

## Plan de correction

### 1. Corriger Settings.jsx
- Corriger l'import et l'utilisation de l'API Capacitor Filesystem
- Améliorer la gestion d'erreur avec logs détaillés
- Ajouter des fallbacks robustes

### 2. Améliorer backup.js
- Corriger la logique d'auto-import
- Améliorer la gestion des erreurs
- Ajouter des logs de debugging
- Corriger les problèmes de permissions Android

### 3. Corriger App.jsx
- S'assurer que backupService.init() est appelé correctement
- Ajouter une gestion d'erreur pour l'auto-import

### 4. Tests et validation
- Tester le système d'auto-backup dans le navigateur
- Tester l'auto-backup sur Android
- Vérifier l'auto-import
- Valider que les données se synchronisent correctement

## Étapes de mise en œuvre

1. Corriger Settings.jsx - Import et API Capacitor
2. Améliorer backup.js - Auto-import et gestion d'erreur  
3. Corriger App.jsx - Initialisation du service
4. Ajouter des logs de debugging
5. Tester le système complet

