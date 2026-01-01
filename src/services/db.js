import Dexie from 'dexie';
import localforage from 'localforage'; // Keep this for migration only
import backupService from './backup';

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
      settings: 'key' // For simple key-value storage
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
    // Check if we already migrated (by checking if Dexie is empty but LocalForage is not)
    const workerCount = await dbInstance.workers.count();
    if (workerCount > 0) return; // Already data in Dexie, skip migration.

    console.log('[DB] Checking for legacy data to migrate...');
    
    // Load old data
    const workers = await localforage.getItem(OLD_STORES.WORKERS);
    
    if (workers && Array.isArray(workers) && workers.length > 0) {
      console.log(`[DB] Migrating ${workers.length} workers...`);
      
      // Bulk Add to Dexie
      await dbInstance.workers.bulkPut(workers);
      
      const departments = await localforage.getItem(OLD_STORES.DEPARTMENTS) || [];
      await dbInstance.departments.bulkPut(departments);
      
      const workplaces = await localforage.getItem(OLD_STORES.WORKPLACES) || [];
      await dbInstance.workplaces.bulkPut(workplaces);
      
      const exams = await localforage.getItem(OLD_STORES.EXAMS) || [];
      await dbInstance.exams.bulkPut(exams);
      
      const waterAnalyses = await localforage.getItem(OLD_STORES.WATER_ANALYSES) || [];
      await dbInstance.water_analyses.bulkPut(waterAnalyses);
      
      const waterDepts = await localforage.getItem(OLD_STORES.WATER_DEPARTMENTS) || [];
      await dbInstance.water_departments.bulkPut(waterDepts);

      console.log('[DB] Migration successful! clearing legacy storage.');
      // Optional: clear localforage to free space, or keep as safety backup
      // await localforage.clear(); 
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
      // NOTE: We change the export function slightly for backup
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

// 5. The Public API (Compatible with your existing components)
export const db = {
  async init() {
    // Run migration check on startup
    await migrateFromLocalForage();
    
    // Seeding Logic (Only if truly empty after migration)
    const deptCount = await dbInstance.departments.count();
    if (deptCount === 0) {
      console.log('Seeding database (First Run)...');
      // Add your seed data here if needed, similar to old file
      // await dbInstance.departments.bulkAdd(SEED_DATA.departments);
    }
  },

  // --- WORKERS ---
  async getWorkers() {
    return await dbInstance.workers.toArray();
  },
  async saveWorker(worker) {
    if (!worker.id) worker.id = Date.now();
    await dbInstance.workers.put(worker); // .put updates if exists, adds if not
    await triggerBackupCheck();
    return worker;
  },
  async deleteWorker(id) {
    await dbInstance.workers.delete(id);
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

 // --- WORKPLACES (Lieux de Travail)

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
  exportData, // Exposed for WorkerList.jsx

  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      await dbInstance.transaction('rw', dbInstance.tables, async () => {
        if (data.departments) await dbInstance.departments.bulkPut(data.departments);
        if (data.workplaces) await dbInstance.workplaces.bulkPut(data.workplaces);
        if (data.workers) await dbInstance.workers.bulkPut(data.workers);
        if (data.exams) await dbInstance.exams.bulkPut(data.exams);
        if (data.water_analyses) await dbInstance.water_analyses.bulkPut(data.water_analyses);
        if (data.water_departments) await dbInstance.water_departments.bulkPut(data.water_departments);
      });
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
};