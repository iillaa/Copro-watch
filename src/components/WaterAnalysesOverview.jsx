import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import { FaPlay, FaCheckCircle, FaExclamationTriangle, FaClock, FaFlask } from 'react-icons/fa';

export default function WaterAnalysesOverview() {
  const [workplaces, setWorkplaces] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workplacesData, analysesData] = await Promise.all([
        db.getWorkplaces(),
        db.getWaterAnalyses()
      ]);
      
      setWorkplaces(workplacesData);
      setWaterAnalyses(analysesData);
      
      // Calculate statistics
      const statsData = logic.getWaterAnalysisDashboardStats(workplacesData, analysesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading water analyses data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLaunchAnalysis = (workplace) => {
    setSelectedAnalysis({ type: 'launch', workplace });
    setShowForm(true);
  };

  const handleEnterResult = (analysis) => {
    setSelectedAnalysis({ type: 'result', analysis });
    setShowForm(true);
  };

  const handleRetest = (analysis) => {
    setSelectedAnalysis({ type: 'retest', analysis, workplace: analysis.workplace });
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAnalysis(null);
    loadData(); // Refresh data
  };

  const getStatusCard = (workplace) => {
    const status = workplace.waterStatus;
    const color = logic.getWaterAnalysisStatusColor(status);
    const label = logic.getWaterAnalysisStatusLabel(status);
    const analysis = workplace.waterAnalysis;

    const cardStyle = {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      borderLeft: `4px solid ${color}`,
      boxShadow: 'var(--shadow-sm)',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'todo':
          return <FaClock size={24} color={color} />;
        case 'pending':
          return <FaFlask size={24} color={color} />;
        case 'ok':
          return <FaCheckCircle size={24} color={color} />;
        case 'alert':
          return <FaExclamationTriangle size={24} color={color} />;
        default:
          return <FaClock size={24} color={color} />;
      }
    };

    const getActionButton = () => {
      switch (status) {
        case 'todo':
          return (
            <button 
              className="btn btn-primary" 
              onClick={() => handleLaunchAnalysis(workplace)}
              style={{ width: '100%' }}
            >
              <FaPlay style={{ marginRight: '0.5rem' }} />
              Lancer l'analyse
            </button>
          );
        case 'pending':
          return (
            <button 
              className="btn btn-warning" 
              onClick={() => handleEnterResult(analysis)}
              style={{ width: '100%' }}
            >
              <FaFlask style={{ marginRight: '0.5rem' }} />
              Saisir le résultat
            </button>
          );
        case 'ok':
          return (
            <div style={{ 
              padding: '0.75rem', 
              backgroundColor: '#d4edda', 
              borderRadius: '4px',
              textAlign: 'center',
              color: '#155724'
            }}>
              <FaCheckCircle style={{ marginRight: '0.5rem' }} />
              Analyse terminée
            </div>
          );
        case 'alert':
          return (
            <button 
              className="btn btn-danger" 
              onClick={() => handleRetest(analysis)}
              style={{ width: '100%' }}
            >
              <FaExclamationTriangle style={{ marginRight: '0.5rem' }} />
              Re-test requis
            </button>
          );
        default:
          return null;
      }
    };

    return (
      <div key={workplace.id} style={cardStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            {getStatusIcon()}
            <div style={{ marginLeft: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{workplace.name}</h3>
              <span 
                style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  color,
                  textTransform: 'uppercase'
                }}
              >
                {label}
              </span>
            </div>
          </div>
          
          {analysis && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div>Échantillon: {analysis.sample_date}</div>
              {analysis.result_date && (
                <div>Résultat: {analysis.result_date}</div>
              )}
              {analysis.notes && (
                <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                  "{analysis.notes}"
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          {getActionButton()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div className="loading-spinner"></div>
        <span style={{ marginLeft: '1rem' }}>Chargement...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Statistics */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div className="card" style={{ 
            backgroundColor: '#e9ecef', 
            textAlign: 'center',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6c757d' }}>
              {stats.summary.total}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total Structures</div>
          </div>
          
          <div className="card" style={{ 
            backgroundColor: '#fff3cd', 
            textAlign: 'center',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {stats.summary.todoCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#ffc107' }}>À faire</div>
          </div>
          
          <div className="card" style={{ 
            backgroundColor: '#d1ecf1', 
            textAlign: 'center',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>
              {stats.summary.pendingCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#17a2b8' }}>En attente</div>
          </div>
          
          <div className="card" style={{ 
            backgroundColor: '#d4edda', 
            textAlign: 'center',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {stats.summary.okCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#28a745' }}>OK</div>
          </div>
          
          <div className="card" style={{ 
            backgroundColor: '#f8d7da', 
            textAlign: 'center',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
              {stats.summary.alertCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#dc3545' }}>Alertes</div>
          </div>
        </div>
      )}

      {/* Current Month */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>
          Mois courant: {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
      </div>

      {/* Workplace Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {stats && stats.todo.concat(stats.pending, stats.ok, stats.alerts).map(getStatusCard)}
      </div>

      {/* Water Analysis Form Modal */}
      {showForm && selectedAnalysis && (
        <WaterAnalysisForm
          type={selectedAnalysis.type}
          analysis={selectedAnalysis.analysis}
          workplace={selectedAnalysis.workplace}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setSelectedAnalysis(null);
          }}
        />
      )}
    </div>
  );
}
