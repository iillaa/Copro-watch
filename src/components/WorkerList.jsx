import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import AddWorkerForm from './AddWorkerForm';
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
} from 'react-icons/fa';

export default function WorkerList({ onNavigateWorker }) {
  // 1. Data State
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);

  // 2. UI State
  const [searchTerm, setSearchTerm] = useState('');
  // KEY FIX: Defer the search term. React allows the UI to update immediately
  // while the heavy filtering happens in the background.
  const deferredSearch = useDeferredValue(searchTerm);
  
  const [filterDept, setFilterDept] = useState(
    () => localStorage.getItem('worker_filter_dept') || ''
  );
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  // 3. Load Data
  const loadData = async () => {
    const [w, d, e] = await Promise.all([
      db.getWorkers(),
      db.getDepartments(),
      db.getExams()
    ]);
    setWorkers(w);
    setDepartments(d);
    setExams(e);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('worker_filter_dept', filterDept);
  }, [filterDept]);

  // 4. PERFORMANCE ENGINE: useMemo
  // This replaces the old useEffect + setFilteredWorkers.
  // It only runs when dependencies change, and it runs DURING render (no double-render).
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
      result = result.filter(
        (w) => 
          w.full_name.toLowerCase().includes(lower) || 
          w.national_id.includes(lower)
      );
    }

    // D. Sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Sort by Department Name instead of ID
        if (sortConfig.key === 'department_id') {
          const getDeptName = (id) => departments.find((x) => x.id == id)?.name || '';
          aVal = getDeptName(a.department_id);
          bVal = getDeptName(b.department_id);
        }
        // Case insensitive sort for text
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

  // --- Handlers ---

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort style={{ opacity: 0.3, marginLeft: '5px' }} />;
    return sortConfig.direction === 'asc' ? (
      <FaSortUp style={{ marginLeft: '5px' }} />
    ) : (
      <FaSortDown style={{ marginLeft: '5px' }} />
    );
  };

  const handleEdit = (e, worker) => {
    e.stopPropagation();
    setEditingWorker(worker);
    setShowForm(true);
  };

  const handleDelete = async (e, worker) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer ${worker.full_name} ?`
      )
    ) {
      await db.deleteWorker(worker.id);
      loadData();
    }
  };

  const handleExport = async () => {
    const json = await db.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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

  const getDeptName = (id) => departments.find((x) => x.id == id)?.name || '-';

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
      <span className={`badge ${conf.class}`} style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
        {conf.label}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>Liste des Travailleurs</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {filteredWorkers.length} dossier{filteredWorkers.length > 1 ? 's' : ''} trouvé(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExport} title="Exporter">
            <FaFileDownload /> Export
          </button>
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            <FaFileUpload /> Import
            <input type="file" onChange={handleImport} style={{ display: 'none' }} accept=".json" />
          </label>
          <button className="btn btn-primary" onClick={() => { setEditingWorker(null); setShowForm(true); }}>
            <FaPlus /> Nouveau
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: '250px', position: 'relative' }}>
          <FaSearch style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
          <input
            style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '1rem', background: 'transparent' }}
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ borderLeft: '1px solid var(--border-color)', height: '2rem', margin: '0 0.5rem' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaFilter style={{ color: 'var(--text-muted)' }} />
          <select
            className="input"
            style={{ padding: '0.75rem', width: 'auto', minWidth: '150px' }}
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">Tous les services</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)', paddingLeft: '10px', borderLeft: '1px solid var(--border-color)' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Voir archives
        </label>
        
        {(searchTerm || filterDept) && (
            <button 
                className="btn btn-outline btn-sm"
                onClick={() => { setSearchTerm(''); setFilterDept(''); localStorage.removeItem('worker_filter_dept'); }}
            >
                Effacer
            </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Nom {getSortIcon('full_name')}</div>
              </th>
              <th onClick={() => handleSort('national_id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Matricule {getSortIcon('national_id')}</div>
              </th>
              <th onClick={() => handleSort('department_id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Service {getSortIcon('department_id')}</div>
              </th>
              <th onClick={() => handleSort('last_exam_date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Dernier Examen {getSortIcon('last_exam_date')}</div>
              </th>
              <th onClick={() => handleSort('next_exam_due')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Prochain Dû {getSortIcon('next_exam_due')}</div>
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((w) => {
              const isOverdue = logic.isOverdue(w.next_exam_due);
              const status = getWorkerLastStatus(w.id);
              
              // Dynamic opacity for better visual hierarchy (stale data during search lag appears dimmed)
              const isStale = searchTerm !== deferredSearch;

              return (
                <tr
                  key={w.id}
                  onClick={() => onNavigateWorker(w.id)}
                  className={!w.archived && isOverdue ? 'overdue-worker-row' : ''}
                  style={{ 
                    cursor: 'pointer', 
                    opacity: isStale ? 0.5 : (w.archived ? 0.6 : 1),
                    background: w.archived ? '#f9f9f9' : undefined 
                  }}
                >
                  <td style={{ fontWeight: 500 }}>
                    {w.full_name}
                    {w.archived && <span style={{ fontSize: '0.7rem', background: '#ddd', color: '#555', padding: '2px 4px', borderRadius: '3px', marginLeft: '6px' }}>Archivé</span>}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', background: w.archived ? '#eee' : 'var(--bg-app)', padding: '2px 6px', borderRadius: '4px' }}>
                      {w.national_id}
                    </span>
                  </td>
                  <td>{getDeptName(w.department_id)}</td>
                  <td>{w.last_exam_date ? logic.formatDate(new Date(w.last_exam_date)) : '-'}</td>
                  <td>
                    {w.next_exam_due}
                    {renderStatusBadge(status)}
                    {!w.archived && isOverdue && <span className="badge badge-red" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Retard</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={(e) => handleEdit(e, w)} style={{ marginRight: '0.5rem' }}><FaEdit /></button>
                    <button className="btn btn-outline btn-sm" onClick={(e) => handleDelete(e, w)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}><FaTrash /></button>
                  </td>
                </tr>
              );
            })}
            {filteredWorkers.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Aucun travailleur trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddWorkerForm
          workerToEdit={editingWorker}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}