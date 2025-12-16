import localforage from 'localforage';


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
    
    // Load counter from localforage
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
  // For Android apps, we'll simulate directory selection by checking storage availability
  if (typeof window !== 'undefined' && window.Capacitor) {
    try {
      // Check if running on Capacitor
      const isNative = window.Capacitor.isNativePlatform();
      if (isNative) {
        // In native Android, we'll use app's internal storage
        // This simulates directory selection for Android
        return {
          type: 'android',
          path: 'Documents/copro-watch',
          name: 'App Documents'
        };
      }
    } catch (e) {
      console.warn('Capacitor check failed', e);
    }
  }
  
  // Web fallback - use File System Access API if available
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      // Store the directory handle for later use
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
      throw new Error('Directory selection was canceled');
    }
  } else {
    throw new Error('Directory picker not supported in this browser. Use export/import instead.');
  }
}


export async function saveBackupJSON(jsonString, filename = BACKUP_FILE_NAME) {
  try {
    console.log('Starting backup save...', filename);
    
    // For Android/Capacitor
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
      try {
        console.log('Attempting Android backup...');
        const { Filesystem } = window.Capacitor.Plugins;
        
        // Create directory structure in app's Documents folder
        await Filesystem.mkdir({
          path: 'copro-watch',
          directory: 'documents',
          recursive: true
        });
        
        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: jsonString,
          directory: 'documents',
          encoding: 'utf8'
        });
        
        console.log('Android backup successful');
        return true;
      } catch (e) {
        console.warn('Native backup failed, falling back to download', e);
        // Fallback to download
      }
    }
    
    // Web implementation or fallback
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        console.log('Attempting web directory backup...');
        // Try to use File System Access API if we have a directory handle stored
        const meta = await localforage.getItem(BACKUP_STORE);
        if (meta && meta.dirHandle) {
          const dirHandle = meta.dirHandle;
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          console.log('Web directory backup successful');
          return true;
        }
      } catch (e) {
        console.warn('Web directory backup failed', e);
      }
    }
    
    // Universal fallback to download
    console.log('Using download fallback...');
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log('Download backup successful');
    return true;
    
  } catch (e) {
    console.error('Backup failed completely', e);
    throw new Error('Backup failed: ' + e.message);
  }
}


export async function readBackupJSON(filename = BACKUP_FILE_NAME) {
  try {
    console.log('Reading backup file:', filename);
    
    // For Android/Capacitor
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
      try {
        console.log('Attempting Android backup read...');
        const { Filesystem } = window.Capacitor.Plugins;
        
        const contents = await Filesystem.readFile({
          path: `copro-watch/${filename}`,
          directory: 'documents',
          encoding: 'utf8'
        });
        
        const stat = await Filesystem.stat({
          path: `copro-watch/${filename}`,
          directory: 'documents'
        });
        
        console.log('Android backup read successful');
        return {
          text: contents.data,
          lastModified: stat.mtime || Date.now()
        };
      } catch (e) {
        console.warn('Native backup read failed', e);
      }
    }
    
    // Web implementation
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        console.log('Attempting web directory backup read...');
        const meta = await localforage.getItem(BACKUP_STORE);
        if (meta && meta.dirHandle) {
          const dirHandle = meta.dirHandle;
          const fileHandle = await dirHandle.getFileHandle(filename);
          const file = await fileHandle.getFile();
          const text = await file.text();
          console.log('Web directory backup read successful');
          return { text, lastModified: file.lastModified };
        } else {
          console.warn('No directory handle found');
        }
      } catch (e) {
        console.warn('Web directory backup read failed', e);
      }
    }
    
    console.log('No backup file found or read failed');
    return null;
  } catch (e) {
    console.warn('No backup file to read or read failed', e);
    return null;
  }
}

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
  } catch (e) {
    console.warn('Auto import failed', e);
    return { imported: false };
  }
  
  return { imported: false };
}

export async function clearDirectory() {
  // Clear stored directory handle and reset to defaults
  const meta = await localforage.getItem(BACKUP_STORE) || {};
  delete meta.dirHandle;
  await localforage.setItem(BACKUP_STORE, meta);
}



export function getThreshold() { 
  return counter >= threshold;
}


export async function getCurrentThreshold() {
  return threshold;
}

export async function getBackupStatus() {
  try {
    const savedCounter = await localforage.getItem('backup_counter');
    counter = savedCounter || 0;
    
    return {
      counter: counter,
      threshold: threshold,
      autoImportEnabled: autoImportEnabled,
      progress: `${counter}/${threshold}`,
      shouldBackup: counter >= threshold,
      backupNeeded: counter >= threshold
    };
  } catch (e) {
    console.warn('Failed to get backup status', e);
    return {
      counter: 0,
      threshold: threshold,
      autoImportEnabled: autoImportEnabled,
      progress: `0/${threshold}`,
      shouldBackup: false,
      backupNeeded: false
    };
  }
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
  
  if (counter >= threshold) {
    return true; // threshold reached, trigger backup
  }
  return false; // threshold not reached yet
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


export function getDirHandle() { 
  return (window.Capacitor && window.Capacitor.isNativePlatform()) ? backupDir : backupDir; 
}

export function getBackupDirName() { 
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    return 'Documents/Copro-Watch';
  }
  return backupDir ? (backupDir.name || 'Selected Directory') : null; 
}

export function isDirectoryAvailable() {
  return (window.Capacitor && window.Capacitor.isNativePlatform()) || ('showDirectoryPicker' in window);
}

export function getCurrentStorageInfo() {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    return {
      type: 'Android',
      path: 'Documents/copro-watch',
      available: true,
      permission: 'granted'
    };
  } else if ('showDirectoryPicker' in window) {
    return {
      type: 'File System Access API',
      path: backupDir?.name || 'Not selected',
      available: !!backupDir,
      permission: backupDir ? 'granted' : 'not selected'
    };
  } else {
    return {
      type: 'Download only',
      path: 'Downloads folder',
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
