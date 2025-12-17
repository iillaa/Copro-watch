
import { addMonths, addDays, isBefore, isAfter, parseISO, format, differenceInDays, startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns';

export const logic = {
  // Constants
  EXAM_INTERVAL_MONTHS: 6,
  DUE_WARNING_DAYS: 15,
  RETEST_INTERVAL_DAYS_DEFAULT: 7,

  // Date Helpers
  formatDate(date) {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  },

  calculateNextExamDue(lastExamDateStr) {
    if (!lastExamDateStr) return this.formatDate(new Date()); // If never examined, due now
    const lastDate = parseISO(lastExamDateStr);
    const nextDate = addMonths(lastDate, this.EXAM_INTERVAL_MONTHS);
    return this.formatDate(nextDate);
  },

  isDueSoon(nextExamDateStr) {
    if (!nextExamDateStr) return true;
    const nextDate = parseISO(nextExamDateStr);
    const today = new Date();
    const diff = differenceInDays(nextDate, today);
    return diff <= this.DUE_WARNING_DAYS && diff >= 0;
  },

  isOverdue(nextExamDateStr) {
    if (!nextExamDateStr) return true;
    const nextDate = parseISO(nextExamDateStr);
    const today = new Date();
    // Check if nextDate is strictly before today (ignoring time)
    return isBefore(nextDate, today) && differenceInDays(today, nextDate) > 0;
  },

  calculateRetestDate(treatmentStartDateStr, days = 7) {
    const startDate = parseISO(treatmentStartDateStr);
    return this.formatDate(addDays(startDate, days));
  },

  recalculateWorkerStatus(exams) {
    if (!exams || exams.length === 0) {
      // No exams = Due immediately
      return { last_exam_date: null, next_exam_due: this.formatDate(new Date()) };
    }

    // Sort exams by date desc (newest first)
    // We parseISO to ensure correct comparison
    const sortedExams = [...exams].sort((a, b) => parseISO(b.exam_date) - parseISO(a.exam_date));
    
    const lastExam = sortedExams[0];
    const lastExamDate = lastExam.exam_date;

    // Find latest finalized exam (Apte, Apte Partielle, or Inapte) for periodic calculation
    // We treat any finalized decision as a "visit" that resets the periodic clock.
    const lastValidExam = sortedExams.find(e => e.decision && ['apte', 'apte_partielle', 'inapte'].includes(e.decision.status));
    
    let nextDue;
    if (lastValidExam) {
         const status = lastValidExam.decision.status;
         
         if (status === 'apte') {
             // Standard 6-month cycle
             nextDue = this.calculateNextExamDue(lastValidExam.exam_date);
         } else if (['inapte', 'apte_partielle'].includes(status)) {
             // Use retest date if available
             if (lastValidExam.treatment && lastValidExam.treatment.retest_date) {
                 nextDue = lastValidExam.treatment.retest_date;
             } else {
                 // Fallback if no retest date specified: Default to 7 days
                 nextDue = this.calculateRetestDate(lastValidExam.exam_date, 7);
             }
         } else {
             // Fallback
             nextDue = this.calculateNextExamDue(lastValidExam.exam_date);
         }
    } else {
         // If no finalized exam found (only Open), and we have history, 
         // arguably they are due for a valid exam now.
         nextDue = this.formatDate(new Date());
    }

    return { last_exam_date: lastExamDate, next_exam_due: nextDue };
  },


  // Dashboard Aggregation
  getDashboardStats(workers, exams) {
    const today = new Date();
    
    // 1. Due within 15 days
    const dueSoon = workers.filter(w => this.isDueSoon(w.next_exam_due) && !this.isOverdue(w.next_exam_due));
    
    // 2. Overdue
    const overdue = workers.filter(w => this.isOverdue(w.next_exam_due));
    
    // 3. Positive / Inapte cases (Active)
    // Find latest exam for each worker
    const activePositive = [];
    const retests = [];

    workers.forEach(w => {
      // Find exams for this worker
      const workerExams = exams.filter(e => e.worker_id === w.id);
      // Sort by date desc
      workerExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
      
      if (workerExams.length > 0) {
        const lastExam = workerExams[0];
        // Check if latest result is positive
        if (lastExam.lab_result && lastExam.lab_result.result === 'positive') {
          activePositive.push({ worker: w, exam: lastExam });
          
          // Check for scheduled re-test
          if (lastExam.treatment && lastExam.treatment.retest_date) {
             retests.push({ worker: w, exam: lastExam, date: lastExam.treatment.retest_date });
          }
        }
      }
    });

    // Sort retests by date
    retests.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      dueSoon,
      overdue,
      activePositive,
      retests
    };
  },

  // Water Analysis Functions
  // Get current month date range
  getCurrentMonthRange() {
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
      month: getMonth(today),
      year: getYear(today)
    };
  },

  // Get analysis status for a structure in current month
  getStructureWaterAnalysisStatus(structureId, waterAnalyses) {
    const { start, end } = this.getCurrentMonthRange();
    
    // Find analyses for this structure in current month
    const monthAnalyses = waterAnalyses.filter(analysis => {
      const sampleDate = parseISO(analysis.sample_date);
      return analysis.structure_id === structureId &&
             sampleDate >= start &&
             sampleDate <= end;
    });

    if (monthAnalyses.length === 0) {
      return { status: 'todo', analysis: null };
    }

    // Sort by sample date desc to get latest
    monthAnalyses.sort((a, b) => new Date(b.sample_date) - new Date(a.sample_date));
    const latest = monthAnalyses[0];

    switch (latest.result) {
      case 'pending':
        return { status: 'pending', analysis: latest };
      case 'potable':
        return { status: 'ok', analysis: latest };
      case 'non_potable':
        return { status: 'alert', analysis: latest };
      default:
        return { status: 'todo', analysis: null };
    }
  },

  // Get all structures with their current water analysis status
  getWorkplacesWaterAnalysesStatus(workplaces, waterAnalyses) {
    return workplaces.map(workplace => {
      const statusInfo = this.getStructureWaterAnalysisStatus(workplace.id, waterAnalyses);
      return {
        ...workplace,
        waterStatus: statusInfo.status,
        waterAnalysis: statusInfo.analysis
      };
    });
  },

  // Get water analysis dashboard statistics
  getWaterAnalysisDashboardStats(workplaces, waterAnalyses) {
    const workplaceStats = this.getWorkplacesWaterAnalysesStatus(workplaces, waterAnalyses);
    
    const todo = workplaceStats.filter(w => w.waterStatus === 'todo');
    const pending = workplaceStats.filter(w => w.waterStatus === 'pending');
    const ok = workplaceStats.filter(w => w.waterStatus === 'ok');
    const alerts = workplaceStats.filter(w => w.waterStatus === 'alert');

    return {
      todo,
      pending,
      ok,
      alerts,
      summary: {
        total: workplaces.length,
        todoCount: todo.length,
        pendingCount: pending.length,
        okCount: ok.length,
        alertCount: alerts.length
      }
    };
  },

  // Check if structure needs re-test (has non-potable result without subsequent potable)
  needsRetest(structureId, waterAnalyses) {
    const structureAnalyses = waterAnalyses
      .filter(a => a.structure_id === structureId)
      .sort((a, b) => new Date(b.sample_date) - new Date(a.sample_date));

    if (structureAnalyses.length === 0) return false;

    const latest = structureAnalyses[0];
    
    // If latest is non-potable, check if there's a subsequent potable result
    if (latest.result === 'non_potable') {
      const hasPotableAfter = structureAnalyses.some(a => 
        a.result === 'potable' && 
        new Date(a.sample_date) > new Date(latest.sample_date)
      );
      return !hasPotableAfter;
    }

    return false;
  },

  // Format status for display
  getWaterAnalysisStatusLabel(status) {
    switch (status) {
      case 'todo': return 'À faire';
      case 'pending': return 'En attente';
      case 'ok': return 'OK';
      case 'alert': return 'ALERTE';
      default: return 'Inconnu';
    }
  },

  // Get status color for UI
  getWaterAnalysisStatusColor(status) {
    switch (status) {
      case 'todo': return '#6c757d'; // gray
      case 'pending': return '#ffc107'; // yellow
      case 'ok': return '#28a745'; // green
      case 'alert': return '#dc3545'; // red
      default: return '#6c757d';
    }
  }
};
