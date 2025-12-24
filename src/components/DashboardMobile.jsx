import {
  FaChevronRight,
  FaExclamationTriangle,
  FaClipboardList,
  FaMicroscope,
} from 'react-icons/fa';
import { logic } from '../services/logic';

export default function DashboardMobile({ stats, onNavigateWorker, loading }) {
  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: 'var(--text-muted)',
        }}
      >
        Chargement...
      </div>
    );

  return (
    <div style={{ paddingBottom: '80px' }}>
      {' '}
      {/* Space for bottom bar */}
      {/* 1. Header */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Tableau de bord</h2>
      {/* 2. Summary Chips (Horizontal Scroll) */}
      <div
        style={{
          display: 'flex',
          gap: '0.8rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Chip: Urgent */}
        <div
          style={{
            minWidth: '140px',
            padding: '1rem',
            borderRadius: '12px',
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <FaExclamationTriangle size={20} style={{ marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1 }}>
            {stats.overdue.length}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>En Retard</span>
        </div>

        {/* Chip: Due Soon */}
        <div
          style={{
            minWidth: '140px',
            padding: '1rem',
            borderRadius: '12px',
            background: 'var(--warning-light)',
            color: 'var(--warning-text)',
            border: '1px solid var(--warning)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <FaClipboardList size={20} style={{ marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1 }}>
            {stats.dueSoon.length}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>À faire (15j)</span>
        </div>

        {/* Chip: Positive */}
        <div
          style={{
            minWidth: '140px',
            padding: '1rem',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            border: '1px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <FaMicroscope size={20} style={{ marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1 }}>
            {stats.activePositive.length}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Suivi Médical</span>
        </div>
      </div>
      {/* 3. Action Lists */}
      {/* Section A: RETARD (Only show if > 0) */}
      {stats.overdue.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>
            ⚠️ Action Requise
          </h3>
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            {stats.overdue.map((w, i) => (
              <div
                key={w.id}
                onClick={() => onNavigateWorker(w.id)}
                style={{
                  padding: '1rem',
                  borderBottom: i === stats.overdue.length - 1 ? 'none' : '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{w.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                    Retard: {w.next_exam_due}
                  </div>
                </div>
                <FaChevronRight color="#cbd5e1" />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Section B: A FAIRE (Normal) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Prochains Examens</h3>
        {stats.dueSoon.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Rien de prévu pour les 15 prochains jours.
          </p>
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            {stats.dueSoon.map((w, i) => (
              <div
                key={w.id}
                onClick={() => onNavigateWorker(w.id)}
                style={{
                  padding: '1rem',
                  borderBottom: i === stats.dueSoon.length - 1 ? 'none' : '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{w.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Prévu: {w.next_exam_due}
                  </div>
                </div>
                <FaChevronRight color="#cbd5e1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
