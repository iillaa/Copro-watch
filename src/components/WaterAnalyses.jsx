import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import { FaSearch } from 'react-icons/fa';
import WaterAnalysisPanel from './WaterAnalysisPanel';

export default function WaterAnalyses() {
  const [departments, setDepartments] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Selection State (for the split view)
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  const loadData = async () => {
    const [depts, analyses] = await Promise.all([db.getWaterDepartments(), db.getWaterAnalyses()]);
    setDepartments(depts);
    setWaterAnalyses(analyses);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 1. Calculate Status for all departments using your new logic
    const withStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);

    // 2. Filter based on search
    const filtered = withStatus.filter((d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDepartments(filtered);

    // 3. Auto-select first item if nothing selected (Crucial for Landscape UX)
    if (!selectedDeptId && filtered.length > 0) {
      setSelectedDeptId(filtered[0].id);
    }
  }, [searchTerm, departments, waterAnalyses]);

  // Helper to find the currently selected department object
  const selectedDept =
    filteredDepartments.find((d) => d.id === selectedDeptId) || filteredDepartments[0];

  return (
    <div
      style={{ height: 'calc(100vh - 4rem)', display: 'flex', gap: '1.5rem', overflow: 'hidden' }}
    >
      {/* LEFT PANEL: LIST (Fixed Width 320px) */}
      <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

        {/* Scrollable Service List */}
        <div className="card" style={{ flex: 1, padding: 0, overflowY: 'auto', margin: 0 }}>
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
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontWeight: 600 }}>{dept.name}</span>
                  {/* Status Badge */}
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
                {/* Last Activity Date */}
                <div
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}
                >
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

      {/* RIGHT PANEL: DETAILS FORM (Fills remaining space) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Sélectionnez un service pour voir les détails.
          </div>
        )}
      </div>
    </div>
  );
}
