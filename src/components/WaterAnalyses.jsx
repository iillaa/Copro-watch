import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaSearch, FaHistory, FaList } from 'react-icons/fa';
import WaterAnalysisPanel from './WaterAnalysisPanel';
import WaterServiceDetail from './WaterServiceDetail';

export default function WaterAnalyses() {
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

    return withStatus.filter((d) =>
      d.name.toLowerCase().includes(deferredSearch.toLowerCase())
    );
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
      />
    );
  }

  // RENDER DASHBOARD VIEW
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

          {/* List Card - Added flex: 1 to stretch */}
          <div
            className="card"
            style={{ padding: 0, overflowY: 'auto', flex: 1, maxHeight: '80vh' }}
          >
            {filteredDepartments.map((dept) => {
              const isSelected = dept.id === selectedDeptId;
              const statusColor = logic.getServiceWaterStatusColor(dept.waterStatus);

              // Use deferred search for visual feedback (opacity)
              const isStale = searchTerm !== deferredSearch;

              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                    borderLeft: isSelected ? `5px solid var(--primary)` : `5px solid transparent`,
                    transition: 'all 0.2s ease',
                    opacity: isStale ? 0.6 : 1 
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{dept.name}</span>
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
                  <div
                    style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}
                  >
                    {dept.lastDate
                      ? `Date: ${logic.formatDateDisplay(dept.lastDate)}`
                      : 'Aucune donnée récente'}
                  </div>
                </div>
              );
            })}
            {filteredDepartments.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Aucun service trouvé.
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