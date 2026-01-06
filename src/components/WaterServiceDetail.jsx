import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import WaterAnalysisCard from './WaterAnalysisCard';
import { 
  FaArrowLeft, 
  FaFlask,
  FaChartBar,
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
  // 3. HANDLERS & DERIVED STATE
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

  // Calculate stats for the Annual Overview
  const stats = useMemo(() => {
    const potable = analyses.filter((a) => a.result === 'potable').length;
    const nonPotable = analyses.filter((a) => a.result === 'non_potable').length;
    const pending = analyses.filter((a) => a.result === 'pending' || !a.result).length;
    const total = analyses.length;
    return { potable, nonPotable, pending, total };
  }, [analyses]);

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

      {/* Header Card with Annual Overview */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaChartBar /> Aperçu Annuel</h4>
            <div>
              <strong>Statut ce mois-ci:</strong>
              <span style={{ color: statusColor, fontWeight: 'bold', marginLeft: '0.5rem' }}>
                {statusLabel}
              </span>
            </div>
          </div>

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
            <div style={{ height: '10px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(stats.potable / stats.total) * 100}%`, background: 'var(--success)' }}></div>
              <div style={{ width: `${(stats.nonPotable / stats.total) * 100}%`, background: 'var(--danger)' }}></div>
              <div style={{ width: `${(stats.pending / stats.total) * 100}%`, background: 'var(--border-color)' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* History Title */}
      <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Historique</h3>

      {/* --- CARD-BASED LIST CONTAINER --- */}
      <div className="scroll-wrapper" style={{ maxHeight: compactMode ? '500px' : 'none' }}>
        {analyses.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}
          >
            {analyses.map((a) => (
              <WaterAnalysisCard
                key={a.id}
                analysis={a}
                onEdit={handleEdit}
                onDelete={handleDeleteAnalysis}
              />
            ))}
          </div>
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
