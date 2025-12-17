import localforage from 'localforage';

// NOTE: We do NOT use static imports for Capacitor to avoid issues on Web/Initialization
// import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; 
// import { Capacitor } from '@capacitor/core'; 

const BACKUP_STORE = 'backup_settings';

// --- Separate filenames ---
const MANUAL_BACKUP_FILE_NAME = 'backup-manuel.json';
const AUTO_BACKUP_FILE_NAME = 'backup-auto.json';

const DEFAULT_THRESHOLD = 10;

let counter = 0;
let threshold = DEFAULT_THRESHOLD;
let autoImportEnabled = false;
let lastImported = 0;
let backupDir = null; 
let isInitialized = false;

export async function init() {
  try {
    const meta = await localforage.getItem(BACKUP_STORE);
    if (meta) {
      threshold = meta.threshold || DEFAULT_THRESHOLD;
      autoImportEnabled = !!meta.autoImport;
      lastImported = meta.lastImported || 0;
    }
    const savedCounter = await localforage.getItem('backup_counter');
    counter = parseInt(savedCounter, 10) || 0;
    isInitialized = true;
    console.log('[Backup] Service initialized. Counter:', counter, 'Threshold:', threshold);
  } catch (e) {
    console.warn('[Backup] Failed to load backup settings', e);
    isInitialized = true;
  }
}

async function saveMeta() {
  await localforage.setItem(BACKUP_STORE, { 
    threshold, 
    autoImport: autoImportEnabled, 
    lastImported,
  });
}

// ... (chooseDirectory function is unchanged, copy it from previous if needed, or keep yours)
export async function chooseDirectory() {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
      return { type: 'android', path: 'Documents/copro-watch', name: 'Dossier Documents/copro-watch' };
  }
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      backupDir = dirHandle; 
      return { type: 'web', handle: dirHandle, name: dirHandle.name };
    } catch (e) {
      throw new Error('Sélection annulée');
    }
  }
  throw new Error('Non supporté');
}


export async function saveBackupJSON(jsonString, filename = MANUAL_BACKUP_FILE_NAME) {
  const { Capacitor } = await import('@capacitor/core');

  try {
    console.log(`[Backup] Saving ${filename}...`);

    // 1. ANDROID
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      try {
        await Filesystem.requestPermissions();
        // Check/Create Dir
        try {
          await Filesystem.stat({ path: 'copro-watch', directory: Directory.Documents });
        } catch {
          await Filesystem.mkdir({ path: 'copro-watch', directory: Directory.Documents, recursive: true });
        }

        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        return true;
      } catch (e) {
        console.error('[Backup] Native write failed:', e);
        throw new Error("Échec Android: " + e.message); 
      }
    }

    // 2. WEB
    if (typeof window !== 'undefined' && backupDir) {
      const fileHandle = await backupDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      return true;
    }

    // 3. FALLBACK Download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 0);
    return true;

  } catch (e) {
    console.error('[Backup] Critical failure:', e);
    throw e;
  }
}

/**
 * HELPER: Reads a specific file and returns content + timestamp
 */
async function getFileContent(filename) {
    const { Capacitor } = await import('@capacitor/core');
    
    // ANDROID
    if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        try {
            const stat = await Filesystem.stat({
                path: `copro-watch/${filename}`,
                directory: Directory.Documents
            });
            const contents = await Filesystem.readFile({
                path: `copro-watch/${filename}`,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            return { text: contents.data, lastModified: stat.mtime };
        } catch (e) {
            return null; // File doesn't exist or can't read
        }
    } 
    // WEB
    else if (backupDir) {
        try {
            const handle = await backupDir.getFileHandle(filename);
            const file = await handle.getFile();
            const text = await file.text();
            return { text, lastModified: file.lastModified };
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * INTELLIGENT IMPORT: Checks both files and picks the newest one.
 */
export async function readBackupJSON() {
    console.log('[Backup] Scanning for best backup file...');
    
    // Check both files
    const manual = await getFileContent(MANUAL_BACKUP_FILE_NAME);
    const auto = await getFileContent(AUTO_BACKUP_FILE_NAME);

    // Logic to pick the best one
    let best = null;
    let source = '';

    if (manual && auto) {
        if (manual.lastModified > auto.lastModified) {
            best = manual;
            source = 'MANUAL';
        } else {
            best = auto;
            source = 'AUTO';
        }
    } else if (manual) {
        best = manual;
        source = 'MANUAL';
    } else if (auto) {
        best = auto;
        source = 'AUTO';
    }

    if (best) {
        console.log(`[Backup] Selected ${source} backup (Date: ${new Date(best.lastModified).toLocaleString()})`);
        return best;
    }

    throw new Error("Aucun fichier de sauvegarde trouvé (ni auto, ni manuel).");
}

export async function setAutoImport(enabled) {
  autoImportEnabled = !!enabled;
  await saveMeta();
}
export async function getAutoImport() { return autoImportEnabled; }


export async function checkAndAutoImport(dbInstance) {
  if (!autoImportEnabled) return { imported: false, reason: 'disabled' };
  
  console.log('[Backup] Checking for auto-import...');
  
  try {
    // readBackupJSON now automatically finds the newest of the two files
    const backup = await readBackupJSON();
    
    if (!backup) return { imported: false, reason: 'no_data' };

    const last = backup.lastModified;
    // Tolerance of 1000ms for comparison
    if (last > (lastImported + 1000)) {
      console.log('[Backup] Newer backup found. Importing...');
      const ok = await dbInstance.importData(backup.text);
      if (ok) {
        lastImported = last;
        await saveMeta();
        return { imported: true };
      }
    }
    return { imported: false, reason: 'not_newer' };
  } catch (e) { 
    return { imported: false, error: e.message }; 
  }
}

export async function clearDirectory() {
  const meta = await localforage.getItem(BACKUP_STORE) || {};
  backupDir = null;
  await localforage.setItem(BACKUP_STORE, meta);
}

// --- Generic Register Change Function ---
// Use this for Workers, Departments, Exams, etc.
export async function registerChange() {
  if (!isInitialized) await init();
  counter++;
  await localforage.setItem('backup_counter', counter);
  console.log(`[Backup] Change registered. Counter: ${counter}/${threshold}`);
  if (counter >= threshold) return true;
  return false;
}

// Kept for backward compatibility if other files call them specific names
export async function registerExamChange() { return registerChange(); }
export async function registerWaterAnalysisChange() { return registerChange(); }


export async function performAutoExport(getJsonCallback) {
  try {
    console.log('[Backup] Performing Auto-Export...');
    const json = await getJsonCallback();
    // Save as AUTO file
    const success = await saveBackupJSON(json, AUTO_BACKUP_FILE_NAME);
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

export async function resetCounter() { 
  counter = 0; 
  await localforage.setItem('backup_counter', 0); 
  console.log('[Backup] Counter reset to 0');
}

// Getters
export function getThreshold() { return counter >= threshold; }
export async function getCurrentThreshold() { return threshold; }
export async function getBackupStatus() {
    if (!isInitialized) await init();
    return {
      counter,
      threshold,
      autoImportEnabled,
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
export function getDirHandle() { return backupDir; }
export function getBackupDirName() { 
  if (backupDir) return backupDir.name;
  return 'Dossier Documents (Android) ou Non sélectionné'; 
}
export function isDirectoryAvailable() { return typeof window !== 'undefined'; }
export function getCurrentStorageInfo() {
  if (backupDir) return { type: 'Web API', path: backupDir.name, available: true, permission: 'granted' };
  return { type: 'Système / Android', path: 'Documents/copro-watch', available: true, permission: 'unknown' };
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
  registerChange, // Generic one
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
