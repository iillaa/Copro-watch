import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import {
  FaChevronRight,
  FaClipboardList,
  FaExclamationTriangle,
  FaMicroscope,
  FaClock,
} from 'react-icons/fa';

export default function Dashboard({ onNavigateWorker }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const [workers, exams] = await Promise.all([db.getWorkers(), db.getExams()]);

    // 1. Filtrer les archivés
    const activeWorkers = workers.filter((w) => !w.archived);

    // 2. Calculer les stats
    const computed = logic.getDashboardStats(activeWorkers, exams);

    // 3. TRI AUTOMATIQUE
    // A faire bientôt : du plus proche au plus lointain
    computed.dueSoon.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
    // En retard : du plus grand retard (date ancienne) au plus petit
    computed.overdue.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
    // Contre-visites : par date prévue
    computed.retests.sort((a, b) => new Date(a.date) - new Date(b.date));

    setStats(computed);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          gap: '1rem',
        }}
      >
        <div className="loading-spinner"></div>
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Chargement des données...</div>
      </div>
    );

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Tableau de bord</h2>
        <p>Aperçu de la situation médicale.</p>
      </header>

      {/* --- CARTES DE STATISTIQUES --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* À faire (Jaune) */}
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--warning-light)',
            padding: '1.5rem',
          }}
        >
          <div>
            <h3 className="stat-card-title" style={{ color: 'var(--warning-text)' }}>
              À faire (15 jours)
            </h3>
            <div className="stat-card-value" style={{ color: 'var(--warning)' }}>
              {stats.dueSoon.length}
            </div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--warning-text)' }}>Travailleurs</p>
          </div>
          <div style={{ opacity: 0.8 }}>
            <FaClipboardList size={60} color="var(--warning)" />
          </div>
        </div>

        {/* En Retard (Rouge) */}
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--danger-light)',
            padding: '1.5rem',
          }}
        >
          <div>
            <h3 className="stat-card-title" style={{ color: 'var(--danger-text)' }}>
              En Retard
            </h3>
            <div className="stat-card-value" style={{ color: 'var(--danger)' }}>
              {stats.overdue.length}
            </div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--danger-text)' }}>Travailleurs</p>
          </div>
          <div style={{ opacity: 0.8 }}>
            <FaExclamationTriangle size={60} color="var(--danger)" />
          </div>
        </div>

        {/* Suivi Médical (Bleu) */}
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--primary-light)',
            padding: '1.5rem',
          }}
        >
          <div>
            <h3 className="stat-card-title" style={{ color: 'var(--primary)' }}>
              Suivi Médical
            </h3>
            <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
              {stats.activePositive.length}
            </div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary)' }}>Cas actifs</p>
          </div>
          <div style={{ opacity: 0.8 }}>
            <FaMicroscope size={60} color="var(--primary)" />
          </div>
        </div>
      </div>

      {/* --- TABLEAUX --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr', // Stacks vertically on mobile, auto-grid on desktop if needed
          gap: '1.5rem',
        }}
      >
        {/* TABLEAU 1 : Examens à prévoir (Retard & Bientôt) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.5rem',
              borderBottom: 'var(--border-width) solid var(--border-color)',
              background: 'white',
            }}
          >
            <h3 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaClock /> Examens à prévoir
            </h3>
          </div>

          {stats.dueSoon.length === 0 && stats.overdue.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Rien à signaler. Tout est à jour !
            </div>
          ) : (
            <div
              className="table-container"
              style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Date Prévue</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {/* D'abord les retards (Priorité absolue) */}
                  {stats.overdue.map((w) => (
                    <tr key={w.id} className="overdue-worker-row">
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--danger-text)' }}>
                          {w.full_name}
                        </div>
                        <span
                          className="badge badge-red"
                          style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}
                        >
                          En Retard
                        </span>
                      </td>
                      <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                        {logic.formatDate(new Date(w.next_exam_due))}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => onNavigateWorker(w.id)}
                        >
                          Voir <FaChevronRight size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Ensuite les examens à venir */}
                  {stats.dueSoon.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.full_name}</div>
                      </td>
                      <td>{logic.formatDate(new Date(w.next_exam_due))}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => onNavigateWorker(w.id)}
                        >
                          Voir <FaChevronRight size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TABLEAU 2 : Contre-visites (Suivi) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.5rem',
              borderBottom: 'var(--border-width) solid var(--border-color)',
              background: 'white',
            }}
          >
            <h3 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaMicroscope color="var(--primary)" /> Contre-visites
            </h3>
          </div>

          {stats.retests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucune contre-visite prévue.
            </div>
          ) : (
            <div
              className="table-container"
              style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Patient (Suivi)</th>
                    <th>Date Prévue</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.retests.map((item) => (
                    <tr key={item.worker.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {/* ICÔNE DE SUIVI */}
                          <div
                            style={{
                              background: 'var(--primary-light)',
                              padding: '6px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FaMicroscope size={14} color="var(--primary)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.worker.full_name}</div>
                            {/* BADGE DISCRET */}
                            <span
                              style={{
                                fontSize: '0.7rem',
                                background: '#e0f2fe',
                                color: '#0284c7',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '600',
                              }}
                            >
                              Suivi requis
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{logic.formatDate(new Date(item.date))}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => onNavigateWorker(item.worker.id)}
                        >
                          Ouvrir <FaChevronRight size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
