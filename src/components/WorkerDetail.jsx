import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import ExamForm from './ExamForm';
// AJOUT : Import des icônes d'archive et FaCheckSquare
import {
  FaArrowLeft,
  FaFileMedical,
  FaTrash,
  FaArchive,
  FaBoxOpen,
  FaCheckSquare, // [NEW] Icon
  FaEye,
} from 'react-icons/fa';
import BulkActionsToolbar from './BulkActionsToolbar'; // [NEW] Import Toolbar

export default function WorkerDetail({ workerId, onBack, compactMode }) {
  const [worker, setWorker] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exams, setExams] = useState([]);
  const [showExamForm, setShowExamForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  const [deptName, setDeptName] = useState('');
  const [workplaceName, setWorkplaceName] = useState('');

  // [NEW] Persistent Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(
    () => localStorage.getItem('copro_selection_mode_medical') === 'true'
  );

  // [SMART GRID] Config for Medical History (Based on your columns)
  // Cols: Check(50) | Date(0.9) | Médecin(1.2) | Labo(1.1) | Statut(1) | Actions(100)
  const gridTemplate = isSelectionMode
    ? '50px 0.9fr 1.2fr 1.1fr 1fr 100px'
    : '0px 0.9fr 1.2fr 1.1fr 1fr 100px';

  const loadData = async () => {
    try {
      // [OPTIMIZATION] Use specific queries instead of loading everything
      // Convert workerId to Number to ensure match
      const id = Number(workerId);
      const w = await db.getWorker(id);
      setWorker(w);

      if (w) {
        // We still load lists for mapping names, but these are usually smaller.
        // For maximum speed, you could stick to IDs or fetch single dept/workplace too.
        const depts = await db.getDepartments();
        const works = await db.getWorkplaces();
        const d = depts.find((x) => x.id == w.department_id);
        const wp = works.find((x) => x.id == w.workplace_id);
        setDeptName(d ? d.name : '-');
        setWorkplaceName(wp ? wp.name : '-');
      }

      // [OPTIMIZATION] Load only this worker's exams
      const wExams = await db.getExamsByWorker(id);
      // Sort desc
      wExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
      setExams(wExams);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [workerId]);

  // --- NEW: Batch Handlers ---

  // [NEW] Toggle Function
  const toggleSelectionMode = () => {
    const newState = !isSelectionMode;
    setIsSelectionMode(newState);
    localStorage.setItem('copro_selection_mode_medical', newState);
    // Clear selection if turning off
    if (!newState) setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === exams.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(exams.map((e) => e.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Supprimer définitivement ${selectedIds.size} examens ?`)) {
      const idsToDelete = Array.from(selectedIds);
      await Promise.all(idsToDelete.map((id) => db.deleteExam(id)));

      setSelectedIds(new Set());
      // We keep selection mode ON here so you can continue deleting if needed
      loadData();
    }
  };

  const handleNewExam = () => {
    setSelectedExam(null);
    setShowExamForm(true);
  };

  const handleOpenExam = (exam) => {
    setSelectedExam(exam);
    setShowExamForm(true);
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet examen ?')) {
      await db.deleteExam(examId);
      loadData();
    }
  };
  // NOUVELLE FONCTION : Gère l'archivage
  const handleToggleArchive = async () => {
    const newStatus = !worker.archived;
    const actionName = newStatus ? 'archiver' : 'réactiver';

    if (window.confirm(`Voulez-vous vraiment ${actionName} ce travailleur ?`)) {
      // On utilise saveWorker qui gère la sauvegarde
      const updatedWorker = { ...worker, archived: newStatus };
      await db.saveWorker(updatedWorker);

      alert(`Travailleur ${newStatus ? 'archivé' : 'réactivé'} avec succès.`);
      loadData();
    }
  };

  const handleDeleteWorker = async () => {
    if (
      window.confirm(
        `ATTENTION : La suppression est définitive !\n\nVoulez-vous vraiment supprimer ${worker.full_name} et tout son historique ?\n\n(Conseil : Utilisez plutôt "Archiver" pour le masquer temporairement)`
      )
    ) {
      await db.deleteWorker(worker.id);
      onBack();
    }
  };

  const renderStatusBadge = (status) => {
    if (!status) return '-';
    let badgeClass = '';
    let label = status;

    switch (status) {
      case 'apte':
        badgeClass = 'badge badge-green';
        label = 'Apte';
        break;
      case 'inapte':
        badgeClass = 'badge badge-red';
        label = 'Inapte Temporaire';
        break;
      case 'apte_partielle':
        badgeClass = 'badge badge-yellow';
        label = 'Apte Partiel';
        break;
      default:
        return status;
    }
    return <span className={badgeClass}>{label}</span>;
  };

  if (!worker) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={onBack}>
          <FaArrowLeft /> Retour
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {worker.full_name}
              {/* Indicateur visuel si archivé */}
              {worker.archived && (
                <span
                  style={{
                    fontSize: '0.5em',
                    marginLeft: '10px',
                    background: '#eee',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: '#666',
                    verticalAlign: 'middle',
                  }}
                >
                  ARCHIVÉ
                </span>
              )}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              <strong>Service:</strong> {deptName} • <strong>Lieu:</strong> {workplaceName} •{' '}
              <strong>Poste:</strong> {worker.job_role}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Matricule: {worker.national_id}
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <span className="badge badge-yellow">Prochain Examen: {worker.next_exam_due}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* [NEW] TOGGLE SELECTION MODE (Icon Only) */}
            <button
              className={`btn ${isSelectionMode ? 'btn-primary' : 'btn-outline'}`}
              onClick={toggleSelectionMode}
              title={isSelectionMode ? 'Masquer la sélection' : 'Sélection multiple'}
            >
              <FaCheckSquare />
            </button>

            {/* Bouton Nouvel Examen */}
            <button className="btn btn-primary" onClick={handleNewExam} disabled={worker.archived}>
              <FaFileMedical /> Nouvel Examen
            </button>

            {/* NOUVEAU BOUTON ARCHIVER / REACTIVER */}
            <button
              className="btn btn-outline"
              onClick={handleToggleArchive}
              title={
                worker.archived
                  ? 'Réactiver ce travailleur'
                  : 'Archiver (Désactiver temporairement)'
              }
              style={{
                color: worker.archived ? 'var(--success)' : 'var(--warning)',
                borderColor: worker.archived ? 'var(--success)' : 'var(--warning)',
              }}
            >
              {worker.archived ? (
                <>
                  <FaBoxOpen /> Réactiver
                </>
              ) : (
                <>
                  <FaArchive /> Archiver
                </>
              )}
            </button>

            {/* Bouton Supprimer (Rouge) */}
            <button
              className="btn btn-outline"
              onClick={handleDeleteWorker}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              title="Supprimer définitivement"
            >
              <FaTrash />
            </button>
          </div>
        </div>

        {worker.archived && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#f8f9fa',
              border: '1px dashed #ccc',
              borderRadius: '4px',
              fontSize: '0.9rem',
              color: '#666',
            }}
          >
            ℹ️ Ce dossier est archivé. Il n'apparaîtra plus dans le tableau de bord des retards.
            Cliquez sur "Réactiver" pour le modifier.
          </div>
        )}

        <div
          style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}
        >
          <strong>Antécédents médicaux:</strong> {worker.notes || 'Aucun antécédent.'}
        </div>
      </div>

      {/* --- TITLE --- */}
      <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Historique Médical</h3>

      {/* --- HYBRID HISTORY LIST --- */}
      <div className="scroll-wrapper" style={{ maxHeight: compactMode ? '400px' : 'none' }}>
        <div className="hybrid-container" style={{ minWidth: '700px' }}>
          {/* 1. HEADER CARD */}
          <div className="hybrid-header" style={{ gridTemplateColumns: gridTemplate }}>
            <div style={{ textAlign: 'center' }}>
              {isSelectionMode && (
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={exams.length > 0 && selectedIds.size === exams.length}
                />
              )}
            </div>
            <div>Date</div>
            <div>Médecin</div>
            <div>Résultat Labo</div>
            <div>Statut Final</div>
            <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>Actions</div>
          </div>

          {/* 2. ROW CARDS */}
          {exams.map((e) => {
            const isSelected = selectedIds.has(e.id);
            return (
              <div
                key={e.id}
                className={`hybrid-row ${isSelected ? 'selected' : ''}`}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {/* Col 1: Checkbox */}
                <div style={{ textAlign: 'center', overflow: 'hidden' }}>
                  {isSelectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(e.id)}
                    />
                  )}
                </div>

                {/* Col 2: Date */}
                <div className="hybrid-cell" style={{ fontWeight: 800 }}>
                  {e.exam_date}
                </div>

                {/* Col 3: Médecin */}
                <div className="hybrid-cell">{e.physician_name || '-'}</div>

                {/* Col 4: Labo */}
                <div className="hybrid-cell">
                  {e.lab_result ? (
                    <span
                      className={`badge ${
                        e.lab_result.result === 'positive' ? 'badge-red' : 'badge-green'
                      }`}
                    >
                      {e.lab_result.result === 'positive' ? 'Positif' : 'Négatif'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      En attente
                    </span>
                  )}
                </div>

                {/* Col 5: Statut */}
                <div className="hybrid-cell">{renderStatusBadge(e.decision?.status)}</div>

                {/* Col 6: Actions */}
                <div className="hybrid-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenExam(e)}
                    title="Voir Détails"
                  >
                    <FaEye />
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDeleteExam(e.id)}
                    style={{
                      color: 'var(--danger)',
                      borderColor: 'var(--danger)',
                      backgroundColor: '#fff1f2',
                    }}
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}

          {exams.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📂</div>
              <p>Aucun historique médical.</p>
            </div>
          )}
        </div>
      </div>

      {/* [NEW] Batch Toolbar (Delete Only) */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onDelete={handleBatchDelete}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

      {showExamForm && (
        <ExamForm
          worker={worker}
          existingExam={selectedExam}
          deptName={deptName}
          workplaceName={workplaceName}
          onClose={() => setShowExamForm(false)}
          onSave={() => {
            setShowExamForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
