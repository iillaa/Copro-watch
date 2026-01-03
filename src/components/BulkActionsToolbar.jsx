
import React from 'react';
import { FaTrash, FaArrowRight } from 'react-icons/fa';

export default function BulkActionsToolbar({
  selectedCount,
  onDelete,
  onMove,
  onClearSelection,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--surface)',
        padding: '1rem 2rem',
        borderRadius: 'var(--radius)',
        border: 'var(--border-width) solid var(--border-color)',
        boxShadow: 'var(--shadow-hard)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        zIndex: 1000,
      }}
    >
      <div style={{ fontWeight: 'bold' }}>
        {selectedCount} {selectedCount > 1 ? 'travailleurs sélectionnés' : 'travailleur sélectionné'}
      </div>
      <button className="btn btn-outline" onClick={onDelete} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
        <FaTrash /> Supprimer
      </button>
      <button className="btn btn-outline" onClick={onMove}>
        <FaArrowRight /> Déplacer
      </button>
      <button className="btn btn-outline" onClick={onClearSelection}>
        Annuler
      </button>
    </div>
  );
}
