// [FIX] REMOVED: import { db } from './db'; 
// We do NOT import db here to avoid circular dependency loop.

const BACKUP_STORE = 'backup_settings';
const MANUAL_BACKUP_FILE_NAME = 'backup-manuel.json';
const AUTO_BACKUP_FILE_NAME = 'backup-auto.json';
const DEFAULT_THRESHOLD = 10;

let counter = 0;
let threshold = DEFAULT_THRESHOLD;
let autoImportEnabled = false;
let lastImported = 0;
let backupDir = null;
let isInitialized = false;

// [FIX] New internal variable for DB
let dbApi = null; 

// [FIX] Update init to accept the db instance
export async function init(providedDb) {
  if (providedDb) dbApi = providedDb;

  if (!dbApi) {
    console.warn('[Backup] Init called without DB instance');
    return;
  }

  try {
    // [FIX] Use dbApi instead of db
    const settings = await dbApi.getSettings();
    threshold = settings.backup_threshold || DEFAULT_THRESHOLD;
    autoImportEnabled = !!settings.backup_autoImport;
    lastImported = settings.backup_lastImported || 0;
    counter = settings.backup_counter || 0;
    isInitialized = true;
    console.log('[Backup] initialized. Counter:', counter);
  } catch (e) {
    console.warn('[Backup] Settings load error', e);
    isInitialized = true;
  }
}

async function saveMeta() {
  if (dbApi) {
    await dbApi.saveSettings({
      backup_threshold: threshold,
      backup_autoImport: autoImportEnabled,
      backup_lastImported: lastImported,
    });
  }
}

export async function chooseDirectory() {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    return {
      type: 'android',
      path: 'Documents/copro-watch',
      name: 'Dossier Documents/copro-watch',
    };
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
        try {
          await Filesystem.stat({ path: 'copro-watch', directory: Directory.Documents });
        } catch {
          await Filesystem.mkdir({
            path: 'copro-watch',
            directory: Directory.Documents,
            recursive: true,
          });
        }

        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        return true;
      } catch (e) {
        console.error('[Backup] Native write failed:', e);
        throw new Error('Échec Android: ' + e.message);
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
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
    return true;
  } catch (e) {
    console.error('[Backup] Critical failure:', e);
    throw e;
  }
}

async function getFileContent(filename) {
  const { Capacitor } = await import('@capacitor/core');

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    try {
      const stat = await Filesystem.stat({
        path: `copro-watch/${filename}`,
        directory: Directory.Documents,
      });
      const contents = await Filesystem.readFile({
        path: `copro-watch/${filename}`,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return { text: contents.data, lastModified: stat.mtime };
    } catch (e) {
      return null;
    }
  }
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

// [NEW] Helper to safely extract the REAL date from inside the JSON
function getRealDate(fileObj) {
  if (!fileObj || !fileObj.text) return 0;
  try {
    const data = JSON.parse(fileObj.text);
    // If we have our new metadata, TRUST IT above all else
    if (data.meta && data.meta.exported_at) {
      return data.meta.exported_at;
    }
  } catch (e) {
    return 0; // File is corrupt
  }
  // Fallback: Use file system date (for old backups)
  return fileObj.lastModified;
}

export async function readBackupJSON() {
  const manual = await getFileContent(MANUAL_BACKUP_FILE_NAME);
  const auto = await getFileContent(AUTO_BACKUP_FILE_NAME);

  // 1. Calculate the TRUE dates
  const manualDate = getRealDate(manual);
  const autoDate = getRealDate(auto);

  console.log(`[Backup] Manual Date: ${new Date(manualDate).toLocaleString()}`);
  console.log(`[Backup] Auto Date:   ${new Date(autoDate).toLocaleString()}`);

  let best = null;
  let source = '';

  // 2. Compare True Dates
  if (manualDate > autoDate) {
    best = manual;
    source = 'MANUAL';
  } else if (autoDate > manualDate) {
    best = auto;
    source = 'AUTO';
  } else {
    // If equal or one missing, prefer Manual, then Auto
    best = manual || auto;
    source = manual ? 'MANUAL' : (auto ? 'AUTO' : '');
  }

  if (best) {
    console.log(`[Backup] Selected ${source} based on timestamp.`);
    return best;
  }

  throw new Error('Aucun fichier de sauvegarde trouvé.');
}

export async function setAutoImport(enabled) {
  autoImportEnabled = !!enabled;
  await saveMeta();
}
export async function getAutoImport() {
  return autoImportEnabled;
}

export async function checkAndAutoImport(dbInstance) {
  if (!autoImportEnabled) return { imported: false, reason: 'disabled' };

  try {
    const backup = await readBackupJSON();
    if (!backup) return { imported: false, reason: 'no_data' };

    const last = backup.lastModified;
    if (last > lastImported + 1000) {
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
  backupDir = null;
}

export async function registerChange() {
  if (!isInitialized || !dbApi) await init(dbApi); // Try to init if missing
  if (!dbApi) return false; // Fail safe

  counter++;
  await dbApi.saveSettings({ backup_counter: counter });
  if (counter >= threshold) return true;
  return false;
}

export async function registerExamChange() {
  return registerChange();
}
export async function registerWaterAnalysisChange() {
  return registerChange();
}

export async function performAutoExport(getJsonCallback) {
  try {
    const json = await getJsonCallback();
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
  if (dbApi) await dbApi.saveSettings({ backup_counter: 0 });
}

export function getThreshold() {
  return counter >= threshold;
}
export async function getCurrentThreshold() {
  return threshold;
}
export async function getBackupStatus() {
  if (!isInitialized) await init(dbApi);
  return {
    counter,
    threshold,
    autoImportEnabled,
    progress: `${counter}/${threshold}`,
    shouldBackup: counter >= threshold,
    backupNeeded: counter >= threshold,
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
export function getDirHandle() {
  return backupDir;
}
export function getBackupDirName() {
  if (backupDir) return backupDir.name;
  return 'Dossier Documents (Android) ou Non sélectionné';
}
export function isDirectoryAvailable() {
  return typeof window !== 'undefined';
}
export function getCurrentStorageInfo() {
  if (backupDir)
    return { type: 'Web API', path: backupDir.name, available: true, permission: 'granted' };
  return {
    type: 'Système / Android',
    path: 'Documents/copro-watch',
    available: true,
    permission: 'unknown',
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
  registerChange,
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
  getCurrentStorageInfo,
};