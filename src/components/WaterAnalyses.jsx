import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterServiceDetail from './WaterServiceDetail';
import { FaPlus, FaSearch, FaFileDownload, FaFileUpload, FaEye } from 'react-icons/fa';

export default function WaterAnalyses({ onNavigateService }) {
  const [departments, setDepartments] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);


  const loadData = async () => {
    setIsLoading(true);
    try {
      const [waterDepartmentsData, analysesData] = await Promise.all([
        db.getWaterDepartments(), // Services séparés pour analyses d'eau
        db.getWaterAnalyses()
      ]);
      setDepartments(waterDepartmentsData);
      setWaterAnalyses(analysesData);
    } catch (error) {
      console.error('Error loading water analyses data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Get departments with water status
    const departmentsWithStatus = logic.getDepartmentsWaterStatus(departments, waterAnalyses);
    
    // Apply search filter
    let result = departmentsWithStatus;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(lower));
    }
    
    setFilteredDepartments(result);
  }, [searchTerm, departments, waterAnalyses]);

  const handleServiceClick = (department) => {
    setSelectedDepartment(department);
    setShowDetail(true);
  };

  const handleAddNew = () => {
    // Navigate to first department or show message
    if (departments.length > 0) {
      handleServiceClick(departments[0]);
    }
  };

  const handleExport = async () => {
    const json = await db.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copro_watch_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const success = await db.importData(evt.target.result);
      if (success) {
        alert("Import réussi !");
        loadData();
      } else {
        alert("Erreur lors de l'import.");
      }
    };
    reader.readAsText(file);
  };


  const renderStatusBadge = (status) => {
    if (!status) return null;
    let badgeClass = '';
    let label = '';
    switch(status) {
        case 'ok': 
          badgeClass = 'badge-green'; label = 'OK'; break;
        case 'alert': 
          badgeClass = 'badge-red'; label = 'ALERTE'; break;
        case 'pending': 
          badgeClass = 'badge-yellow'; label = 'En Attente'; break;
        case 'todo': 
          badgeClass = 'badge-gray'; label = 'À Faire'; break;
        default: return null;
    }
    return <span className={`badge ${badgeClass}`} style={{marginLeft:'0.5rem', fontSize:'0.7rem'}}>{label}</span>;
  };

  const getStatusStyle = (status) => {
    const color = logic.getServiceWaterStatusColor(status);
    return {
      color,
      fontWeight: 'bold'
    };
  };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
        <div>
           <h2 style={{marginBottom:0}}>Analyses d'Eau</h2>
           <p style={{margin:0, fontSize:'0.875rem'}}>Suivi mensuel de la qualité de l'eau par service.</p>
        </div>

        <div style={{display:'flex', gap:'0.75rem'}}>
          <button className="btn btn-outline" onClick={handleExport} title="Exporter les données"><FaFileDownload /> Export</button>
          <label className="btn btn-outline" title="Importer les données" style={{cursor:'pointer'}}>
             <FaFileUpload /> Import
             <input type="file" onChange={handleImport} style={{display:'none'}} accept=".json" />
          </label>
        </div>
      </div>

      {/* Statistics Cards */}
      {(() => {
        const stats = logic.getServiceWaterAnalysisStats(departments, waterAnalyses);
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            <div className="card" style={{ 
              backgroundColor: '#e9ecef', 
              textAlign: 'center',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6c757d' }}>
                {stats.summary.total}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Total Services</div>
            </div>
            
            <div className="card" style={{ 
              backgroundColor: '#fff3cd', 
              textAlign: 'center',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>
                {stats.summary.todoCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#ffc107' }}>À Faire</div>
            </div>
            
            <div className="card" style={{ 
              backgroundColor: '#d1ecf1', 
              textAlign: 'center',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#17a2b8' }}>
                {stats.summary.pendingCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#17a2b8' }}>En Attente</div>
            </div>
            
            <div className="card" style={{ 
              backgroundColor: '#d4edda', 
              textAlign: 'center',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                {stats.summary.okCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#28a745' }}>OK</div>
            </div>
            
            <div className="card" style={{ 
              backgroundColor: '#f8d7da', 
              textAlign: 'center',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>
                {stats.summary.alertCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#dc3545' }}>Alertes</div>
            </div>
          </div>
        );
      })()}

      {/* Search Bar */}
      <div className="card" style={{display:'flex', gap:'1rem', padding:'1rem', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap'}}>
        <div style={{flex:1, display:'flex', alignItems:'center', minWidth:'250px', position:'relative'}}>
            <FaSearch style={{color:'var(--text-muted)', marginRight:'0.5rem', transition:'all 0.2s ease'}} />
            <input 
              style={{
                border:'none', 
                outline:'none', 
                padding:'0.75rem', 
                width:'100%', 
                fontSize:'1rem', 
                background:'transparent',
                transition:'all 0.2s ease'
              }} 
              placeholder="Rechercher un service..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'var(--primary-light)';
                e.target.style.borderRadius = '8px';
                e.target.style.transform = 'translate(-2px, -2px)';
                e.target.style.boxShadow = '2px 2px 0px var(--border-color)';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'translate(0, 0)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position:'absolute',
                  right:'0.5rem',
                  background:'none',
                  border:'none',
                  color:'var(--text-muted)',
                  cursor:'pointer',
                  padding:'0.25rem',
                  borderRadius:'4px',
                  transition:'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--danger-light)';
                  e.target.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--text-muted)';
                }}
              >
                ×
              </button>
            )}
        </div>
      </div>

      {/* Current Month */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>
          Mois courant: {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
      </div>

      {/* Services Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Dernier Prélèvement</th>
              <th>Statut (Mois en cours)</th>
              <th style={{textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.map(dept => {
              const status = dept.waterStatus;
              const statusLabel = logic.getServiceWaterStatusLabel(status);
              const lastSampleDate = dept.lastSampleDate ? 
                logic.formatDate(new Date(dept.lastSampleDate)) : '-';
                
              return (
                <tr key={dept.id} onClick={() => handleServiceClick(dept)} style={{cursor:'pointer'}}>
                  <td style={{fontWeight:500}}>
                      {dept.name}
                  </td>
                  <td>{lastSampleDate}</td>
                  <td>
                    <span style={getStatusStyle(status)}>
                      {statusLabel}
                    </span>
                    {renderStatusBadge(status)}
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn btn-outline btn-sm" onClick={(e) => {
                      e.stopPropagation();
                      handleServiceClick(dept);
                    }} title="Détails">
                      <FaEye /> Détails
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredDepartments.length === 0 && (
              <tr><td colSpan="4" style={{textAlign:'center', padding:'3rem', color:'var(--text-muted)'}}>
                {searchTerm ? 'Aucun service trouvé pour cette recherche.' : 'Aucun service configuré.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Service Detail Modal */}
      {showDetail && selectedDepartment && (
        <WaterServiceDetail 
          department={selectedDepartment}
          onBack={() => {
            setShowDetail(false);
            setSelectedDepartment(null);
          }}
          onSave={() => {
            setShowDetail(false);
            setSelectedDepartment(null);
            loadData(); // Refresh data to update status
          }}
        />
      )}
    </div>
  );
}
