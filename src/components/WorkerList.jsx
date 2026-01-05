import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import backupService from '../services/backup';
import AddWorkerForm from './AddWorkerForm';
import BulkActionsToolbar from './BulkActionsToolbar'; // [NEW] Batch Toolbar
import MoveWorkersModal from './MoveWorkersModal';     // [NEW] Move Modal
import {
  FaPlus,
  FaSearch,
  FaFileDownload,
  FaFileUpload,
  FaEdit,
  FaTrash,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUserPlus,
  FaCheckSquare, // [NEW] Icon for Toggle
} from 'react-icons/fa';

export default function WorkerList({ onNavigateWorker, compactMode }) {
  // ==================================================================================
  // 1. STATE MANAGEMENT
  // ==================================================================================
  
  // Data State
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  
  // KEY FIX: Defer the search term. React allows the UI to update immediately
  // while the heavy filtering happens in the background.
  const deferredSearch = useDeferredValue(searchTerm);

  const [filterDept, setFilterDept] = useState(
    () => localStorage.getItem('worker_filter_dept') || ''
  );
  
  const [sortConfig, setSortConfig] = useState({ 
    key: 'full_name', 
    direction: 'asc' 
  });
  
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  // [NEW] BATCH SELECTION STATE
  // We use localStorage to remember if the user likes the checkboxes visible or hidden
  const [isSelectionMode, setIsSelectionMode] = useState(
    () => localStorage.getItem('copro_selection_mode_workers') === 'true'
  );
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  

  // ==================================================================================
  // 2. DATA LOADING & EFFECTS
  // ==================================================================================
  
  const loadData = async () => {
    try {
      const [w, d, e] = await Promise.all([
        db.getWorkers(),
        db.getDepartments(),
        db.getExams()
      ]);
      setWorkers(w);
      setDepartments(d);
      setExams(e);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('worker_filter_dept', filterDept);
  }, [filterDept]);

  // ==================================================================================
  // 3. FILTERING & SORTING ENGINE (useMemo)
  // ==================================================================================
  
  const filteredWorkers = useMemo(() => {
    let result = workers;

    // A. Filter Archive
    if (!showArchived) {
      result = result.filter((w) => !w.archived);
    }

    // B. Filter Department
    if (filterDept) {
      result = result.filter((w) => w.department_id == filterDept);
    }

    // C. Filter Search (Using the deferred value!)
    if (deferredSearch) {
      const lower = deferredSearch.toLowerCase();
      result = result.filter((w) => {
        // [FIX] Recherche sécurisée sur le Nom ET le Matricule
        const nameMatch = w.full_name && w.full_name.toLowerCase().includes(lower);
        // On convertit le matricule en String pour éviter les erreurs si c'est un nombre
        const idMatch = w.national_id && String(w.national_id).toLowerCase().includes(lower);
        
        return nameMatch || idMatch;
      });
    }

    // D. Sorting Logic
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Sort by Department Name
        if (sortConfig.key === 'department_id') {
          const getDeptName = (id) => departments.find((x) => x.id == id)?.name || '';
          aVal = getDeptName(a.department_id);
          bVal = getDeptName(b.department_id);
        }
        // Case insensitive string sort
        else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal ? bVal.toLowerCase() : '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [workers, deferredSearch, filterDept, showArchived, sortConfig, departments]);
  // ==================================================================================
  // 4. BATCH OPERATIONS HANDLERS
  // ==================================================================================
  
  // Toggle the Checkbox Column ON/OFF
  const toggleSelectionMode = () => {
    const newState = !isSelectionMode;
    setIsSelectionMode(newState);
    localStorage.setItem('copro_selection_mode_workers', newState);
    
    // Safety: If turning OFF, clear selections to avoid accidental deletes later
    if (!newState) {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWorkers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkers.map(w => w.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Supprimer définitivement ${selectedIds.size} travailleurs ?`)) {
      await Promise.all(Array.from(selectedIds).map(id => db.deleteWorker(id)));
      
      setSelectedIds(new Set());
      // [FIX] Mode stays ON after delete
      loadData();
    }
  };

const handleBatchArchive = async () => {
    // 1. Identify the selected workers
    const targets = workers.filter(w => selectedIds.has(w.id));
    
    // 2. Detect State: Are they ALL currently archived?
    // If every selected worker is already archived, we assume you want to RESTORE them.
    const areAllArchived = targets.length > 0 && targets.every(w => w.archived);
    
    // 3. Determine Action & New Status
    const actionLabel = areAllArchived ? 'Restaurer' : 'Archiver';
    const newStatus = !areAllArchived; // If all archived (true), set to false (active).
    
    // 4. Confirm & Execute
    if (window.confirm(`${actionLabel} ${selectedIds.size} travailleurs ?`)) {
      await Promise.all(targets.map(w => db.saveWorker({ ...w, archived: newStatus })));

      setSelectedIds(new Set());
      // Keep Selection Mode ON (User Preference)
      loadData();
    }
  };
  const handleBatchMoveConfirm = async (deptId) => {
    const targets = workers.filter(w => selectedIds.has(w.id));
    await Promise.all(targets.map(w => db.saveWorker({ ...w, department_id: parseInt(deptId) })));
    
    setShowMoveModal(false);
    setSelectedIds(new Set());
    // [FIX] Mode stays ON after move
    loadData();
  };
  // ==================================================================================
  // 5. STANDARD ACTION HANDLERS
  // ==================================================================================

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort style={{ opacity: 0.3, marginLeft: '5px' }} />;
    }
    return sortConfig.direction === 'asc' ? 
      <FaSortUp style={{ marginLeft: '5px' }} /> : 
      <FaSortDown style={{ marginLeft: '5px' }} />;
  };

  const handleEdit = (e, worker) => {
    e.stopPropagation();
    setEditingWorker(worker);
    setShowForm(true);
  };

  const handleDelete = async (e, worker) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${worker.full_name} ?`)) {
      await db.deleteWorker(worker.id);
      loadData();
    }
  };

  const handleExport = async () => {
    try {
      const json = await db.exportData();
      // Use the backup service to ensure it saves correctly
      await backupService.saveBackupJSON(
        json,
        `medical_backup_${new Date().toISOString().split('T')[0]}.json`
      );
      alert('Export réussi ! (Vérifiez le dossier Documents/copro-watch)');
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export: " + e.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const success = await db.importData(evt.target.result);
      if (success) {
        alert('Import réussi !');
        loadData();
      } else {
        alert("Erreur lors de l'import.");
      }
    };
    reader.readAsText(file);
  };

  // ==================================================================================
  // 6. HELPER FUNCTIONS
  // ==================================================================================

  const getDeptName = (id) => {
    return departments.find((x) => x.id == id)?.name || '-';
  };

  const getWorkerLastStatus = (workerId) => {
    const workerExams = exams.filter((e) => e.worker_id === workerId);
    if (workerExams.length === 0) return null;
    // Quick sort just for this worker (cheap operation)
    workerExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    return workerExams[0]?.decision?.status;
  };

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const configs = {
      apte: { class: 'badge-green', label: 'Apte' },
      inapte: { class: 'badge-red', label: 'Inapte' },
      apte_partielle: { class: 'badge-yellow', label: 'Apte Partiel' },
    };
    const conf = configs[status];
    if (!conf) return null;

    return (
      <span 
        className={`badge ${conf.class}`} 
        style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}
      >
        {conf.label}
      </span>
    );
  };

  const emptyStateUI = (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        border: '2px dashed var(--border-color)',
        background: '#f8fafc',
        boxShadow: 'none',
        marginTop: '2rem',
      }}
    >
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>
        Aucun travailleur enregistré
      </h3>
      <p
        style={{
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          maxWidth: '450px',
          margin: '0 auto 2rem',
        }}
      >
        Votre base de données est vide. Commencez par ajouter votre premier travailleur.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => { setEditingWorker(null); setShowForm(true); }}
        >
          <FaUserPlus /> Ajouter le premier travailleur
        </button>
      </div>
    </div>
  );
  // ==================================================================================
  // RENDER: HYBRID ROW-CARD LAYOUT (Fixed)
  // ==================================================================================
  
  // Columns: Check | Nom | Mat | Svc | Last | Next | Actions
  // [FIX] Updated Template: 2.2fr for Prochain Dû (Column 6) to stop squishing
  const gridTemplate = isSelectionMode 
    ? "50px 1.9fr 0.8fr 1fr 0.9fr 2.2fr 100px" 
    : "0px 1.5fr 0.8fr 1fr 0.9fr 2.2fr 100px";

  return (
    <div>
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>Liste des Travailleurs</h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {filteredWorkers.length} dossier{filteredWorkers.length > 1 ? 's' : ''} trouvé(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          
          <button
            className={`btn ${isSelectionMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={toggleSelectionMode}
            title={isSelectionMode ? "Masquer la sélection" : "Activer la sélection multiple"}
            style={{ padding: '0.6rem 0.8rem' }}
          >
            <FaCheckSquare />
          </button>

          <button className="btn btn-outline" onClick={handleExport} title="Exporter">
            <FaFileDownload /> <span className="hide-mobile">Export</span>
          </button>
          
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            <FaFileUpload /> <span className="hide-mobile">Import</span>
            <input type="file" onChange={handleImport} style={{ display: 'none' }} accept=".json" />
          </label>
          
          <button className="btn btn-primary" onClick={() => { setEditingWorker(null); setShowForm(true); }}>
            <FaPlus /> Nouveau
          </button>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="card" style={{ padding: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center', overflowX: 'auto', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: '2.5rem', borderRadius: '50px' }}
            placeholder="Rechercher (Nom et prénom, Matricule)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: 'auto', borderRadius: '50px' }}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">Tous les services</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archives
        </label>
        {(searchTerm || filterDept) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearchTerm(''); setFilterDept(''); }}>
            Effacer
          </button>
        )}
      </div>

      {/* SCROLLABLE TABLE WINDOW */}
          <div className="scroll-wrapper" style={{ maxHeight: compactMode ? '75vh' : 'none', paddingBottom: '120px' }}>
            <div className="hybrid-container">
          
          {/* 1. STICKY HEADER ROW */}
          <div className="hybrid-header" style={{ gridTemplateColumns: gridTemplate }}>
            <div style={{ textAlign: 'center' }}>
              {isSelectionMode && (
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={filteredWorkers.length > 0 && selectedIds.size === filteredWorkers.length}
                />
              )}
            </div>
            <div onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>Nom et prénom {getSortIcon('full_name')}</div>
            <div onClick={() => handleSort('national_id')} style={{ cursor: 'pointer' }}>Matricule {getSortIcon('national_id')}</div>
            <div onClick={() => handleSort('department_id')} style={{ cursor: 'pointer' }}>Service {getSortIcon('department_id')}</div>
            <div onClick={() => handleSort('last_exam_date')} style={{ cursor: 'pointer' }}>Dernier Exam {getSortIcon('last_exam_date')}</div>
            <div onClick={() => handleSort('next_exam_due')} style={{ cursor: 'pointer' }}>Prochain Dû {getSortIcon('next_exam_due')}</div>
            <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>Actions</div>
          </div>

          {/* 2. SCROLLABLE DATA ROWS */}
          {filteredWorkers.map((w) => {
            const isOverdue = logic.isOverdue(w.next_exam_due);
            const status = getWorkerLastStatus(w.id);
            const isSelected = selectedIds.has(w.id);

            return (
              <div 
                key={w.id}
                onClick={() => isSelectionMode ? toggleSelectOne(w.id) : onNavigateWorker(w.id)}
                className={`hybrid-row ${isSelected ? 'selected' : ''} ${!w.archived && isOverdue ? 'overdue-worker-row' : ''}`}
                style={{ 
                  gridTemplateColumns: gridTemplate,
                  opacity: w.archived ? 0.6 : 1,
                }}
              >
                {/* Checkbox */}
                <div style={{ textAlign: 'center', overflow: 'hidden' }}>
                  {isSelectionMode && (
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleSelectOne(w.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>

                {/* Nom et prénom */}
                <div className="hybrid-cell cell-name">
                  {w.full_name}
                  {w.archived && <span className="badge" style={{fontSize: '0.6rem', marginLeft: '5px', background:'#eee', color:'#666', border:'none'}}>Archivé</span>}
                </div>

                {/* Matricule */}
                <div className="hybrid-cell">
                  <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                    {w.national_id}
                  </span>
                </div>

                {/* Service */}
                <div className="hybrid-cell">{getDeptName(w.department_id)}</div>

                {/* Dernier Exam */}
                <div className="hybrid-cell">
                  {w.last_exam_date ? logic.formatDate(new Date(w.last_exam_date)) : '-'}
                </div>

               {/* Col 6: Prochain Dû */}
                <div className="hybrid-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* [FIX] Fixed width '85px' prevents wiggling when scrolling */}
                  <span style={{ fontWeight: 600, minWidth: '85px', display: 'inline-block' }}>
                    {w.next_exam_due}
                  </span>
                  {renderStatusBadge(status)}
                  {!w.archived && isOverdue && (
                    <span className="badge badge-red" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>RETARD</span>
                  )}
                </div>

                {/* Actions */}
                <div className="hybrid-actions">
                  <button className="btn btn-outline btn-sm" onClick={(e) => handleEdit(e, w)} title="Modifier">
                    <FaEdit />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={(e) => handleDelete(e, w)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', backgroundColor: '#fff1f2' }} title="Supprimer">
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredWorkers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🔍</div>
              <p>Aucun résultat trouvé.</p>
              <button className="btn btn-outline btn-sm" onClick={() => { setSearchTerm(''); setFilterDept(''); }}>
                Effacer les filtres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FLOATERS */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onDelete={handleBatchDelete}
          onArchive={handleBatchArchive}
          onMove={() => setShowMoveModal(true)}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

      {showMoveModal && (
        <MoveWorkersModal
          departments={departments}
          onConfirm={handleBatchMoveConfirm}
          onCancel={() => setShowMoveModal(false)}
        />
      )}

      {showForm && (
        <AddWorkerForm
          workerToEdit={editingWorker}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );}