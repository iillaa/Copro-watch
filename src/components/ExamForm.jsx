import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { format } from 'date-fns';
import { 
  FaCalendar, FaUserMd, FaFlask, FaCheckCircle, 
  FaSave, FaTimes, FaNotesMedical, FaPills, FaClock, FaHistory 
} from 'react-icons/fa';

export default function ExamForm({ worker, existingExam, onClose, onSave, deptName, workplaceName }) {
  // --- STATE FROM CLEAN VERSION ---
  const [validationDate, setValidationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [formData, setFormData] = useState({
    exam_date: format(new Date(), 'yyyy-MM-dd'),
    physician_name: 'Dr. Kibeche Ali Dia Eddine',
    notes: '',
    status: 'open',
    lab_result: null, 
    treatment: null,  
    decision: null    
  });

  useEffect(() => {
    if (existingExam) {
      setFormData(existingExam);
      if (existingExam.decision?.date) {
        setValidationDate(existingExam.decision.date);
      }
    }
  }, [existingExam]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLabResult = (result) => {
    const labData = {
      result,
      date: formData.exam_date,
      parasite: result === 'positive' ? 'Parasite X' : '',
    };
    updateField('lab_result', labData);
  };

  const handleTreatmentDateCalc = (days) => {
    const start = formData.treatment?.start_date || format(new Date(), 'yyyy-MM-dd');
    const retest = logic.calculateRetestDate(start, days);
    updateField('treatment', { ...(formData.treatment || {}), start_date: start, retest_date: retest });
  };

  const handleDecision = async (status) => {
    const finalDecisionDate = validationDate || formData.exam_date;
    const decision = { status, date: finalDecisionDate };
    const newExamData = { ...formData, decision, status: 'closed' };

    if (existingExam) {
        await db.saveExam({ ...existingExam, ...newExamData });
    } else {
        await db.saveExam({ ...newExamData, worker_id: worker.id });
    }

    // Logic from Clean Version: Update Worker Status
    const allExams = await db.getExams();
    const workerExams = allExams.filter((e) => e.worker_id === worker.id);
    const statusUpdate = logic.recalculateWorkerStatus(workerExams);
    await db.saveWorker({ ...worker, ...statusUpdate });

    onSave();
  };

  const saveWithoutDecision = async () => {
    const dataToSave = { ...formData, worker_id: worker.id };
    if (existingExam) {
        await db.saveExam({ ...existingExam, ...dataToSave });
    } else {
        await db.saveExam(dataToSave);
    }
    // Update status even for drafts
    const allExams = await db.getExams();
    const workerExams = allExams.filter((e) => e.worker_id === worker.id);
    const statusUpdate = logic.recalculateWorkerStatus(workerExams);
    await db.saveWorker({ ...worker, ...statusUpdate });
    
    onSave();
  };

  const isPositive = formData.lab_result?.result === 'positive';
  const isNegative = formData.lab_result?.result === 'negative';
  const isLandscape = window.innerHeight < 500;

  return (
    <div className="modal-overlay">
      <div className="modal premium-modal">
        <div className="modal-header">
          <div>
            <h3>{existingExam ? 'Modifier Examen' : 'Nouvel Examen'}</h3>
            <p className="text-muted" style={{ margin: 0 }}>
              {worker.full_name} <span style={{ opacity: 0.5 }}>| {deptName || '-'}</span>
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-grid">
              
              {/* --- SECTION 1: PRESCRIPTION --- */}
              <div className="form-group">
                <label><FaCalendar /> Date Prescription</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                    type="date"
                    className="input"
                    value={formData.exam_date}
                    onChange={(e) => updateField('exam_date', e.target.value)}
                    />
                    {new Date(formData.exam_date) < new Date(new Date().setHours(0,0,0,0)) && 
                        <span className="badge badge-yellow">Historique</span>
                    }
                </div>
              </div>

              <div className="form-group">
                <label><FaUserMd /> Médecin</label>
                <input
                  className="input"
                  value={formData.physician_name}
                  onChange={(e) => updateField('physician_name', e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label><FaNotesMedical /> Notes Cliniques</label>
                <textarea
                  className="input"
                  rows={isLandscape ? 1 : 2}
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Examen clinique..."
                />
              </div>

              {/* --- SECTION 2: LABO (Restored Buttons) --- */}
              <div className="full-width" style={{ borderTop: '2px dashed var(--border-color)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--primary)' }}><FaFlask /> Laboratoire</h4>
              </div>

              {!formData.lab_result ? (
                <div className="full-width" style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn" style={{ background: 'var(--success-light)', color: 'var(--success-dark)', flex: 1, padding: '0.75rem' }} onClick={() => handleLabResult('negative')}>
                    Négatif (-)
                  </button>
                  <button className="btn" style={{ background: 'var(--danger-light)', color: 'var(--danger)', flex: 1, padding: '0.75rem' }} onClick={() => handleLabResult('positive')}>
                     Positif (+)
                  </button>
                </div>
              ) : (
                 <div className="full-width" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                    <span className={`badge ${isPositive ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '1rem', padding: '0.5rem' }}>
                      Résultat: {formData.lab_result.result.toUpperCase()}
                    </span>
                    <button className="btn btn-sm btn-outline" onClick={() => updateField('lab_result', null)}>Modifier</button>
                 </div>
              )}

              {/* --- SECTION 3: TREATMENT (If Positive) --- */}
              {isPositive && (
                <>
                  <div className="form-group">
                    <label><FaFlask /> Parasite</label>
                    <input 
                      className="input" 
                      value={formData.lab_result.parasite || ''} 
                      onChange={(e) => updateField('lab_result', { ...formData.lab_result, parasite: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label><FaPills /> Traitement</label>
                    <input 
                      className="input" 
                      placeholder="Ex: Flagyl" 
                      value={formData.treatment?.drug || ''}
                      onChange={(e) => updateField('treatment', { ...(formData.treatment || {}), drug: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                     <label><FaClock /> Contre-visite</label>
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => handleTreatmentDateCalc(7)}>+7j</button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleTreatmentDateCalc(10)}>+10j</button>
                        <input 
                          type="date" 
                          className="input" 
                          style={{ flex: 1 }}
                          value={formData.treatment?.retest_date || ''}
                          onChange={(e) => updateField('treatment', { ...(formData.treatment || {}), retest_date: e.target.value })}
                        />
                     </div>
                  </div>
                  <div className="full-width" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDecision('inapte')}>Inapte Temporaire</button>
                      <button className="btn btn-warning" style={{ flex: 1 }} onClick={() => handleDecision('apte_partielle')}>Apte Partiel</button>
                  </div>
                </>
              )}

              {/* --- SECTION 4: DECISION (If Negative) --- */}
              {isNegative && (
                <div className="full-width" style={{ background: 'var(--success-light)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                   <div className="form-group">
                      <label style={{ color: 'var(--success-dark)' }}><FaCheckCircle /> Date Validation (Retour)</label>
                      <input 
                        type="date" 
                        className="input" 
                        value={validationDate} 
                        onChange={(e) => setValidationDate(e.target.value)} 
                      />
                      <small style={{ display: 'block', marginTop: '4px' }}>Date de début de validité (6 mois)</small>
                   </div>
                   <button className="btn btn-success full-width" style={{ marginTop: '1rem' }} onClick={() => handleDecision('apte')}>
                      Valider APTE & Clôturer
                   </button>
                </div>
              )}

            </div>
          </form>
        </div>

        <div className="modal-footer">
           <button className="btn btn-outline" onClick={onClose}>Fermer</button>
           {!isNegative && !isPositive && (
              <button className="btn btn-primary" onClick={saveWithoutDecision}>Sauvegarder (Brouillon)</button>
           )}
        </div>
      </div>
    </div>
  );
}