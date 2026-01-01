import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { FaUser, FaIdCard, FaBuilding, FaBriefcase, FaSave, FaTimes } from 'react-icons/fa';

export default function AddWorkerForm({ onClose, onSave, workerToEdit }) {
  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    department_id: '',
    workplace_id: '',
    job_role: '',
    notes: '',
  });

  const [departments, setDepartments] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);

  useEffect(() => {
    const loadOptions = async () => {
      const [d, w] = await Promise.all([db.getDepartments(), db.getWorkplaces()]);
      setDepartments(d);
      setWorkplaces(w);
    };
    loadOptions();

    if (workerToEdit) {
      setFormData({
        full_name: workerToEdit.full_name || '',
        national_id: workerToEdit.national_id || '',
        department_id: workerToEdit.department_id || '',
        workplace_id: workerToEdit.workplace_id || '',
        job_role: workerToEdit.job_role || '',
        notes: workerToEdit.notes || '',
      });
    }
  }, [workerToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.national_id) {
      alert('Nom et Matricule requis');
      return;
    }

    try {
      if (workerToEdit) {
        await db.saveWorker({ ...workerToEdit, ...formData });
      } else {
        await db.saveWorker(formData);
      }
      onSave();
    } catch (error) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>
            {workerToEdit ? 'Modifier Travailleur' : 'Nouveau Travailleur'}
          </h3>
          <button className="btn-icon" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body">
          <form id="worker-form" onSubmit={handleSubmit}>
            
            {/* Grid for compact layout */}
            <div className="form-grid">
              
              <div className="form-group">
                <label><FaUser /> Nom Complet</label>
                <input
                  className="input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="ex: Dr Kibeche"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaIdCard /> Matricule</label>
                <input
                  className="input"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  placeholder="ex: 123456"
                  required
                />
              </div>

              <div className="form-group">
                <label><FaBuilding /> Service</label>
                <select
                  className="input"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                >
                  <option value="">-- Sélectionner --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label><FaBriefcase /> Lieu</label>
                <select
                  className="input"
                  value={formData.workplace_id}
                  onChange={(e) => setFormData({ ...formData, workplace_id: e.target.value })}
                >
                  <option value="">-- Sélectionner --</option>
                  {workplaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>Poste / Fonction</label>
                <input
                  className="input"
                  value={formData.job_role}
                  onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                  placeholder="ex: Infirmier"
                />
              </div>

              <div className="form-group full-width">
                <label>Notes / Antécédents</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" form="worker-form" className="btn btn-primary"><FaSave /> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}