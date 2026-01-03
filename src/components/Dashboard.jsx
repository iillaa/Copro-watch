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

  // [INJECT THIS] --- MOBILE DETECTOR ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // [END INJECTION]
  const loadStats = async () => {
    try {
      setLoading(true);
      // Safety check for DB
      if (!db) throw new Error('DB not ready');

      const [workers, exams] = await Promise.all([db.getWorkers(), db.getExams()]);

      // 1. Filtrer les archivés
      const activeWorkers = (workers || []).filter((w) => !w.archived);

      // 2. Calculer les stats
      const computed = logic.getDashboardStats(activeWorkers, exams || []);

      // 3. TRI AUTOMATIQUE
      if (computed.dueSoon)
        computed.dueSoon.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
      if (computed.overdue)
        computed.overdue.sort((a, b) => new Date(a.next_exam_due) - new Date(b.next_exam_due));
      if (computed.retests) computed.retests.sort((a, b) => new Date(a.date) - new Date(b.date));

      setStats(computed);
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false); // CRITICAL: This forces the screen to show, even if empty
    }
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
      {/* FIX: Reduced marginBottom to 0.75rem to pull charts UP */}
      {/* --- HEADER (Hybrid) --- */}
      <header style={{ marginBottom: isMobile ? '0.75rem' : '1.5rem' }}>
        <h2
          style={
            isMobile
              ? { marginBottom: 0, marginTop: 0, lineHeight: 1.2 }
              : { marginBottom: '0', marginTop: '0', lineHeight: '1.2' }
          }
        >
          Tableau de bord
        </h2>
        <p
          style={{
            margin: 0,
            color: 'var(--text-muted)',
            fontSize: isMobile ? '0.85rem' : '0.9rem',
          }}
        >
          Aperçu de la situation médicale.
        </p>
      </header>

      {/* --- CARTES DE STATISTIQUES --- */}
      {/* --- STATS CARDS (Hybrid Grid) --- */}
      <div
        style={
          isMobile
            ? {
                // MOBILE GRID: 3 Columns, Tight Gap
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }
            : {
                // DESKTOP GRID: Your Original Layout (Auto-fit, Wide Gap)
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }
        }
      >
        {/* CARD 1: À FAIRE */}
        <div
          className="card"
          style={
            isMobile
              ? {
                  // MOBILE STYLE: Vertical & Compact
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--warning-light)',
                  padding: '0.75rem 0.25rem',
                  textAlign: 'center',
                  margin: 0,
                }
              : {
                  // DESKTOP STYLE: Your Original (Horizontal)
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--warning-light)',
                  padding: '1.5rem',
                }
          }
        >
          {isMobile ? (
            /* MOBILE CONTENT */
            <>
              <FaClipboardList
                size={20}
                color="var(--warning)"
                style={{ marginBottom: '0.25rem' }}
              />
              <div
                className="stat-card-value"
                style={{ color: 'var(--warning)', fontSize: '1.5rem' }}
              >
                {stats.dueSoon.length}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--warning-text)',
                  lineHeight: 1,
                }}
              >
                À faire
              </p>
            </>
          ) : (
            /* DESKTOP CONTENT (Your Original Code) */
            <>
              <div>
                <h3 className="stat-card-title" style={{ color: 'var(--warning-text)' }}>
                  À faire (15 jours)
                </h3>
                <div className="stat-card-value" style={{ color: 'var(--warning)' }}>
                  {stats.dueSoon.length}
                </div>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--warning-text)' }}>
                  Travailleurs
                </p>
              </div>
              <div style={{ opacity: 0.8 }}>
                <FaClipboardList size={60} color="var(--warning)" />
              </div>
            </>
          )}
        </div>

        {/* CARD 2: EN RETARD */}
        <div
          className="card"
          style={
            isMobile
              ? {
                  // MOBILE STYLE
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--danger-light)',
                  padding: '0.75rem 0.25rem',
                  textAlign: 'center',
                  margin: 0,
                }
              : {
                  // DESKTOP STYLE
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--danger-light)',
                  padding: '1.5rem',
                }
          }
        >
          {isMobile ? (
            /* MOBILE CONTENT */
            <>
              <FaExclamationTriangle
                size={20}
                color="var(--danger)"
                style={{ marginBottom: '0.25rem' }}
              />
              <div
                className="stat-card-value"
                style={{ color: 'var(--danger)', fontSize: '1.5rem' }}
              >
                {stats.overdue.length}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--danger-text)',
                  lineHeight: 1,
                }}
              >
                Retard
              </p>
            </>
          ) : (
            /* DESKTOP CONTENT (Your Original Code) */
            <>
              <div>
                <h3 className="stat-card-title" style={{ color: 'var(--danger-text)' }}>
                  En Retard
                </h3>
                <div className="stat-card-value" style={{ color: 'var(--danger)' }}>
                  {stats.overdue.length}
                </div>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--danger-text)' }}>
                  Travailleurs
                </p>
              </div>
              <div style={{ opacity: 0.8 }}>
                <FaExclamationTriangle size={60} color="var(--danger)" />
              </div>
            </>
          )}
        </div>

        {/* CARD 3: SUIVI */}
        <div
          className="card"
          style={
            isMobile
              ? {
                  // MOBILE STYLE
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--primary-light)',
                  padding: '0.75rem 0.25rem',
                  textAlign: 'center',
                  margin: 0,
                }
              : {
                  // DESKTOP STYLE
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--primary-light)',
                  padding: '1.5rem',
                }
          }
        >
          {isMobile ? (
            /* MOBILE CONTENT */
            <>
              <FaMicroscope size={20} color="var(--primary)" style={{ marginBottom: '0.25rem' }} />
              <div
                className="stat-card-value"
                style={{ color: 'var(--primary)', fontSize: '1.5rem' }}
              >
                {stats.activePositive.length}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  lineHeight: 1,
                }}
              >
                Suivi
              </p>
            </>
          ) : (
            /* DESKTOP CONTENT (Your Original Code) */
            <>
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
            </>
          )}
        </div>
      </div>

      {/* --- TABLEAUX --- */}
      <div
        style={{
          display: 'grid',
          /* FIX: Changed '1fr' to this Smart Rule */
          /* It puts tables side-by-side if there is room (300px+), otherwise stacks them */
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
                    {/* FIX: Added whiteSpace: 'nowrap' to prevent header splitting */}
                    <th style={{ whiteSpace: 'nowrap' }}>Date Prévue</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {/* D'abord les retards (Priorité absolue) */}
                  {stats.overdue.map((w) => (
                    <tr key={w.id} className="overdue-worker-row">
                      <td>
                        {/* FIX: Flexbox puts Name + Badge side-by-side */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--danger-text)' }}>
                            {w.full_name}
                          </span>
                          {/* FIX: Smaller, compact badge */}
                          <span
                            className="badge badge-red"
                            style={{
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            En Retard
                          </span>
                        </div>
                      </td>
                      <td
                        style={{ color: 'var(--danger)', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                      >
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
                      {/* Column 1: Name */}
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.full_name}</div>
                      </td>

                      {/* Column 2: Date (Fixed NOWRAP) */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {logic.formatDate(new Date(w.next_exam_due))}
                      </td>

                      {/* Column 3: Button */}
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
