
import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaTimes, FaSave, FaFlask } from 'react-icons/fa';


export default function WaterAnalysisForm({ type, analysis, department, workplace, analysisToEdit, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    department_id: department?.id || analysis?.department_id || analysis?.structure_id,
    sample_date: new Date().toISOString().split('T')[0], // Today's date
    result_date: '',
    result: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  // Pre-fill form when editing an existing analysis
  useEffect(() => {
    if (analysisToEdit) {
      setFormData({
        id: analysisToEdit.id, // Conserver l'ID pour la mise à jour
        department_id: analysisToEdit.department_id || analysisToEdit.structure_id,
        sample_date: analysisToEdit.sample_date,
        result_date: analysisToEdit.result_date || '',
        result: analysisToEdit.result || '',
        notes: analysisToEdit.notes || ''
      });
    }
  }, [analysisToEdit]);


  useEffect(() => {
    // Pre-fill form based on type
    if (type === 'edit') {
      // For edit mode, the formData is already set in the analysisToEdit useEffect
      // Nothing to do here, the edit useEffect above handles it
    } else if (type === 'launch') {
      setFormData(prev => ({
        ...prev,
        department_id: department?.id || workplace?.id,
        sample_date: new Date().toISOString().split('T')[0]
      }));
    } else if (type === 'result') {
      setFormData(prev => ({
        ...prev,
        department_id: analysis?.department_id || analysis?.structure_id,
        sample_date: analysis?.sample_date,
        result_date: new Date().toISOString().split('T')[0] // Today's date for result entry
      }));
    } else if (type === 'retest') {
      setFormData(prev => ({
        ...prev,
        department_id: department?.id || workplace?.id,
        sample_date: new Date().toISOString().split('T')[0] // New sample for retest
      }));
    }
  }, [type, analysis, department, workplace]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };


  const validateForm = () => {
    if (!formData.department_id) {
      setError('Veuillez sélectionner un service.');
      return false;
    }
    
    if (!formData.sample_date) {
      setError('Veuillez saisir la date d\'échantillonnage.');
      return false;
    }




    // For result entry or retest, result is required
    if ((type === 'result' || type === 'retest') && !formData.result) {
      setError('Veuillez saisir le résultat de l\'analyse.');
      return false;
    }
    
    // For edit mode, result is optional - no additional validation needed

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      let analysisData = { ...formData };


      // Set result_date based on result type
      if (type === 'launch') {
        // For launch, result is pending
        analysisData.result = 'pending';
        analysisData.result_date = '';
      } else if (type === 'result' || type === 'retest') {
        // For result entry, ensure result_date is set
        if (!analysisData.result_date) {
          analysisData.result_date = new Date().toISOString().split('T')[0];
        }
      }
      // For edit mode, keep existing data as is - no changes needed


      // Save the analysis
      const savedAnalysis = await db.saveWaterAnalysis(analysisData);
      
      onSuccess(savedAnalysis);
    } catch (error) {
      console.error('Error saving water analysis:', error);
      setError('Erreur lors de la sauvegarde de l\'analyse. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };


  const getFormTitle = () => {
    switch (type) {
      case 'launch':
        return 'Lancer une analyse d\'eau';
      case 'result':
        return 'Saisir le résultat d\'analyse';
      case 'retest':
        return 'Nouvelle analyse (Re-test)';
      case 'edit':
        return 'Éditer l\'analyse d\'eau';
      default:
        return 'Analyse d\'eau';
    }
  };

  const getFormDescription = () => {
    const serviceName = department?.name || workplace?.name || 'le service';
    switch (type) {
      case 'launch':
        return `Enregistrer qu'un échantillon a été prélevé pour ${serviceName}.`;
      case 'result':
        return `Saisir le résultat d'analyse pour l'échantillon du ${analysis?.sample_date}.`;
      case 'retest':
        return `Lancer une nouvelle analyse pour ${serviceName} suite à un résultat non potable.`;
      default:
        return '';
    }
  };

  const getServiceName = () => {
    return department?.name || workplace?.name || 'Service inconnu';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <FaFlask style={{ marginRight: '0.5rem' }} />
              {getFormTitle()}
            </h3>
            <p style={{ 
              margin: '0.5rem 0 0 0', 
              fontSize: '0.9rem', 
              color: 'var(--text-muted)' 
            }}>
              {getFormDescription()}
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="btn btn-outline"
            style={{ padding: '0.5rem' }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Service (read-only) */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Service
            </label>
            <input
              type="text"
              value={getServiceName()}
              readOnly
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: '#f8f9fa'
              }}
            />
          </div>

          {/* Sample Date */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Date d'échantillonnage <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="date"
              name="sample_date"
              value={formData.sample_date}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)'
              }}
            />
          </div>


          {/* Result (for result/retest/edit types) */}
          {(type === 'result' || type === 'retest' || type === 'edit') && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Résultat {type === 'edit' ? '' : <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              <select
                name="result"
                value={formData.result}
                onChange={handleInputChange}
                required={type !== 'edit'}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}
              >
                {type === 'edit' && <option value="">Sélectionner le résultat (laisser vide pour "En attente")</option>}
                <option value="pending">En attente</option>
                <option value="potable">Eau Potable</option>
                <option value="non_potable">Non Potable</option>
              </select>
            </div>
          )}


          {/* Result Date (for result/retest/edit types) */}
          {(type === 'result' || type === 'retest' || type === 'edit') && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Date du résultat
              </label>
              <input
                type="date"
                name="result_date"
                value={formData.result_date}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                {type === 'edit' ? 'Date du résultat (optionnel)' : 'Laissez vide pour utiliser la date d\'aujourd\'hui'}
              </small>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Notes (optionnel)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Ajouter des notes supplémentaires..."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            justifyContent: 'flex-end' 
          }}>
            <button 
              type="button" 
              onClick={onCancel}
              className="btn btn-outline"
              disabled={loading}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}></div>
                  Sauvegarde...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaSave style={{ marginRight: '0.5rem' }} />
                  Sauvegarder
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

