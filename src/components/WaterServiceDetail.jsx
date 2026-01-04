import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import BulkActionsToolbar from './BulkActionsToolbar'; // [NEW] Batch Toolbar
import { 
  FaArrowLeft, 
  FaFlask, 
  FaTrash, 
  FaEdit, 
  FaCheckSquare // [NEW] Icon
} from 'react-icons/fa';

export default function WaterServiceDetail({ department, onBack, onSave, compactMode }) {
  // ==================================================================================
  // 1. STATE MANAGEMENT
  // ==================================================================================
  
  // [PRESERVED] Dynamic Style for Compact Mode (Scrolling)
  const scrollStyle = compactMode
    ? { maxHeight: '400px', overflowY: 'auto' }
    : {};

  const [analyses, setAnalyses] = useState([]);
  const [allAnalyses, setAllAnalyses] = useState([]);
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [editingAnalysis, setEditingAnalysis] = useState(null);

  // [NEW] BATCH SELECTION STATE
  // Persistent Toggle: remembers if you left it ON last time
  const [isSelectionMode, setIsSelectionMode] = useState(
    () => localStorage.getItem('copro_selection_mode_water') === 'true'
  );
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ==================================================================================
  // 2. DATA LOADING
  // ==================================================================================
  
  const loadData = async () => {
    // Reload all data to ensure sync
    const all = await db.getWaterAnalyses();
    
    // Use the logic helper to get sorted history for this department
    const deptHistory = logic.getDepartmentWaterHistory(department.id, all);

    setAnalyses(deptHistory);
    setAllAnalyses(all);
  };

  useEffect(() => {
    loadData();
  }, [department.id]);
  // ==================================================================================
  // 3. STANDARD HANDLERS
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

  // Helper: Status Badges
  const renderStatusBadge = (result) => {
    if (!result || result === 'pending')
      return <span className="badge badge-yellow">En attente</span>;
    if (result === 'potable') return <span className="badge badge-green">Potable</span>;
    if (result === 'non_potable') return <span className="badge badge-red">Non Potable</span>;
    return '-';
  };

  // Helper: Current Department Status
  const currentStatus = logic.getServiceWaterStatus(department.id, allAnalyses);
  const statusLabel = logic.getServiceWaterStatusLabel(currentStatus.status);
  const statusColor = logic.getServiceWaterStatusColor(currentStatus.status);

  // ==================================================================================
  // 4. BATCH OPERATIONS HANDLERS
  // ==================================================================================
  
  const toggleSelectionMode = () => {
    const newState = !isSelectionMode;
    setIsSelectionMode(newState);
    localStorage.setItem('copro_selection_mode_water', newState);
    
    // Clear selection when turning OFF
    if (!newState) {
      setSelectedIds(new Set());
    }
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
      // [FIX] Keep Mode ON after delete (User Preference)
      loadData();
      if (onSave) onSave();
    }
  };
  // ==================================================================================
  // 5. RENDER COMPONENT
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
            {/* [NEW] TOGGLE SELECTION MODE */}
            <button
              className={`btn ${isSelectionMode ? 'btn-primary' : 'btn-outline'}`}
              onClick={toggleSelectionMode}
              title={isSelectionMode ? "Masquer la sélection" : "Sélection multiple"}
            >
              <FaCheckSquare /> <span className="hide-mobile">Sélection</span>
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

      {/* History Table */}
      <h3>Historique</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="table-container"
          style={{
            boxShadow: 'none',
            border: 'none',
            borderRadius: 0,
            ...scrollStyle // Apply Compact Mode scroll here
          }}
        >
          <table>
            <thead>
              <tr>
                {/* [NEW] CONDITIONAL HEADER CHECKBOX */}
                {isSelectionMode && (
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={analyses.length > 0 && selectedIds.size === analyses.length}
                    />
                  </th>
                )}
                
                <th>Date Demande</th>
                <th>Date Prélèvement</th>
                <th>Date Résultat</th>
                <th>Verdict</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  {/* [NEW] CONDITIONAL ROW CHECKBOX */}
                  {isSelectionMode && (
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelectOne(a.id)}
                      />
                    </td>
                  )}
                  
                  <td>{logic.formatDateDisplay(a.request_date)}</td>
                  <td style={{ fontWeight: 600 }}>{logic.formatDateDisplay(a.sample_date)}</td>
                  <td>{logic.formatDateDisplay(a.result_date)}</td>
                  <td>{renderStatusBadge(a.result)}</td>
                  <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.notes || '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(a)} style={{ marginRight: '0.5rem' }}>
                      <FaEdit /> Détails
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDeleteAnalysis(a.id)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              
              {analyses.length === 0 && (
                <tr>
                  {/* [FIX] Dynamic ColSpan: 7 if Selection Mode is ON, 6 if OFF */}
                  <td 
                    colSpan={isSelectionMode ? 7 : 6} 
                    style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
                  >
                    Aucune analyse enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* [NEW] BATCH TOOLBAR (Delete Only) */}
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