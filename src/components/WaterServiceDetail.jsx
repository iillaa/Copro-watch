import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import WaterAnalysisCard from './WaterAnalysisCard';
import './Timeline.css'; // Import the new timeline styles
import { 
  FaArrowLeft, 
  FaFlask,
} from 'react-icons/fa';

export default function WaterServiceDetail({ department, onBack, onSave, compactMode }) {
  // ==================================================================================
  // 1. STATE MANAGEMENT
  // ==================================================================================
  
  const [analyses, setAnalyses] = useState([]);
  const [allAnalyses, setAllAnalyses] = useState([]);
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [editingAnalysis, setEditingAnalysis] = useState(null);

  // ==================================================================================
  // 2. DATA LOADING
  // ==================================================================================
  
  const loadData = async () => {
    const all = await db.getWaterAnalyses();
    const deptHistory = logic.getDepartmentWaterHistory(department.id, all);
    setAnalyses(deptHistory);
    setAllAnalyses(all);
  };

  useEffect(() => {
    loadData();
  }, [department.id]);

  // ==================================================================================
  // 3. HANDLERS
  // ==================================================================================

  const handleNewAnalysis = () => {
    setSelectedAnalysis(null);
    setEditingAnalysis(null);
    setShowForm(true);
  };

  const handleEdit = (analysis) => {
    setSelectedAnalysis(analysis);
    setEditingAnalysis(analysis);
    setShowForm(true);
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      await db.deleteWaterAnalysis(analysisId);
      loadData();
      if (onSave) onSave();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAnalysis(null);
    setEditingAnalysis(null);
    loadData();
    if (onSave) onSave();
  };

  const currentStatus = logic.getServiceWaterStatus(department.id, allAnalyses);
  const statusLabel = logic.getServiceWaterStatusLabel(currentStatus.status);
  const statusColor = logic.getServiceWaterStatusColor(currentStatus.status);

  // ==================================================================================
  // 4. RENDER
  // ==================================================================================
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Back Button */}
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={onBack}>
          <FaArrowLeft /> Retour
        </button>
      </div>

      {/* Header Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 style={{ margin: 0 }}>{department.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Historique complet des analyses
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleNewAnalysis}>
              <FaFlask /> Nouvelle Analyse
            </button>
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <strong>Statut ce mois-ci:</strong>
          <span style={{ color: statusColor, fontWeight: 'bold', marginLeft: '0.5rem' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* --- TIMELINE CONTAINER --- */}
      <div className="timeline-container">
        {analyses.length > 0 ? (
          analyses.map((a) => (
            <div key={a.id} className="timeline-event">
              <div className="timeline-dot"></div>
              <div className="timeline-event-content">
                <WaterAnalysisCard
                  analysis={a}
                  onEdit={handleEdit}
                  onDelete={handleDeleteAnalysis}
                />
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🧪</div>
            <p>Aucune analyse enregistrée.</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <WaterAnalysisForm
          type={editingAnalysis ? 'edit' : 'launch'}
          department={department}
          analysis={selectedAnalysis}
          analysisToEdit={editingAnalysis}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
