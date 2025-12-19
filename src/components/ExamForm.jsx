import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { format } from 'date-fns';

export default function ExamForm({
  worker,
  existingExam,
  onClose,
  onSave,
  deptName,
  workplaceName,
}) {
  const [formData, setFormData] = useState({
    exam_date: format(new Date(), 'yyyy-MM-dd'),
    physician_name: 'Dr. Principal',
    notes: '',
    status: 'open',
    // Lab
    lab_result: null, // { result: 'negative'|'positive', parasite: '', date: '' }
    // Treatment
    treatment: null, // { drug: '', dose: '', duration: '', start_date: '', retest_date: '' }
    // Decision
    decision: null, // { status: 'apte'|'inapte'|'apte_partielle', date: '' }
  });

  useEffect(() => {
    if (existingExam) {
      setFormData(existingExam);
    }
  }, [existingExam]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLabResult = (result) => {
    const labData = {
      result, // 'positive' or 'negative'
      date: formData.exam_date, // Use the exam date selected by user (allows back-dating)
      parasite: result === 'positive' ? 'Parasite X' : '',
    };
    updateField('lab_result', labData);
  };

  const handleDecision = async (status) => {
    // 1. Save Decision
    // Use the exam date for the decision date too, to keep history consistent
    const decision = { status, date: formData.exam_date };
    const newExamData = { ...formData, decision, status: 'closed' };

    await db.saveExam({ ...newExamData, worker_id: worker.id });

    // 2. Recalculate Worker Status based on full history
    const allExams = await db.getExams();
    const workerExams = allExams.filter((e) => e.worker_id === worker.id);
    const statusUpdate = logic.recalculateWorkerStatus(workerExams);

    await db.saveWorker({ ...worker, ...statusUpdate });

    onSave();
  };

  const saveWithoutDecision = async () => {
    await db.saveExam({ ...formData, worker_id: worker.id });

    // Recalculate status (e.g. update last_exam_date if this is the newest)
    const allExams = await db.getExams();
    const workerExams = allExams.filter((e) => e.worker_id === worker.id);
    const statusUpdate = logic.recalculateWorkerStatus(workerExams);

    await db.saveWorker({ ...worker, ...statusUpdate });

    onSave();
  };

  // Render Helpers
  const isPositive = formData.lab_result?.result === 'positive';
  const isNegative = formData.lab_result?.result === 'negative';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          Examen Médical - {worker.full_name}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          <strong>Service:</strong> {deptName || '-'} • <strong>Lieu:</strong>{' '}
          {workplaceName || '-'} • <strong>Poste:</strong> {worker.job_role || '-'}
        </p>

        {/* Basic Info */}
        <div className="card" style={{ background: '#f9fafb' }}>
          <div className="form-group">
            <label className="label">Date de l'examen</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="date"
                className="input"
                value={formData.exam_date}
                onChange={(e) => updateField('exam_date', e.target.value)}
              />
              {new Date(formData.exam_date) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                <span className="badge badge-yellow">⚠️ Mode Historique</span>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="label">Médecin</label>
            <input
              className="input"
              value={formData.physician_name}
              onChange={(e) => updateField('physician_name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Examen clinique</label>
            <textarea
              className="input"
              rows="2"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Lab Section */}
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4>Laboratoire (Copro-parasitologie)</h4>
          {!formData.lab_result ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-success" onClick={() => handleLabResult('negative')}>
                Résultat Négatif (-)
              </button>
              <button className="btn btn-danger" onClick={() => handleLabResult('positive')}>
                Résultat Positif (+)
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}
              >
                <span
                  className={`badge ${
                    formData.lab_result.result === 'positive' ? 'badge-red' : 'badge-green'
                  }`}
                >
                  Résultat: {formData.lab_result.result.toUpperCase()}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => updateField('lab_result', null)}
                >
                  Modifier
                </button>
              </div>
              {isPositive && (
                <div className="form-group">
                  <label className="label">Type de Parasite</label>
                  <input
                    className="input"
                    value={formData.lab_result.parasite}
                    onChange={(e) =>
                      updateField('lab_result', {
                        ...formData.lab_result,
                        parasite: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Treatment / Decision Section */}
        {isPositive && (
          <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
            <h4>Traitement & Suivi</h4>
            <div className="form-group">
              <label className="label">Médicament & Dose</label>
              <input
                className="input"
                placeholder="Ex: Flagyl 500mg"
                value={formData.treatment?.drug || ''}
                onChange={(e) =>
                  updateField('treatment', { ...(formData.treatment || {}), drug: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="label">Date Début Traitement</label>
              <input
                type="date"
                className="input"
                value={formData.treatment?.start_date || format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) =>
                  updateField('treatment', {
                    ...(formData.treatment || {}),
                    start_date: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label className="label">Contre-visite prévue le:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => {
                    const start =
                      formData.treatment?.start_date || format(new Date(), 'yyyy-MM-dd');
                    const date = logic.calculateRetestDate(start, 7);
                    updateField('treatment', {
                      ...(formData.treatment || {}),
                      start_date: start,
                      retest_date: date,
                    });
                  }}
                >
                  +7 Jours
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => {
                    const start =
                      formData.treatment?.start_date || format(new Date(), 'yyyy-MM-dd');
                    const date = logic.calculateRetestDate(start, 10);
                    updateField('treatment', {
                      ...(formData.treatment || {}),
                      start_date: start,
                      retest_date: date,
                    });
                  }}
                >
                  +10 Jours
                </button>
                <input
                  type="date"
                  className="input"
                  style={{ width: 'auto' }}
                  value={formData.treatment?.retest_date || ''}
                  onChange={(e) =>
                    updateField('treatment', {
                      ...(formData.treatment || {}),
                      retest_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-danger" onClick={() => handleDecision('inapte')}>
                Marquer Inapte Temporaire
              </button>
              <button className="btn btn-warning" onClick={() => handleDecision('apte_partielle')}>
                Apte Partiel (Sous réserve)
              </button>
            </div>
          </div>
        )}

        {isNegative && (
          <div className="card" style={{ borderLeft: '4px solid #22c55e' }}>
            <h4>Décision Finale</h4>
            <p>Le résultat est négatif. Le travailleur peut être déclaré apte.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-success" onClick={() => handleDecision('apte')}>
                Déclarer APTE & Sauvegarder
              </button>
            </div>
          </div>
        )}

        <div
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '1rem' }}
        >
          <button className="btn btn-outline" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-primary" onClick={saveWithoutDecision}>
            Sauvegarder (Sans clôturer)
          </button>
        </div>
      </div>
    </div>
  );
}
