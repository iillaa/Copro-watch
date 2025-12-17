
import localforage from 'localforage';

// Import Capacitor plugins properly for modern versions
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';



const BACKUP_STORE = 'backup_settings';
const DEFAULT_THRESHOLD = 10;

// Function to generate unique backup filename with timestamp
const generateBackupFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `copro-watch-backup-${timestamp}.json`;
};

const DEFAULT_BACKUP_NAME = 'backup-auto.json';

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
  // Import Capacitor if needed
  const { Capacitor } = await import('@capacitor/core');
  
  // For Android apps, we'll use the app's Documents directory
  if (Capacitor.isNativePlatform()) {
    // In native Android, we'll use app's Documents directory
    console.log('Android platform detected, using Documents/copro-watch');
    return {
      type: 'android',
      path: 'Documents/copro-watch',
      name: 'App Documents'
    };
  }
  
  // Web fallback - use File System Access API if available
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      console.log('Opening directory picker for web...');
      const dirHandle = await window.showDirectoryPicker();
      // Store the directory handle for later use
      const meta = await localforage.getItem(BACKUP_STORE) || {};
      meta.dirHandle = dirHandle;
      await localforage.setItem(BACKUP_STORE, meta);
      
      console.log('Directory selected:', dirHandle.name);
      return {
        type: 'web',
        handle: dirHandle,
        name: dirHandle.name
      };
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('Directory selection was canceled by user');
        throw new Error('Directory selection was canceled');
      } else {
        console.error('Directory selection failed:', e);
        throw new Error('Directory selection failed: ' + e.message);
      }
    }
  } else {
    throw new Error('Directory picker not supported in this browser. Use export/import instead.');
  }
}





export async function saveBackupJSON(jsonString, filename = null) {
  // Generate unique filename if not provided (for manual backups)
  const backupFilename = filename || generateBackupFilename();

  try {
    console.log('Starting backup save...', backupFilename);
    
    // Import Capacitor if needed
    const { Capacitor } = await import('@capacitor/core');
    
    // For Android/Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('Attempting Android backup...');
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        

        // Create directory structure in app's Documents folder
        await Filesystem.mkdir({
          path: 'copro-watch',
          directory: Directory.Documents,
          recursive: true
        });
        
        await Filesystem.writeFile({
          path: `copro-watch/${backupFilename}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        
        console.log('Android backup successful, size:', jsonString.length, 'bytes');
        return true;
      } catch (e) {
        console.warn('Native backup failed, falling back to download:', e.message);
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
          const fileHandle = await dirHandle.getFileHandle(backupFilename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          console.log('Web directory backup successful, size:', jsonString.length, 'bytes');
          return true;
        }
      } catch (e) {
        console.warn('Web directory backup failed:', e.message);
      }
    }
    
    // Universal fallback to download
    console.log('Using download fallback...');
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log('Download backup successful, size:', jsonString.length, 'bytes');
    return true;
    
  } catch (e) {
    console.error('Backup failed completely:', e.message);
    throw new Error('Backup failed: ' + e.message);
  }
}





// Function to list available backup files
export async function listBackupFiles() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    
    if (Capacitor.isNativePlatform()) {
      // Android - list files in copro-watch directory
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const result = await Filesystem.readdir({
          path: 'copro-watch',
          directory: Directory.Documents
        });
        
        // Filter only JSON backup files
        const backupFiles = result.files.filter(file => 
          file.name.startsWith('copro-watch-backup-') && file.name.endsWith('.json')
        );
        
        return backupFiles.map(file => ({
          name: file.name,
          path: `copro-watch/${file.name}`,
          type: 'android'
        }));
      } catch (e) {
        console.warn('Failed to list Android backup files:', e);
        return [];
      }
    }
    
    // Web - list files using File System Access API
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const meta = await localforage.getItem(BACKUP_STORE);
        if (meta && meta.dirHandle) {
          const files = [];
          for await (const [name, handle] of meta.dirHandle.entries()) {
            if (name.startsWith('copro-watch-backup-') && name.endsWith('.json')) {
              files.push({
                name,
                type: 'web',
                handle
              });
            }
          }
          return files;
        }
      } catch (e) {
        console.warn('Failed to list web backup files:', e);
      }
    }
    
    return [];
  } catch (e) {
    console.error('Failed to list backup files:', e);
    return [];
  }
}

export async function readBackupJSON(filename) {
  // If no filename provided, try to find the latest backup file
  if (!filename) {
    const files = await listBackupFiles();
    if (files.length === 0) {
      throw new Error('No backup files found');
    }
    // Sort by name (timestamp) and get the latest
    files.sort((a, b) => b.name.localeCompare(a.name));
    filename = files[0].name;
  }
  try {
    console.log('Reading backup file:', filename);
    
    // Import Capacitor if needed
    const { Capacitor } = await import('@capacitor/core');
    
    // For Android/Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('Attempting Android backup read...');
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        
        const contents = await Filesystem.readFile({
          path: `copro-watch/${filename}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        
        const stat = await Filesystem.stat({
          path: `copro-watch/${filename}`,
          directory: Directory.Documents
        });
        
        console.log('Android backup read successful, size:', contents.data.length, 'bytes');
        return {
          text: contents.data,
          lastModified: stat.mtime || Date.now()
        };
      } catch (e) {
        console.warn('Native backup read failed:', e.message);
        throw e; // Re-throw to handle in upper level
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
          console.log('Web directory backup read successful, size:', text.length, 'bytes');
          return { text, lastModified: file.lastModified };
        } else {
          console.warn('No directory handle found');
          throw new Error('No directory handle available');
        }
      } catch (e) {
        console.warn('Web directory backup read failed:', e.message);
        throw e; // Re-throw to handle in upper level
      }
    }
    
    console.log('No backup method available for this platform');
    throw new Error('No backup method available for this platform');
  } catch (e) {
    console.error('Backup read failed completely:', e.message);
    throw e; // Re-throw to let caller handle the error
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
  if (!autoImportEnabled) {
    console.log('Auto import is disabled, skipping check');
    return { imported: false };
  }
  
  console.log('Checking for auto import...');
  
  try {
    const backup = await readBackupJSON();
    if (!backup) {
      console.log('No backup file found for auto import');
      return { imported: false };
    }
    
    const last = backup.lastModified;
    console.log('Backup file last modified:', last, 'Last imported:', lastImported);
    
    if (last > lastImported) {
      console.log('Newer backup found, attempting import...');
      const ok = await dbInstance.importData(backup.text);
      if (ok) {
        lastImported = last;
        await saveMeta();
        console.log('Auto import successful');
        return { imported: true };
      } else {
        console.error('Auto import failed - importData returned false');
      }
    } else {
      console.log('Backup file is not newer than last import');
    }
  } catch (e) {
    console.error('Auto import failed with error:', e);
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
  console.log(`Exam change registered. Counter: ${counter}/${threshold}`);
  
  if (counter >= threshold) {
    console.log('Threshold reached for exam change - backup will trigger');
    return true; // threshold reached, trigger backup
  }
  return false; // threshold not reached yet
}

export async function registerWaterAnalysisChange() {
  counter++;
  await localforage.setItem('backup_counter', counter);
  console.log(`Water analysis change registered. Counter: ${counter}/${threshold}`);
  
  if (counter >= threshold) {
    console.log('Threshold reached for water analysis change - backup will trigger');
    return true; // threshold reached, trigger backup
  }
  return false; // threshold not reached yet
}


export async function resetCounter() { 
  counter = 0; 
  await localforage.setItem('backup_counter', 0); 
  console.log('Backup counter reset to 0');
}


export async function performAutoExport(getJsonCallback) {
  try {
    const json = await getJsonCallback();
    const success = await saveBackupJSON(json); // Will generate unique filename automatically
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
  return Capacitor.isNativePlatform() ? backupDir : backupDir; 
}

export function getBackupDirName() { 
  if (Capacitor.isNativePlatform()) {
    return 'Documents/Copro-Watch';
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
