import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaCalendar, FaUserMd, FaFlask, FaCheckCircle, FaSave, FaTimes } from 'react-icons/fa';

export default function ExamForm({ worker, existingExam, onClose, onSave }) {
  const [formData, setFormData] = useState({
    exam_date: new Date().toISOString().split('T')[0],
    physician_name: 'Dr Kibeche',
    lab_result: 'pending', // 'pending', 'negative', 'positive'
    status: 'apte', // 'apte', 'inapte', 'apte_partielle'
    notes: '',
  });

  useEffect(() => {
    if (existingExam) {
      setFormData({
        exam_date: existingExam.exam_date,
        physician_name: existingExam.physician_name,
        lab_result: existingExam.lab_result?.result || 'pending',
        status: existingExam.decision?.status || 'apte',
        notes: existingExam.notes || '',
      });
    }
  }, [existingExam]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const examData = {
      worker_id: worker.id,
      exam_date: formData.exam_date,
      physician_name: formData.physician_name,
      notes: formData.notes,
      // Structure specific objects
      lab_result: formData.lab_result === 'pending' ? null : { 
        result: formData.lab_result, 
        date: formData.exam_date 
      },
      decision: { 
        status: formData.status, 
        date: formData.exam_date, 
        valid_until: logic.calculateNextDueDate(formData.exam_date, 6) // Default 6 months
      }
    };

    try {
      if (existingExam) {
        await db.saveExam({ ...existingExam, ...examData });
      } else {
        await db.saveExam(examData);
      }
      
      // Update worker next due date automatically
      await logic.updateWorkerStatus(worker.id);
      
      onSave();
    } catch (error) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{existingExam ? 'Modifier Examen' : 'Nouvel Examen'}</h3>
          <button className="btn-icon" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body">
          <form id="exam-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              
              <div className="form-group">
                <label><FaCalendar /> Date de l'examen</label>
                <input
                  type="date"
                  className="input"
                  value={formData.exam_date}
                  onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label><FaUserMd /> Médecin</label>
                <input
                  className="input"
                  value={formData.physician_name}
                  onChange={(e) => setFormData({ ...formData, physician_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label><FaFlask /> Résultat Labo</label>
                <select
                  className="input"
                  value={formData.lab_result}
                  onChange={(e) => setFormData({ ...formData, lab_result: e.target.value })}
                  style={{ 
                    borderColor: formData.lab_result === 'positive' ? 'var(--danger)' : 
                                 formData.lab_result === 'negative' ? 'var(--success)' : '' 
                  }}
                >
                  <option value="pending">En attente</option>
                  <option value="negative">Négatif (Normal)</option>
                  <option value="positive">Positif (Anormal)</option>
                </select>
              </div>

              <div className="form-group">
                <label><FaCheckCircle /> Décision / Aptitude</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="apte">Apte</option>
                  <option value="apte_partielle">Apte Partiel</option>
                  <option value="inapte">Inapte Temporaire</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Observations</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Remarques cliniques..."
                />
              </div>

            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" form="exam-form" className="btn btn-primary"><FaSave /> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}