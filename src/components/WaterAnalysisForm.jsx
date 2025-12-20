import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaTimes, FaSave, FaFlask } from 'react-icons/fa';

export default function WaterAnalysisForm({
  type,
  analysis,
  department,
  workplace,
  analysisToEdit,
  onSuccess,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    department_id: department?.id || analysis?.department_id || analysis?.structure_id,
    request_date: new Date().toISOString().split('T')[0], // Default Request to Today
    sample_date: '',
    result_date: '',
    result: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing an existing analysis
  useEffect(() => {
    if (analysisToEdit) {
      setFormData({
        id: analysisToEdit.id,
        department_id: analysisToEdit.department_id || analysisToEdit.structure_id,
        request_date: analysisToEdit.request_date || '', // Load request date
        sample_date: analysisToEdit.sample_date || '',
        result_date: analysisToEdit.result_date || '',
        result: analysisToEdit.result || '',
        notes: analysisToEdit.notes || '',
      });
    }
  }, [analysisToEdit]);

  useEffect(() => {
    // Logic for new entries (not editing)
    if (type === 'edit') {
      // Handled above in analysisToEdit effect
    } else if (type === 'launch') {
      setFormData((prev) => ({
        ...prev,
        department_id: department?.id || workplace?.id,
        request_date: new Date().toISOString().split('T')[0],
        sample_date: new Date().toISOString().split('T')[0], // Default Sample to Today for convenience
      }));
    } else if (type === 'result') {
      setFormData((prev) => ({
        ...prev,
        department_id: analysis?.department_id || analysis?.structure_id,
        request_date: analysis?.request_date || '',
        sample_date: analysis?.sample_date,
        result_date: new Date().toISOString().split('T')[0],
      }));
    } else if (type === 'retest') {
      setFormData((prev) => ({
        ...prev,
        department_id: department?.id || workplace?.id,
        request_date: new Date().toISOString().split('T')[0],
        sample_date: '',
      }));
    }
  }, [type, analysis, department, workplace]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.department_id) {
      setError('Veuillez sélectionner un service.');
      return false;
    }

    // 1. Validate Request Date
    if (!formData.request_date) {
      setError('Veuillez saisir la date de demande.');
      return false;
    }

    // 2. Validate Sample Date (if result is present)
    if (formData.result && formData.result !== 'pending' && !formData.sample_date) {
      setError('Une date de prélèvement est requise pour enregistrer un résultat.');
      return false;
    }

    if ((type === 'result' || type === 'retest') && !formData.result) {
      setError("Veuillez saisir le résultat de l'analyse.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      let analysisData = { ...formData };

      // Ensure 'pending' status if launching without a result
      if (type === 'launch') {
        if (!analysisData.result) analysisData.result = 'pending';
      }

      await db.saveWaterAnalysis(analysisData);
      onSuccess(analysisData);
    } catch (error) {
      console.error('Error saving water analysis:', error);
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    switch (type) {
      case 'launch':
        return 'Nouvelle analyse (Historique)';
      case 'result':
        return 'Saisir le résultat';
      case 'retest':
        return 'Nouvelle analyse (Contre-visite)';
      case 'edit':
        return "Détails / Modifier l'analyse";
      default:
        return "Analyse d'eau";
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <FaFlask style={{ marginRight: '0.5rem' }} /> {getFormTitle()}
          </h3>
          <button onClick={onCancel} className="btn btn-outline" style={{ padding: '0.5rem' }}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. DATE DE DEMANDE */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Date de demande <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="date"
              name="request_date"
              value={formData.request_date}
              onChange={handleInputChange}
              required
              className="input"
            />
          </div>

          {/* 2. DATE DE PRÉLÈVEMENT */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Date de prélèvement
            </label>
            <input
              type="date"
              name="sample_date"
              value={formData.sample_date}
              onChange={handleInputChange}
              className="input"
            />
          </div>

          {/* 3. RESULTAT + DATE RESULTAT */}
          <div
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Résultat Laboratoire
            </label>
            <select
              name="result"
              value={formData.result}
              onChange={handleInputChange}
              className="input"
              style={{ marginBottom: '1rem' }}
            >
              <option value="pending">En attente</option>
              <option value="potable">✅ Eau Potable</option>
              <option value="non_potable">⚠️ Non Potable</option>
            </select>

            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                fontSize: '0.9rem',
              }}
            >
              Date du résultat
            </label>
            <input
              type="date"
              name="result_date"
              value={formData.result_date}
              onChange={handleInputChange}
              className="input"
              disabled={!formData.result || formData.result === 'pending'}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="input"
              placeholder="Ex: Taux de chlore..."
            />
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} className="btn btn-outline" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FaSave style={{ marginRight: '0.5rem' }} />{' '}
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
