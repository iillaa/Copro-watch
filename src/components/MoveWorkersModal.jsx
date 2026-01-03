import { useState } from 'react';

export default function MoveWorkersModal({ departments, onConfirm, onCancel }) {
  const [selectedDeptId, setSelectedDeptId] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '400px' }}>
        <h3 style={{ marginTop: 0 }}>Déplacer les travailleurs</h3>
        <p style={{ color: 'var(--text-muted)' }}>Veuillez choisir le nouveau service :</p>

        <div style={{ marginBottom: '1.5rem' }}>
          <select className="input" value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}>
            <option value="">-- Choisir un service --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" disabled={!selectedDeptId} onClick={() => onConfirm(selectedDeptId)}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}
