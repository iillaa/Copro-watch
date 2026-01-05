import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import BulkActionsToolbar from './BulkActionsToolbar';
import WaterAnalysisCard from './WaterAnalysisCard'; // Import the new card component
import { 
  FaArrowLeft, 
  FaFlask, 
  FaCheckSquare 
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

  // [BATCH SELECTION STATE]
  const [isSelectionMode, setIsSelectionMode] = useState(
    () => localStorage.getItem('copro_selection_mode_water') === 'true'
  );
  const [selectedIds, setSelectedIds] = useState(new Set());

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

  const handleFormSuccess = ()_ => {
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
  // 4. BATCH HANDLERS
  // ==================================================================================
  
  const toggleSelectionMode = () => {
    const newState = !isSelectionMode;
    setIsSelectionMode(newState);
    localStorage.setItem('copro_selection_mode_water', newState);
    if (!newState) setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === analyses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analyses.map(a => a.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Supprimer définitivement ${selectedIds.size} analyses ?`)) {
      const idsToDelete = Array.from(selectedIds);
      await Promise.all(idsToDelete.map(id => db.deleteWaterAnalysis(id)));
      setSelectedIds(new Set());
      loadData();
      if (onSave) onSave();
    }
  };

  // ==================================================================================
  // 5. RENDER
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
            <button
              className={`btn ${isSelectionMode ? 'btn-primary' : 'btn-outline'}`}
              onClick={toggleSelectionMode}
              title={isSelectionMode ? "Masquer la sélection" : "Sélection multiple"}
            >
              <FaCheckSquare />
            </button>

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

      {/* History Title & Select All Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
        <h3>Historique</h3>
        {isSelectionMode && (
          <button className="btn btn-outline" onClick={toggleSelectAll}>
            {selectedIds.size === analyses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
      </div>

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
                isSelected={selectedIds.has(a.id)}
                isSelectionMode={isSelectionMode}
                onEdit={handleEdit}
                onDelete={handleDeleteAnalysis}
                onToggleSelect={toggleSelectOne}
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

      {/* Batch Toolbar */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onDelete={handleBatchDelete}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

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
