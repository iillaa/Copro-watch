import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaSearch, FaHistory } from 'react-icons/fa';
import WaterAnalysisPanel from './WaterAnalysisPanel';
import WaterServiceDetail from './WaterServiceDetail';

export default function WaterAnalyses() {
  const [departments, setDepartments] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    const withStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);
    const filtered = withStatus.filter((d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDepartments(filtered);

    // Auto-select first item if nothing selected
    if (!selectedDeptId && filtered.length > 0) {
      setSelectedDeptId(filtered[0].id);
    }
  }, [searchTerm, departments, waterAnalyses]);

  const selectedDept = filteredDepartments.find((d) => d.id === selectedDeptId) || filteredDepartments[0];

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
    <div>
       {/* Responsive Container: Flex wrap allows items to stack on small screens */}
       <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* LEFT PANEL: LIST */}
        <div style={{ 
            flex: '1 1 300px', // Grow: 1, Shrink: 1, Basis: 300px
            minWidth: '280px',
            maxWidth: '100%', // Allow full width on mobile
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem' 
        }}>
            {/* Header & Search */}
            <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Analyses d'Eau</h2>
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

            {/* List Card - height adjusts to content (max-height optional) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}> 
                {filteredDepartments.map((dept) => {
                    const isSelected = dept.id === selectedDeptId;
                    const statusColor = logic.getServiceWaterStatusColor(dept.waterStatus);

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
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{dept.name}</span>
                        <span
                            className="badge"
                            style={{
                            backgroundColor: statusColor,
                            color: 'white',
                            border: 'none',
                            fontSize: '0.7rem',
                            }}
                        >
                            {logic.getServiceWaterStatusLabel(dept.waterStatus)}
                        </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {dept.lastDate ? `Date: ${dept.lastDate}` : 'Aucune donnée récente'}
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
        <div style={{ flex: '999 1 400px', minWidth: '300px' }}>
            {selectedDept ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <WaterAnalysisPanel
                    department={selectedDept}
                    analyses={waterAnalyses.filter(
                    (a) => (a.department_id || a.structure_id) === selectedDept.id
                    )}
                    onUpdate={loadData}
                />
                
                {/* History Button (Outside the panel, nicely aligned) */}
                <div style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline" onClick={() => handleViewHistory(selectedDept)}>
                        <FaHistory /> Voir l'historique complet
                    </button>
                </div>
            </div>
            ) : (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                Sélectionnez un service pour voir les détails.
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
