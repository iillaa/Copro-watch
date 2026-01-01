import { useState, useEffect } from 'react';
import { db } from '../../services/db'; // Note the ../.. path
import ExamForm from '../ExamForm'; // Reuse the existing form
import {
  FaArrowLeft,
  FaFileMedical,
  FaTrash,
  FaArchive,
  FaBoxOpen,
  FaStethoscope,
} from 'react-icons/fa';

export default function MobileWorkerDetail({ workerId, onBack }) {
  const [worker, setWorker] = useState(null);
  const [exams, setExams] = useState([]);
  const [showExamForm, setShowExamForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [workplaceName, setWorkplaceName] = useState('');

  // Reuse the exact same logic as desktop
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
    wExams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    setExams(wExams);
  };

  useEffect(() => {
    loadData();
  }, [workerId]);

  const handleToggleArchive = async () => {
    const newStatus = !worker.archived;
    if (
      window.confirm(
        `Voulez-vous vraiment ${newStatus ? 'archiver' : 'réactiver'} ce travailleur ?`
      )
    ) {
      await db.saveWorker({ ...worker, archived: newStatus });
      loadData();
    }
  };

  const handleDeleteWorker = async () => {
    if (window.confirm(`Supprimer ${worker.full_name} définitivement ?`)) {
      await db.deleteWorker(worker.id);
      onBack();
    }
  };

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const map = {
      apte: { color: 'var(--success)', text: 'Apte' },
      inapte: { color: 'var(--danger)', text: 'Inapte' },
      apte_partielle: { color: 'var(--warning)', text: 'Apte Partiel' },
    };
    const s = map[status] || { color: '#666', text: status };
    return <span style={{ color: s.color, fontWeight: 700, fontSize: '0.9rem' }}>{s.text}</span>;
  };

  if (!worker) return <div className="loading-spinner"></div>;

  return (
    <div className="mobile-layout">
      {/* Sticky Header Navigation */}
      <div
        style={{
          padding: '0.5rem',
          borderBottom: '1px solid #eee',
          background: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <button
          onClick={onBack}
          className="btn btn-sm btn-outline"
          style={{ border: 'none', padding: '0.5rem' }}
        >
          <FaArrowLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Détails</h3>
      </div>

      {/* Profile Card */}
      <div
        className="mobile-card"
        style={{
          marginTop: '1rem',
          borderTop: `4px solid ${worker.archived ? '#999' : 'var(--primary)'}`,
        }}
      >
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>{worker.full_name}</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {worker.job_role} • {deptName}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>MATRICULE</div>
            <div style={{ fontWeight: 600 }}>{worker.national_id}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>PROCHAIN EXAMEN</div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{worker.next_exam_due}</div>
          </div>
        </div>

        {/* Action Grid (Big Buttons) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedExam(null);
              setShowExamForm(true);
            }}
          >
            <FaFileMedical /> Exam
          </button>
          <button
            className="btn btn-outline"
            onClick={handleToggleArchive}
            style={{ padding: '0 1rem' }}
          >
            {worker.archived ? <FaBoxOpen /> : <FaArchive />}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleDeleteWorker}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0 1rem' }}
          >
            <FaTrash />
          </button>
        </div>
      </div>

      {/* History Timeline (Replaces Table) */}
      <h3 style={{ padding: '0 0.5rem', fontSize: '1.1rem', marginTop: '1.5rem' }}>
        Historique Médical
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {exams.map((e) => (
          <div
            key={e.id}
            className="mobile-card"
            style={{ marginBottom: 0 }}
            onClick={() => {
              setSelectedExam(e);
              setShowExamForm(true);
            }}
          >
            <div className="mobile-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaStethoscope color="var(--text-muted)" />
                <span style={{ fontWeight: 600 }}>{e.exam_date}</span>
              </div>
              {renderStatusBadge(e.decision?.status)}
            </div>

            <div className="mobile-card-row">
              <span style={{ color: 'var(--text-muted)' }}>Médecin:</span>
              <span>{e.physician_name}</span>
            </div>

            <div className="mobile-card-row">
              <span style={{ color: 'var(--text-muted)' }}>Labo:</span>
              <span>
                {e.lab_result
                  ? e.lab_result.result === 'positive'
                    ? '🔴 Positif'
                    : '🟢 Négatif'
                  : '⚪ En attente'}
              </span>
            </div>

            <div className="mobile-card-actions">
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                Toucher pour voir les détails
              </span>
            </div>
          </div>
        ))}

        {exams.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Aucun historique disponible.
          </div>
        )}
      </div>

      {/* Form Modal (Full Screen on Mobile) */}
      {showExamForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'white' }}>
          <div style={{ height: '100%', overflowY: 'auto' }}>
            {/* We wrap the existing form but you might want to style it specifically for mobile later */}
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
          </div>
          <button
            onClick={() => setShowExamForm(false)}
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              zIndex: 2001,
              background: 'black',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
