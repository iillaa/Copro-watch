import { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { logic } from '../../services/logic';
import { FaExclamationTriangle, FaClipboardList } from 'react-icons/fa';

export default function MobileDashboard({ onNavigateWorker }) {
  const [stats, setStats] = useState({ overdue: [], dueSoon: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [workers, exams] = await Promise.all([db.getWorkers(), db.getExams()]);
      const active = workers.filter((w) => !w.archived);
      const s = logic.getDashboardStats(active, exams);

      // Sort priority
      s.overdue.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
      s.dueSoon.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));

      setStats(s);
      setLoading(false);
    };
    load();
  }, []);

  if (loading)
    return (
      <div className="loading-spinner" style={{ margin: '2rem auto', display: 'block' }}></div>
    );

  return (
    <div className="mobile-layout">
      <div className="mobile-header">
        <h2>Tableau de bord</h2>
      </div>

      {/* Summary Chips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          padding: '0 1rem 1.5rem 1rem',
        }}
      >
        <div
          className="mobile-card"
          style={{ background: 'var(--danger-light)', marginBottom: 0, textAlign: 'center' }}
        >
          <FaExclamationTriangle size={24} color="var(--danger)" />
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>
            {stats.overdue.length}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)' }}>
            Retard
          </div>
        </div>
        <div
          className="mobile-card"
          style={{ background: 'var(--warning-light)', marginBottom: 0, textAlign: 'center' }}
        >
          <FaClipboardList size={24} color="var(--warning)" />
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)' }}>
            {stats.dueSoon.length}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning-text)' }}>
            À Faire
          </div>
        </div>
      </div>

      {/* List */}
      <h3 style={{ padding: '0 1rem', fontSize: '1.1rem' }}>Priorités</h3>
      <div style={{ padding: '0 1rem' }}>
        {stats.overdue.map((w) => (
          <div
            key={w.id}
            className="mobile-card"
            onClick={() => onNavigateWorker(w.id)}
            style={{ borderLeft: '5px solid var(--danger)' }}
          >
            <div className="mobile-card-header">
              <span className="mobile-card-title">{w.full_name}</span>
              <span className="badge badge-red">Retard</span>
            </div>
            <div className="mobile-card-row">
              <span>Dû le:</span>
              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                {logic.formatDate(new Date(w.next_exam_due))}
              </span>
            </div>
          </div>
        ))}
        {stats.dueSoon.map((w) => (
          <div
            key={w.id}
            className="mobile-card"
            onClick={() => onNavigateWorker(w.id)}
            style={{ borderLeft: '5px solid var(--warning)' }}
          >
            <div className="mobile-card-header">
              <span className="mobile-card-title">{w.full_name}</span>
              <span className="badge badge-yellow">Bientôt</span>
            </div>
            <div className="mobile-card-row">
              <span>Dû le:</span>
              <span>{logic.formatDate(new Date(w.next_exam_due))}</span>
            </div>
          </div>
        ))}
        {stats.overdue.length === 0 && stats.dueSoon.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>
            Tout est à jour !
          </div>
        )}
      </div>
    </div>
  );
}
