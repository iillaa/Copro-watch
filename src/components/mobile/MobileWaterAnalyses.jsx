import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { db } from '../../services/db';
import { logic } from '../../services/logic';
import { FaSearch, FaTint, FaArrowLeft } from 'react-icons/fa';
import WaterAnalysisPanel from '../WaterAnalysisPanel'; // Reuse existing logic

export default function MobileWaterAnalyses() {
  // --- STATE ---
  const [departments, setDepartments] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  
  // Navigation State (Mobile Routing)
  const [selectedDept, setSelectedDept] = useState(null);

  const loadData = async () => {
    const [depts, analyses] = await Promise.all([db.getWaterDepartments(), db.getWaterAnalyses()]);
    setDepartments(depts);
    setWaterAnalyses(analyses);
  };

  useEffect(() => { loadData(); }, []);

  // Filter Logic
  const filteredDepartments = useMemo(() => {
    const withStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);
    if (!deferredSearch) return withStatus;
    return withStatus.filter((d) => d.name.toLowerCase().includes(deferredSearch.toLowerCase()));
  }, [departments, waterAnalyses, deferredSearch]);


  // --- VIEW 1: DETAIL (If a department is selected) ---
  if (selectedDept) {
    // Filter analyses for this department
    const deptAnalyses = waterAnalyses.filter(
        (a) => (a.department_id || a.structure_id) === selectedDept.id
    );

    return (
      <div className="mobile-layout">
         {/* Sticky Header */}
        <div style={{ padding: '0.5rem', borderBottom: '1px solid #eee', background: 'white', position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', gap:'1rem' }}>
          <button onClick={() => setSelectedDept(null)} className="btn btn-sm btn-outline" style={{border:'none', padding:'0.5rem'}}>
              <FaArrowLeft size={18} />
          </button>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedDept.name}</h3>
          </div>
        </div>

        {/* Reuse the Desktop Panel but it will stack naturally on mobile */}
        <div style={{ padding: '0.5rem' }}>
            <WaterAnalysisPanel
              department={selectedDept}
              analyses={deptAnalyses}
              onUpdate={loadData}
            />
        </div>
      </div>
    );
  }

  // --- VIEW 2: LIST (Default) ---
  return (
    <div className="mobile-layout">
      {/* Search Header */}
      <div style={{ position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 10, padding: '0.5rem 0' }}>
         <h2 style={{ paddingLeft: '0.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaTint color="var(--primary)" /> Qualité de l'Eau
         </h2>
         <div className="input" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '50px', margin: '0 0.5rem' }}>
            <FaSearch color="var(--text-muted)" />
            <input 
                style={{ border: 'none', marginLeft: '0.5rem', width: '100%', outline: 'none' }} 
                placeholder="Chercher un service..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {filteredDepartments.map((dept) => {
           const statusColor = logic.getServiceWaterStatusColor(dept.waterStatus);
           
           return (
             <div key={dept.id} className="mobile-card" onClick={() => setSelectedDept(dept)}>
                <div className="mobile-card-header">
                    <span className="mobile-card-title">{dept.name}</span>
                    <span className="badge" style={{ backgroundColor: statusColor, color: 'white', border:'none' }}>
                        {logic.getServiceWaterStatusLabel(dept.waterStatus)}
                    </span>
                </div>
                <div className="mobile-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Dernière analyse:</span>
                    <span>{dept.lastDate ? logic.formatDateDisplay(dept.lastDate) : '-'}</span>
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
}