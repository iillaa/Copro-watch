import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { FaSave, FaCheckCircle } from 'react-icons/fa';

export default function WaterAnalysisPanel({ department, analyses, onUpdate }) {
  // 1. Find the relevant analysis for the CURRENT MONTH
  // We sort by date descending to get the latest interaction
  const history = [...analyses].sort(
    (a, b) => new Date(b.request_date || b.sample_date) - new Date(a.request_date || a.sample_date)
  );

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

  // 3. Load Data whenever the Department changes
  useEffect(() => {
    if (currentMonthAnalysis) {
      // Load existing data
      setFormData({
        id: currentMonthAnalysis.id,
        request_date: currentMonthAnalysis.request_date || '',
        sample_date: currentMonthAnalysis.sample_date || '',
        result_date: currentMonthAnalysis.result_date || '',
        result: currentMonthAnalysis.result || 'pending',
        notes: currentMonthAnalysis.notes || '',
      });
    } else {
      // Reset form for a new entry (defaults to Today for request)
      setFormData({
        department_id: department.id,
        request_date: new Date().toISOString().split('T')[0],
        sample_date: '',
        result_date: '',
        result: 'pending',
        notes: '',
      });
    }
  }, [department, currentMonthAnalysis]);

  // 4. Save Handler
  const handleSave = async (step) => {
    let dataToSave = { ...formData, department_id: department.id };

    // Auto-fill dates logic (Smart defaults)
    const today = new Date().toISOString().split('T')[0];
    if (step === 'sample' && !dataToSave.sample_date) dataToSave.sample_date = today;
    if (step === 'result' && !dataToSave.result_date) dataToSave.result_date = today;

    await db.saveWaterAnalysis(dataToSave);
    onUpdate(); // Trigger refresh in parent
  };

  return (
    <div
      className="card"
      style={{ height: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '3px solid var(--border-color)',
          paddingBottom: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary)' }}>
          {department.name}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Gestion mensuelle</p>
      </div>

      {/* Visual Progress Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          position: 'relative',
          padding: '0 2rem',
        }}
      >
        {/* The gray line background */}
        <div
          style={{
            position: 'absolute',
            top: '15px',
            left: '3rem',
            right: '3rem',
            height: '4px',
            background: '#e2e8f0',
            zIndex: 0,
          }}
        ></div>

        <StepIndicator active={!!formData.request_date} label="Demandé" />
        <StepIndicator active={!!formData.sample_date} label="Prélevé" />
        <StepIndicator active={!!formData.result_date} label="Résultat" />
      </div>

      {/* Steps Form Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto',
          paddingRight: '0.5rem',
        }}
      >
        {/* STEP 1: REQUEST */}
        <div
          className={`card ${formData.sample_date ? 'completed' : ''}`}
          style={{ border: '1px solid var(--border-color)', margin: 0, padding: '1rem' }}
        >
          <h4 style={{ marginTop: 0 }}>1. Demande d'analyse</h4>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Date de la demande</label>
              <input
                type="date"
                className="input"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
              />
            </div>
            {/* Show Create button only if not yet created */}
            {!formData.id && (
              <button className="btn btn-primary" onClick={() => handleSave('request')}>
                <FaSave /> Créer
              </button>
            )}
          </div>
        </div>

        {/* STEP 2: SAMPLE (Visible if Requested) */}
        {formData.id && (
          <div
            className={`card ${formData.result_date ? 'completed' : ''}`}
            style={{ border: '1px solid var(--border-color)', margin: 0, padding: '1rem' }}
          >
            <h4 style={{ marginTop: 0 }}>2. Prélèvement</h4>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Date du prélèvement</label>
                <input
                  type="date"
                  className="input"
                  value={formData.sample_date}
                  onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })}
                />
              </div>
              {/* Show Confirm button only if date not set */}
              {!formData.sample_date && (
                <button className="btn btn-primary" onClick={() => handleSave('sample')}>
                  <FaCheckCircle /> Confirmer
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: RESULT (Visible if Sampled) */}
        {formData.sample_date && (
          <div
            className="card"
            style={{
              border: '1px solid var(--border-color)',
              margin: 0,
              padding: '1rem',
              background: 'var(--primary-light)',
            }}
          >
            <h4 style={{ marginTop: 0 }}>3. Résultat Laboratoire</h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Date Résultat</label>
                <input
                  type="date"
                  className="input"
                  value={formData.result_date}
                  onChange={(e) => setFormData({ ...formData, result_date: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Verdict</label>
                <select
                  className="input"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  style={{ fontWeight: 'bold' }}
                >
                  <option value="pending">En attente</option>
                  <option value="potable">EAU POTABLE</option>
                  <option value="non_potable">NON POTABLE</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => handleSave('result')}>
                <FaSave /> Enregistrer le résultat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Visual Helper for the timeline bubbles
function StepIndicator({ active, label }) {
  return (
    <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: active ? 'var(--primary)' : 'white',
          border: '3px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          marginBottom: '0.5rem',
          boxShadow: active ? 'var(--shadow-hard)' : 'none',
          transition: 'all 0.3s',
        }}
      >
        {active && <FaCheckCircle size={14} />}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: '0.8rem',
          color: active ? 'var(--text-main)' : 'var(--text-muted)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
