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
    }
    const savedCounter = await localforage.getItem('backup_counter');
    // FIX: Force integer parsing to avoid "01" string issues which break the math
    counter = parseInt(savedCounter, 10) || 0;
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
  });
}

/**
 * Prompts the user to choose a directory (Web) or sets up the path (Android).
 */
export async function chooseDirectory() {
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
      backupDir = dirHandle; 
      
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
        await Filesystem.requestPermissions();
        
        console.log('[Backup] Checking directory...');
        // FIX: Check if directory exists before creating to avoid "already exists" crash
        try {
          await Filesystem.stat({
            path: 'copro-watch',
            directory: Directory.Documents
          });
          console.log('[Backup] Directory exists, skipping creation.');
        } catch (statErr) {
          // If stat fails, the directory probably doesn't exist, so we create it
          console.log('[Backup] Directory not found, creating...');
          await Filesystem.mkdir({
            path: 'copro-watch',
            directory: Directory.Documents,
            recursive: true
          });
        }

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
        const fileHandle = await backupDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return true;
      } catch (e) {
        console.error('[Backup] Web directory write failed:', e);
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
 */
export async function readBackupJSON(filename = BACKUP_FILE_NAME) {
  const { Capacitor } = await import('@capacitor/core');

  try {
    // 1. ANDROID / NATIVE
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      console.log('[Backup] Reading from Android Documents...');
      
      try {
        // FIX: Request permissions before reading too, just in case
        await Filesystem.requestPermissions();

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
        } catch(statErr) {
            console.warn('[Backup] Could not get file stats:', statErr);
        }

        return { text: contents.data, lastModified: mtime };
      } catch (e) {
        console.error('[Backup] Native read failed:', e);
        throw new Error("Impossible de lire le fichier (Permissions ou fichier manquant).");
      }
    }

    // 2. WEB
    if (typeof window !== 'undefined' && backupDir) {
        const fileHandle = await backupDir.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return { text, lastModified: file.lastModified };
    }

    throw new Error("Aucun dossier de sauvegarde configuré.");

  } catch (e) {
    console.error('[Backup] readBackupJSON failed:', e);
    throw e; 
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

export async function checkAndAutoImport(dbInstance) {
  if (!autoImportEnabled) return { imported: false, reason: 'disabled' };
  
  console.log('[Backup] Checking for auto-import...');
  
  try {
    const backup = await readBackupJSON();
    
    if (!backup) return { imported: false, reason: 'no_data' };

    const last = backup.lastModified;
    console.log(`[Backup] File time: ${last}, Last imported: ${lastImported}`);

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
    console.warn('[Backup] Auto-import check failed (normal if no file exists):', e.message);
    return { imported: false, error: e.message }; 
  }
}

export async function clearDirectory() {
  const meta = await localforage.getItem(BACKUP_STORE) || {};
  backupDir = null;
  await localforage.setItem(BACKUP_STORE, meta);
  console.log('[Backup] Directory selection cleared');
}

export function getThreshold() { return counter >= threshold; }
export async function getCurrentThreshold() { return threshold; }

export async function getBackupStatus() {
    const savedCounter = await localforage.getItem('backup_counter') || 0;
    counter = parseInt(savedCounter, 10) || 0;
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
  if (backupDir) return backupDir.name;
  return 'Dossier Documents (Android) ou Non sélectionné'; 
}

export function isDirectoryAvailable() {
  return typeof window !== 'undefined';
}

export function getCurrentStorageInfo() {
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
    available: true, 
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
