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

    // 1. Filter archived
    const activeWorkers = workers.filter((w) => !w.archived);

    // 2. Calculate stats
    const computed = logic.getDashboardStats(activeWorkers, exams);

    // 3. Auto-sort
    computed.dueSoon.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
    computed.overdue.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
    computed.retests.sort((a, b) => new Date(a.date) - new Date(b.date));

    setStats(computed);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Chargement des données...</div>
      </div>
    );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Tableau de bord</h2>
        <p>Aperçu de la situation médicale.</p>
      </header>

      {/* --- STATS CARDS --- */}
      <div className="dashboard-stats-grid">
        {/* Warning Card */}
        <div className="card stat-card warning">
          <div className="stat-content">
            <h3 className="stat-card-title warning-text">À faire (15j)</h3>
            <div className="stat-card-value warning-val">{stats.dueSoon.length}</div>
            <p className="stat-subtitle warning-text">Travailleurs</p>
          </div>
          <div className="stat-icon">
            <FaClipboardList />
          </div>
        </div>

        {/* Overdue Card */}
        <div className="card stat-card danger">
          <div className="stat-content">
            <h3 className="stat-card-title danger-text">En Retard</h3>
            <div className="stat-card-value danger-val">{stats.overdue.length}</div>
            <p className="stat-subtitle danger-text">Travailleurs</p>
          </div>
          <div className="stat-icon">
            <FaExclamationTriangle />
          </div>
        </div>

        {/* Active Card */}
        <div className="card stat-card primary">
          <div className="stat-content">
            <h3 className="stat-card-title primary-text">Suivi Médical</h3>
            <div className="stat-card-value primary-val">{stats.activePositive.length}</div>
            <p className="stat-subtitle primary-text">Cas actifs</p>
          </div>
          <div className="stat-icon">
            <FaMicroscope />
          </div>
        </div>
      </div>

      {/* --- TABLES --- */}
      <div className="dashboard-tables-grid">
        {/* TABLE 1: Exams Needed */}
        <div className="card no-padding overflow-hidden">
          <div className="card-header-clean">
            <h3><FaClock /> Examens à prévoir</h3>
          </div>

          {stats.dueSoon.length === 0 && stats.overdue.length === 0 ? (
            <div className="empty-state">Rien à signaler. Tout est à jour !</div>
          ) : (
            <div className="table-container flat">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Date Prévue</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Overdue first */}
                  {stats.overdue.map((w) => (
                    <tr key={w.id} className="overdue-worker-row">
                      <td>
                        <div className="danger-text fw-700">{w.full_name}</div>
                        <span className="badge badge-red mt-1">En Retard</span>
                      </td>
                      <td className="danger-text fw-700">
                        {logic.formatDate(new Date(w.next_exam_due))}
                      </td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-outline" onClick={() => onNavigateWorker(w.id)}>
                          Voir <FaChevronRight size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Upcoming next */}
                  {stats.dueSoon.map((w) => (
                    <tr key={w.id}>
                      <td><div className="fw-600">{w.full_name}</div></td>
                      <td>{logic.formatDate(new Date(w.next_exam_due))}</td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-outline" onClick={() => onNavigateWorker(w.id)}>
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

        {/* TABLE 2: Retests */}
        <div className="card no-padding overflow-hidden">
          <div className="card-header-clean">
            <h3><FaMicroscope className="primary-color" /> Contre-visites</h3>
          </div>

          {stats.retests.length === 0 ? (
            <div className="empty-state">Aucune contre-visite prévue.</div>
          ) : (
            <div className="table-container flat">
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
                        <div className="flex-align-center gap-2">
                          <div className="icon-circle-sm">
                            <FaMicroscope size={14} />
                          </div>
                          <div>
                            <div className="fw-600">{item.worker.full_name}</div>
                            <span className="badge-soft-blue">Suivi requis</span>
                          </div>
                        </div>
                      </td>
                      <td>{logic.formatDate(new Date(item.date))}</td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-outline" onClick={() => onNavigateWorker(item.worker.id)}>
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
