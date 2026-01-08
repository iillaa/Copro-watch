import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaSearch, FaHistory, FaList, FaTint, FaColumns, FaChartBar } from 'react-icons/fa';
import WaterAnalysisPanel from './WaterAnalysisPanel';
import WaterServiceDetail from './WaterServiceDetail';

export default function WaterAnalyses({ compactMode }) {
  const [departments, setDepartments] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);

  // 1. REMOVED: const [filteredDepartments, setFilteredDepartments] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  // 2. NEW: Defer the search term to keep typing smooth
  const deferredSearch = useDeferredValue(searchTerm);

  // Selection State
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  // View Mode: 'dashboard' (default) or 'history'
  const [viewMode, setViewMode] = useState('dashboard');
  const [historyDept, setHistoryDept] = useState(null);
  const [isPanelVisible, setIsPanelVisible] = useState(() => {
    const saved = localStorage.getItem('isPanelVisible');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const loadData = async () => {
    const [depts, analyses] = await Promise.all([db.getWaterDepartments(), db.getWaterAnalyses()]);
    setDepartments(depts);
    setWaterAnalyses(analyses);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('isPanelVisible', JSON.stringify(isPanelVisible));
  }, [isPanelVisible]);

  // 3. OPTIMIZATION: Calculate filtered list on-the-fly
  const filteredDepartments = useMemo(() => {
    const withStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);

    const withStats = withStatus.map(dept => {
      const analysesForDept = waterAnalyses.filter(a => a.department_id === dept.id || a.structure_id === dept.id);
      const potable = analysesForDept.filter(a => a.result === 'potable').length;
      const nonPotable = analysesForDept.filter(a => a.result === 'non_potable').length;
      const pending = analysesForDept.filter(a => a.result === 'pending' || !a.result).length;
      const total = analysesForDept.length;
      return { ...dept, stats: { potable, nonPotable, pending, total } };
    });

    if (!deferredSearch) return withStats;

    return withStats.filter((d) => d.name.toLowerCase().includes(deferredSearch.toLowerCase()));
  }, [departments, waterAnalyses, deferredSearch]);

  // Auto-select first item if nothing selected (Handled via effect to avoid loop)
  useEffect(() => {
    if (!selectedDeptId && filteredDepartments.length > 0) {
      setSelectedDeptId(filteredDepartments[0].id);
    }
  }, [filteredDepartments, selectedDeptId]);

  const selectedDept =
    filteredDepartments.find((d) => d.id === selectedDeptId) || filteredDepartments[0];

  // SWITCH TO HISTORY VIEW
  const handleViewHistory = (dept) => {
    setHistoryDept(dept);
    setViewMode('history');
  };

  const handleBackFromHistory = () => {
    setViewMode('dashboard');
    setHistoryDept(null);
    loadData(); // Refresh data on return
  };

  // RENDER HISTORY VIEW
  if (viewMode === 'history' && historyDept) {
    return (
      <WaterServiceDetail
        department={historyDept}
        onBack={handleBackFromHistory}
        onSave={loadData}
        compactMode={compactMode} // <--- [NEW] Pass Prop
      />
    );
  }

  // --- NEW: Empty State UI (Premium Look) ---
  const emptyStateUI = (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        border: '2px dashed var(--border-color)',
        background: '#f8fafc',
        boxShadow: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          color: 'var(--primary-light)',
          filter: 'drop-shadow(2px 2px 0px var(--border-color))',
        }}
      >
        <FaTint />
      </div>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Aucun service d'eau configuré</h3>
      <p
        style={{
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          maxWidth: '450px',
          lineHeight: '1.6',
        }}
      >
        Votre tableau de bord est vide. Pour commencer le suivi de la qualité de l'eau, veuillez
        ajouter vos points d'eau (Robinets, Réservoirs, Bâches) dans l'onglet{' '}
        <strong>Paramètres</strong>.
      </p>
      <div
        style={{
          padding: '1rem',
          background: '#e2e8f0',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#475569',
        }}
      >
        ℹ️ Conseil : Allez dans <strong>Paramètres {'>'} Services d'Eau</strong> pour en ajouter.
      </div>
    </div>
  );

  // RENDER DASHBOARD VIEW
  if (departments.length === 0) return emptyStateUI; // <--- 1. Check for Empty DB

    return (
    <div style={{ height: compactMode ? 'calc(100vh - 90px)' : 'auto', overflowY: compactMode ? 'auto' : 'visible' }}>
      <div
        className="water-dashboard-layout"
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-start', // Let panels have their own height
        }}
      >
   
        {/* LEFT PANEL: LIST */}
        <div
          style={{
            flex: isPanelVisible ? '1 1 300px' : '1 1 100%',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            // Make left panel sticky and take full height
            position: 'sticky',
            top: 0,
            height: compactMode ? 'calc(100vh - 90px)' : 'auto',
          }}
        >
          {/* Header & Search */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2
                style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <FaList /> Services
              </h2>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                title={isPanelVisible ? "Masquer le panneau" : "Afficher le panneau"}
              >
                <FaColumns />
              </button>
            </div>
            <div
              className="input"
              style={{ display: 'flex', alignItems: 'center', padding: '0.5rem' }}
            >
              <FaSearch style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
              <input
                style={{ border: 'none', outline: 'none', width: '100%' }}
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* V4 Card List */}
 {/* SCROLLABLE LIST AREA */}
          {/* SCROLLABLE LIST AREA */}
          <div 
            /* FIX: Removed class "water-panel-scroll" to avoid conflicts */
            style={{
              flex: 1,
              padding: '0.5rem',
              overflowY: 'auto', // Always allow internal scroll
              minHeight: 0, // Needed for flexbox scrolling
            }}
          >
            {filteredDepartments.map((dept) => {
              const isSelected = dept.id === selectedDeptId;
              const statusColor = logic.getServiceWaterStatusColor(dept.waterStatus);
              const isStale = searchTerm !== deferredSearch;

              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className="card"
                  style={{
                    border: '2px solid black',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '4px 4px 0px rgba(0,0,0,0.15)',
                    opacity: isStale ? 0.6 : 1,
                   ...(isSelected && {
        borderColor: statusColor,            // Border takes the status color
        boxShadow: `6px 6px 0px ${statusColor}`, // Shadow takes the status color
        transform: 'translate(-3px, -3px)',
      }),
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{dept.name}</span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: statusColor,
                        color: 'white',
                        border: 'none',
                        fontSize: '0.9rem',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '6px',
                      }}
                    >
                      {logic.getServiceWaterStatusLabel(dept.waterStatus)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {dept.lastDate ? `Date: ${logic.formatDateDisplay(dept.lastDate)}` : 'Aucune donnée récente'}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewHistory(dept);
                      }}
                    >
                      <FaHistory style={{ marginRight: '0.5rem' }} />
                      Voir l'historique
                    </button>
                  </div>

                  {!isPanelVisible && (
                    <div style={{ borderTop: '2px solid black', marginTop: '1rem', paddingTop: '1rem' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><FaChartBar /> Aperçu Annuel</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{dept.stats.potable}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Potable</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{dept.stats.nonPotable}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Non Potable</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{dept.stats.pending}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>En Attente</div>
                        </div>
                      </div>
                      <div style={{ height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
                        {dept.stats.total > 0 && (
                          <>
                            <div style={{ width: `${(dept.stats.potable / dept.stats.total) * 100}%`, background: 'var(--success)' }}></div>
                            <div style={{ width: `${(dept.stats.nonPotable / dept.stats.total) * 100}%`, background: 'var(--danger)' }}></div>
                            <div style={{ width: `${(dept.stats.pending / dept.stats.total) * 100}%`, background: 'var(--border-color)' }}></div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* No Search Results State */}
            {filteredDepartments.length === 0 && (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ opacity: 0.5, fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <p>Aucun service trouvé pour "{searchTerm}"</p>
                <button className="btn btn-outline btn-sm" onClick={() => setSearchTerm('')} style={{ marginTop: '0.5rem' }}>
                  Effacer la recherche
                </button>
              </div>
            )}
          </div>
        </div>
{/* RIGHT PANEL: DETAILS */}
        {isPanelVisible && (
          <div
            style={{
              flex: '1.2 1 280px',
              minWidth: '280px',
              // Let the panel grow with its content
              overflow: 'visible', // IMPORTANT: Fixes the border being cut off
            }}
          >
            {selectedDept ? (
              <WaterAnalysisPanel
                department={selectedDept}
                analyses={waterAnalyses.filter(
                  (a) => (a.department_id || a.structure_id) === selectedDept.id
                )}
                onUpdate={loadData}
              />
            ) : (
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  padding: '3rem',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Sélectionnez un service pour voir les détails.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}