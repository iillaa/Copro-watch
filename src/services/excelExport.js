import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { db } from './db';
import { logic } from './logic';

// Helper: Convert ArrayBuffer to Base64 (Required for Android Filesystem)
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const exportWorkersToExcel = async (workers, departments) => {
  try {
    console.log('[Excel] Starting Export generation...');

    // ---------------------------------------------------------
    // 1. DATA FETCHING (Robust)
    // ---------------------------------------------------------
    let allExams = [];
    let waterLogs = [];

    try {
      allExams = await db.getExams();
    } catch (e) {
      console.warn('[Excel] Could not load exams:', e);
    }

    try {
      waterLogs = await db.getWaterAnalyses();
    } catch (e) {
      console.warn('[Excel] Could not load water logs:', e);
    }

    // ---------------------------------------------------------
    // 2. EXCEL CONSTRUCTION (Visuals)
    // ---------------------------------------------------------
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Copro-Watch';
    workbook.created = new Date();

    // --- SHEET 1: TRAVAILLEURS ---
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

    const workerRows = workers.map((w) => {
      const dept = departments.find((d) => d.id === w.department_id);

      const myExams = allExams.filter((e) => e.worker_id === w.id);
      myExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));

      let statusLabel = '-';
      if (myExams.length > 0) {
        const lastExam = myExams.find((e) => e.decision && e.decision.status);
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
        status: statusLabel,
      };
    });
    sheetWorkers.addRows(workerRows);
    styleSheet(sheetWorkers);

    // --- SHEET 2: HISTORIQUE ---
    if (allExams.length > 0) {
      const sheetVisits = workbook.addWorksheet('Historique Médical');
      sheetVisits.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Travailleur', key: 'worker_name', width: 30 },
        { header: 'Type Visite', key: 'type', width: 20 },
        { header: 'Conclusion', key: 'conclusion', width: 20 },
        { header: 'Notes', key: 'notes', width: 40 },
      ];

      const visitRows = allExams.map((e) => {
        const worker = workers.find((w) => w.id === e.worker_id);
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
          type:
            e.type === 'periodic' ? 'Périodique' : e.type === 'embauche' ? 'Embauche' : 'Spontanée',
          conclusion: conc,
          notes: e.comments || '-',
        };
      });
      visitRows.sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
      });
      sheetVisits.addRows(visitRows);
      styleSheet(sheetVisits);
    }

    // --- SHEET 3: ANALYSES D'EAU ---
    if (waterLogs.length > 0) {
      const sheetWater = workbook.addWorksheet("Analyses d'Eau");
      sheetWater.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Service/Lieu', key: 'location', width: 30 },
        { header: 'Résultat', key: 'result', width: 20 },
        { header: 'Décision', key: 'decision', width: 20 },
      ];

      const waterRows = waterLogs.map((l) => {
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

        let loc = l.location;
        if (!loc && l.department_id) {
          const dept = departments.find((d) => d.id === l.department_id);
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

    // ---------------------------------------------------------
    // 3. SAVING LOGIC (The Fix)
    // ---------------------------------------------------------
    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `CoproWatch_Complet_${dateStr}.xlsx`;

    // Dynamic Import for Capacitor Check (Matches backup.js strategy)
    const { Capacitor } = await import('@capacitor/core');

    // A. ANDROID / NATIVE
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      try {
        console.log('[Excel] Requesting Permissions...');
        // 1. CRITICAL: Request permission first (Like backup.js)
        await Filesystem.requestPermissions();

        // 2. Ensure Folder Exists
        try {
          await Filesystem.stat({ path: 'copro-watch', directory: Directory.Documents });
        } catch {
          await Filesystem.mkdir({
            path: 'copro-watch',
            directory: Directory.Documents,
            recursive: true,
          });
        }

        // 3. Convert to Base64 (Required for Binary write in Capacitor)
        const base64Data = arrayBufferToBase64(buffer);

        // 4. Write File (NO ENCODING for Binary/Base64)
        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: base64Data,
          directory: Directory.Documents,
        });

        alert(`SUCCÈS !\n\nFichier enregistré dans :\nMes Documents / copro-watch / ${filename}`);
      } catch (e) {
        console.error('[Excel] Native Write Failed:', e);
        throw new Error("Impossible d'écrire dans Documents. Vérifiez les permissions.");
      }
    }
    // B. WEB BROWSER
    else {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, filename);
    }
  } catch (error) {
    console.error('[Excel] Generation Error:', error);
    throw new Error('Erreur Export: ' + error.message);
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
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
}
