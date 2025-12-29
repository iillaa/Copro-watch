import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import {
  FaChevronRight,
  FaClipboardList,
  FaExclamationTriangle,
  FaMicroscope,
} from 'react-icons/fa';

export default function Dashboard({ onNavigateWorker }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const [workers, exams] = await Promise.all([db.getWorkers(), db.getExams()]);

    // 1. Filtrer les archivés (Important !)
    const activeWorkers = workers.filter((w) => !w.archived);

    // 2. Calculer les stats
    const computed = logic.getDashboardStats(activeWorkers, exams);

    // 3. AJOUTER CE BLOC DE TRI (SORTING) ICI :
    // Trier par date d'échéance (du plus urgent au moins urgent)
    computed.dueSoon.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
    computed.overdue.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));

    // Trier les contre-visites par date
    computed.retests.sort((a, b) => new Date(a.date) - new Date(b.date));
    // ----------------------------------------

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
        <div
          style={{
            width: '200px',
            height: '4px',
            backgroundColor: 'var(--bg-app)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--primary)',
              animation: 'shimmer 1.5s infinite',
            }}
          ></div>
        </div>
      </div>
    );

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Tableau de bord</h2>
        <p>Aperçu de la situation médicale.</p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Due Soon - Orange/Yellow */}
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

        {/* Overdue - Red */}
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

        {/* Positive Cases - Blue/Teal */}
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Urgent List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.5rem',
              borderBottom: 'var(--border-width) solid var(--border-color)',
              background: 'white',
            }}
          >
            <h3 style={{ marginBottom: 0 }}>Examens à prévoir</h3>
          </div>

          {stats.dueSoon.length === 0 && stats.overdue.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Rien à signaler.
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
                  {stats.overdue.map((w) => (
                    <tr key={w.id} className="overdue-worker-row">
                      <td>
                        <div style={{ fontWeight: 700 }}>{w.full_name}</div>
                        <span className="badge badge-red" style={{ marginTop: '0.25rem' }}>
                          En Retard
                        </span>
                      </td>
                      <td>{w.next_exam_due}</td>
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
                  {stats.dueSoon.map((w) => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>{w.full_name}</td>
                      <td>{w.next_exam_due}</td>
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

        {/* Re-tests */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.5rem',
              borderBottom: 'var(--border-width) solid var(--border-color)',
              background: 'white',
            }}
          >
            <h3 style={{ marginBottom: 0 }}>Contre-visites</h3>
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
                    <th>Nom</th>
                    <th>Date Prévue</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.retests.map((item) => (
                    <tr key={item.worker.id}>
                      <td style={{ fontWeight: 600 }}>{item.worker.full_name}</td>
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
