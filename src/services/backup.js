import localforage from 'localforage';

// NOTE: We do NOT use static imports for Capacitor to avoid issues on Web/Initialization
// import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; 
// import { Capacitor } from '@capacitor/core'; 

const BACKUP_STORE = 'backup_settings';
const BACKUP_FILE_NAME = 'backup-auto.json';
const DEFAULT_THRESHOLD = 10;

let counter = 0;
let threshold = DEFAULT_THRESHOLD;
let autoImportEnabled = false;
let lastImported = 0;
let backupDir = null; // Used for Web API handle

export async function init() {
  try {
    const meta = await localforage.getItem(BACKUP_STORE);
    if (meta) {
      threshold = meta.threshold || DEFAULT_THRESHOLD;
      autoImportEnabled = !!meta.autoImport;
      lastImported = meta.lastImported || 0;
      // Note: dirHandle cannot be stored in localforage properly across reloads in all browsers, 
      // but we keep the structure for compatibility.
    }
    const savedCounter = await localforage.getItem('backup_counter');
    counter = savedCounter || 0;
    console.log('[Backup] Service initialized. Counter:', counter, 'Threshold:', threshold);
  } catch (e) {
    console.warn('[Backup] Failed to load backup settings', e);
  }
}

async function saveMeta() {
  await localforage.setItem(BACKUP_STORE, { 
    threshold, 
    autoImport: autoImportEnabled, 
    lastImported,
    // We don't save dirHandle here as it's not serializable for long-term storage in all contexts
  });
}

/**
 * Prompts the user to choose a directory (Web) or sets up the path (Android).
 */
export async function chooseDirectory() {
  // Dynamically import Capacitor Core to check platform safely
  const { Capacitor } = await import('@capacitor/core');

  // ANDROID: We target the Documents folder
  if (Capacitor.isNativePlatform()) {
      console.log('[Backup] Android platform detected for directory selection');
      return {
        type: 'android',
        path: 'Documents/copro-watch',
        name: 'Dossier Documents/copro-watch'
      };
  }

  // WEB: Use File System Access API
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      backupDir = dirHandle; // Cache it in memory
      
      return {
        type: 'web',
        handle: dirHandle,
        name: dirHandle.name
      };
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('[Backup] Directory selection cancelled by user');
        throw new Error('Sélection annulée par l\'utilisateur');
      }
      console.error('[Backup] Directory picker error:', e);
      throw new Error('Impossible de sélectionner le dossier: ' + e.message);
    }
  } else {
    throw new Error('La sauvegarde automatique n\'est pas supportée sur ce navigateur');
  }
}

/**
 * Saves the JSON string to the backup file.
 */
export async function saveBackupJSON(jsonString, filename = BACKUP_FILE_NAME) {
  const { Capacitor } = await import('@capacitor/core');

  try {
    console.log(`[Backup] Starting backup save for ${filename}... Size: ${jsonString.length} bytes`);

    // 1. ANDROID / NATIVE
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      
      try {
        console.log('[Backup] Requesting permissions...');
        // Always request permissions first on Android
        await Filesystem.requestPermissions();
        
        console.log('[Backup] Ensuring directory exists...');
        await Filesystem.mkdir({
          path: 'copro-watch',
          directory: Directory.Documents,
          recursive: true
        });

        console.log('[Backup] Writing file...');
        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        
        console.log('[Backup] Android backup successful');
        return true;
      } catch (e) {
        console.error('[Backup] Native write failed:', e);
        throw new Error("Échec de la sauvegarde Android: " + e.message); 
      }
    }

    // 2. WEB (File System Access API)
    if (typeof window !== 'undefined' && backupDir) {
      try {
        console.log('[Backup] Writing to Web Directory Handle...');
        const fileHandle = await backupDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        console.log('[Backup] Web directory backup successful');
        return true;
      } catch (e) {
        console.error('[Backup] Web directory write failed:', e);
        // Don't throw here, allow fallback to download
      }
    }

    // 3. FALLBACK: Browser Download
    console.log('[Backup] Falling back to browser download...');
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    return true;

  } catch (e) {
    console.error('[Backup] Critical backup failure:', e);
    throw e;
  }
}

/**
 * Reads the backup file.
 * NOW THROWS ERRORS instead of returning null for better debugging.
 */
export async function readBackupJSON(filename = BACKUP_FILE_NAME) {
  const { Capacitor } = await import('@capacitor/core');

  try {
    // 1. ANDROID / NATIVE
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      console.log('[Backup] Reading from Android Documents...');
      
      try {
        const contents = await Filesystem.readFile({
          path: `copro-watch/${filename}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        // Try to get last modified time
        let mtime = Date.now();
        try {
            const stat = await Filesystem.stat({
              path: `copro-watch/${filename}`,
              directory: Directory.Documents
            });
            mtime = stat.mtime;
        } catch(statErr) {
            console.warn('[Backup] Could not get file stats:', statErr);
        }

        return { text: contents.data, lastModified: mtime };
      } catch (e) {
        console.error('[Backup] Native read failed:', e);
        throw new Error("Impossible de lire le fichier de sauvegarde sur l'appareil.");
      }
    }

    // 2. WEB
    if (typeof window !== 'undefined' && backupDir) {
        console.log('[Backup] Reading from Web Directory...');
        const fileHandle = await backupDir.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return { text, lastModified: file.lastModified };
    }

    throw new Error("Aucun dossier de sauvegarde configuré.");

  } catch (e) {
    console.error('[Backup] readBackupJSON failed:', e);
    throw e; // Re-throw to be handled by caller
  }
}

export async function setAutoImport(enabled) {
  autoImportEnabled = !!enabled;
  await saveMeta();
  console.log('[Backup] Auto-import set to:', autoImportEnabled);
}

export async function getAutoImport() {
  return autoImportEnabled;
}

/**
 * Checks if a newer backup exists and imports it.
 * Now includes detailed logging and error reporting.
 */
export async function checkAndAutoImport(dbInstance) {
  if (!autoImportEnabled) return { imported: false, reason: 'disabled' };
  
  console.log('[Backup] Checking for auto-import...');
  
  try {
    const backup = await readBackupJSON();
    
    // Note: readBackupJSON now throws if file not found, which we catch below
    if (!backup) return { imported: false, reason: 'no_data' };

    const last = backup.lastModified;
    console.log(`[Backup] File time: ${last}, Last imported: ${lastImported}`);

    // If file is newer (or we haven't imported anything yet)
    if (last > lastImported) {
      console.log('[Backup] New backup found, importing...');
      const ok = await dbInstance.importData(backup.text);
      
      if (ok) {
        lastImported = last;
        await saveMeta();
        console.log('[Backup] Auto-import successful');
        return { imported: true };
      } else {
        console.error('[Backup] Import data validation failed');
        return { imported: false, reason: 'validation_failed' };
      }
    } else {
        return { imported: false, reason: 'not_newer' };
    }
  } catch (e) { 
    console.warn('[Backup] Auto-import check failed (normal if no file exists yet):', e.message);
    return { imported: false, error: e.message }; 
  }
}

export async function clearDirectory() {
  const meta = await localforage.getItem(BACKUP_STORE) || {};
  backupDir = null;
  // delete meta.dirHandle; // Not used in this version
  await localforage.setItem(BACKUP_STORE, meta);
  console.log('[Backup] Directory selection cleared');
}

export function getThreshold() { return counter >= threshold; }
export async function getCurrentThreshold() { return threshold; }

export async function getBackupStatus() {
    const savedCounter = await localforage.getItem('backup_counter') || 0;
    counter = parseInt(savedCounter, 10);
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
  console.log(`[Backup] Exam change registered. Counter: ${counter}/${threshold}`);
  if (counter >= threshold) return true;
  return false;
}

export async function registerWaterAnalysisChange() {
  counter++;
  await localforage.setItem('backup_counter', counter);
  console.log(`[Backup] Water Analysis change registered. Counter: ${counter}/${threshold}`);
  if (counter >= threshold) return true;
  return false;
}

export async function resetCounter() { 
  counter = 0; 
  await localforage.setItem('backup_counter', 0); 
  console.log('[Backup] Counter reset to 0');
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
    console.error('[Backup] Auto export failed:', e);
    return false;
  }
}

export function getDirHandle() { return backupDir; }

export function getBackupDirName() { 
  // We can't synchronously check platform here easily without the import, 
  // but we can rely on our internal state or a rough check.
  // For UI display, this is usually sufficient:
  if (backupDir) return backupDir.name;
  return 'Dossier Documents (Android) ou Non sélectionné'; 
}

export function isDirectoryAvailable() {
  // Simple check - for accurate platform check we'd need async
  return typeof window !== 'undefined';
}

export function getCurrentStorageInfo() {
  // Since we don't have synchronous access to Capacitor.isNativePlatform() here without import,
  // we return a generic object that the UI can interpret.
  // The UI should ideally call an async function to get this status if strict accuracy is needed.
  if (backupDir) {
    return {
      type: 'Web API',
      path: backupDir.name,
      available: true,
      permission: 'granted'
    };
  }
  return {
    type: 'Système / Android',
    path: 'Documents/copro-watch',
    available: true, // Assumed available on Android
    permission: 'unknown'
  };
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
  registerWaterAnalysisChange,
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
