import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import AddWorkerForm from './AddWorkerForm';
import { FaPlus, FaSearch, FaFileDownload, FaFileUpload, FaEdit, FaTrash, FaFilter, FaSort, FaSortUp, FaSortDown, FaUserPlus } from 'react-icons/fa';

export default function WorkerList({ onNavigateWorker }) {
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm); // Performance fix
  const [filterDept, setFilterDept] = useState(() => localStorage.getItem('worker_filter_dept') || '');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const loadData = async () => {
    const [w, d, e] = await Promise.all([db.getWorkers(), db.getDepartments(), db.getExams()]);
    setWorkers(w || []);
    setDepartments(d || []);
    setExams(e || []);
  };

  useEffect(() => { loadData(); }, []);

  const filteredWorkers = useMemo(() => {
    let result = workers;
    if (!showArchived) result = result.filter(w => !w.archived);
    if (filterDept) result = result.filter(w => w.department_id == filterDept);
    if (deferredSearch) {
      const lower = deferredSearch.toLowerCase();
      result = result.filter(w => w.full_name.toLowerCase().includes(lower) || w.national_id.includes(lower));
    }
    
    // Sort logic from Tablet version
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'department_id') {
          aVal = departments.find(x => x.id == a.department_id)?.name || '';
          bVal = departments.find(x => x.id == b.department_id)?.name || '';
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [workers, deferredSearch, filterDept, showArchived, sortConfig, departments]);

  const getWorkerLastStatus = (workerId) => {
    const workerExams = exams.filter(e => e.worker_id === workerId);
    if (workerExams.length === 0) return null;
    workerExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    return workerExams[0]?.decision?.status;
  };

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const map = { apte: 'badge-green', inapte: 'badge-red', apte_partielle: 'badge-yellow' };
    return <span className={`badge ${map[status] || ''} ml-2`}>{status === 'apte_partielle' ? 'Restreint' : status}</span>;
  };

  return (
    <div className="worker-list-container">
      <div className="worker-header">
        <h2>Travailleurs ({filteredWorkers.length})</h2>
        <div className="action-buttons">
            <button className="btn btn-outline mobile-hide-text" onClick={() => loadData()}><FaSearch /> Actualiser</button>
            <button className="btn btn-primary" onClick={() => { setEditingWorker(null); setShowForm(true); }}><FaPlus /> Nouveau</button>
        </div>
      </div>

      <div className="worker-toolbar card">
        <div className="search-box">
           <FaSearch className="search-icon" />
           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher..." />
           {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}>×</button>}
        </div>
        <select className="input dept-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
           <option value="">Tous services</option>
           {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <label className="archive-toggle"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Archives</label>
      </div>

      <div className="table-container table-responsive">
        <table>
          <thead>
            <tr>
              <th onClick={() => setSortConfig({ key: 'full_name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Nom</th>
              <th>Matricule</th>
              <th>Service</th>
              <th>Prochain Dû</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map(w => {
               const isOverdue = logic.isOverdue(w.next_exam_due);
               const status = getWorkerLastStatus(w.id);
               return (
                 <tr key={w.id} onClick={() => onNavigateWorker(w.id)} className={isOverdue && !w.archived ? 'overdue-worker-row' : ''}>
                   <td style={{ fontWeight: 600 }}>{w.full_name} {w.archived && <span className="badge-archived">Archivé</span>}</td>
                   <td><span className="matricule-tag">{w.national_id}</span></td>
                   <td>{departments.find(d => d.id == w.department_id)?.name || '-'}</td>
                   <td>{w.next_exam_due} {renderStatusBadge(status)}</td>
                   <td className="text-right">
                      <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setEditingWorker(w); setShowForm(true); }}><FaEdit /></button>
                   </td>
                 </tr>
               )
            })}
          </tbody>
        </table>
      </div>
      {showForm && <AddWorkerForm workerToEdit={editingWorker} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); loadData(); }} />}
    </div>
  );
}