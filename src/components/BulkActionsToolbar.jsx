import { FaTrash, FaArchive, FaArrowRight, FaTimes } from 'react-icons/fa';

export default function BulkActionsToolbar({
  selectedCount,
  onDelete,
  onArchive,
  onMove,
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
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        zIndex: 1000,
        minWidth: '320px',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
        {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onDelete && (
          <button onClick={onDelete} className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Supprimer">
            <FaTrash />
          </button>
        )}
        {onArchive && (
          <button onClick={onArchive} className="btn btn-sm btn-outline" title="Archiver">
            <FaArchive />
          </button>
        )}
        {onMove && (
          <button onClick={onMove} className="btn btn-sm btn-outline" title="Déplacer">
            <FaArrowRight />
          </button>
        )}
        <button onClick={onCancel} className="btn btn-sm btn-outline" style={{ marginLeft: '0.5rem', borderColor: 'transparent' }} title="Annuler">
          <FaTimes />
        </button>
      </div>
    </div>
  );
}
