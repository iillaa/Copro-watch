import { describe, it, expect } from 'vitest';
import { logic } from '../logic';

describe('logic.calculateNextExamDue', () => {
  it('returns today if lastExamDateStr is falsy', () => {
    const res = logic.calculateNextExamDue(null);
    expect(res).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('returns 6 months after last exam', () => {
    const res = logic.calculateNextExamDue('2024-01-01');
    expect(res).toBe('2024-07-01');
  });
});

describe('logic.calculateRetestDate', () => {
  it('adds days to treatment start', () => {
    const res = logic.calculateRetestDate('2024-01-01', 10);
    expect(res).toBe('2024-01-11');
  });
});

describe('logic.recalculateWorkerStatus', () => {
  it('handles empty exams array', () => {
    const res = logic.recalculateWorkerStatus([]);
    expect(res.last_exam_date).toBeNull();
    expect(res.next_exam_due).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('computes next due from apte exam', () => {
    const exams = [
      { exam_date: '2024-01-01', decision: { status: 'apte' } },
    ];
    const res = logic.recalculateWorkerStatus(exams);
    expect(res.next_exam_due).toBe('2024-07-01');
  });
});
