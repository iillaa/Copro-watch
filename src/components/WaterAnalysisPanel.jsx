import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import {
  FaSave,
  FaCheckCircle,
  FaTrash,
  FaUndo,
  FaExclamationTriangle,
  FaNotesMedical,
  FaChartBar,
} from 'react-icons/fa';

export default function WaterAnalysisPanel({ department, analyses, onUpdate }) {
  // 1. Find the relevant analysis for the CURRENT MONTH
  const history = [...analyses].sort((a, b) => {
    const dateA = new Date(a.request_date || a.sample_date);
    const dateB = new Date(b.request_date || b.sample_date);
    const diff = dateB - dateA;
    return diff !== 0 ? diff : b.id - a.id;
  });

  const currentMonthAnalysis = history.find((a) => {
    const d = new Date(a.request_date || a.sample_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // 2. Form State
  const [formData, setFormData] = useState({
    request_date: '',
    sample_date: '',
    result_date: '',
    result: 'pending',
    notes: '',
  });

  const [isCreatingRetest, setIsCreatingRetest] = useState(false);

  // 3. Load Data
  useEffect(() => {
    if (isCreatingRetest) return;

    if (currentMonthAnalysis) {
      setFormData({
        id: currentMonthAnalysis.id,
        request_date: currentMonthAnalysis.request_date || '',
        sample_date: currentMonthAnalysis.sample_date || '',
        result_date: currentMonthAnalysis.result_date || '',
        result: currentMonthAnalysis.result || 'pending',
        notes: currentMonthAnalysis.notes || '',
        department_id: department.id,
      });
    } else {
      resetForm();
    }
  }, [department, currentMonthAnalysis, isCreatingRetest]);

  const resetForm = () => {
    setFormData({
      department_id: department.id,
      request_date: new Date().toISOString().split('T')[0],
      sample_date: '',
      result_date: '',
      result: 'pending',
      notes: '',
    });
  };

  // 4. Save Handler
  const handleSave = async (step) => {
    let dataToSave = { ...formData, department_id: department.id };
    const today = new Date().toISOString().split('T')[0];

    if (step === 'sample' && !dataToSave.sample_date) dataToSave.sample_date = today;
    if (step === 'result' && !dataToSave.result_date) dataToSave.result_date = today;

    await db.saveWaterAnalysis(dataToSave);
    setIsCreatingRetest(false);
    onUpdate();
  };

  // 5. Undo/Reset Handler
  const handleUndo = async (step) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette étape ?')) return;

    let dataToSave = { ...formData };

    if (step === 'result') {
      dataToSave.result_date = '';
      dataToSave.result = 'pending';
    } else if (step === 'sample') {
      dataToSave.sample_date = '';
      dataToSave.result_date = '';
      dataToSave.result = 'pending';
    } else if (step === 'request') {
      if (dataToSave.id) {
        await db.deleteWaterAnalysis(dataToSave.id);
        onUpdate();
        return;
      }
    }

    setFormData(dataToSave);
    await db.saveWaterAnalysis(dataToSave);
    onUpdate();
  };

  // 6. Retest Handler
  const handleStartRetest = () => {
    setIsCreatingRetest(true);
    setFormData({
      department_id: department.id,
      request_date: new Date().toISOString().split('T')[0],
      sample_date: '',
      result_date: '',
      result: 'pending',
      notes: 'Contre-visite : ',
    });
  };

  // 7. Calculate Stats for Dashboard
  const stats = useMemo(() => {
    const potable = analyses.filter((a) => a.result === 'potable').length;
    const nonPotable = analyses.filter((a) => a.result === 'non_potable').length;
    const pending = analyses.filter((a) => a.result === 'pending' || !a.result).length;
    const total = analyses.length;
    return { potable, nonPotable, pending, total };
  }, [analyses]);

  // Helper to determine status color
  const getResultColor = () => {
    if (!formData.result_date) return 'var(--border-color)';
    if (formData.result === 'potable') return 'var(--success)';
    if (formData.result === 'non_potable') return 'var(--danger)';
    return 'var(--warning)';
  };

  return (
    <div
      className="card"
      style={{
        height: 'auto',
        minHeight: '400px',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '3px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        style={{
          paddingBottom: '1rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary)' }}>
          {department.name}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Suivi Mensuel</p>
      </div>

      {/* NEW: Annual Overview Section */}
      <div style={{ borderTop: '3px solid var(--border-color)', borderBottom: '3px solid var(--border-color)', padding: '1rem 0', margin: '1rem 0' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaChartBar /> Aperçu Annuel
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.potable}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Potable</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{stats.nonPotable}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Non Potable</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{stats.pending}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En Attente</div>
          </div>
        </div>
        {stats.total > 0 && (
          <div style={{ height: '20px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(stats.potable / stats.total) * 100}%`, background: 'var(--success)' }}></div>
            <div style={{ width: `${(stats.nonPotable / stats.total) * 100}%`, background: 'var(--danger)' }}></div>
            <div style={{ width: `${(stats.pending / stats.total) * 100}%`, background: 'var(--border-color)' }}></div>
          </div>
        )}
      </div>

      {isCreatingRetest && (
        <div
          style={{
            background: 'var(--danger-light)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '2px dashed var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <FaExclamationTriangle color="var(--danger)" size={24} />
          <div>
            <strong>CONTRE-VISITE EN COURS</strong>
            <div style={{ fontSize: '0.9rem' }}>Suite à une non-conformité. Veuillez documenter la nouvelle demande.</div>
          </div>
        </div>
      )}

      {/* Visual Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative', padding: '0 2rem' }}>
        <div style={{ position: 'absolute', top: '15px', left: '3rem', right: '3rem', height: '4px', background: '#e2e8f0', zIndex: 0 }}></div>
        <StepIndicator active={!!formData.request_date} label="Demandé" color="var(--primary)" />
        <StepIndicator active={!!formData.sample_date} label="Prélevé" color="var(--warning)" />
        <StepIndicator active={!!formData.result_date} label="Résultat" color={getResultColor()} />
      </div>

      {/* Steps Form Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* STEP 1: REQUEST */}
        <div className={`card ${formData.sample_date ? 'completed' : ''}`} style={{ border: '2px solid var(--border-color)', margin: 0, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>1. Demande d'analyse</h4>
            {formData.request_date && !formData.sample_date && !isCreatingRetest && (
              <button className="btn btn-sm btn-outline" onClick={() => handleUndo('request')} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                <FaTrash size={12} /> Annuler
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Date de la demande</label>
              <input type="date" className="input" value={formData.request_date} onChange={(e) => setFormData({ ...formData, request_date: e.target.value })} disabled={!!formData.sample_date} />
            </div>
            {(!formData.id || isCreatingRetest) && (
              <button className="btn btn-primary" onClick={() => handleSave('request')}>
                <FaSave /> {isCreatingRetest ? 'Lancer Contre-visite' : 'Créer'}
              </button>
            )}
          </div>
        </div>

        {/* STEP 2: SAMPLE */}
        {formData.id && !isCreatingRetest && (
          <div className={`card ${formData.result_date ? 'completed' : ''}`} style={{ border: '2px solid var(--border-color)', margin: 0, padding: '1rem', borderColor: !formData.sample_date ? 'var(--warning)' : 'var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0 }}>2. Prélèvement</h4>
              {formData.sample_date && !formData.result_date && (
                <button className="btn btn-sm btn-outline" onClick={() => handleUndo('sample')} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  <FaUndo size={12} /> Corriger
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Date de prélèvement</label>
                <input type="date" className="input" value={formData.sample_date} onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })} disabled={!!formData.result_date} />
              </div>
              {!formData.sample_date && (
                <button className="btn btn-warning" onClick={() => handleSave('sample')} style={{ color: 'black' }}>
                  <FaCheckCircle /> Confirmer
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: RESULT */}
        {formData.sample_date && !isCreatingRetest && (
          <div className="card" style={{ border: '2px solid var(--border-color)', margin: 0, padding: '1rem', background: formData.result_date ? 'white' : '#f0f9ff', borderColor: !formData.result_date ? 'var(--primary)' : 'var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0 }}>3. Résultat Laboratoire</h4>
              {formData.result_date && formData.result !== 'non_potable' && (
                <button className="btn btn-sm btn-outline" onClick={() => handleUndo('result')} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  <FaUndo size={12} /> Corriger
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Date Résultat</label>
                <input type="date" className="input" value={formData.result_date} onChange={(e) => setFormData({ ...formData, result_date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Verdict</label>
                <select className="input" value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} style={{ fontWeight: 'bold', color: formData.result === 'potable' ? 'var(--success)' : formData.result === 'non_potable' ? 'var(--danger)' : 'inherit' }}>
                  <option value="pending">En attente</option>
                  <option value="potable">✅ EAU POTABLE</option>
                  <option value="non_potable">⚠️ EAU NON POTABLE</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label className="label">Notes / Mesures</label>
              <input className="input" placeholder="Ex: Chloration effectuée..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => handleSave('result')}>
                <FaSave /> Enregistrer le résultat
              </button>
            </div>
          </div>
        )}

        {formData.result === 'non_potable' && formData.result_date && !isCreatingRetest && (
          <div className="card" style={{ background: 'var(--danger)', color: 'white', textAlign: 'center', border: '3px solid black', animation: 'pulse 2s infinite' }}>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>⚠️ EAU NON POTABLE</h3>
            <p style={{ marginBottom: '1rem' }}>Une contre-visite est requise immédiatement.</p>
            <button className="btn" style={{ background: 'white', color: 'var(--danger)', border: '2px solid black', fontWeight: 'bold', fontSize: '1.1rem' }} onClick={handleStartRetest}>
              <FaNotesMedical style={{ marginRight: '0.5rem' }} />
              Planifier Contre-Visite
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ active, label, color }) {
  const finalColor = active ? color || 'var(--primary)' : 'white';
  const borderColor = active ? 'var(--border-color)' : '#cbd5e1';
  return (
    <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: finalColor, border: `3px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'white' : '#cbd5e1', marginBottom: '0.5rem', boxShadow: active ? 'var(--shadow-hard)' : 'none', transition: 'all 0.3s' }}>
        {active && <FaCheckCircle size={14} />}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: active ? 'var(--text-main)' : 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}
