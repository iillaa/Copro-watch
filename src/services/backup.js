// src/services/backup.js
// [FIX] REMOVED: import { db } from './db';

const BACKUP_STORE = 'backup_settings';

// --- FILES ---
const MANUAL_BACKUP_FILE_NAME = 'backup-manuel.json';
const AUTO_BACKUP_COUNTER_FILE = 'backup-auto-compteur.json'; // [NEW]
const AUTO_BACKUP_TIME_FILE = 'backup-auto-temps.json'; // [NEW]

// --- CONSTANTS ---
const DEFAULT_THRESHOLD = 10;
const DEFAULT_TIME_THRESHOLD = 4 * 60 * 60 * 1000; // 4 Hours

// --- STATE ---
let counter = 0;
let threshold = DEFAULT_THRESHOLD;
let timeThreshold = DEFAULT_TIME_THRESHOLD;
let lastAutoBackup = 0;

let autoImportEnabled = false;
let lastImported = 0;
let backupDir = null;
let isInitialized = false;

let dbApi = null;

// --- INITIALIZATION ---
export async function init(providedDb) {
  if (providedDb) dbApi = providedDb;

  if (!dbApi) {
    console.warn('[Backup] Init called without DB instance');
    return;
  }

  try {
    const settings = await dbApi.getSettings();

    threshold = settings.backup_threshold || DEFAULT_THRESHOLD;
    counter = settings.backup_counter || 0;
    timeThreshold = settings.backup_timeThreshold || DEFAULT_TIME_THRESHOLD;

    // Default to NOW if missing (fresh install fix)
    lastAutoBackup = settings.backup_lastAutoBackup || Date.now();

    autoImportEnabled = !!settings.backup_autoImport;
    lastImported = settings.backup_lastImported || 0;

    isInitialized = true;
  } catch (e) {
    console.warn('[Backup] Settings load error', e);
    isInitialized = true;
    lastAutoBackup = Date.now();
  }
}

async function saveMeta() {
  if (dbApi) {
    await dbApi.saveSettings({
      backup_threshold: threshold,
      backup_autoImport: autoImportEnabled,
      backup_lastImported: lastImported,
      backup_timeThreshold: timeThreshold,
      backup_lastAutoBackup: lastAutoBackup,
    });
  }
}

// --- DIRECTORY SELECTION ---
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

// --- CORE: SAVE JSON ---
export async function saveBackupJSON(jsonString, filename) {
  const { Capacitor } = await import('@capacitor/core');

  try {
    console.log(`[Backup] Saving to ${filename}...`);

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

// --- CORE: READ FILE ---
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
      return { text: contents.data, lastModified: stat.mtime, name: filename };
    } catch (e) {
      return null;
    }
  } else if (backupDir) {
    try {
      const handle = await backupDir.getFileHandle(filename);
      const file = await handle.getFile();
      const text = await file.text();
      return { text, lastModified: file.lastModified, name: filename };
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getRealDate(fileObj) {
  if (!fileObj || !fileObj.text) return 0;
  try {
    const data = JSON.parse(fileObj.text);
    if (data.meta && data.meta.exported_at) {
      return data.meta.exported_at;
    }
  } catch (e) {
    return 0;
  }
  return fileObj.lastModified;
}

// --- SMART READ (COMPARE 3 FILES) ---
export async function readBackupJSON() {
  // 1. Load candidates
  const manual = await getFileContent(MANUAL_BACKUP_FILE_NAME);
  const autoCounter = await getFileContent(AUTO_BACKUP_COUNTER_FILE);
  const autoTime = await getFileContent(AUTO_BACKUP_TIME_FILE);

  // 2. Get Dates
  const dManual = getRealDate(manual);
  const dCounter = getRealDate(autoCounter);
  const dTime = getRealDate(autoTime);

  console.log('[Backup] Dates Found:', {
    manual: new Date(dManual).toLocaleString(),
    counter: new Date(dCounter).toLocaleString(),
    time: new Date(dTime).toLocaleString(),
  });

  // 3. Find Winner
  let best = null;
  let maxDate = 0;

  if (manual && dManual > maxDate) {
    best = manual;
    maxDate = dManual;
  }
  if (autoCounter && dCounter > maxDate) {
    best = autoCounter;
    maxDate = dCounter;
  }
  if (autoTime && dTime > maxDate) {
    best = autoTime;
    maxDate = dTime;
  }

  if (best) {
    console.log(`[Backup] Winner: ${best.name} (${new Date(maxDate).toLocaleString()})`);
    return best;
  }

  throw new Error('Aucun fichier de sauvegarde trouvé.');
}

// --- LOGIC TRIGGERS ---
export async function registerChange() {
  if (!isInitialized || !dbApi) await init(dbApi);
  if (!dbApi) return false;

  counter++;

  // 1. Calc Time
  const now = Date.now();
  const timeElapsed = now - lastAutoBackup;
  const isTimeDue = timeElapsed >= timeThreshold;
  const isCounterDue = counter >= threshold;

  // 2. Save Progress
  await dbApi.saveSettings({ backup_counter: counter });

  // 3. Trigger Logic (Prioritize Time, then Counter)
  if (isTimeDue) {
    console.log('[Backup] Time Triggered!');
    // Pass 'TIME' to use the specific file
    return 'TIME';
  }

  if (isCounterDue) {
    console.log('[Backup] Counter Triggered!');
    // Pass 'COUNTER' to use the specific file
    return 'COUNTER';
  }

  return false;
}

// Wrappers
export async function registerExamChange() {
  return registerChange();
}
export async function registerWaterAnalysisChange() {
  return registerChange();
}

// [UPDATED] Export now takes a specific filename based on type
export async function performAutoExport(getJsonCallback, type = 'COUNTER') {
  try {
    const json = await getJsonCallback();

    // Choose file based on trigger type
    let targetFile = AUTO_BACKUP_COUNTER_FILE;
    if (type === 'TIME') targetFile = AUTO_BACKUP_TIME_FILE;

    const success = await saveBackupJSON(json, targetFile);

    if (success) {
      await resetCounter(); // Resets everything on success
      return true;
    }
    return false;
  } catch (e) {
    console.error('[Backup] Auto export failed:', e);
    return false;
  }
}

// Reset both Clocks
export async function resetCounter() {
  counter = 0;
  lastAutoBackup = Date.now();
  if (dbApi) {
    await dbApi.saveSettings({
      backup_counter: 0,
      backup_lastAutoBackup: lastAutoBackup,
    });
  }
}

// --- IMPORT LOGIC ---
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
    // readBackupJSON now automatically finds the newest of the 3 files
    const backup = await readBackupJSON();
    if (!backup) return { imported: false, reason: 'no_data' };

    const realDate = getRealDate(backup);
    if (realDate > lastImported + 1000) {
      console.log(`[Backup] Newer backup found (${backup.name}). Importing...`);
      const ok = await dbInstance.importData(backup.text);
      if (ok) {
        lastImported = realDate;
        await saveMeta();
        return { imported: true, source: backup.name };
      }
    }
    return { imported: false, reason: 'not_newer' };
  } catch (e) {
    return { imported: false, error: e.message };
  }
}

// --- STATUS & UTILS ---
export async function getBackupStatus() {
  if (!isInitialized) await init(dbApi);

  const now = Date.now();

  // Safety fix
  if (!lastAutoBackup || lastAutoBackup === 0) lastAutoBackup = now;

  const timeElapsed = Math.max(0, now - lastAutoBackup);
  const isTimeDue = timeElapsed >= timeThreshold;
  const isCounterDue = counter >= threshold;

  return {
    counter,
    threshold,
    timeThreshold,
    lastAutoBackup,
    autoImportEnabled,
    progress: `Modifs: ${counter}/${threshold} | Temps: ${(timeElapsed / 60000).toFixed(0)}/${(
      timeThreshold / 60000
    ).toFixed(0)} min`,
    shouldBackup: isCounterDue || isTimeDue,
    backupNeeded: isCounterDue || isTimeDue,
  };
}

// Standard exports
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
export async function clearDirectory() {
  backupDir = null;
}

export function getThreshold() {
  // Returns true if counter limit is reached
  return counter >= threshold;
}

export async function getCurrentThreshold() {
  return threshold;
}

// [NEW] Helper for the Time Limit (Optional but useful for UI)
export function getTimeThreshold() {
  return timeThreshold;
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
