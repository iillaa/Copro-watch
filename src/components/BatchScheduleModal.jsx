import { useState } from 'react';
import { FaCalendarAlt, FaTimes, FaSave } from 'react-icons/fa';

export default function BatchScheduleModal({ count, onConfirm, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [examType, setExamType] = useState('visite_periodique');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(date, examType);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaCalendarAlt /> Planifier pour {count}
          </h3>
          <button onClick={onCancel} className="btn-icon"><FaTimes /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Date de Consultation</label>
            <input 
              type="date" 
              className="input" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Type de Visite</label>
            <select className="input" value={examType} onChange={(e) => setExamType(e.target.value)}>
              <option value="visite_periodique">Visite Périodique</option>
              <option value="visite_embauche">Visite d'Embauche</option>
              <option value="reprise">Visite de Reprise</option>
              <option value="spontanee">Visite Spontanée</option>
            </select>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#666', background: '#f8fafc', padding: '10px', borderRadius: '4px' }}>
            Cela créera une consultation pour chaque travailleur sélectionné et mettra à jour leur prochaine date d'échéance.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onCancel}>Annuler</button>
            <button type="submit" className="btn btn-primary"><FaSave /> Valider</button>
          </div>
        </form>
      </div>
    </div>
  );
}