# 📱 Guide Complet de Compilation Android (APK)

Ce document détaille les différentes méthodes pour générer le fichier `.apk` de l'application, en fonction de votre environnement de travail.

---

## 🛑 AVERTISSEMENT IMPORTANT (IA & Utilisateurs Termux/Codespaces)

**LISEZ CECI AVANT D'ESSAYER DE COMPILER :**

Si vous travaillez depuis :

1.  **GitHub Codespaces** (dans le navigateur)
2.  **Termux** (sur un téléphone Android)
3.  Un conteneur Linux léger

**NE TENTEZ PAS D'INSTALLER LE SDK ANDROID LOCALE.**
Ces environnements ne sont pas conçus pour supporter la lourdeur d'Android Studio et du SDK complet. Vous perdrez du temps et de l'espace disque pour un résultat qui échouera.

👉 **Utilisez la "Méthode 1 : Compilation Cloud" ci-dessous.**

---

## 🛠️ Méthode 1 : Compilation Cloud (GitHub Actions)

**Recommandé pour :** Termux, Codespaces, ou si vous n'avez pas Android Studio installé.

L'application est configurée pour être construite automatiquement par les serveurs de GitHub. C'est la méthode la plus simple pour les utilisateurs mobiles (Termux).

### Comment faire :

1.  **Préparez votre code** : Faites vos modifications dans l'application web.
2.  **Envoyez vers GitHub** :
    - Depuis **Termux** ou le terminal, lancez :
      ```bash
      git add .
      git commit -m "Mise à jour pour build APK"
      git push origin main
      ```
3.  **Laissez GitHub travailler** :
    - Une fois le "push" effectué, GitHub détecte le changement et lance une action automatique.
    - Ce processus prend environ **3 à 5 minutes**.
4.  **Téléchargez l'APK** :
    - Allez sur la page de votre dépôt GitHub.
    - Cliquez sur l'onglet **"Actions"** en haut.
    - Cliquez sur le workflow le plus récent (ex: "Build Android APK").
    - Descendez tout en bas de la page jusqu'à la section **"Artifacts"**.
    - Cliquez sur **`app-release`** (ou `app-debug`) pour télécharger le fichier ZIP contenant votre APK.

---

## 💻 Méthode 2 : Compilation Locale (PC / Mac)

**Recommandé pour :** Les développeurs sur un ordinateur avec Android Studio installé. C'est la méthode la plus rapide pour itérer.

### Prérequis

- Node.js installé.
- Android Studio installé et configuré (avec le SDK Android).

### Instructions étape par étape

1.  **Compiler le Web** :
    Générez les fichiers HTML/JS/CSS optimisés dans le dossier `dist/`.

    ```bash
    npm run build
    ```

2.  **Synchroniser avec Android** :
    Copie le contenu de `dist/` vers le projet natif Android.

    ```bash
    npx cap sync android
    ```

3.  **Lancer la compilation Gradle** :
    - **Sur Windows (PowerShell / CMD)** :
      ```bash
      cd android
      gradlew assembleRelease
      ```
    - **Sur Mac / Linux** :
      ```bash
      cd android
      chmod +x gradlew
      ./gradlew assembleRelease
      ```

4.  **Récupérer votre fichier** :
    Si la compilation réussit ("BUILD SUCCESSFUL"), votre APK se trouve ici :

    `android/app/build/outputs/apk/release/app-release-unsigned.apk`

    _(Note : Cet APK est "non signé". Il s'installera sur la plupart des téléphones si vous activez "Sources inconnues", mais pour le Play Store, il faudra le signer)._

---

## ❓ FAQ & Dépannage

**Q: J'ai une erreur `gradlew: permission denied` sur Linux/Mac.**
R: Lancez `chmod +x gradlew` dans le dossier `android/` pour rendre le script exécutable.

**Q: J'utilise Termux et je veux vraiment compiler en local.**
R: C'est techniquement très difficile. Vous devrez installer un JDK, Gradle, et une version "command-line tools" du SDK Android, configurer les variables `$ANDROID_HOME`, et gérer la mémoire limitée du téléphone. **La Méthode 1 est 100x plus simple.**

**Q: Quelle est la différence entre `assembleDebug` et `assembleRelease` ?**

- `assembleDebug` : Crée un APK signé avec une clé de test. Idéal pour le développement et l'émulateur.
- `assembleRelease` : Crée un APK optimisé pour la production (plus rapide, plus léger), mais non signé par défaut.
