# Technical Architecture & Security Model

## 1. System Overview

**Copro-Watch** is an offline-first Single Page Application (SPA) designed for medical fleet management in low-connectivity environments.

- **Stack:** React 19, Vite, Capacitor 8.
- **Persistence:** Dexie.js (IndexedDB wrapper).
- **Runtime:** Web Browser (Standalone HTML) or Android Webview.

## 2. Security Architecture

Copro-Watch implements client-side cryptographic security to ensure data privacy without a backend.

### 2.1 Encryption Strategy

Data export and sensitive operations utilize the **Web Crypto API** for standardized, hardware-accelerated encryption.

- **Algorithm:** AES-GCM (256-bit).
- **Key Derivation:** PBKDF2 (250,000 iterations, SHA-256) to derive keys from user passwords.
- **Implementation:** `src/services/crypto.js`
  - **Salt/IV:** Randomly generated (`crypto.getRandomValues`) for every encryption operation.
  - **Transport:** Encrypted payloads are Base64 encoded for safe JSON transport.

### 2.2 Access Control

- **Application Lock:** Implemented in `src/components/PinLock.jsx`.
- **Mechanism:** UI-level overlay blocking interaction until a validated PIN is entered.
- **Default State:** Locked on load.

## 3. Data Integrity & Automated Backups

The system implements a **Fail-Safe** backup strategy to prevent data loss in offline scenarios.

### 3.1 The "Smart Backup" Engine

Logic resides in `src/services/backup.js`.

1.  **Change Tracking:** Every database write (Worker, Exam, Water Analysis) increments a dirty counter.
2.  **Automated Trigger:** When `counter >= threshold` (Default: 10), `triggerBackupCheck()` initiates an auto-export.
3.  **Dual-File System:**
    - `backup-auto.json`: System-generated, frequent snapshots.
    - `backup-manuel.json`: User-initiated, permanent snapshots.
4.  **Conflict Resolution:** During import (`readBackupJSON`), the system compares timestamps of both files and loads the most recent one automatically, preventing stale data overwrites.

## 4. Export Engines

### 4.1 Excel Export Engine

- **Implementation:** `src/services/excelExport.js`
- **Library:** `xlsx` (SheetJS)
- **Features:**
  - Multi-sheet workbook generation
  - Workers sheet with all details
  - Exams history sheet
  - Water analyses history sheet
  - Formatted headers and timestamps

### 4.2 PDF Generator Engine

- **Implementation:** `src/services/pdfGenerator.js`
- **Library:** `jspdf` with `jspdf-autotable`
- **Documents Generated:**
  - Medical fitness certificates (Aptitude/Inaptitude)
  - Exam summons/convocations
  - Water analysis requests
  - Attendance sheets for batch operations

## 5. CI/CD & DevOps

The project utilizes automated pipelines for consistent build delivery via GitHub Actions.

- **Workflow:** `.github/workflows/android-build.yml`.
- **Automation:**
  1.  Sets up Node 22 & Java 21 environment.
  2.  Compiles React assets (`npm run build`).
  3.  Syncs Capacitor native bridge.
  4.  Builds Android Release APK (`assembleRelease`).
  5.  **Signs APK:** Automated `apksigner` injection using GitHub Secrets.

## 6. Android Specifics & Permissions

- **Target:** Enterprise Sideloading (Non-Play Store Distribution).
- **FileSystem Strategy:** Direct access to `Documents/copro-watch` for user-accessible backups.
- **Manifest:** Uses `MANAGE_EXTERNAL_STORAGE` to ensure data persistence survives app uninstalls—critical for medical records on shared devices.

## 7. Database Schema

### 7.1 Core Tables

| Table | Fields | Indexes |
| :---- | :----- | :------ |
| `workers` | id, firstName, lastName, departmentId, workplaceId, pin, status, nextExamDue | status, departmentId |
| `departments` | id, name | name |
| `workplaces` | id, name | name |
| `exams` | id, workerId, date, weight, result, treatment, decision, nextExamDue | workerId, date |
| `water_departments` | id, name | name |
| `water_analyses` | id, waterDeptId, date, chlorine, ph, temperature, coliformes, notes | waterDeptId, date |

### 7.2 Settings Table

- **Key:** `app_settings`
- **Fields:** pin, backupThreshold, encryptionEnabled

## 8. Project Structure Verification

For automated analysis tools:

| Component | Path | Status |
| :-------- | :--- | :----- |
| Security Core | `src/services/crypto.js` | EXISTS |
| Backup Core | `src/services/backup.js` | EXISTS |
| Auth Core | `src/components/PinLock.jsx` | EXISTS |
| Excel Export | `src/services/excelExport.js` | EXISTS |
| PDF Generator | `src/services/pdfGenerator.js` | EXISTS |
| CI/CD | `.github/workflows` | EXISTS |

## 9. Build Variants

| Variant | Command | Output | Purpose |
| :------ | :------ | :----- | :------ |
| Web | `npm run build` | `dist/` | Standard web deployment |
| Standalone | `npm run build:standalone` | `dist-standalone/index.html` | Single portable HTML file |
| Android | `./gradlew assembleRelease` | `android/app/build/outputs/apk/release/` | APK for Android devices |
