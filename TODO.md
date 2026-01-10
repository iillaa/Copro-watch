# 📝 Carnet d'Idées & Roadmap

## 💡 Idées de Fonctionnalités (Backlog)

### 🩺 Valeur Médicale & Métier

- [ ] **Concept : Types d'Examens Personnalisables**
  - _Idée :_ Rendre le système générique via les paramètres.
  - _But :_ Permettre d'ajouter d'autres types que la Coprologie (ex: Visite d'embauche, Vision, Sang).
- [ ] **Concept : File d'Attente "Contre-Visites"**
  - _Idée :_ Créer une liste dédiée pour les cas positifs.
  - _But :_ Système de rappel automatique à J+7 / J+10 pour ne jamais oublier un contrôle.

### 📊 Administration & Reporting

- [ ] **Concept : Export Excel Avancé**
  - _Idée :_ Génération de fichiers `.xlsx` natifs (pas juste CSV).
  - _But :_ Colonnes séparées et filtrables (Nom, Matricule, Aptitude) pour les rapports RH directs.
- [ ] **Concept : Rapports PDF Natifs**
  - _Idée :_ Génération de documents PDF non modifiables directement dans l'app.
  - _But :_ Imprimer des fiches d'aptitude et rapports mensuels propres.
- [ ] **Concept : Tableau de Bord "Statistiques Globales"**
  - _Idée :_ Une page dédiée avec des graphiques sectoriels (Camemberts/Barres).
  - _But :_ Analyser le % de couverture vaccinale ou le taux de positivité par département.

### 📱 Expérience Utilisateur (UX) & Mobile

- [ ] **Concept : Notifications Locales (Android)**
  - _Idée :_ L'application envoie une notification push locale chaque matin à 08h00.
  - _But :_ Rappeler proactivement : "3 visites prévues aujourd'hui" ou "Analyse d'eau requise".
- [ ] **Concept : Mode Sombre (Dark Mode)**
  - _Idée :_ Option pour basculer l'interface en noir/gris foncé.
  - _But :_ Confort visuel pour le travail de nuit et économie de batterie.
- [x] **Concept : Actions en Masse (Bulk Actions)**
  - _Idée :_ Cases à cocher dans la liste des travailleurs.
  - _But :_ Supprimer ou déplacer 10 travailleurs d'un coup vers un autre département.
- [ ] **Concept : Recherche Avancée**
  - _Idée :_ Filtres combinés dans la barre de recherche.
  - _But :_ Trouver "Cuisiniers" + "En Retard" + "Dep: SWAG" en une seule requête.

### 🔒 Sécurité & Technique

- [ ] **Concept : Authentification Biométrique**

  - _Idée :_ Utiliser les API natives Android.
  - _But :_ Connexion par empreinte digitale ou FaceID (remplace le PIN).

- [ ] **Concept : Logs d'Audit**
  - _Idée :_ Historique technique invisible.
  - _But :_ Savoir qui a modifié une fiche et quand (traçabilité en cas d'erreur).

---

## ✅ Historique des Versions (v1.0 Stable)

- [x] **Core** : Gestion Travailleurs, Examens, Analyses d'eau.
- [x] **Securité** : Sauvegarde "Smart Backup" (Auto + Manuel) avec anti-collision.
- [x] **Stabilité** : Correction des crashs Android (Permissions) et bug SWASS.
- [x] **Déploiement** : Version Standalone (Fichier unique) et APK Android fonctionnels.
