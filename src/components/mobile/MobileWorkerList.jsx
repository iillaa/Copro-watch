import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../../services/db';
import { logic } from '../../services/logic';
import AddWorkerForm from '../AddWorkerForm';
import { FaSearch, FaPlus, FaUserEdit } from 'react-icons/fa';

export default function MobileWorkerList({ onNavigateWorker }) {
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const loadData = async () => {
    setWorkers(await db.getWorkers());
  };
  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let res = workers.filter((w) => !w.archived);
    if (deferredSearch) {
      const lower = deferredSearch.toLowerCase();
      res = res.filter(
        (w) => w.full_name.toLowerCase().includes(lower) || w.national_id.includes(lower)
      );
    }
    return res;
  }, [workers, deferredSearch]);

  return (
    <div className="mobile-layout">
      {/* Search Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'var(--bg-app)',
          zIndex: 10,
          padding: '0.5rem 1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div
            className="input"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              borderRadius: '50px',
              flex: 1,
            }}
          >
            <FaSearch color="var(--text-muted)" />
            <input
              style={{ border: 'none', marginLeft: '0.5rem', width: '100%', outline: 'none' }}
              placeholder="Chercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ borderRadius: '50%', width: '45px', padding: 0 }}
            onClick={() => {
              setEditingWorker(null);
              setShowForm(true);
            }}
          >
            <FaPlus />
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        {filtered.map((w) => (
          <div key={w.id} className="mobile-card" onClick={() => onNavigateWorker(w.id)}>
            <div className="mobile-card-header">
              <div>
                <div className="mobile-card-title">{w.full_name}</div>
                <div className="mobile-card-subtitle">{w.national_id}</div>
              </div>
            </div>
            <div className="mobile-card-row">
              <span style={{ color: 'var(--text-muted)' }}>Prochain examen:</span>
              <span>{logic.formatDate(new Date(w.next_exam_due))}</span>
            </div>
            <div className="mobile-card-actions">
              <button
                className="btn btn-sm btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingWorker(w);
                  setShowForm(true);
                }}
              >
                <FaUserEdit /> Éditer
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <AddWorkerForm
          workerToEdit={editingWorker}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
