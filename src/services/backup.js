import localforage from 'localforage';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; // <--- INDISPENSABLE
import { Capacitor } from '@capacitor/core'; // <--- INDISPENSABLE
const BACKUP_STORE = 'backup_settings';
const BACKUP_FILE_NAME = 'backup-auto.json';
const DEFAULT_THRESHOLD = 10;
let counter = 0;
let threshold = DEFAULT_THRESHOLD;
let autoImportEnabled = false;
let lastImported = 0;
let backupDir = null;
async function init() {
  try {
    const meta = await localforage.getItem(BACKUP_STORE);
    if (meta) {
      threshold = meta.threshold || DEFAULT_THRESHOLD;
      autoImportEnabled = !!meta.autoImport;
      lastImported = meta.lastImported || 0;
    }
    const savedCounter = await localforage.getItem('backup_counter');
    counter = savedCounter || 0;
  } catch (e) {
    console.warn('Failed to load backup settings', e);
  }
}
async function saveMeta() {
  await localforage.setItem(BACKUP_STORE, { 
    threshold, 
    autoImport: autoImportEnabled, 
    lastImported 
  });
}
export async function chooseDirectory() {
  // Sur Android, on force le dossier Documents pour éviter les erreurs de permission
  if (Capacitor.isNativePlatform()) {
      return {
        type: 'android',
        path: 'Documents/copro-watch',
        name: 'Dossier Documents (Automatique)'
      };
  }
  // Fallback Web (PC / Navigateur)
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const meta = await localforage.getItem(BACKUP_STORE) || {};
      meta.dirHandle = dirHandle;
      await localforage.setItem(BACKUP_STORE, meta);
      return {
        type: 'web',
        handle: dirHandle,
        name: dirHandle.name
      };
    } catch (e) {
      console.warn('Directory pick canceled', e);
      throw new Error('Selection annulée');
    }
  } else {
    throw new Error('Fonction non supportée sur ce navigateur');
  }
}
export async function saveBackupJSON(jsonString, filename = BACKUP_FILE_NAME) {
  try {
    console.log('Starting backup save...', filename);
    // 1. TENTATIVE NATIVE ANDROID
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('Mode Android détecté, écriture en cours...');
        // On demande la permission si nécessaire
        try { await Filesystem.requestPermissions(); } catch(e) {}
        // Création du dossier (ne fait rien s'il existe déjà)
        await Filesystem.mkdir({
          path: 'copro-watch',
          directory: Directory.Documents,
          recursive: true
        });
        // Ecriture du fichier
        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        console.log('Backup Android réussi dans Documents/copro-watch');
        return true;
      } catch (e) {
        console.error('Erreur écriture native:', e);
        // Si l'écriture native échoue, on lance une erreur pour que l'utilisateur le sache
        // au lieu de télécharger silencieusement dans Download
        throw new Error("Echec sauvegarde Android: " + e.message); 
      }
    }
    // 2. TENTATIVE WEB (PC)
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const meta = await localforage.getItem(BACKUP_STORE);
        if (meta && meta.dirHandle) {
          const dirHandle = meta.dirHandle;
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          return true;
        }
      } catch (e) {
        console.warn('Web directory backup failed', e);
      }
    }
    // 3. DERNIER RECOURS : TÉLÉCHARGEMENT (Seulement si tout le reste échoue)
    console.log('Fallback download...');
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Backup failed completely', e);
    throw e;
  }
}
export async function readBackupJSON(filename = BACKUP_FILE_NAME) {
  try {
    // LECTURE ANDROID
    if (Capacitor.isNativePlatform()) {
      try {
        const contents = await Filesystem.readFile({
          path: `copro-watch/${filename}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        let mtime = Date.now();
        try {
            const stat = await Filesystem.stat({
              path: `copro-watch/${filename}`,
              directory: Directory.Documents
            });
            mtime = stat.mtime;
        } catch(err) {}
        return { text: contents.data, lastModified: mtime };
      } catch (e) {
        console.warn('Fichier introuvable ou erreur lecture native', e);
        return null;
      }
    }
    // LECTURE WEB
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      // ... code web existant ...
       const meta = await localforage.getItem(BACKUP_STORE);
        if (meta && meta.dirHandle) {
          const dirHandle = meta.dirHandle;
          const fileHandle = await dirHandle.getFileHandle(filename);
          const file = await fileHandle.getFile();
          const text = await file.text();
          return { text, lastModified: file.lastModified };
        }
    }
    return null;
  } catch (e) {
    return null;
  }
}
// ... Les autres fonctions (setThreshold, etc.) restent inchangées ...
export async function setAutoImport(enabled) {
  autoImportEnabled = !!enabled;
  await saveMeta();
}
export async function getAutoImport() {
  return autoImportEnabled;
}
export async function checkAndAutoImport(dbInstance) {
  if (!autoImportEnabled) return { imported: false };
  try {
    const backup = await readBackupJSON();
    if (!backup) return { imported: false };
    const last = backup.lastModified;
    if (last > lastImported) {
      const ok = await dbInstance.importData(backup.text);
      if (ok) {
        lastImported = last;
        await saveMeta();
        return { imported: true };
      }
    }
  } catch (e) { return { imported: false }; }
  return { imported: false };
}
export async function clearDirectory() {
  const meta = await localforage.getItem(BACKUP_STORE) || {};
  delete meta.dirHandle;
  await localforage.setItem(BACKUP_STORE, meta);
}
export function getThreshold() { return counter >= threshold; }
export async function getCurrentThreshold() { return threshold; }
export async function getBackupStatus() {
    // Simple status check
    const savedCounter = await localforage.getItem('backup_counter') || 0;
    counter = savedCounter;
    return {
      counter: counter,
      threshold: threshold,
      autoImportEnabled: autoImportEnabled,
      progress: `${counter}/${threshold}`,
      shouldBackup: counter >= threshold,
      backupNeeded: counter >= threshold
    };
}
export async function setThreshold(value) {
  if (typeof value === 'number' && value > 0) {
    threshold = value;
    await saveMeta();
    return true;
  }
  return false;
}
export async function registerExamChange() {
  counter++;
  await localforage.setItem('backup_counter', counter);
  if (counter >= threshold) return true;
  return false;
}
export async function resetCounter() { 
  counter = 0; 
  await localforage.setItem('backup_counter', 0); 
}
export async function performAutoExport(getJsonCallback) {
  try {
    const json = await getJsonCallback();
    const success = await saveBackupJSON(json, BACKUP_FILE_NAME);
    if (success) {
      await resetCounter();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Auto export failed', e);
    return false;
  }
}
export function getDirHandle() { return backupDir; }
export function getBackupDirName() { 
  if (Capacitor.isNativePlatform()) {
    return 'Documents/copro-watch (Android)';
  }
  return backupDir ? (backupDir.name || 'Selected Directory') : null; 
}
export function isDirectoryAvailable() {
  return Capacitor.isNativePlatform() || ('showDirectoryPicker' in window);
}
export function getCurrentStorageInfo() {
  if (Capacitor.isNativePlatform()) {
    return {
      type: 'Android',
      path: 'Documents/copro-watch',
      available: true,
      permission: 'granted'
    };
  } else if ('showDirectoryPicker' in window) {
    return {
      type: 'Web API',
      path: backupDir?.name || 'Not selected',
      available: !!backupDir,
      permission: backupDir ? 'granted' : 'not selected'
    };
  } else {
    return {
      type: 'Download only',
      path: 'Downloads',
      available: false,
      permission: 'not supported'
    };
  }
}
export default {
  init,
  chooseDirectory,
  saveBackupJSON,
  readBackupJSON,
  getThreshold,
  getCurrentThreshold,
  getBackupStatus,
  setThreshold,
  registerExamChange,
  resetCounter,
  performAutoExport,
  getDirHandle,
  getBackupDirName,
  clearDirectory,
  setAutoImport,
  getAutoImport,
  checkAndAutoImport,
  isDirectoryAvailable,
  getCurrentStorageInfo
};
