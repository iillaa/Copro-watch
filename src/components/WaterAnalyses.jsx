import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaSearch, FaHistory, FaList, FaTint } from 'react-icons/fa';
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

  const loadData = async () => {
    const [depts, analyses] = await Promise.all([db.getWaterDepartments(), db.getWaterAnalyses()]);
    setDepartments(depts);
    setWaterAnalyses(analyses);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 3. OPTIMIZATION: Calculate filtered list on-the-fly
  const filteredDepartments = useMemo(() => {
    const withStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);

    if (!deferredSearch) return withStatus;

    return withStatus.filter((d) => d.name.toLowerCase().includes(deferredSearch.toLowerCase()));
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
    <div style={{ height: '100%' }}>
      {/* Container: Stretches nicely */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        {/* LEFT PANEL: LIST */}
        <div
          style={{
            flex: '1 1 300px',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Header & Search */}
          <div>
            <h2
              style={{
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FaList /> Services
            </h2>
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
          <div
            className="scroll-wrapper"
            style={{
              overflowY: 'auto',
              flex: 1,
              // [FIX 1] Compact Mode Logic
              maxHeight: compactMode ? '850px' : '105vh',
              // [FIX 2] Safety Padding (Anti-Crop)
              paddingBottom: '10px',
              padding: '0.25rem',
              margin: '-0.25rem',
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
                      borderColor: 'var(--primary)',
                      boxShadow: '6px 6px 0px var(--primary)',
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
        <div
          style={{ flex: '3 1 400px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}
        >
          {selectedDept ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              {/* History Button at TOP */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => handleViewHistory(selectedDept)}>
                  <FaHistory style={{ marginRight: '0.5rem' }} /> Voir l'historique complet
                </button>
              </div>

              <WaterAnalysisPanel
                department={selectedDept}
                analyses={waterAnalyses.filter(
                  (a) => (a.department_id || a.structure_id) === selectedDept.id
                )}
                onUpdate={loadData}
              />
            </div>
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
      </div>
    </div>
  );
}
