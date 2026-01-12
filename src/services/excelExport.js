import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { db } from './db';
import { logic } from './logic';

export const exportWorkersToExcel = async (workers, departments) => {
  try {
    console.log("Starting Export...");

    // 1. FETCH ALL DATA CORRECTLY (Using the public API from db.js)
    let allExams = [];
    let waterLogs = [];
    
    try {
      // [CORRECTION] Use getExams(), not db.visits
      allExams = await db.getExams(); 
      console.log(`Loaded ${allExams.length} exams.`);
    } catch (e) {
      console.warn("Could not load exams:", e);
    }

    try {
      // [CORRECTION] Use getWaterAnalyses(), not db.water_analysis
      waterLogs = await db.getWaterAnalyses();
      console.log(`Loaded ${waterLogs.length} water logs.`);
    } catch (e) {
      console.warn("Could not load water logs:", e);
    }

    // 2. Initialize Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Copro-Watch';
    workbook.created = new Date();

    // ===========================================================================
    // SHEET 1: TRAVAILLEURS (With Calculated Aptitude)
    // ===========================================================================
    const sheetWorkers = workbook.addWorksheet('Travailleurs');
    
    sheetWorkers.columns = [
      { header: 'Nom et Prénom', key: 'full_name', width: 30 },
      { header: 'Matricule', key: 'national_id', width: 15 },
      { header: 'Service', key: 'department_name', width: 25 },
      { header: 'Date Naissance', key: 'birth_date', width: 15 },
      { header: 'Dernier Examen', key: 'last_exam_date', width: 18 },
      { header: 'Prochain Dû', key: 'next_exam_due', width: 18 },
      { header: 'Aptitude', key: 'status', width: 20 },
    ];

    const workerRows = workers.map(w => {
      const dept = departments.find(d => d.id === w.department_id);
      
      // [CALCULATION] Find Aptitude from the exams we just fetched
      const myExams = allExams.filter(e => e.worker_id === w.id);
      // Sort: Newest date first
      myExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
      
      let statusLabel = '-';
      if (myExams.length > 0) {
        // Look for the last exam that has a decision
        const lastExam = myExams.find(e => e.decision && e.decision.status);
        if (lastExam) {
          const stat = lastExam.decision.status;
          if (stat === 'apte') statusLabel = 'Apte';
          else if (stat === 'inapte') statusLabel = 'Inapte';
          else if (stat === 'apte_partielle') statusLabel = 'Apte Partiel';
          else statusLabel = stat;
        }
      }

      return {
        full_name: w.full_name,
        national_id: w.national_id,
        department_name: dept ? dept.name : '-',
        birth_date: logic.formatDateDisplay(w.birth_date),
        last_exam_date: logic.formatDateDisplay(w.last_exam_date),
        next_exam_due: logic.formatDateDisplay(w.next_exam_due),
        status: statusLabel // <--- Populated now
      };
    });
    
    sheetWorkers.addRows(workerRows);
    styleSheet(sheetWorkers);

    // ===========================================================================
    // SHEET 2: HISTORIQUE MÉDICAL (From 'exams' table)
    // ===========================================================================
    if (allExams.length > 0) {
      const sheetVisits = workbook.addWorksheet('Historique Médical');
      
      sheetVisits.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Travailleur', key: 'worker_name', width: 30 },
        { header: 'Type Visite', key: 'type', width: 20 },
        { header: 'Conclusion', key: 'conclusion', width: 20 },
        { header: 'Notes', key: 'notes', width: 40 },
      ];

      const visitRows = allExams.map(e => {
        const worker = workers.find(w => w.id === e.worker_id);
        
        let conc = '-';
        if (e.decision && e.decision.status) {
          const s = e.decision.status;
          if (s === 'apte') conc = 'Apte';
          else if (s === 'inapte') conc = 'Inapte';
          else conc = s;
        }

        return {
          date: logic.formatDateDisplay(e.exam_date),
          worker_name: worker ? worker.full_name : 'Inconnu (Supprimé)',
          type: e.type === 'periodic' ? 'Périodique' : (e.type === 'embauche' ? 'Embauche' : 'Spontanée'),
          conclusion: conc,
          notes: e.comments || '-'
        };
      });

      // Sort by date descending
      visitRows.sort((a, b) => {
        // Parse DD/MM/YYYY back to objects for sorting
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
      });
      
      sheetVisits.addRows(visitRows);
      styleSheet(sheetVisits);
    }

    // ===========================================================================
    // SHEET 3: ANALYSES D'EAU (From 'water_analyses' table)
    // ===========================================================================
    if (waterLogs.length > 0) {
      const sheetWater = workbook.addWorksheet("Analyses d'Eau");

      sheetWater.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Service/Lieu', key: 'location', width: 30 },
        { header: 'Résultat', key: 'result', width: 20 },
        { header: 'Décision', key: 'decision', width: 20 },
      ];

      const waterRows = waterLogs.map(l => {
        // [CORRECTION] Determine status based on 'result' field from logic.js
        let resLabel = '-';
        let decisionLabel = '-';
        
        if (l.result === 'potable') {
            resLabel = 'CONFORME';
            decisionLabel = 'Potable';
        } else if (l.result === 'non_potable') {
            resLabel = 'NON CONFORME';
            decisionLabel = 'Non Potable';
        } else {
            resLabel = 'EN COURS';
        }

        // Try to find department name if location is missing
        let loc = l.location;
        if (!loc && l.department_id) {
            const dept = departments.find(d => d.id === l.department_id);
            if (dept) loc = dept.name;
        }

        return {
          date: logic.formatDateDisplay(l.sample_date || l.request_date),
          location: loc || '-',
          result: resLabel,
          decision: decisionLabel,
        };
      });
      
      waterRows.sort((a, b) => {
         const dateA = a.date.split('/').reverse().join('-');
         const dateB = b.date.split('/').reverse().join('-');
         return new Date(dateB) - new Date(dateA);
      });

      sheetWater.addRows(waterRows);
      styleSheet(sheetWater);
    }

    // ===========================================================================
    // SAVE
    // ===========================================================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const dateStr = new Date().toISOString().split('T')[0];
    saveAs(blob, `CoproWatch_Complet_${dateStr}.xlsx`);

  } catch (error) {
    console.error("Excel Generation Error:", error);
    throw new Error("Erreur Export: " + error.message);
  }
};

// HELPER: Blue Header Styling
function styleSheet(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });
  
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
}