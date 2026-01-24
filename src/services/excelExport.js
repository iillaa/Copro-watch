import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { db } from './db';
import { logic } from './logic';

// Helper: Convert ArrayBuffer to Base64
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

    // 1. DATA PREPARATION
    let allExams = [];
    let waterLogs = [];
    let workplaces = [];
    let waterDepts = [];

    try {
      const [examsData, waterData, workplaceData, waterDeptData] = await Promise.all([
        db.getExams(),
        db.getWaterAnalyses(),
        db.getWorkplaces(),
        db.getWaterDepartments()
      ]);
      allExams = examsData;
      waterLogs = waterData;
      workplaces = workplaceData;
      waterDepts = waterDeptData;
    } catch (e) {
      console.warn('[Excel] Partial data load:', e);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Copro-Watch v2.0';
    workbook.created = new Date();

    // ==========================================
    // SHEET 0: TABLEAU DE BORD (UI IMPROVED)
    // ==========================================
    const sheetDash = workbook.addWorksheet('Tableau de Bord', {
      views: [{ showGridLines: false }]
    });

    // --- LOGIC CORRECTION FOR COUNTS ---
    const totalWorkers = workers.length;
    
    // We strictly categorize based on "Current Priority":
    // 1. Overdue -> "En Retard"
    // 2. If not overdue -> Check Status
    const overdueList = workers.filter(w => logic.isOverdue(w.next_exam_due));
    const activeList = workers.filter(w => !logic.isOverdue(w.next_exam_due));

    const lateCount = overdueList.length;
    const apteCount = activeList.filter(w => w.latest_status === 'apte').length;
    const inapteCount = activeList.filter(w => w.latest_status === 'inapte').length;
    const partialCount = activeList.filter(w => w.latest_status === 'apte_partielle').length;
    
    // Water Stats
    const waterTotal = waterLogs.length;
    const waterPotable = waterLogs.filter(w => w.result === 'potable').length;
    const waterCompliance = waterTotal > 0 ? (waterPotable / waterTotal) : 0;

    // --- DRAWING THE "WIDGETS" ---
    
    // Title
    sheetDash.mergeCells('B2:F3');
    const titleCell = sheetDash.getCell('B2');
    titleCell.value = 'RAPPORT DE SANTÉ AU TRAVAIL';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF4F46E5' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = { bottom: { style: 'medium', color: { argb: 'FF4F46E5' } } };

    // SECTION 1: SANTÉ (MEDICAL)
    sheetDash.getCell('B5').value = "1. STATISTIQUES MÉDICALES";
    sheetDash.getCell('B5').font = { size: 12, bold: true };

    const medicalData = [
      ['Total Effectif', totalWorkers, 'FFFFFF', '6B7280'], // Gray
      ['Aptes (Actifs)', apteCount, 'DCFCE7', '166534'],     // Green
      ['Aptes Partiels', partialCount, 'FEF9C3', '854D0E'],  // Yellow
      ['Inaptes', inapteCount, 'FEE2E2', '991B1B'],          // Red
      ['En Retard (URGENT)', lateCount, '7F1D1D', 'FFFFFF']  // Dark Red + White Text
    ];

    let row = 7;
    medicalData.forEach(([label, val, bg, color]) => {
      sheetDash.getCell(`B${row}`).value = label;
      sheetDash.getCell(`C${row}`).value = val;
      
      // Styling like a card
      const cellLabel = sheetDash.getCell(`B${row}`);
      const cellVal = sheetDash.getCell(`C${row}`);
      
      cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
      cellLabel.font = { color: { argb: 'FF' + color }, bold: true };
      cellLabel.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'} };

      cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
      cellVal.font = { color: { argb: 'FF' + color }, bold: true };
      cellVal.alignment = { horizontal: 'center' };
      cellVal.border = { top: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      
      row++;
    });

    // SECTION 2: EAU (WATER)
    row += 2;
    sheetDash.getCell(`B${row}`).value = "2. QUALITÉ DE L'EAU";
    sheetDash.getCell(`B${row}`).font = { size: 12, bold: true };
    row += 2;

    const waterDataList = [
      ['Total Analyses', waterTotal],
      ['Conformes', waterPotable],
      ['Non Conformes', waterTotal - waterPotable],
      ['Taux de Conformité', waterCompliance]
    ];

    waterDataList.forEach(([label, val]) => {
        sheetDash.getCell(`B${row}`).value = label;
        sheetDash.getCell(`C${row}`).value = val;
        
        if (label.includes('Taux')) {
             sheetDash.getCell(`C${row}`).numFmt = '0.0%';
             // Color code the percentage
             if(val < 0.8) sheetDash.getCell(`C${row}`).font = { color: { argb: 'FFDC2626' }, bold: true }; // Red if < 80%
             else sheetDash.getCell(`C${row}`).font = { color: { argb: 'FF16A34A' }, bold: true }; // Green
        }
        
        sheetDash.getCell(`B${row}`).border = { bottom: {style: 'dotted'} };
        row++;
    });

    sheetDash.getColumn(2).width = 30; // Col B
    sheetDash.getColumn(3).width = 15; // Col C

    // ==========================================
    // SHEET 1: TRAVAILLEURS
    // ==========================================
    const sheetWorkers = workbook.addWorksheet('Travailleurs', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });
    
    sheetWorkers.columns = [
      { header: 'Matricule', key: 'national_id', width: 15 },
      { header: 'Nom et Prénom', key: 'full_name', width: 30 },
      { header: 'Service', key: 'department_name', width: 25 },
      { header: 'Poste / Lieu', key: 'workplace_name', width: 25 },
      { header: 'Date Naissance', key: 'birth_date', width: 15 },
      { header: 'Dernier Examen', key: 'last_exam_date', width: 18 },
      { header: 'Prochain Dû', key: 'next_exam_due', width: 18 },
      { header: 'Statut Actuel', key: 'status', width: 20 },
    ];

    const workerRows = workers.map((w) => {
      const dept = departments.find((d) => d.id == w.department_id);
      const wp = workplaces.find(loc => loc.id == w.workplace_id);

      // --- LOGIC MATCHING THE DASHBOARD ---
      let statusLabel = '-';
      const stat = w.latest_status; 

      if (logic.isOverdue(w.next_exam_due)) {
         statusLabel = 'En Retard';
      } else if (stat === 'apte') {
         statusLabel = 'Apte';
      } else if (stat === 'inapte') {
         statusLabel = 'Inapte';
      } else if (stat === 'apte_partielle') {
         statusLabel = 'Apte Partiel';
      } else {
         statusLabel = 'En attente';
      }

      return {
        national_id: w.national_id,
        full_name: w.full_name,
        department_name: dept ? dept.name : '-',
        workplace_name: wp ? wp.name : '-',
        birth_date: logic.formatDateDisplay(w.birth_date),
        last_exam_date: logic.formatDateDisplay(w.last_exam_date),
        next_exam_due: logic.formatDateDisplay(w.next_exam_due),
        status: statusLabel,
      };
    });

    sheetWorkers.addRows(workerRows);
    styleSheet(sheetWorkers);
    applyConditionalFormatting(sheetWorkers);

    // ==========================================
    // SHEET 2: HISTORIQUE (GROUPED BY WORKER)
    // ==========================================
    const relevantExams = allExams.filter(e => workers.some(w => w.id == e.worker_id));

    if (relevantExams.length > 0) {
      const sheetVisits = workbook.addWorksheet('Historique Médical', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });
      
      sheetVisits.columns = [
        { header: 'Travailleur', key: 'worker_name', width: 30 }, // Moved First
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Type Visite', key: 'type', width: 20 },
        { header: 'Conclusion', key: 'conclusion', width: 20 },
        { header: 'Notes', key: 'notes', width: 40 },
      ];

      const visitRows = relevantExams.map((e) => {
        const worker = workers.find((w) => w.id == e.worker_id);
        
        let conc = '-';
        if (e.decision && e.decision.status) {
            conc = e.decision.status.toUpperCase();
        }

        return {
          worker_name: worker ? worker.full_name : 'Inconnu',
          date: logic.formatDateDisplay(e.exam_date),
          type: e.type === 'periodic' ? 'Périodique' : e.type === 'embauche' ? 'Embauche' : 'Spontanée',
          conclusion: conc,
          notes: e.comments || '-',
          // Hidden Sort Keys
          _sortDate: e.exam_date,
          _sortName: worker ? worker.full_name : 'ZZZ'
        };
      });
      
      // --- SORTING: By Name (ASC) THEN By Date (DESC) ---
      visitRows.sort((a, b) => {
        // Primary: Name
        const nameA = a._sortName.toLowerCase();
        const nameB = b._sortName.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        
        // Secondary: Date (Newest first)
        const dateA = new Date(a._sortDate || 0);
        const dateB = new Date(b._sortDate || 0);
        return dateB - dateA;
      });
      
      // Clean up helper keys before adding
      const cleanRows = visitRows.map(({_sortDate, _sortName, ...rest}) => rest);
      
      sheetVisits.addRows(cleanRows);
      styleSheet(sheetVisits);
    }

    // ==========================================
    // SHEET 3: ANALYSES D'EAU (FIXED LOCATIONS)
    // ==========================================
    if (waterLogs.length > 0) {
      const sheetWater = workbook.addWorksheet("Analyses d'Eau", {
        views: [{ state: 'frozen', ySplit: 1 }]
      });
      
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

        // --- TRIPLE CHECK LOCATION ---
        let loc = l.location; // 1. Custom string?
        
        if (!loc && l.department_id) {
             // 2. Is it a Water Dept ID?
            const waterDept = waterDepts.find(d => d.id == l.department_id);
            if (waterDept) {
                loc = waterDept.name;
            } else {
                // 3. Is it an HR Dept ID?
                const hrDept = departments.find(d => d.id == l.department_id);
                if (hrDept) loc = hrDept.name;
            }
        }

        return {
          date: logic.formatDateDisplay(l.sample_date || l.request_date),
          location: loc || 'Lieu Inconnu',
          result: resLabel,
          decision: decisionLabel,
        };
      });

      // Sort by Date
      waterRows.sort((a, b) => {
         try {
            const dA = a.date.split('/').reverse().join('-');
            const dB = b.date.split('/').reverse().join('-');
            return new Date(dB) - new Date(dA);
        } catch(e) { return 0; }
      });
      
      sheetWater.addRows(waterRows);
      styleSheet(sheetWater);

      // Color coding
      sheetWater.eachRow((row, rowNumber) => {
        if(rowNumber === 1) return;
        const cell = row.getCell('result');
        if(cell.value === 'CONFORME') {
             cell.font = { color: { argb: 'FF006100' }, bold: true };
        } else if (cell.value === 'NON CONFORME') {
             cell.font = { color: { argb: 'FF9C0006' }, bold: true };
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        }
      });
    }

    // SAVING LOGIC
    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `CoproWatch_Complet_${dateStr}.xlsx`;

    const { Capacitor } = await import('@capacitor/core');

    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      try {
        await Filesystem.requestPermissions();
        try {
           // Ensure folder exists
          await Filesystem.stat({ path: 'copro-watch', directory: Directory.Documents });
        } catch {
          await Filesystem.mkdir({
            path: 'copro-watch',
            directory: Directory.Documents,
            recursive: true,
          });
        }
        
        const base64Data = arrayBufferToBase64(buffer);
        await Filesystem.writeFile({
          path: `copro-watch/${filename}`,
          data: base64Data,
          directory: Directory.Documents,
        });
        alert(`SUCCÈS !\n\nFichier enregistré dans :\nMes Documents / copro-watch / ${filename}`);
      } catch (e) {
        throw new Error("Impossible d'écrire dans Documents. Vérifiez les permissions.");
      }
    } else {
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

// --- STYLING HELPERS ---

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
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
}

function applyConditionalFormatting(sheet) {
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const cell = row.getCell('status');
        const val = cell.value;

        if (val === 'Apte') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
            cell.font = { color: { argb: 'FF006100' } };
        } else if (val === 'Inapte' || val === 'En Retard') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
            cell.font = { color: { argb: 'FF9C0006' } };
        } else if (val === 'Apte Partiel') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
            cell.font = { color: { argb: 'FF9C5700' } };
        }
    });
}