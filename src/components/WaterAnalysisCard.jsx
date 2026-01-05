import { logic } from '../services/logic';
import { FaEye, FaTrash } from 'react-icons/fa';
import './WaterAnalysisCard.css';

export default function WaterAnalysisCard({
  analysis,
  isSelected,
  isSelectionMode,
  onEdit,
  onDelete,
  onToggleSelect,
}) {
  const renderStatusBadge = (result) => {
    if (!result || result === 'pending')
      return <span className="badge badge-yellow">En attente</span>;
    if (result === 'potable') return <span className="badge badge-green">Potable</span>;
    if (result === 'non_potable') return <span className="badge badge-red">Non Potable</span>;
    return '-';
  };

  return (
    <div className={`card water-analysis-card ${isSelected ? 'selected' : ''}`}>
      <div className="water-analysis-card-header">
        <div className="date">{logic.formatDateDisplay(analysis.request_date)}</div>
        {isSelectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(analysis.id)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      <div className="water-analysis-card-body">
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

      <div>
        <div className="label">Notes</div>
        <div className="water-analysis-card-notes">
          {analysis.notes ? (
            <span title={analysis.notes}>
              {analysis.notes.length > 100 ? `${analysis.notes.substring(0, 100)}...` : analysis.notes}
            </span>
          ) : (
            '-'
          )}
        </div>
      </div>

      <div className="water-analysis-card-footer">
        <button className="btn btn-outline btn-sm" onClick={() => onEdit(analysis)} title="Voir Détails">
          <FaEye />
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onDelete(analysis.id)}
          style={{
            color: 'var(--danger)',
            borderColor: 'var(--danger)',
            backgroundColor: '#fff1f2',
          }}
          title="Supprimer"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}
