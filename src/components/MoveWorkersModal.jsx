
import React, { useState } from 'react';

export default function MoveWorkersModal({ departments, onMove, onClose }) {
  const [selectedDept, setSelectedDept] = useState('');

  const handleMove = () => {
    if (selectedDept) {
      onMove(parseInt(selectedDept, 10));
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={{
          animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'scale(0.9)',
          animationFillMode: 'forwards',
        }}
      >
        <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Déplacer les travailleurs</h3>
        <p>Sélectionnez le service de destination :</p>
        <select
          className="input"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        >
          <option value="">Sélectionner un service</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={handleMove} disabled={!selectedDept}>
            Déplacer
          </button>
        </div>
      </div>
    </div>
  );
}
