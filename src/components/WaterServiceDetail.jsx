import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import { FaArrowLeft, FaFlask, FaTrash } from 'react-icons/fa';

export default function WaterServiceDetail({ department, onBack, onSave }) {
  const [analyses, setAnalyses] = useState([]);
  const [allAnalyses, setAllAnalyses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [editingAnalysis, setEditingAnalysis] = useState(null);

  const loadData = async () => {
    const [deptAnalyses, allAnalysesData] = await Promise.all([
      logic.getDepartmentWaterHistory(department.id, await db.getWaterAnalyses()),
      db.getWaterAnalyses(),
    ]);
    setAnalyses(deptAnalyses);
    setAllAnalyses(allAnalysesData);
  };

  useEffect(() => {
    loadData();
  }, [department.id]);

  const handleNewAnalysis = () => {
    setSelectedAnalysis(null);
    setEditingAnalysis(null);
    setShowForm(true);
  };

  const handleEdit = (analysis) => {
    setSelectedAnalysis(analysis);
    setEditingAnalysis(analysis);
    setShowForm(true);
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      await db.deleteWaterAnalysis(analysisId);
      loadData();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAnalysis(null);
    setEditingAnalysis(null);
    loadData();
    if (onSave) onSave();
  };

  const renderStatusBadge = (result) => {
    if (!result) return '-';
    let badgeClass = '';
    let label = '';

    switch (result) {
      case 'potable':
        badgeClass = 'badge badge-green';
        label = 'Potable';
        break;
      case 'non_potable':
        badgeClass = 'badge badge-red';
        label = 'Non Potable';
        break;
      case 'pending':
        badgeClass = 'badge badge-yellow';
        label = 'En attente';
        break;
      default:
        return result;
    }
    return <span className={badgeClass}>{label}</span>;
  };

  // Calculate current status
  const currentStatus = logic.getServiceWaterStatus(department.id, allAnalyses);
  const statusLabel = logic.getServiceWaterStatusLabel(currentStatus.status);
  const statusColor = logic.getServiceWaterStatusColor(currentStatus.status);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={onBack}>
          <FaArrowLeft /> Retour
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 style={{ margin: 0 }}>{department.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Service de Copro-Watch
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <span className="badge badge-blue">Suivi qualité de l'eau</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleNewAnalysis}>
              <FaFlask /> Nouvelle Analyse
            </button>
          </div>
        </div>
        <div
          style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}
        >
          <strong>Statut actuel:</strong>
          <span style={{ color: statusColor, fontWeight: 'bold', marginLeft: '0.5rem' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <h3>Historique des Analyses</h3>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Date Prélèvement</th>
              <th>Date Résultat</th>
              <th>Résultat</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => (
              <tr key={a.id}>
                {/* FIX: Check if sample_date exists first to avoid crash */}
                <td>{a.sample_date ? logic.formatDate(new Date(a.sample_date)) : '-'}</td>

                <td>{a.result_date ? logic.formatDate(new Date(a.result_date)) : '-'}</td>

                <td>{renderStatusBadge(a.result)}</td>
                <td
                  style={{
                    maxWidth: '150px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.notes || '-'}
                </td>

                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleEdit(a)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Détails
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDeleteAnalysis(a.id)}
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
            {analyses.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
                >
                  Aucune analyse enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <WaterAnalysisForm
          type={selectedAnalysis ? 'result' : 'launch'}
          department={department}
          analysis={selectedAnalysis}
          analysisToEdit={editingAnalysis}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
