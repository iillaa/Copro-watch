import localforage from 'localforage';
import { encryptString, decryptString } from './crypto';
import backupService from './backup';

// Configure localforage
localforage.config({
  name: 'MedicalWorkerManager',
  storeName: 'medical_db',
  description: 'Offline database for medical worker management'
});

const STORES = {
  DEPARTMENTS: 'departments',
  WORKPLACES: 'workplaces',
  WORKERS: 'workers',
  EXAMS: 'exams',
  WATER_ANALYSES: 'water_analyses',
  WATER_DEPARTMENTS: 'water_departments',
  SETTINGS: 'settings'
};

// Seed Data (unchanged)
const SEED_DATA = {
  departments: [
    { id: 1, name: "SWAG" },
    { id: 2, name: "BMPJ" },
    { id: 3, name: "SD INGHAR" },
    { id: 4, name: "BPFA" },
    { id: 5, name: "SWASS" },
    { id: 6, name: "AUTRES" }
  ],
  waterDepartments: [
    { id: 1, name: "SWAG" },
    { id: 2, name: "BMPJ" },
    { id: 3, name: "SD INGHAR" },
    { id: 4, name: "BPFA" },
    { id: 5, name: "SWASS" },
    { id: 6, name: "AUTRES" }
  ],
  workplaces: [
    { id: 1, name: "Cuisine" },
    { id: 2, name: "Foyer" },
    { id: 3, name: "Autres" }
  ],
  workers: [
    { id: 1, full_name: "Ahmed Benali", national_id: "1001", phone: "0661123456", workplace_id: 1, department_id: 1, job_role: "Cuisinier", start_date: "2023-01-15", notes: "Allergie aux arachides", last_exam_date: "2025-02-01", next_exam_due: "2025-08-01" },
    { id: 2, full_name: "Sarah Idrissi", national_id: "1002", phone: "0661123457", workplace_id: 1, department_id: 1, job_role: "Serveuse", start_date: "2023-03-10", notes: "", last_exam_date: "2024-09-01", next_exam_due: "2025-03-01" }, 
    { id: 3, full_name: "Karim Tazi", national_id: "1003", phone: "0661123458", workplace_id: 2, department_id: 4, job_role: "Plongeur", start_date: "2022-11-05", notes: "", last_exam_date: "2024-05-15", next_exam_due: "2024-11-15" }, 
    { id: 4, full_name: "Fatima Zahra", national_id: "1004", phone: "0661123459", workplace_id: 3, department_id: 3, job_role: "Entretien", start_date: "2024-01-20", notes: "", last_exam_date: null, next_exam_due: "2024-01-20" }, 
    { id: 5, full_name: "Youssef Amrani", national_id: "1005", phone: "0661123460", workplace_id: 1, department_id: 1, job_role: "Chef de Partie", start_date: "2021-06-01", notes: "", last_exam_date: "2025-01-10", next_exam_due: "2025-07-10" }
  ]
};

// Helper to trigger auto-backup check
async function triggerBackupCheck() {
  try {
    // We use a generic 'registerChange' now
    const thresholdReached = await backupService.registerChange();
    if (thresholdReached) {
      await backupService.performAutoExport(async () => await db.exportData());
    }
  } catch (e) {
    console.warn('[DB] Auto backup trigger failed', e);
  }
}

export const db = {
  async getAll(storeKey) {
    const data = await localforage.getItem(storeKey);
    return data || [];
  },

  async saveAll(storeKey, data) {
    return await localforage.setItem(storeKey, data);
  },

  async init() {
    const depts = await this.getAll(STORES.DEPARTMENTS);
    const hasSwass = depts.find(d => d.name === 'SWASS');
    
    const waterDepts = await this.getAll(STORES.WATER_DEPARTMENTS);
    const hasWaterSwass = waterDepts.find(d => d.name === 'SWASS');
    
    if (depts.length === 0 || !hasSwass) {
      console.log("Seeding/Updating database...");
      await this.saveAll(STORES.DEPARTMENTS, SEED_DATA.departments);
      await this.saveAll(STORES.WORKPLACES, SEED_DATA.workplaces);
      
      const workers = await this.getAll(STORES.WORKERS);
      if (workers.length === 0) {
        await this.saveAll(STORES.WORKERS, SEED_DATA.workers);
        await this.saveAll(STORES.EXAMS, []);
      }
    }
    
    if (waterDepts.length === 0 || !hasWaterSwass) {
      console.log("Seeding water departments database...");
      await this.saveAll(STORES.WATER_DEPARTMENTS, SEED_DATA.waterDepartments);
    }
  },

  // --- WORKERS (Updated with Backup Trigger) ---
  async getWorkers() { return this.getAll(STORES.WORKERS); },
  async saveWorker(worker) {
    const workers = await this.getWorkers();
    const index = workers.findIndex(w => w.id === worker.id);
    if (index >= 0) {
      workers[index] = worker;
    } else {
      worker.id = Date.now();
      workers.push(worker);
    }
    await this.saveAll(STORES.WORKERS, workers);
    await triggerBackupCheck(); // <--- ADDED
    return worker;
  },
  async deleteWorker(id) {
    const workers = await this.getWorkers();
    const newWorkers = workers.filter(w => w.id !== id);
    await this.saveAll(STORES.WORKERS, newWorkers);
    await triggerBackupCheck(); // <--- ADDED
  },

  // --- EXAMS (Already had triggers, kept them) ---
  async getExams() { return this.getAll(STORES.EXAMS); },
  async saveExam(exam) {
    const exams = await this.getExams();
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
      exams[index] = exam;
    } else {
      exam.id = exam.id || Date.now();
      exams.push(exam);
    }
    await this.saveAll(STORES.EXAMS, exams);
    await triggerBackupCheck();
    return exam;
  },
  async deleteExam(id) {
    const exams = await this.getExams();
    const newExams = exams.filter(e => e.id !== id);
    await this.saveAll(STORES.EXAMS, newExams);
    await triggerBackupCheck();
  },

  // --- WATER ANALYSES (Already had triggers, kept them) ---
  async getWaterAnalyses() { return this.getAll(STORES.WATER_ANALYSES); },
  async saveWaterAnalysis(analysis) {
    const analyses = await this.getWaterAnalyses();
    const index = analyses.findIndex(a => a.id === analysis.id);
    if (index >= 0) {
      analyses[index] = analysis;
    } else {
      analysis.id = analysis.id || Date.now();
      analysis.created_at = analysis.created_at || new Date().toISOString();
      analyses.push(analysis);
    }
    await this.saveAll(STORES.WATER_ANALYSES, analyses);
    await triggerBackupCheck();
    return analysis;
  },
  async deleteWaterAnalysis(id) {
    const analyses = await this.getWaterAnalyses();
    const newAnalyses = analyses.filter(a => a.id !== id);
    await this.saveAll(STORES.WATER_ANALYSES, newAnalyses);
    await triggerBackupCheck();
  },

  // --- DEPARTMENTS (Updated with Backup Trigger) ---
  async saveDepartment(department) {
    const departments = await this.getDepartments();
    const index = departments.findIndex(d => d.id === department.id);
    if (index >= 0) {
      departments[index] = department;
    } else {
      department.id = department.id || Date.now();
      departments.push(department);
    }
    await this.saveAll(STORES.DEPARTMENTS, departments);
    await triggerBackupCheck(); // <--- ADDED
    return department;
  },
  async deleteDepartment(id) {
    const departments = await this.getDepartments();
    const newDepartments = departments.filter(d => d.id !== id);
    await this.saveAll(STORES.DEPARTMENTS, newDepartments);
    await triggerBackupCheck(); // <--- ADDED
  },

  // Settings
  async getSettings() {
      const settings = await this.getAll(STORES.SETTINGS);
      return settings || {}; 
  },
  async saveSettings(settings) {
      return await this.saveAll(STORES.SETTINGS, settings);
  },

  // Getters
  async getDepartments() { return this.getAll(STORES.DEPARTMENTS); },
  async getWorkplaces() { return this.getAll(STORES.WORKPLACES); },
  async getWaterDepartments() { return this.getAll(STORES.WATER_DEPARTMENTS); },
  
  async saveWaterDepartment(waterDepartment) {
    const waterDepartments = await this.getWaterDepartments();
    const index = waterDepartments.findIndex(d => d.id === waterDepartment.id);
    if (index >= 0) {
      waterDepartments[index] = waterDepartment;
    } else {
      waterDepartment.id = waterDepartment.id || Date.now();
      waterDepartments.push(waterDepartment);
    }
    await this.saveAll(STORES.WATER_DEPARTMENTS, waterDepartments);
    await triggerBackupCheck(); // <--- ADDED
    return waterDepartment;
  },
  async deleteWaterDepartment(id) {
    const waterDepartments = await this.getWaterDepartments();
    const newWaterDepartments = waterDepartments.filter(d => d.id !== id);
    await this.saveAll(STORES.WATER_DEPARTMENTS, newWaterDepartments);
    await triggerBackupCheck(); // <--- ADDED
  },

  // Import/Export
  async exportData() {
    const data = {
      departments: await this.getDepartments(),
      workplaces: await this.getWorkplaces(),
      workers: await this.getWorkers(),
      exams: await this.getExams(),
      water_analyses: await this.getWaterAnalyses(),
      water_departments: await this.getWaterDepartments()
    };
    return JSON.stringify(data);
  },

  async exportDataEncrypted(password) {
    const json = await this.exportData();
    if (!password) throw new Error('Password required');
    return await encryptString(password, json);
  },

  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.departments) await this.saveAll(STORES.DEPARTMENTS, data.departments);
      if (data.workplaces) await this.saveAll(STORES.WORKPLACES, data.workplaces);
      if (data.workers) await this.saveAll(STORES.WORKERS, data.workers);
      if (data.exams) await this.saveAll(STORES.EXAMS, data.exams);
      if (data.water_analyses) await this.saveAll(STORES.WATER_ANALYSES, data.water_analyses);
      if (data.water_departments) await this.saveAll(STORES.WATER_DEPARTMENTS, data.water_departments);
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  },

  async importDataEncrypted(encryptedString, password) {
    if (!password) throw new Error('Password required');
    try {
      const json = await decryptString(password, encryptedString);
      return await this.importData(json);
    } catch (e) {
      console.error('Decryption failed', e);
      return false;
    }
  }
};
