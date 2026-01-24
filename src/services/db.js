import Dexie from 'dexie';
import backupService from './backup';
import { encryptString, decryptString } from './crypto'; // IMPORT ADDED

// 1. Define the Database
class CoproDatabase extends Dexie {
  constructor() {
    super('CoproWatchDB');
    
    // KEEP Version 1 (For history)
    this.version(1).stores({
      workers: '++id, full_name, national_id, department_id, archived',
      departments: '++id',
      workplaces: '++id',
      exams: '++id, worker_id, exam_date',
      water_analyses: '++id, sample_date',
      water_departments: '++id',
      settings: 'key',
    });

    // [ADD THIS] Version 2: Updates the database structure
    this.version(2).stores({
      workers: '++id, full_name, national_id, department_id, archived',
      departments: '++id',
      workplaces: '++id',
      exams: '++id, worker_id, exam_date',
      // 👇 ADDED 'department_id' and 'structure_id' here
      water_analyses: '++id, sample_date, department_id, structure_id',
      water_departments: '++id',
      settings: 'key',
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
  // 3. Fix for Workers
  async deleteWorker(id) {
    const numId = Number(id); // [CRITICAL] Convert once, use everywhere

    // Delete Orphans
    await dbInstance.exams.where('worker_id').equals(numId).delete();
    
    // Delete Worker
    await dbInstance.workers.delete(numId);
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
  // 2. Fix for HR Services (Settings > Services RH)
  async deleteDepartment(id) {
    const numId = Number(id); // Force Number

    // A. PRIMARY: Delete Workers (This is the most important part for HR)
    await dbInstance.workers.where('department_id').equals(numId).delete();

    // B. SECONDARY: Safety Net for Water (Prevents errors if any test was linked)
    await dbInstance.water_analyses.where('department_id').equals(numId).delete();

    // C. FINAL: Delete the Service itself
    await dbInstance.departments.delete(numId);
    
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
 // 1. Fix for Water Services
  async deleteWaterDepartment(id) {
    const numId = Number(id); // [CRITICAL] Convert once, use everywhere
    
    // Delete Orphans (Uses numId)
    await dbInstance.water_analyses.where('structure_id').equals(numId).delete();
    
    // Delete Service (Uses numId)
    await dbInstance.water_departments.delete(numId); 
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
  // [NEW] JANITOR FUNCTION
  async cleanupOrphans() {
    console.log('🧹 Starting Cleanup...');
    let deletedExams = 0;
    let deletedWater = 0;
    
    // 1. Clean Exams (Ghost Workers)
    const workerIds = new Set((await dbInstance.workers.toArray()).map(w => w.id));
    const allExams = await dbInstance.exams.toArray();
    const orphanExamIds = allExams
      .filter(e => !workerIds.has(e.worker_id))
      .map(e => e.id);
    
    if (orphanExamIds.length > 0) {
      await dbInstance.exams.bulkDelete(orphanExamIds);
      deletedExams = orphanExamIds.length;
    }

    // 2. Clean Water Logs (Ghost Locations)
    const deptIds = new Set((await dbInstance.departments.toArray()).map(d => d.id));
    const waterDeptIds = new Set((await dbInstance.water_departments.toArray()).map(d => d.id));
    const allWater = await dbInstance.water_analyses.toArray();
    
    const orphanWaterIds = allWater.filter(log => {
      // Rule 1: If it has a department_id, that ID must exist
      if (log.department_id && !deptIds.has(log.department_id)) return true;
      // Rule 2: If it has a structure_id, that ID must exist
      if (log.structure_id && !waterDeptIds.has(log.structure_id)) return true;
      return false;
    }).map(l => l.id);

    if (orphanWaterIds.length > 0) {
      await dbInstance.water_analyses.bulkDelete(orphanWaterIds);
      deletedWater = orphanWaterIds.length;
    }

    await triggerBackupCheck();
    return { exams: deletedExams, water: deletedWater };
  },
};
