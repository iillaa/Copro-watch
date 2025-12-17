# 📝 Carnet d'Idées & Roadmap

## 💡 Idées de Fonctionnalités (Backlog)

### 🩺 Valeur Médicale & Métier
- [ ] **Concept : Historique Visuel (Timeline)**
  * *Idée :* Sur la fiche d'un travailleur, afficher une frise chronologique verticale.
  * *But :* Voir l'évolution sanitaire (Examens, Résultats, Absences) en un coup d'œil rapide.
- [ ] **Concept : Types d'Examens Personnalisables**
  * *Idée :* Rendre le système générique via les paramètres.
  * *But :* Permettre d'ajouter d'autres types que la Coprologie (ex: Visite d'embauche, Vision, Sang).
- [ ] **Concept : File d'Attente "Contre-Visites"**
  * *Idée :* Créer une liste dédiée pour les cas positifs.
  * *But :* Système de rappel automatique à J+7 / J+10 pour ne jamais oublier un contrôle.
- [ ] **Concept : Tendances Qualité Eau**
  * *Idée :* Ajouter un graphique (courbe) dans le détail d'un service d'eau.
  * *But :* Visualiser la chute du Chlore ou les variations de pH sur 30 jours.

### 📊 Administration & Reporting
- [ ] **Concept : Export Excel Avancé**
  * *Idée :* Génération de fichiers `.xlsx` natifs (pas juste CSV).
  * *But :* Colonnes séparées et filtrables (Nom, Matricule, Aptitude) pour les rapports RH directs.
- [ ] **Concept : Rapports PDF Natifs**
  * *Idée :* Génération de documents PDF non modifiables directement dans l'app.
  * *But :* Imprimer des fiches d'aptitude et rapports mensuels propres.
- [ ] **Concept : Tableau de Bord "Statistiques Globales"**
  * *Idée :* Une page dédiée avec des graphiques sectoriels (Camemberts/Barres).
  * *But :* Analyser le % de couverture vaccinale ou le taux de positivité par département.

### 📱 Expérience Utilisateur (UX) & Mobile
- [ ] **Concept : Notifications Locales (Android)**
  * *Idée :* L'application envoie une notification push locale chaque matin à 08h00.
  * *But :* Rappeler proactivement : "3 visites prévues aujourd'hui" ou "Analyse d'eau requise".
- [ ] **Concept : Mode Sombre (Dark Mode)**
  * *Idée :* Option pour basculer l'interface en noir/gris foncé.
  * *But :* Confort visuel pour le travail de nuit et économie de batterie.
- [ ] **Concept : Actions en Masse (Bulk Actions)**
  * *Idée :* Cases à cocher dans la liste des travailleurs.
  * *But :* Supprimer ou déplacer 10 travailleurs d'un coup vers un autre département.
- [ ] **Concept : Recherche Avancée**
  * *Idée :* Filtres combinés dans la barre de recherche.
  * *But :* Trouver "Cuisiniers" + "En Retard" + "Dep: SWAG" en une seule requête.

### 🔒 Sécurité & Technique
- [ ] **Concept : Authentification Biométrique**
  * *Idée :* Utiliser les API natives Android.
  * *But :* Connexion par empreinte digitale ou FaceID (remplace le PIN).
- [ ] **Concept : Verrouillage Automatique**
  * *Idée :* Timer d'inactivité.
  * *But :* Verrouiller l'écran après 5 minutes sans action.
- [ ] **Concept : Logs d'Audit**
  * *Idée :* Historique technique invisible.
  * *But :* Savoir qui a modifié une fiche et quand (traçabilité en cas d'erreur).

---

## ✅ Historique des Versions (v1.0 Stable)
- [x] **Core** : Gestion Travailleurs, Examens, Analyses d'eau.
- [x] **Securité** : Sauvegarde "Smart Backup" (Auto + Manuel) avec anti-collision.
- [x] **Stabilité** : Correction des crashs Android (Permissions) et bug SWASS.
- [x] **Déploiement** : Version Standalone (Fichier unique) et APK Android fonctionnels.
