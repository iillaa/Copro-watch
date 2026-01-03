import Dexie from 'dexie';
import localforage from 'localforage';
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

// 2. Migration Helper (Run once)
async function migrateFromLocalForage() {
  const OLD_STORES = {
    WORKERS: 'workers',
    DEPARTMENTS: 'departments',
    WORKPLACES: 'workplaces',
    EXAMS: 'exams',
    WATER_ANALYSES: 'water_analyses',
    WATER_DEPARTMENTS: 'water_departments',
  };

  try {
    const workerCount = await dbInstance.workers.count();
    if (workerCount > 0) return;

    console.log('[DB] Checking for legacy data to migrate...');
    const workers = await localforage.getItem(OLD_STORES.WORKERS);

    if (workers && Array.isArray(workers) && workers.length > 0) {
      console.log(`[DB] Migrating ${workers.length} workers...`);
      await dbInstance.workers.bulkPut(workers);

      const departments = (await localforage.getItem(OLD_STORES.DEPARTMENTS)) || [];
      await dbInstance.departments.bulkPut(departments);

      const workplaces = (await localforage.getItem(OLD_STORES.WORKPLACES)) || [];
      await dbInstance.workplaces.bulkPut(workplaces);

      const exams = (await localforage.getItem(OLD_STORES.EXAMS)) || [];
      await dbInstance.exams.bulkPut(exams);

      const waterAnalyses = (await localforage.getItem(OLD_STORES.WATER_ANALYSES)) || [];
      await dbInstance.water_analyses.bulkPut(waterAnalyses);

      const waterDepts = (await localforage.getItem(OLD_STORES.WATER_DEPARTMENTS)) || [];
      await dbInstance.water_departments.bulkPut(waterDepts);

      console.log('[DB] Migration successful!');
    }
  } catch (e) {
    console.error('[DB] Migration Failed', e);
  }
}

// 3. Helper to trigger auto-backup check
async function triggerBackupCheck() {
  try {
    const thresholdReached = await backupService.registerChange();
    if (thresholdReached) {
      await backupService.performAutoExport(async () => await exportData());
    }
  } catch (e) {
    console.warn('[DB] Auto backup trigger failed', e);
  }
}

// 4. Export Global Function (Used by UI and Backup)
async function exportData() {
  const data = {
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
    await migrateFromLocalForage();
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
      console.error("Decryption failed", e);
      return false;
    }
  },

  // --- WORKERS ---
  async getWorkers() {
    return await dbInstance.workers.toArray();
  },
  async saveWorker(worker) {
    if (!worker.id) worker.id = Date.now();
    await dbInstance.workers.put(worker);
    await triggerBackupCheck();
    return worker;
  },
  async deleteWorker(id) {
    await dbInstance.workers.delete(id);
    await triggerBackupCheck();
  },

  async bulkDeleteWorkers(ids) {
    await dbInstance.workers.bulkDelete(ids);
    await triggerBackupCheck();
  },

  async bulkMoveWorkers(ids, departmentId) {
    await dbInstance.workers.where('id').anyOf(ids).modify({ department_id: departmentId });
    await triggerBackupCheck();
  },

  // --- EXAMS ---
  async getExams() {
    return await dbInstance.exams.toArray();
  },
  async saveExam(exam) {
    if (!exam.id) exam.id = Date.now();
    await dbInstance.exams.put(exam);
    await triggerBackupCheck();
    return exam;
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
    if (!dept.id) dept.id = Date.now();
    await dbInstance.departments.put(dept);
    return dept;
  },
  async deleteDepartment(id) {
    await dbInstance.departments.delete(id);
  },

  // --- WORKPLACES ---
  async getWorkplaces() {
    return await dbInstance.workplaces.toArray();
  },
  async saveWorkplace(workplace) {
    if (!workplace.id) workplace.id = Date.now();
    await dbInstance.workplaces.put(workplace);
    return workplace;
  },
  async deleteWorkplace(id) {
    await dbInstance.workplaces.delete(id);
  },

  // --- WATER ---
  async getWaterAnalyses() {
    return await dbInstance.water_analyses.toArray();
  },
  async saveWaterAnalysis(analysis) {
    if (!analysis.id) analysis.id = Date.now();
    await dbInstance.water_analyses.put(analysis);
    await triggerBackupCheck();
    return analysis;
  },
  async deleteWaterAnalysis(id) {
    await dbInstance.water_analyses.delete(id);
    await triggerBackupCheck();
  },
  async getWaterDepartments() {
    return await dbInstance.water_departments.toArray();
  },
  async saveWaterDepartment(dept) {
    if (!dept.id) dept.id = Date.now();
    await dbInstance.water_departments.put(dept);
    return dept;
  },
  async deleteWaterDepartment(id) {
    await dbInstance.water_departments.delete(id);
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
