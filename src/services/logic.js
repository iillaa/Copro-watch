import {
  addMonths,
  addDays,
  isBefore,
  parseISO,
  format,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  getMonth,
  getYear,
  isValid
} from 'date-fns';
import { db } from './db'; // Import DB to handle status updates

export const logic = {
  // ==========================================
  // CONFIGURATION CONSTANTS
  // ==========================================
  EXAM_INTERVAL_MONTHS: 6,
  DUE_WARNING_DAYS: 15,
  RETEST_INTERVAL_DAYS_DEFAULT: 7,

  // ==========================================
  // GENERAL DATE HELPERS
  // ==========================================
  
  // Safe Date Parser to prevent RangeError
  safeParse(dateStr) {
    if (!dateStr) return null;
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return isValid(d) ? d : null;
  },

  formatDate(date) {
    if (!date) return '';
    try {
      const d = this.safeParse(date);
      return d ? format(d, 'yyyy-MM-dd') : '';
    } catch (e) {
      return '';
    }
  },

  formatDateDisplay(date) {
    if (!date) return '-';
    try {
      const d = this.safeParse(date);
      return d ? format(d, 'dd/MM/yyyy') : '-';
    } catch (e) {
      return '-';
    }
  },

  getCurrentMonthRange() {
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
      month: getMonth(today),
      year: getYear(today),
    };
  },

  // ==========================================
  // WORKER (FOOD HANDLERS) LOGIC
  // ==========================================

  // PREMIUM FEATURE: Calculate due date with variable months
  calculateNextDueDate(dateStr, months = 6) {
    const date = this.safeParse(dateStr);
    if (!date) return this.formatDate(new Date()); // Default to now if invalid
    
    try {
      const nextDate = addMonths(date, months);
      return this.formatDate(nextDate);
    } catch (e) {
      console.warn("Date calculation error", e);
      return this.formatDate(new Date());
    }
  },

  // Legacy support (defaults to 6 months)
  calculateNextExamDue(lastExamDateStr) {
    return this.calculateNextDueDate(lastExamDateStr, this.EXAM_INTERVAL_MONTHS);
  },

  isDueSoon(nextExamDateStr) {
    const nextDate = this.safeParse(nextExamDateStr);
    if (!nextDate) return true;
    
    const today = new Date();
    const diff = differenceInDays(nextDate, today);
    return diff <= this.DUE_WARNING_DAYS && diff >= 0;
  },

  isOverdue(nextExamDateStr) {
    const nextDate = this.safeParse(nextExamDateStr);
    if (!nextDate) return true;
    
    const today = new Date();
    return isBefore(nextDate, today) && differenceInDays(today, nextDate) > 0;
  },

  calculateRetestDate(treatmentStartDateStr, days = 7) {
    const startDate = this.safeParse(treatmentStartDateStr);
    if (!startDate) return this.formatDate(new Date());
    return this.formatDate(addDays(startDate, days));
  },

  // CORE LOGIC: Determines status based on exam history
  recalculateWorkerStatus(exams) {
    if (!exams || exams.length === 0) {
      return { last_exam_date: null, next_exam_due: this.formatDate(new Date()) };
    }

    // Sort by exam date descending
    const sortedExams = [...exams].sort((a, b) => {
      const dateA = this.safeParse(a.exam_date) || new Date(0);
      const dateB = this.safeParse(b.exam_date) || new Date(0);
      return dateB - dateA;
    });

    const lastExam = sortedExams[0];
    const lastExamDate = lastExam.exam_date;

    // Find the last "Decisive" exam (Valid, Inapt, or Partial)
    const lastValidExam = sortedExams.find(
      (e) => e.decision && ['apte', 'apte_partielle', 'inapte'].includes(e.decision.status)
    );

    let nextDue;

    if (lastValidExam) {
      const status = lastValidExam.decision.status;
      // Use the decision date if available (lab return), else exam date
      const referenceDate = lastValidExam.decision.date || lastValidExam.exam_date; 
      // Use the logic already stored in the exam if possible
      const storedValidity = lastValidExam.decision.valid_until;

      if (storedValidity && isValid(parseISO(storedValidity))) {
         nextDue = storedValidity;
      } else {
        // Fallback calculation
        if (status === 'apte') {
           // Default to 6 months if not specified
           nextDue = this.calculateNextDueDate(referenceDate, 6);
        } else if (['inapte', 'apte_partielle'].includes(status)) {
          if (lastValidExam.treatment && lastValidExam.treatment.retest_date) {
            nextDue = lastValidExam.treatment.retest_date;
          } else {
            nextDue = this.calculateRetestDate(referenceDate, 7);
          }
        } else {
          nextDue = this.calculateNextDueDate(referenceDate, 6);
        }
      }
    } else {
      nextDue = this.formatDate(new Date());
    }
    return { last_exam_date: lastExamDate, next_exam_due: nextDue };
  },

  // NEW: Update Worker Status in DB (Fixes the "Not like tablets" issue)
  async updateWorkerStatus(workerId) {
    try {
      const allExams = await db.getExams();
      const workerExams = allExams.filter(e => e.worker_id === workerId);
      const newStatus = this.recalculateWorkerStatus(workerExams);
      
      const workers = await db.getWorkers();
      const worker = workers.find(w => w.id === workerId);
      
      if (worker) {
        const updatedWorker = { 
          ...worker, 
          last_exam_date: newStatus.last_exam_date,
          next_exam_due: newStatus.next_exam_due
        };
        await db.saveWorker(updatedWorker);
      }
    } catch (e) {
      console.error("Failed to update worker status", e);
    }
  },

  // Worker Dashboard Stats
  getDashboardStats(workers, exams) {
    const dueSoon = workers.filter(
      (w) => !w.archived && this.isDueSoon(w.next_exam_due) && !this.isOverdue(w.next_exam_due)
    );
    const overdue = workers.filter((w) => !w.archived && this.isOverdue(w.next_exam_due));
    const activePositive = [];
    const retests = [];

    workers.forEach((w) => {
      if (w.archived) return;
      const workerExams = exams.filter((e) => e.worker_id === w.id);
      workerExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
      if (workerExams.length > 0) {
        const lastExam = workerExams[0];
        if (lastExam.lab_result && lastExam.lab_result.result === 'positive') {
          activePositive.push({ worker: w, exam: lastExam });
          if (lastExam.treatment && lastExam.treatment.retest_date) {
            retests.push({ worker: w, exam: lastExam, date: lastExam.treatment.retest_date });
          }
        }
      }
    });
    retests.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { dueSoon, overdue, activePositive, retests };
  },

  // ==========================================
  // WATER ANALYSIS LOGIC
  // ==========================================

  getDepartmentWaterHistory(departmentId, allAnalyses) {
    return allAnalyses
      .filter((a) => (a.department_id || a.structure_id) === departmentId)
      .sort((a, b) => {
        const dateA = new Date(a.request_date || a.sample_date);
        const dateB = new Date(b.request_date || b.sample_date);
        const diff = dateB - dateA;
        return diff !== 0 ? diff : b.id - a.id;
      });
  },

  getServiceWaterStatus(departmentId, allAnalyses) {
    const { start, end } = this.getCurrentMonthRange();
    const deptAnalyses = this.getDepartmentWaterHistory(departmentId, allAnalyses);
    const lastActivity = deptAnalyses[0];
    const lastDate = lastActivity ? lastActivity.sample_date || lastActivity.request_date : null;

    const currentMonthAnalysis = deptAnalyses.find((analysis) => {
      const dateToCheck = analysis.sample_date || analysis.request_date;
      if (!dateToCheck) return false;
      const pDate = this.safeParse(dateToCheck);
      return pDate && pDate >= start && pDate <= end;
    });

    if (!currentMonthAnalysis) {
      return { status: 'todo', analysis: null, lastDate: lastDate };
    }

    let status = 'todo';
    if (currentMonthAnalysis.request_date && !currentMonthAnalysis.sample_date)
      status = 'requested';
    else if (currentMonthAnalysis.result === 'pending') status = 'pending';
    else if (currentMonthAnalysis.result === 'potable') status = 'ok';
    else if (currentMonthAnalysis.result === 'non_potable') status = 'alert';

    return {
      status: status,
      analysis: currentMonthAnalysis,
      lastDate: lastDate,
    };
  },

  getDepartmentsWaterStatus(departments, waterAnalyses) {
    return departments.map((department) => {
      const statusInfo = this.getServiceWaterStatus(department.id, waterAnalyses);
      return {
        ...department,
        waterStatus: statusInfo.status,
        waterAnalysis: statusInfo.analysis,
        lastDate: statusInfo.lastDate,
      };
    });
  },

  getServiceWaterStatusLabel(status) {
    switch (status) {
      case 'todo': return 'À Faire';
      case 'requested': return 'Demandé';
      case 'pending': return 'En Cours';
      case 'ok': return 'OK';
      case 'alert': return 'ALERTE';
      default: return '-';
    }
  },

  getServiceWaterStatusColor(status) {
    switch (status) {
      case 'todo': return '#94a3b8';
      case 'requested': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'ok': return '#22c55e';
      case 'alert': return '#ef4444';
      default: return '#94a3b8';
    }
  },

  getServiceWaterAnalysisStats(departments, waterAnalyses) {
    const departmentStats = this.getDepartmentsWaterStatus(departments, waterAnalyses);
    const todo = departmentStats.filter((d) => d.waterStatus === 'todo');
    const requested = departmentStats.filter((d) => d.waterStatus === 'requested');
    const pending = departmentStats.filter((d) => d.waterStatus === 'pending');
    const ok = departmentStats.filter((d) => d.waterStatus === 'ok');
    const alerts = departmentStats.filter((d) => d.waterStatus === 'alert');

    return {
      todo, requested, pending, ok, alerts,
      summary: {
        total: departments.length,
        todoCount: todo.length,
        requestedCount: requested.length,
        pendingCount: pending.length,
        okCount: ok.length,
        alertCount: alerts.length,
      },
    };
  },
};