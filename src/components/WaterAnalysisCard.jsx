import { logic } from '../services/logic';
import { FaEye, FaTrash, FaCheckCircle, FaExclamationTriangle, FaHourglassHalf } from 'react-icons/fa';

export default function WaterAnalysisCard({ analysis, onEdit, onDelete }) {
  const getStatusInfo = (result) => {
    switch (result) {
      case 'potable':
        return {
          icon: <FaCheckCircle color="var(--success)" size={24} />,
          badge: <span className="badge badge-green">Potable</span>,
        };
      case 'non_potable':
        return {
          icon: <FaExclamationTriangle color="var(--danger)" size={24} />,
          badge: <span className="badge badge-red">Non Potable</span>,
        };
      default:
        return {
          icon: <FaHourglassHalf color="var(--text-muted)" size={24} />,
          badge: <span className="badge badge-yellow">En attente</span>,
        };
    }
  };

  const statusInfo = getStatusInfo(analysis.result);

  return (
    <div className="card" style={{ border: '2px solid black', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        {statusInfo.icon}
        <h4 style={{ margin: 0, flex: 1 }}>{logic.formatDateDisplay(analysis.request_date)}</h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div className="label">Prélèvement</div>
          <div>{logic.formatDateDisplay(analysis.sample_date)}</div>
        </div>
        <div>
          <div className="label">Résultat</div>
          <div>{logic.formatDateDisplay(analysis.result_date)}</div>
        </div>
      </div>

      <div>
          <div className="label">Verdict</div>
          <div>{statusInfo.badge}</div>
      </div>

      {analysis.notes && (
        <div style={{ marginTop: '1rem' }}>
          <div className="label">Notes</div>
          <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            {analysis.notes}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn btn-outline btn-sm" onClick={() => onEdit(analysis)} title="Voir Détails">
          <FaEye />
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onDelete(analysis.id)}
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          title="Supprimer"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}
