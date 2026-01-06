import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import { FaTrash, FaEye } from 'react-icons/fa';

export default function WaterAnalysesHistory({ compactMode }) {
  const [workplaces, setWorkplaces] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. REMOVED: const [filteredAnalyses, setFilteredAnalyses] = useState([]);

  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedResult, setSelectedResult] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workplacesData, analysesData] = await Promise.all([
        db.getWorkplaces(),
        db.getWaterAnalyses(),
      ]);

      setWorkplaces(workplacesData);
      setWaterAnalyses(analysesData);
      // Removed manual setting of filteredAnalyses here
    } catch (error) {
      console.error('Error loading water analyses history:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. REMOVED: useEffect(() => { filterAnalyses(); }, [...])
  // 3. OPTIMIZATION: useMemo replaces the old filterAnalyses function
  const filteredAnalyses = useMemo(() => {
    let filtered = [...waterAnalyses];

    // Filter by workplace
    if (selectedWorkplace !== 'all') {
      filtered = filtered.filter((a) => a.structure_id === parseInt(selectedWorkplace));
    }

    // Filter by month
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter((a) => {
        const analysisDate = new Date(a.sample_date);
        return (
          analysisDate.getFullYear() === parseInt(year) &&
          analysisDate.getMonth() + 1 === parseInt(month)
        );
      });
    }

    // Filter by result
    if (selectedResult !== 'all') {
      filtered = filtered.filter((a) => a.result === selectedResult);
    }

    // Sort and Join
    return filtered
      .map((analysis) => ({
        ...analysis,
        workplace: workplaces.find((w) => w.id === analysis.structure_id),
      }))
      .sort((a, b) => new Date(b.sample_date) - new Date(a.sample_date));
  }, [waterAnalyses, workplaces, selectedWorkplace, selectedMonth, selectedResult]);

  const handleDelete = async (analysisId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      try {
        await db.deleteWaterAnalysis(analysisId);
        loadData(); // This will auto-trigger useMemo recalculation
      } catch (error) {
        console.error('Error deleting analysis:', error);
        alert("Erreur lors de la suppression de l'analyse.");
      }
    }
  };

  const handleEditDetail = (analysis) => {
    setSelectedAnalysis({ type: 'edit', analysis });
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAnalysis(null);
    loadData();
  };

  const getResultBadge = (result) => {
    const styles = {
      pending: { bg: '#fff3cd', color: '#856404', text: 'En attente' },
      potable: { bg: '#d4edda', color: '#155724', text: 'Eau Potable' },
      non_potable: { bg: '#f8d7da', color: '#721c24', text: 'Non Potable' },
    };

    const style = styles[result] || styles.pending;

    return (
      <span
        style={{
          backgroundColor: style.bg,
          color: style.color,
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
        }}
      >
        {style.text}
      </span>
    );
  };

  const getUniqueMonths = () => {
    const months = new Set();
    waterAnalyses.forEach((analysis) => {
      const date = new Date(analysis.sample_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  };
// [GRID CONFIG] Structure(1.3) | Date E(0.9) | Date R(0.9) | Result(1) | Notes(1.5) | Actions(100)
  const gridTemplate = "1.3fr 0.9fr 0.9fr 1fr 1.5fr 100px";

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
        }}
      >
        <div className="loading-spinner"></div>
        <span style={{ marginLeft: '1rem' }}>Chargement...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Filtres</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Structure
            </label>
            <select
              value={selectedWorkplace}
              onChange={(e) => setSelectedWorkplace(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
              }}
            >
              <option value="all">Toutes les structures</option>
              {workplaces.map((workplace) => (
                <option key={workplace.id} value={workplace.id}>
                  {workplace.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Mois
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
              }}
            >
              <option value="all">Tous les mois</option>
              {getUniqueMonths().map((monthKey) => {
                const [year, month] = monthKey.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return (
                  <option key={monthKey} value={monthKey}>
                    {date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Résultat
            </label>
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
              }}
            >
              <option value="all">Tous les résultats</option>
              <option value="pending">En attente</option>
              <option value="potable">Eau Potable</option>
              <option value="non_potable">Non Potable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>
          Historique des analyses ({filteredAnalyses.length} résultat
          {filteredAnalyses.length > 1 ? 's' : ''})
        </h3>
      </div>

     {/* --- HYBRID WATER ANALYSIS LIST (V4) --- */}
      {filteredAnalyses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🧪</div>
          <p>Aucune analyse trouvée avec les filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="scroll-wrapper" style={{ maxHeight: compactMode ? '600px' : 'none', paddingBottom: '30px' }}>
          <div className="hybrid-container" style={{ minWidth: '800px' }}>    
            
            {/* 1. HEADER CARD */}
            <div className="hybrid-header" style={{ gridTemplateColumns: gridTemplate }}>
              <div>Structure</div>
              <div>Date Échantillon</div>
              <div>Date Résultat</div>
              <div>Résultat</div>
              <div>Notes</div>
              <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>Actions</div>
            </div>

            {/* 2. ROW CARDS */}
            {filteredAnalyses.map((analysis) => (
              <div 
                key={analysis.id}
                className="hybrid-row"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {/* Structure */}
                <div className="hybrid-cell" style={{ fontWeight: 800 }}>
                  {analysis.workplace ? analysis.workplace.name : 'Inconnue'}
                </div>

                {/* Date Echantillon */}
                <div className="hybrid-cell">
                  {analysis.sample_date}
                </div>

                {/* Date Résultat */}
                <div className="hybrid-cell">
                  {analysis.result_date || '-'}
                </div>

                {/* Résultat Badge */}
                <div className="hybrid-cell">
                  {getResultBadge(analysis.result)}
                </div>

                {/* Notes */}
                <div className="hybrid-cell" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  {analysis.notes ? (
                    <span title={analysis.notes}>
                      {analysis.notes.length > 30 ? `${analysis.notes.substring(0, 30)}...` : analysis.notes}
                    </span>
                  ) : '-'}
                </div>

                {/* Actions */}
                <div className="hybrid-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleEditDetail(analysis)}
                    title="Voir Détails"
                  >
                    <FaEye />
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDelete(analysis.id)}
                    style={{ 
                      color: 'var(--danger)', 
                      borderColor: 'var(--danger)', 
                      backgroundColor: '#fff1f2' 
                    }}
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Water Analysis Form Modal */}
      {showForm && selectedAnalysis && (
        <WaterAnalysisForm
          type={selectedAnalysis.type}
          analysisToEdit={selectedAnalysis.analysis}
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
