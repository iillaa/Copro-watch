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
  isValid,
} from 'date-fns';

// HELPER: Safety Check for Dates
const safeDate = (d) => {
  if (!d) return null;
  const date = typeof d === 'string' ? parseISO(d) : d;
  return isValid(date) ? date : null;
};

export const logic = {
  // CONFIGURATION
  EXAM_INTERVAL_MONTHS: 6,
  DUE_WARNING_DAYS: 15,
  RETEST_INTERVAL_DAYS_DEFAULT: 7,

  // GENERAL DATE HELPERS
  formatDate(date) {
    const d = safeDate(date);
    return d ? format(d, 'yyyy-MM-dd') : '';
  },

  formatDateDisplay(date) {
    const d = safeDate(date);
    return d ? format(d, 'dd/MM/yyyy') : '-';
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

  // WORKER LOGIC
  calculateNextExamDue(lastExamDateStr) {
    const lastDate = safeDate(lastExamDateStr);
    if (!lastDate) return this.formatDate(new Date());
    return this.formatDate(addMonths(lastDate, this.EXAM_INTERVAL_MONTHS));
  },

  isDueSoon(nextExamDateStr) {
    const nextDate = safeDate(nextExamDateStr);
    if (!nextDate) return true;
    const diff = differenceInDays(nextDate, new Date());
    return diff <= this.DUE_WARNING_DAYS && diff >= 0;
  },

  isOverdue(nextExamDateStr) {
    const nextDate = safeDate(nextExamDateStr);
    if (!nextDate) return true;
    const today = new Date();
    return isBefore(nextDate, today) && differenceInDays(today, nextDate) > 0;
  },

  calculateRetestDate(treatmentStartDateStr, days = 7) {
    const startDate = safeDate(treatmentStartDateStr) || new Date();
    return this.formatDate(addDays(startDate, days));
  },

  recalculateWorkerStatus(exams) {
    if (!exams || exams.length === 0) {
      return { last_exam_date: null, next_exam_due: this.formatDate(new Date()) };
    }
    // Safe Sort
    const sortedExams = [...exams].sort((a, b) => {
      const dateA = safeDate(a.exam_date) || new Date(0);
      const dateB = safeDate(b.exam_date) || new Date(0);
      return dateB - dateA;
    });

    const lastExam = sortedExams[0];
    const lastValidExam = sortedExams.find(
      (e) => e.decision && ['apte', 'apte_partielle', 'inapte'].includes(e.decision.status)
    );

    let nextDue;
    if (lastValidExam) {
      const status = lastValidExam.decision.status;
      const referenceDate = lastValidExam.decision.date || lastValidExam.exam_date;

      if (status === 'apte') {
        nextDue = this.calculateNextExamDue(referenceDate);
      } else if (['inapte', 'apte_partielle'].includes(status)) {
        nextDue = lastValidExam.treatment?.retest_date
          ? lastValidExam.treatment.retest_date
          : this.calculateRetestDate(referenceDate, 7);
      } else {
        nextDue = this.calculateNextExamDue(referenceDate);
      }
    } else {
      nextDue = this.formatDate(new Date());
    }

    return {
      last_exam_date: lastExam.exam_date,
      next_exam_due: nextDue || this.formatDate(new Date()),
    };
  },

  // --- RESTORED DASHBOARD STATS (CRITICAL FIX) ---
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
      // Safe Sort
      workerExams.sort((a, b) => (safeDate(b.exam_date) || 0) - (safeDate(a.exam_date) || 0));

      if (workerExams.length > 0) {
        const lastExam = workerExams[0];
        if (lastExam.lab_result?.result === 'positive') {
          activePositive.push({ worker: w, exam: lastExam });
          if (lastExam.treatment?.retest_date) {
            retests.push({ worker: w, exam: lastExam, date: lastExam.treatment.retest_date });
          }
        }
      }
    });
    // Safe Sort Retests
    retests.sort((a, b) => (safeDate(a.date) || 0) - (safeDate(b.date) || 0));
    return { dueSoon, overdue, activePositive, retests };
  },

  // WATER ANALYSIS LOGIC
  getDepartmentWaterHistory(departmentId, allAnalyses) {
    return allAnalyses
      .filter((a) => (a.department_id || a.structure_id) === departmentId)
      .sort((a, b) => {
        const dateA = safeDate(a.request_date || a.sample_date) || 0;
        const dateB = safeDate(b.request_date || b.sample_date) || 0;
        return dateB - dateA; // Descending
      });
  },

  getServiceWaterStatus(departmentId, allAnalyses) {
    const { start, end } = this.getCurrentMonthRange();
    const deptAnalyses = this.getDepartmentWaterHistory(departmentId, allAnalyses);
    const lastActivity = deptAnalyses[0];
    const lastDate = lastActivity ? lastActivity.sample_date || lastActivity.request_date : null;

    const currentMonthAnalysis = deptAnalyses.find((analysis) => {
      const dateToCheck = analysis.sample_date || analysis.request_date;
      const pDate = safeDate(dateToCheck);
      return pDate && pDate >= start && pDate <= end;
    });

    if (!currentMonthAnalysis) return { status: 'todo', analysis: null, lastDate };

    let status = 'todo';

    // 1. STEP 1: Request made, no sample yet -> "Demandé"
    if (currentMonthAnalysis.request_date && !currentMonthAnalysis.sample_date) {
      status = 'requested';
    }
    // 2. STEP 2: Sample taken, no result yet -> "En cours" (ROBUST FIX)
    // We strictly check: Has Sample? Yes. Has Result Date? No. => MUST BE PENDING.
    else if (currentMonthAnalysis.sample_date && !currentMonthAnalysis.result_date) {
      status = 'pending';
    }
    // 3. STEP 3: Result is in -> Check Verdict
    else if (currentMonthAnalysis.result === 'potable') {
      status = 'ok';
    } 
    else if (currentMonthAnalysis.result === 'non_potable') {
      status = 'alert';
    }
    // Fallback: If result date exists but result is 'pending' or unknown
    else {
      status = 'pending';
    }

    return { status, analysis: currentMonthAnalysis, lastDate };
  },

  getDepartmentsWaterStatus(departments, waterAnalyses) {
    return departments.map((d) => {
      const statusInfo = this.getServiceWaterStatus(d.id, waterAnalyses);
      return {
        ...d,
        waterStatus: statusInfo.status,
        waterAnalysis: statusInfo.analysis,
        lastDate: statusInfo.lastDate,
      };
    });
  },

  getServiceWaterStatusLabel(status) {
    const map = {
      todo: 'À PLANIFIER',           // We need to decide a date
      requested: 'DEMANDE ENVOYÉE',  // We called the lab, waiting for them to come
      pending: 'EN COURS',     // They took the sample, analyzing it now
      ok: 'CONFORME',                // Safe
      alert: 'NON CONFORME',         // Danger,
    };
    return map[status] || '-';
  },

  getServiceWaterStatusColor(status) {
    const map = {
      todo: '#94a3b8',
      requested: '#3b82f6',
      pending: '#f59e0b',
      ok: '#22c55e',
      alert: '#ef4444',
    };
    return map[status] || '#94a3b8';
  },

  getServiceWaterAnalysisStats(departments, waterAnalyses) {
    const stats = this.getDepartmentsWaterStatus(departments, waterAnalyses);
    const counts = { todo: 0, requested: 0, pending: 0, ok: 0, alert: 0 };
    stats.forEach((s) => {
      if (counts[s.waterStatus] !== undefined) counts[s.waterStatus]++;
    });

    return {
      todo: stats.filter((d) => d.waterStatus === 'todo'),
      requested: stats.filter((d) => d.waterStatus === 'requested'),
      pending: stats.filter((d) => d.waterStatus === 'pending'),
      ok: stats.filter((d) => d.waterStatus === 'ok'),
      alerts: stats.filter((d) => d.waterStatus === 'alert'),
      summary: { total: departments.length, ...counts },
    };
  },
};
