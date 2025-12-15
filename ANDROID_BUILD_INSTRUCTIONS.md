# Instructions for AI Bot - Android Build Solution

## Problem
Stop trying to install the Android SDK in the terminal. This is a GitHub Codespace, and it is not optimized for building Android apps locally (it lacks the SDK and system paths). You will likely keep hitting errors.

## Solution
Instead, please solve this by creating a GitHub Action to build the APK remotely.

## Action Required
Do the following:

1. **Create the workflow directory and file:**
   - Create a file named `.github/workflows/build-android.yml`

2. **Write the workflow content:**
   ```yaml
   name: Build Android APK
   
   on:
     push:
       branches: [main, master]
     pull_request:
       branches: [main, master]
     workflow_dispatch:
   
   jobs:
     build:
       runs-on: ubuntu-latest
       
       steps:
         - name: Checkout repository
           uses: actions/checkout@v4
   
         - name: Set up Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
   
         - name: Install dependencies
           run: npm install
   
         - name: Build web app
           run: npm run build
   
         - name: Sync Capacitor
           run: npx cap sync android
   
         - name: Set up JDK 17
           uses: actions/setup-java@v4
           with:
             java-version: '17'
             distribution: 'temurin'
   
         - name: Grant execute permission for gradlew
           run: chmod +x android/gradlew
   
         - name: Build Debug APK
           working-directory: android
           run: ./gradlew assembleDebug
   
         - name: Upload APK artifact
           uses: actions/upload-artifact@v4
           with:
             name: app-debug
             path: android/app/build/outputs/apk/debug/app-debug.apk
             retention-days: 30
   ```

3. **Commit and push the changes:**
   - Add the file to git
   - Commit with message "Add GitHub Actions workflow for Android build"
   - Push to the repository

## How It Works
- GitHub Actions will use `ubuntu-latest` which already has Java and Android SDK installed
- The workflow will automatically build the APK when you push or manually trigger it
- The built APK will be available as a downloadable artifact in the Actions tab
- No need to install Android tools locally

## Immediate Verification
Before committing, you can verify your web code works by running:
```bash
npm run build
```

This will check if your HTML/JS is correct without needing the heavy Android tools.
