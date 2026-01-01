import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaSearch, FaHistory, FaList, FaTint } from 'react-icons/fa';
import WaterAnalysisPanel from './WaterAnalysisPanel';
import WaterServiceDetail from './WaterServiceDetail';

export default function WaterAnalyses() {
  const [departments, setDepartments] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [historyDept, setHistoryDept] = useState(null);

  const loadData = async () => {
    const [depts, analyses] = await Promise.all([db.getWaterDepartments(), db.getWaterAnalyses()]);
    setDepartments(depts);
    setWaterAnalyses(analyses);
  };

  useEffect(() => { loadData(); }, []);

  const filteredDepartments = useMemo(() => {
    const withStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);
    if (!deferredSearch) return withStatus;
    return withStatus.filter((d) => d.name.toLowerCase().includes(deferredSearch.toLowerCase()));
  }, [departments, waterAnalyses, deferredSearch]);

  useEffect(() => {
    if (!selectedDeptId && filteredDepartments.length > 0) {
      setSelectedDeptId(filteredDepartments[0].id);
    }
  }, [filteredDepartments, selectedDeptId]);

  const selectedDept = filteredDepartments.find((d) => d.id === selectedDeptId) || filteredDepartments[0];

  const handleViewHistory = (dept) => {
    setHistoryDept(dept);
    setViewMode('history');
  };

  const handleBackFromHistory = () => {
    setViewMode('dashboard');
    setHistoryDept(null);
    loadData();
  };

  if (viewMode === 'history' && historyDept) {
    return <WaterServiceDetail department={historyDept} onBack={handleBackFromHistory} onSave={loadData} />;
  }

  // Empty State
  if (departments.length === 0) return (
    <div className="water-empty-state card">
      <div className="water-empty-icon"><FaTint /></div>
      <h3>Aucun service d'eau configuré</h3>
      <p>Votre tableau de bord est vide. Pour commencer, ajoutez vos points d'eau dans <strong>Paramètres</strong>.</p>
      <div className="water-empty-tip">ℹ️ Conseil : Allez dans <strong>Paramètres {'>'} Services d'Eau</strong></div>
    </div>
  );

  return (
    <div className="water-layout">
      {/* LEFT PANEL: LIST */}
      <div className="water-sidebar">
        <div className="water-sidebar-header">
          <h2><FaList /> Services</h2>
          <div className="input search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card water-list-card">
          {filteredDepartments.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            const statusColor = logic.getServiceWaterStatusColor(dept.waterStatus);
            const isStale = searchTerm !== deferredSearch;

            return (
              <div
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`water-list-item ${isSelected ? 'selected' : ''}`}
                style={{ opacity: isStale ? 0.6 : 1, borderLeftColor: isSelected ? 'var(--primary)' : 'transparent' }}
              >
                <div className="water-item-top">
                  <span className="water-item-name">{dept.name}</span>
                  <span className="badge" style={{ backgroundColor: statusColor, color: 'white' }}>
                    {logic.getServiceWaterStatusLabel(dept.waterStatus)}
                  </span>
                </div>
                <div className="water-item-date">
                  {dept.lastDate ? `Date: ${logic.formatDateDisplay(dept.lastDate)}` : 'Aucune donnée'}
                </div>
              </div>
            );
          })}
          
          {filteredDepartments.length === 0 && (
            <div className="water-no-results">
              <div className="icon">🔍</div>
              <p>Aucun service trouvé</p>
              <button className="btn btn-outline btn-sm" onClick={() => setSearchTerm('')}>Effacer</button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: DETAILS */}
      <div className="water-content">
        {selectedDept ? (
          <div className="water-detail-wrapper">
            <div className="water-detail-actions">
              <button className="btn btn-outline" onClick={() => handleViewHistory(selectedDept)}>
                <FaHistory /> Voir l'historique complet
              </button>
            </div>

            <WaterAnalysisPanel
              department={selectedDept}
              analyses={waterAnalyses.filter((a) => (a.department_id || a.structure_id) === selectedDept.id)}
              onUpdate={loadData}
            />
          </div>
        ) : (
          <div className="water-select-prompt card">
            Sélectionnez un service pour voir les détails.
          </div>
        )}
      </div>
    </div>
  );
}