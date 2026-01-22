import { FaTrash, FaArchive, FaArrowRight, FaTimes, FaCalendarAlt, FaPrint, FaClipboardCheck } from 'react-icons/fa';

export default function BulkActionsToolbar({
  selectedCount,
  onDelete,
  onArchive,
  onMove,
  onSchedule, // [NEW]
  onPrint, // [NEW]
  onResult,
  onCancel,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--surface)',
        border: 'var(--border-width) solid var(--border-color)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-hard)',
        padding: '0.8rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        zIndex: 1000,
        minWidth: '380px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontWeight: 800, color: 'var(--primary)', minWidth: '80px' }}>
        {selectedCount} <span style={{ fontSize: '0.8em', fontWeight: 400 }}>sélectionné(s)</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {/* --- NOUVEAUX BOUTONS --- */}
        {onSchedule && (
          <button
            onClick={onSchedule}
            className="btn btn-sm btn-primary"
            title="Planifier Consultation"
          >
            <FaCalendarAlt />
          </button>
        )}
        
{onResult && (
          <button
            onClick={onResult}
            className="btn btn-sm btn-white" 
            
            title="Saisir Résultats Groupés"
          >
            <FaClipboardCheck />
          </button>
        )}

        {onPrint && (
          <button onClick={onPrint} className="btn btn-sm btn-outline" title="Imprimer Documents">
            <FaPrint />
          </button>
        )}

        <div style={{ width: '1px', background: '#ddd', margin: '0 5px' }}></div>
        {/* ------------------------- */}

        {onMove && (
          <button onClick={onMove} className="btn btn-sm btn-outline" title="Déplacer">
            <FaArrowRight />
          </button>
        )}
        {onArchive && (
          <button onClick={onArchive} className="btn btn-sm btn-outline" title="Archiver">
            <FaArchive />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="btn btn-sm btn-outline"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            title="Supprimer"
          >
            <FaTrash />
          </button>
        )}
        <button
          onClick={onCancel}
          className="btn btn-sm btn-outline"
          style={{ marginLeft: '0.5rem', borderColor: 'transparent', color: '#666' }}
          title="Annuler"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
}
