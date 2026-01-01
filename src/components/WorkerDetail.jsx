import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { FaArrowLeft, FaFileMedical, FaTrash, FaArchive, FaBoxOpen } from 'react-icons/fa';
import ExamForm from './ExamForm';

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

  const handleToggleArchive = async () => {
    const newStatus = !worker.archived;
    const actionName = newStatus ? 'archiver' : 'réactiver';

    if (window.confirm(`Voulez-vous vraiment ${actionName} ce travailleur ?`)) {
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
      case 'apte': badgeClass = 'badge-green'; label = 'Apte'; break;
      case 'inapte': badgeClass = 'badge-red'; label = 'Inapte Temporaire'; break;
      case 'apte_partielle': badgeClass = 'badge-yellow'; label = 'Apte Partiel'; break;
      default: return status;
    }
    return <span className={`badge ${badgeClass}`}>{label}</span>;
  };

  if (!worker) return <div className="loading-text">Chargement...</div>;

  return (
    <div className="worker-detail-container">
      <div className="back-nav">
        <button className="btn btn-outline" onClick={onBack}>
          <FaArrowLeft /> Retour
        </button>
      </div>

      <div className="card detail-card">
        <div className="detail-header">
          <div className="detail-info">
            <h2 className="worker-name">
              {worker.full_name}
              {worker.archived && <span className="tag-archived">ARCHIVÉ</span>}
            </h2>
            <p className="worker-meta">
              <strong>Service:</strong> {deptName} • <strong>Lieu:</strong> {workplaceName} •{' '}
              <strong>Poste:</strong> {worker.job_role}
            </p>
            <p className="worker-matricule">Matricule: {worker.national_id}</p>
            <div className="worker-status">
              <span className="badge badge-yellow">Prochain Examen: {worker.next_exam_due}</span>
            </div>
          </div>

          <div className="action-bar">
            <button className="btn btn-primary" onClick={handleNewExam} disabled={worker.archived}>
              <FaFileMedical /> <span className="btn-label">Nouvel Examen</span>
            </button>

            <button
              className={`btn btn-outline ${worker.archived ? 'btn-success-outline' : 'btn-warning-outline'}`}
              onClick={handleToggleArchive}
              title={worker.archived ? 'Réactiver' : 'Archiver'}
            >
              {worker.archived ? <><FaBoxOpen /> <span className="btn-label">Réactiver</span></> : <><FaArchive /> <span className="btn-label">Archiver</span></>}
            </button>

            <button
              className="btn btn-outline btn-danger-outline"
              onClick={handleDeleteWorker}
              title="Supprimer définitivement"
            >
              <FaTrash />
            </button>
          </div>
        </div>

        {worker.archived && (
          <div className="archive-notice">
            ℹ️ Ce dossier est archivé. Il n'apparaîtra plus dans le tableau de bord des retards.
            Cliquez sur "Réactiver" pour le modifier.
          </div>
        )}

        <div className="detail-notes">
          <strong>Antécédents médicaux:</strong> {worker.notes || 'Aucun antécédent.'}
        </div>
      </div>

      <h3>Historique Médical</h3>
      <div className="card no-padding">
        <div className="table-responsive">
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
                      <span className={`badge ${e.lab_result.result === 'positive' ? 'badge-red' : 'badge-green'}`}>
                        {e.lab_result.result === 'positive' ? 'Positif' : 'Négatif'}
                      </span>
                    ) : (
                      <span className="text-muted">En attente</span>
                    )}
                  </td>
                  <td>{renderStatusBadge(e.decision?.status)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenExam(e)}>
                        Détails
                      </button>
                      <button className="btn btn-outline btn-sm btn-danger-outline" onClick={() => handleDeleteExam(e.id)}>
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-4">Aucun historique.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showExamForm && (
        <ExamForm
          worker={worker}
          existingExam={selectedExam}
          deptName={deptName}
          workplaceName={workplaceName}
          onClose={() => setShowExamForm(false)}
          onSave={() => { setShowExamForm(false); loadData(); }}
        />
      )}
    </div>
  );
}