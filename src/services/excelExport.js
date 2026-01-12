import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { db } from './db';
import { logic } from './logic';

export const exportWorkersToExcel = async (workers, departments) => {
  try {
    // 1. Initialize Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Copro-Watch';
    workbook.created = new Date();

    // ===========================================================================
    // SHEET 1: TRAVAILLEURS (Always exists)
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
      
      let statusLabel = '-';
      if (w.latest_status === 'apte') statusLabel = 'Apte';
      else if (w.latest_status === 'inapte') statusLabel = 'Inapte';
      else if (w.latest_status === 'apte_partielle') statusLabel = 'Apte Partiel';

      return {
        full_name: w.full_name,
        national_id: w.national_id,
        department_name: dept ? dept.name : '-',
        birth_date: w.birth_date ? logic.formatDateDisplay(w.birth_date) : '-',
        last_exam_date: w.last_exam_date ? logic.formatDateDisplay(w.last_exam_date) : '-',
        next_exam_due: w.next_exam_due ? logic.formatDateDisplay(w.next_exam_due) : '-',
        status: statusLabel
      };
    });
    
    sheetWorkers.addRows(workerRows);
    styleSheet(sheetWorkers);

    // ===========================================================================
    // SHEET 2: HISTORIQUE MÉDICAL (Safe Check)
    // ===========================================================================
    // FIX: Check if db.visits exists before asking for data
    if (db.visits) {
      const sheetVisits = workbook.addWorksheet('Historique Médical');
      const visits = await db.visits.toArray();
      
      sheetVisits.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Travailleur', key: 'worker_name', width: 30 },
        { header: 'Type Visite', key: 'type', width: 20 },
        { header: 'Conclusion', key: 'conclusion', width: 25 },
        { header: 'Notes', key: 'notes', width: 40 },
      ];

      const visitRows = visits.map(v => {
        const worker = workers.find(w => w.id === v.worker_id);
        
        let conc = v.conclusion || '-';
        if (conc === 'apte') conc = 'Apte';
        if (conc === 'inapte') conc = 'Inapte';

        return {
          date: v.date ? logic.formatDateDisplay(v.date) : '-',
          worker_name: worker ? worker.full_name : 'Inconnu',
          type: v.type,
          conclusion: conc,
          notes: v.notes || '-'
        };
      });

      // Sort Newest First
      visitRows.sort((a, b) => new Date(b.date) - new Date(a.date)); // Fallback sort if dates are strings
      
      sheetVisits.addRows(visitRows);
      styleSheet(sheetVisits);
    }

    // ===========================================================================
    // SHEET 3: ANALYSES D'EAU (Safe Check)
    // ===========================================================================
    // FIX: Check if db.water_analysis exists
    if (db.water_analysis) {
      const sheetWater = workbook.addWorksheet("Analyses d'Eau");
      const waterLogs = await db.water_analysis.toArray();

      sheetWater.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Lieu', key: 'location', width: 30 },
        { header: 'Résultat', key: 'result', width: 20 },
        { header: 'Chlore', key: 'cl', width: 15 },
        { header: 'pH', key: 'ph', width: 15 },
      ];

      const waterRows = waterLogs.map(l => ({
        date: l.date ? logic.formatDateDisplay(l.date) : '-',
        location: l.location || '-',
        result: l.is_compliant ? 'CONFORME' : 'NON CONFORME',
        cl: l.cl_level || '-',
        ph: l.ph_level || '-'
      }));

      sheetWater.addRows(waterRows);
      styleSheet(sheetWater);
    }

    // ===========================================================================
    // SAVE FILE
    // ===========================================================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const dateStr = new Date().toISOString().split('T')[0];
    saveAs(blob, `CoproWatch_Full_Report_${dateStr}.xlsx`);

  } catch (error) {
    // [CRITICAL] Throw error so the UI knows exactly what happened
    console.error("Excel Generation Error:", error);
    throw new Error(error.message);
  }
};

// Styling Helper
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