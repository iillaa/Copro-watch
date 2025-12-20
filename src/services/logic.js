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
} from 'date-fns';

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
  // 1. For Inputs (Computer needs this)
  formatDate(date) {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  },

  // 2. For Display (Humans read this)
  formatDateDisplay(date) {
    if (!date) return '-';
    try {
      // Handle both Date objects and Strings
      const d = typeof date === 'string' ? parseISO(date) : date;
      return format(d, 'dd/MM/yyyy');
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
    // Check if nextDate is strictly before today
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
    const sortedExams = [...exams].sort((a, b) => parseISO(b.exam_date) - parseISO(a.exam_date));
    const lastExam = sortedExams[0];
    const lastExamDate = lastExam.exam_date;

    // Find latest finalized exam (Apte, Apte Partielle, or Inapte)
    const lastValidExam = sortedExams.find(
      (e) => e.decision && ['apte', 'apte_partielle', 'inapte'].includes(e.decision.status)
    );

    let nextDue;
    if (lastValidExam) {
      const status = lastValidExam.decision.status;
      if (status === 'apte') {
        // Standard 6-month cycle
        nextDue = this.calculateNextExamDue(lastValidExam.exam_date);
      } else if (['inapte', 'apte_partielle'].includes(status)) {
        // Use retest date if available, else default 7 days
        if (lastValidExam.treatment && lastValidExam.treatment.retest_date) {
          nextDue = lastValidExam.treatment.retest_date;
        } else {
          nextDue = this.calculateRetestDate(lastValidExam.exam_date, 7);
        }
      } else {
        nextDue = this.calculateNextExamDue(lastValidExam.exam_date);
      }
    } else {
      // If no finalized exam found, due now
      nextDue = this.formatDate(new Date());
    }

    return { last_exam_date: lastExamDate, next_exam_due: nextDue };
  },

  // Worker Dashboard Stats
  getDashboardStats(workers, exams) {
    const dueSoon = workers.filter(
      (w) => this.isDueSoon(w.next_exam_due) && !this.isOverdue(w.next_exam_due)
    );
    const overdue = workers.filter((w) => this.isOverdue(w.next_exam_due));
    const activePositive = [];
    const retests = [];

    workers.forEach((w) => {
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
  // WATER ANALYSIS LOGIC (UPDATED & FIXED)
  // ==========================================

  // 1. Get ALL history for a department (New Helper)
  // This allows us to see past activity even if it wasn't this month.
  getDepartmentWaterHistory(departmentId, allAnalyses) {
    return allAnalyses
      .filter((a) => (a.department_id || a.structure_id) === departmentId)
      .sort(
        (a, b) =>
          new Date(b.request_date || b.sample_date) - new Date(a.request_date || a.sample_date)
      );
  },

  // 2. Get Status (Considers History for "Last Date" but Current Month for "Status")
  getServiceWaterStatus(departmentId, allAnalyses) {
    const { start, end } = this.getCurrentMonthRange();

    // A. Get ALL history first to find the TRUE last date
    const deptAnalyses = this.getDepartmentWaterHistory(departmentId, allAnalyses);

    // B. Find "Last Date" (The most recent activity EVER, even if months ago)
    const lastActivity = deptAnalyses[0];
    const lastDate = lastActivity ? lastActivity.sample_date || lastActivity.request_date : null;

    // C. Find "Current Status" (Strictly THIS MONTH for Compliance)
    const currentMonthAnalysis = deptAnalyses.find((analysis) => {
      const dateToCheck = analysis.sample_date || analysis.request_date;
      if (!dateToCheck) return false;
      const pDate = parseISO(dateToCheck);
      return pDate >= start && pDate <= end;
    });

    // If no activity THIS month -> TODO (Gray), but we return the REAL lastDate!
    if (!currentMonthAnalysis) {
      return { status: 'todo', analysis: null, lastDate: lastDate };
    }

    // Determine status for the CURRENT analysis
    let status = 'todo';
    if (currentMonthAnalysis.request_date && !currentMonthAnalysis.sample_date)
      status = 'requested';
    else if (currentMonthAnalysis.result === 'pending') status = 'pending';
    else if (currentMonthAnalysis.result === 'potable') status = 'ok';
    else if (currentMonthAnalysis.result === 'non_potable') status = 'alert';

    return {
      status: status,
      analysis: currentMonthAnalysis,
      lastDate: lastDate, // Use the TRUE last date from history
    };
  },

  // 3. Batch Process all Departments (Used by Left Panel)
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

  // 4. UI Helpers (Labels & Colors)
  getServiceWaterStatusLabel(status) {
    switch (status) {
      case 'todo':
        return 'À Faire';
      case 'requested':
        return 'Demandé';
      case 'pending':
        return 'En Cours';
      case 'ok':
        return 'OK';
      case 'alert':
        return 'ALERTE';
      default:
        return '-';
    }
  },

  getServiceWaterStatusColor(status) {
    switch (status) {
      case 'todo':
        return '#94a3b8';
      case 'requested':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
      case 'ok':
        return '#22c55e';
      case 'alert':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  },

  // 5. Dashboard Summary Stats (WAS MISSING IN PREVIOUS VERSION)
  // This calculates the totals for the Overview Panel
  getServiceWaterAnalysisStats(departments, waterAnalyses) {
    const departmentStats = this.getDepartmentsWaterStatus(departments, waterAnalyses);

    const todo = departmentStats.filter((d) => d.waterStatus === 'todo');
    const requested = departmentStats.filter((d) => d.waterStatus === 'requested');
    const pending = departmentStats.filter((d) => d.waterStatus === 'pending');
    const ok = departmentStats.filter((d) => d.waterStatus === 'ok');
    const alerts = departmentStats.filter((d) => d.waterStatus === 'alert');

    return {
      todo,
      requested,
      pending,
      ok,
      alerts,
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
