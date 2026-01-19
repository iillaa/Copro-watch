import Dexie from 'dexie';
import backupService from './backup';
import { encryptString, decryptString } from './crypto'; // IMPORT ADDED

// 1. Define the Database
class CoproDatabase extends Dexie {
  constructor() {
    super('CoproWatchDB');
    this.version(1).stores({
      workers: '++id, full_name, national_id, department_id, archived',
      departments: '++id',
      workplaces: '++id',
      exams: '++id, worker_id, exam_date',
      water_analyses: '++id, sample_date',
      water_departments: '++id',
      settings: 'key', // For simple key-value storage
    });
  }
}

const dbInstance = new CoproDatabase();

// 3. Helper to trigger auto-backup check (Lazy / Non-Blocking)
// This counts EVERY change but waits for the CPU to be free to avoid lag.
function triggerBackupCheck() {
  const runBackup = async () => {
    try {
      // [UPDATED] Capture the trigger type ('TIME' or 'COUNTER')
      const triggerType = await backupService.registerChange();

      // If triggerType is not false (it's a string), we proceed
      if (triggerType) {
        console.log('[DB] Auto-backup triggered by:', triggerType);
        
        // [IMPORTANT] Pass 'triggerType' as the 2nd argument
        await backupService.performAutoExport(
          async () => await exportData(), 
          triggerType // <--- This ensures it goes to the right file
        );
      }
    } catch (e) {
      console.warn('[DB] Auto backup trigger failed', e);
    }
  };

  // ... (Keep the requestIdleCallback logic below unchanged) ...
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(runBackup, { timeout: 5000 });
  } else {
    setTimeout(runBackup, 2000);
  }
}
// 4. Export Global Function (Used by UI and Backup)
async function exportData() {
  const data = {
    // [NEW] Metadata allows us to trust the data, not the file system
    meta: {
      version: '1.1',
      exported_at: new Date().getTime(),
    },
    departments: await dbInstance.departments.toArray(),
    workplaces: await dbInstance.workplaces.toArray(),
    workers: await dbInstance.workers.toArray(),
    exams: await dbInstance.exams.toArray(),
    water_analyses: await dbInstance.water_analyses.toArray(),
    water_departments: await dbInstance.water_departments.toArray(),
  };
  return JSON.stringify(data);
}

// 5. The Public API
export const db = {
  async init() {
    const deptCount = await dbInstance.departments.count();
    if (deptCount === 0) {
      console.log('Seeding database (First Run)...');
    }
  },

  // --- SETTINGS (FIXED) ---
  async getSettings() {
    const s = await dbInstance.settings.get('app_settings');
    return s || { key: 'app_settings' };
  },

  async saveSettings(newSettings) {
    const current = (await dbInstance.settings.get('app_settings')) || { key: 'app_settings' };
    const updated = { ...current, ...newSettings };
    await dbInstance.settings.put(updated);
    return updated;
  },

  // --- ENCRYPTION (FIXED) ---
  async exportDataEncrypted(password) {
    const json = await exportData();
    return await encryptString(password, json);
  },

  async importDataEncrypted(encryptedContent, password) {
    try {
      const decryptedJson = await decryptString(password, encryptedContent);
      // Calls the plain import function below
      return await this.importData(decryptedJson);
    } catch (e) {
      console.error('Decryption failed', e);
      return false;
    }
  },

  // --- WORKERS ---
  async getWorkers() {
    return await dbInstance.workers.toArray();
  },
  async getWorker(id) {
    // Fetch only ONE worker (Fast)
    // Ensure ID is a number
    return await dbInstance.workers.get(Number(id));
  },
  async saveWorker(worker) {
    const id = await dbInstance.workers.put(worker);
    await triggerBackupCheck();
    return { ...worker, id };
  },
  async deleteWorker(id) {
    await dbInstance.workers.delete(id);
    await triggerBackupCheck();
  },

  // --- EXAMS ---
  async getExams() {
    return await dbInstance.exams.toArray();
  },
  async getExamsByWorker(workerId) {
    // Fetch only exams for this worker (Fast)
    return await dbInstance.exams.where('worker_id').equals(Number(workerId)).toArray();
  },
  async saveExam(exam) {
    const id = await dbInstance.exams.put(exam);
    await triggerBackupCheck();
    return { ...exam, id };
  },
  async deleteExam(id) {
    await dbInstance.exams.delete(id);
    await triggerBackupCheck();
  },

  // --- DEPARTMENTS ---
  async getDepartments() {
    return await dbInstance.departments.toArray();
  },
  async saveDepartment(dept) {
    const id = await dbInstance.departments.put(dept);
    await triggerBackupCheck();
    return { ...dept, id };
  },
  async deleteDepartment(id) {
    await dbInstance.departments.delete(id);
    await triggerBackupCheck();
  },

  // --- WORKPLACES ---
  async getWorkplaces() {
    return await dbInstance.workplaces.toArray();
  },
  async saveWorkplace(workplace) {
    const id = await dbInstance.workplaces.put(workplace);
    await triggerBackupCheck();
    return { ...workplace, id };
  },
  async deleteWorkplace(id) {
    await dbInstance.workplaces.delete(id);
    await triggerBackupCheck();
  },

  // --- WATER ---
  async getWaterAnalyses() {
    return await dbInstance.water_analyses.toArray();
  },
  async saveWaterAnalysis(analysis) {
    const id = await dbInstance.water_analyses.put(analysis);
    await triggerBackupCheck();
    return { ...analysis, id };
  },
  async deleteWaterAnalysis(id) {
    await dbInstance.water_analyses.delete(id);
    await triggerBackupCheck();
  },
  async getWaterDepartments() {
    return await dbInstance.water_departments.toArray();
  },
  async saveWaterDepartment(dept) {
    const id = await dbInstance.water_departments.put(dept);
    await triggerBackupCheck();
    return { ...dept, id };
  },
  async deleteWaterDepartment(id) {
    await dbInstance.water_departments.delete(id);
    await triggerBackupCheck();
  },

  // --- IMPORT / EXPORT ---
  exportData,

  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      await dbInstance.transaction('rw', dbInstance.tables, async () => {
        if (data.departments) await dbInstance.departments.bulkPut(data.departments);
        if (data.workplaces) await dbInstance.workplaces.bulkPut(data.workplaces);
        if (data.workers) await dbInstance.workers.bulkPut(data.workers);
        if (data.exams) await dbInstance.exams.bulkPut(data.exams);
        if (data.water_analyses) await dbInstance.water_analyses.bulkPut(data.water_analyses);
        if (data.water_departments)
          await dbInstance.water_departments.bulkPut(data.water_departments);
      });
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  },
};
