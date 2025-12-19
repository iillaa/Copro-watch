import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import ExamForm from './ExamForm';
// AJOUT : Import des icônes d'archive
import { FaArrowLeft, FaFileMedical, FaTrash, FaArchive, FaBoxOpen } from 'react-icons/fa';

export default function WorkerDetail({ workerId, onBack }) {
  const [worker, setWorker] = useState(null);
  const [exams, setExams] = useState([]);
  const [showExamForm, setShowExamForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  const [deptName, setDeptName] = useState('');
  const [workplaceName, setWorkplaceName] = useState('');

  const loadData = async () => {
    const w = (await db.getWorkers()).find((x) => x.id === workerId);
    setWorker(w);

    if (w) {
      const depts = await db.getDepartments();
      const works = await db.getWorkplaces();
      const d = depts.find((x) => x.id == w.department_id);
      const wp = works.find((x) => x.id == w.workplace_id);
      setDeptName(d ? d.name : '-');
      setWorkplaceName(wp ? wp.name : '-');
    }

    const allExams = await db.getExams();
    const wExams = allExams.filter((e) => e.worker_id === workerId);
    // Sort desc
    wExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    setExams(wExams);
  };

  useEffect(() => {
    loadData();
  }, [workerId]);

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

      <h3>Historique Médical</h3>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Médecin</th>
              <th>Résultat Labo</th>
              <th>Statut Final</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td>{e.exam_date}</td>
                <td>{e.physician_name}</td>
                <td>
                  {e.lab_result ? (
                    <span
                      className={`badge ${
                        e.lab_result.result === 'positive' ? 'badge-red' : 'badge-green'
                      }`}
                    >
                      {e.lab_result.result === 'positive' ? 'Positif' : 'Négatif'}
                    </span>
                  ) : (
                    'En attente'
                  )}
                </td>
                <td>{renderStatusBadge(e.decision?.status)}</td>
                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenExam(e)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Détails
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDeleteExam(e.id)}
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  Aucun historique.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
