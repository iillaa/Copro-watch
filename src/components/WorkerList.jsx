import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import AddWorkerForm from './AddWorkerForm';
import { FaPlus, FaSearch, FaFileDownload, FaFileUpload, FaEdit, FaTrash, FaFilter, FaSort, FaSortUp, FaSortDown, FaUserPlus } from 'react-icons/fa';

export default function WorkerList({ onNavigateWorker }) {
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [filterDept, setFilterDept] = useState(() => localStorage.getItem('worker_filter_dept') || '');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [w, d, e] = await Promise.all([db.getWorkers(), db.getDepartments(), db.getExams()]);
      setWorkers(w || []);
      setDepartments(d || []);
      setExams(e || []);
    } catch (err) {
      console.error("WorkerList load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredWorkers = useMemo(() => {
    let result = workers;
    if (!showArchived) result = result.filter(w => !w.archived);
    if (filterDept) result = result.filter(w => w.department_id == filterDept);
    if (deferredSearch) {
      const low = deferredSearch.toLowerCase();
      result = result.filter(w => w.full_name?.toLowerCase().includes(low) || w.national_id?.includes(low));
    }
    return [...result].sort((a, b) => {
      let aV = a[sortConfig.key], bV = b[sortConfig.key];
      if (sortConfig.key === 'department_id') {
        aV = departments.find(x => x.id == a.department_id)?.name || '';
        bV = departments.find(x => x.id == b.department_id)?.name || '';
      }
      return sortConfig.direction === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
    });
  }, [workers, deferredSearch, filterDept, showArchived, sortConfig, departments]);

  if (loading) return <div className="text-center p-5">Chargement...</div>;

  return (
    <div className="worker-list-container">
      <div className="worker-header">
        <h2>Travailleurs</h2>
        <button className="btn btn-primary" onClick={() => { setEditingWorker(null); setShowForm(true); }}><FaPlus /> Nouveau</button>
      </div>
      
      <div className="worker-toolbar card">
        <input className="input" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="table-container table-responsive">
        <table>
          <thead>
            <tr><th>Nom</th><th>Matricule</th><th>Prochain Examen</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filteredWorkers.map(w => (
              <tr key={w.id} onClick={() => onNavigateWorker(w.id)} className="worker-row">
                <td>{w.full_name}</td>
                <td><span className="matricule-tag">{w.national_id}</span></td>
                <td>{w.next_exam_due}</td>
                <td className="text-right">
                  <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setEditingWorker(w); setShowForm(true); }}><FaEdit /></button>
                </td>
              </tr>
            ))}
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