import { logic } from '../services/logic';
import { FaEye, FaTrash } from 'react-icons/fa';

export default function WaterAnalysisCard({
  analysis,
  onEdit,
  onDelete,
}) {
  const renderStatusBadge = (result) => {
    if (!result || result === 'pending')
      return <span className="badge badge-yellow">En attente</span>;
    if (result === 'potable') return <span className="badge badge-green">Potable</span>;
    if (result === 'non_potable') return <span className="badge badge-red">Non Potable</span>;
    return '-';
  };

  return (
    <div className="card" style={{ marginBottom: '1rem', border: '2px solid black', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>{logic.formatDateDisplay(analysis.request_date)}</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}
      >
        <div>
          <div className="label">Prélèvement</div>
          <div>{logic.formatDateDisplay(analysis.sample_date)}</div>
        </div>
        <div>
          <div className="label">Résultat</div>
          <div>{logic.formatDateDisplay(analysis.result_date)}</div>
        </div>
        <div>
          <div className="label">Verdict</div>
          <div>{renderStatusBadge(analysis.result)}</div>
        </div>
      </div>

      {analysis.notes && (
        <div>
          <div className="label">Notes</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            {analysis.notes}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          marginTop: '1rem',
        }}
      >
        <button className="btn btn-outline btn-sm" onClick={() => onEdit(analysis)} title="Voir Détails">
          <FaEye />
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onDelete(analysis.id)}
          style={{
            color: 'var(--danger)',
            borderColor: 'var(--danger)',
          }}
          title="Supprimer"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}
