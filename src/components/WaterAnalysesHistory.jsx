import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import { FaTrash, FaEye } from 'react-icons/fa';

export default function WaterAnalysesHistory() {
  const [workplaces, setWorkplaces] = useState([]);
  const [waterAnalyses, setWaterAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
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

      // Sort analyses by date (newest first)
      const sortedAnalyses = analysesData
        .map((analysis) => ({
          ...analysis,
          workplace: workplacesData.find((w) => w.id === analysis.structure_id),
        }))
        .sort((a, b) => new Date(b.sample_date) - new Date(a.sample_date));

      setFilteredAnalyses(sortedAnalyses);
    } catch (error) {
      console.error('Error loading water analyses history:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAnalyses();
  }, [waterAnalyses, selectedWorkplace, selectedMonth, selectedResult]);

  const filterAnalyses = () => {
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

    // Sort by date (newest first) and add workplace info
    const sortedFiltered = filtered
      .map((analysis) => ({
        ...analysis,
        workplace: workplaces.find((w) => w.id === analysis.structure_id),
      }))
      .sort((a, b) => new Date(b.sample_date) - new Date(a.sample_date));

    setFilteredAnalyses(sortedFiltered);
  };

  const handleDelete = async (analysisId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      try {
        await db.deleteWaterAnalysis(analysisId);
        loadData(); // Refresh data
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
    loadData(); // Refresh data to sync with overview and statistics
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

      {/* History Table */}
      {filteredAnalyses.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Aucune analyse trouvée avec les filtres sélectionnés.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="table-container"
            style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}
          >
            <table>
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Date Échantillon</th>
                  <th>Date Résultat</th>
                  <th>Résultat</th>
                  <th>Notes</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td style={{ fontWeight: '600' }}>
                      {analysis.workplace ? analysis.workplace.name : 'Structure inconnue'}
                    </td>
                    <td>{analysis.sample_date}</td>
                    <td>{analysis.result_date || '-'}</td>
                    <td>{getResultBadge(analysis.result)}</td>
                    <td>
                      {analysis.notes ? (
                        <span title={analysis.notes}>
                          {analysis.notes.length > 50
                            ? `${analysis.notes.substring(0, 50)}...`
                            : analysis.notes}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEditDetail(analysis)}
                          title="Éditer les détails"
                        >
                          <FaEye size={12} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleDelete(analysis.id)}
                          title="Supprimer"
                          style={{ color: 'var(--danger)' }}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
