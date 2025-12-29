import { useState, useEffect } from 'react';
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
  FaArchive,
  FaSort,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa';

export default function WorkerList({ onNavigateWorker }) {
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState(
    () => localStorage.getItem('worker_filter_dept') || ''
  );
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });

  // NOUVEAU STATE : Pour gérer l'affichage des archives
  const [showArchived, setShowArchived] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const loadData = async () => {
    const w = await db.getWorkers();
    const d = await db.getDepartments();
    const e = await db.getExams();
    setWorkers(w);
    setDepartments(d);
    setExams(e);
  };
  // A. Sauvegarder le choix du service
  useEffect(() => {
    localStorage.setItem('worker_filter_dept', filterDept);
  }, [filterDept]);

  // B. Fonction de gestion du tri
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // C. Helper pour afficher la petite flèche
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort style={{ opacity: 0.3, marginLeft: '5px' }} />;
    return sortConfig.direction === 'asc' ? (
      <FaSortUp style={{ marginLeft: '5px' }} />
    ) : (
      <FaSortDown style={{ marginLeft: '5px' }} />
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = workers;

    // 1. FILTRE ARCHIVE (Gardez votre logique existante ici si elle est différente)
    if (!showArchived) {
      result = result.filter((w) => !w.archived);
    }

    // 2. Filtre Département
    if (filterDept) {
      result = result.filter((w) => w.department_id == filterDept);
    }

    // 3. Filtre Recherche
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (w) => w.full_name.toLowerCase().includes(lower) || w.national_id.includes(lower)
      );
    }

    // 4. NOUVEAU : TRI (Sorting)
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Tri spécifique pour le nom du département
        if (sortConfig.key === 'department_id') {
          aVal = getDeptName(a.department_id) || ''; // getDeptName doit exister dans votre code
          bVal = getDeptName(b.department_id) || '';
        }
        // Tri insensible à la casse pour le texte
        else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal ? bVal.toLowerCase() : '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredWorkers(result);
  }, [searchTerm, filterDept, workers, showArchived, sortConfig]); // N'oubliez pas d'ajouter sortConfig ici

  const handleEdit = (e, worker) => {
    e.stopPropagation();
    setEditingWorker(worker);
    setShowForm(true);
  };

  const handleDelete = async (e, worker) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer ${worker.full_name} ? Cette action est irréversible.\n\n(Préférez l'archivage via la fiche du travailleur)`
      )
    ) {
      await db.deleteWorker(worker.id);
      loadData();
    }
  };

  const handleAddNew = () => {
    setEditingWorker(null);
    setShowForm(true);
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

  const getDeptName = (id) => {
    const d = departments.find((x) => x.id == id);
    return d ? d.name : '-';
  };

  const getWorkerLastStatus = (workerId) => {
    const workerExams = exams.filter((e) => e.worker_id === workerId);
    if (workerExams.length === 0) return null;
    workerExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    const lastDecision = workerExams.find((e) => e.decision?.status);
    return lastDecision?.decision?.status;
  };

  const renderStatusBadge = (status) => {
    if (!status) return null;
    let badgeClass = '';
    let label = '';
    switch (status) {
      case 'apte':
        badgeClass = 'badge-green';
        label = 'Apte';
        break;
      case 'inapte':
        badgeClass = 'badge-red';
        label = 'Inapte';
        break;
      case 'apte_partielle':
        badgeClass = 'badge-yellow';
        label = 'Apte Partiel';
        break;
      default:
        return null;
    }
    return (
      <span className={`badge ${badgeClass}`} style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
        {label}
      </span>
    );
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ marginBottom: 0 }}>Liste des Travailleurs</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Gérez vos effectifs et leurs examens.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExport} title="Exporter les données">
            <FaFileDownload /> Export
          </button>
          <label
            className="btn btn-outline"
            title="Importer les données"
            style={{ cursor: 'pointer' }}
          >
            <FaFileUpload /> Import
            <input type="file" onChange={handleImport} style={{ display: 'none' }} accept=".json" />
          </label>
          <button className="btn btn-primary" onClick={handleAddNew}>
            <FaPlus /> Nouveau
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          gap: '1rem',
          padding: '1rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            minWidth: '250px',
            position: 'relative',
          }}
        >
          <FaSearch style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
          <input
            style={{
              border: 'none',
              outline: 'none',
              padding: '0.75rem',
              width: '100%',
              fontSize: '1rem',
              background: 'transparent',
            }}
            placeholder="Rechercher par nom ou matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          )}
        </div>
        <div
          style={{
            borderLeft: '1px solid var(--border-color)',
            height: '2rem',
            margin: '0 0.5rem',
          }}
        ></div>

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
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* NOUVEAU : Case à cocher pour voir les archives */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            paddingLeft: '10px',
            borderLeft: '1px solid var(--border-color)',
          }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Voir archives
        </label>

 {(searchTerm || filterDept) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearchTerm('');
              setFilterDept('');
              localStorage.removeItem('worker_filter_dept'); // Nettoyage correct
            }}
          >
            Effacer filtres
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th
                onClick={() => handleSort('full_name')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  Nom {getSortIcon('full_name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('national_id')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  Matricule {getSortIcon('national_id')}
                </div>
              </th>
              <th
                onClick={() => handleSort('department_id')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  Service {getSortIcon('department_id')}
                </div>
              </th>
              <th
                onClick={() => handleSort('last_exam_date')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  Dernier Examen {getSortIcon('last_exam_date')}
                </div>
              </th>
              <th
                onClick={() => handleSort('next_exam_due')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  Prochain Dû {getSortIcon('next_exam_due')}
                </div>
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((w) => {
              const isOverdue = logic.isOverdue(w.next_exam_due);
              const status = getWorkerLastStatus(w.id);

              // Style spécial pour les archivés (Grisé)
              const rowStyle = w.archived
                ? {
                    opacity: 0.6,
                    background: '#f9f9f9',
                    color: '#666',
                  }
                : {
                    cursor: 'pointer',
                  };

              return (
                <tr
                  key={w.id}
                  onClick={() => onNavigateWorker(w.id)}
                  className={!w.archived && isOverdue ? 'overdue-worker-row' : ''}
                  style={rowStyle}
                >
                  <td style={{ fontWeight: 500 }}>
                    {w.full_name}
                    {/* Petit badge Archivé */}
                    {w.archived && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: '#ddd',
                          color: '#555',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          marginLeft: '6px',
                        }}
                      >
                        Archivé
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        background: w.archived ? '#eee' : 'var(--bg-app)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {w.national_id}
                    </span>
                  </td>
                  <td>{getDeptName(w.department_id)}</td>
                  <td>{w.last_exam_date ? logic.formatDate(new Date(w.last_exam_date)) : '-'}</td>
                  <td>
                    {w.next_exam_due}
                    {renderStatusBadge(status)}
                    {!w.archived && isOverdue && (
                      <span
                        className="badge badge-red"
                        style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}
                      >
                        Retard
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => handleEdit(e, w)}
                      title="Modifier"
                      style={{ marginRight: '0.5rem' }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => handleDelete(e, w)}
                      title="Supprimer"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredWorkers.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                >
                  Aucun travailleur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
