import {
  addMonths,
  addDays,
  isBefore,
  isAfter,
  parseISO,
  format,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  getMonth,
  getYear,
} from 'date-fns';

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
    const dueSoon = workers.filter(
      (w) => this.isDueSoon(w.next_exam_due) && !this.isOverdue(w.next_exam_due)
    );

    // 2. Overdue
    const overdue = workers.filter((w) => this.isOverdue(w.next_exam_due));

    // 3. Positive / Inapte cases (Active)
    // Find latest exam for each worker
    const activePositive = [];
    const retests = [];

    workers.forEach((w) => {
      // Find exams for this worker
      const workerExams = exams.filter((e) => e.worker_id === w.id);
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
      retests,
    };
  },

  // ==========================================
  // NEW WATER ANALYSIS LOGIC (3-STEP WORKFLOW)
  // ==========================================

  // 1. Helper: Get current month range
  getCurrentMonthRange() {
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
      month: getMonth(today),
      year: getYear(today),
    };
  },

  /**
   * Determine status for a service (department) in current month
   * 3 Steps: Requested -> Pending (Sampled) -> Result (OK/Alert)
   */
  getServiceWaterStatus(departmentId, allAnalyses) {
    const { start, end } = this.getCurrentMonthRange();

    // Filter analyses for this department in current month
    const monthAnalyses = allAnalyses.filter((analysis) => {
      // Compatibility: handle both IDs (legacy structure_id vs new department_id)
      const analysisDepartmentId = analysis.department_id || analysis.structure_id;
      if (analysisDepartmentId !== departmentId) return false;

      // Check if ANY relevant date falls in current month
      const dateToCheck = analysis.sample_date || analysis.request_date;
      if (!dateToCheck) return false;

      const pDate = parseISO(dateToCheck);
      return pDate >= start && pDate <= end;
    });

    // If no activity this month -> TODO
    if (monthAnalyses.length === 0) {
      return { status: 'todo', analysis: null, lastDate: null };
    }

    // Sort by latest activity (Newest date first)
    monthAnalyses.sort((a, b) => {
      const dateA = a.request_date || a.sample_date;
      const dateB = b.request_date || b.sample_date;
      return new Date(dateB) - new Date(dateA);
    });

    const latest = monthAnalyses[0];
    const relevantDate = latest.sample_date || latest.request_date;

    // --- DETERMINE STATUS ---

    // Step 1: Requested (Has request_date, but NO sample_date)
    if (latest.request_date && !latest.sample_date) {
      return {
        status: 'requested',
        analysis: latest,
        lastDate: relevantDate,
      };
    }

    // Step 2: Sampled/Pending (Has sample_date, result is 'pending')
    if (latest.result === 'pending') {
      return {
        status: 'pending',
        analysis: latest,
        lastDate: relevantDate,
      };
    }

    // Step 3: Completed (Has result)
    if (latest.result === 'potable') {
      return {
        status: 'ok',
        analysis: latest,
        lastDate: relevantDate,
      };
    }

    if (latest.result === 'non_potable') {
      return {
        status: 'alert',
        analysis: latest,
        lastDate: relevantDate,
      };
    }

    // Fallback
    return { status: 'todo', analysis: null, lastDate: null };
  },

  /**
   * Get all departments with their current water analysis status
   * This is used by the Left Panel List
   */
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

  // Helper for UI Labels
  getServiceWaterStatusLabel(status) {
    switch (status) {
      case 'todo':
        return 'À Faire';
      case 'requested':
        return 'Demandé'; // Blue
      case 'pending':
        return 'En Cours'; // Orange
      case 'ok':
        return 'OK'; // Green
      case 'alert':
        return 'ALERTE'; // Red
      default:
        return '-';
    }
  },

  // Helper for UI Colors
  getServiceWaterStatusColor(status) {
    switch (status) {
      case 'todo':
        return '#94a3b8'; // Slate 400
      case 'requested':
        return '#3b82f6'; // Blue
      case 'pending':
        return '#f59e0b'; // Amber
      case 'ok':
        return '#22c55e'; // Green
      case 'alert':
        return '#ef4444'; // Red
      default:
        return '#94a3b8';
    }
  },

  // Dashboard Stats (Safe to keep or replace)
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
