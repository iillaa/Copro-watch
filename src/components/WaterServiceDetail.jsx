import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { logic } from '../services/logic';
import WaterAnalysisForm from './WaterAnalysisForm';
import { FaArrowLeft, FaFlask, FaTrash, FaEdit } from 'react-icons/fa';

export default function WaterServiceDetail({ department, onBack, onSave }) {
  const [analyses, setAnalyses] = useState([]);
  const [allAnalyses, setAllAnalyses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [editingAnalysis, setEditingAnalysis] = useState(null);

  const loadData = async () => {
    // Reload all data to ensure sync
    const all = await db.getWaterAnalyses();
    // Use the logic helper to get sorted history
    const deptHistory = logic.getDepartmentWaterHistory(department.id, all);

    setAnalyses(deptHistory);
    setAllAnalyses(all);
  };

  useEffect(() => {
    loadData();
  }, [department.id]);

  const handleNewAnalysis = () => {
    setSelectedAnalysis(null);
    setEditingAnalysis(null);
    setShowForm(true); // Opens form in 'launch' mode
  };

  const handleEdit = (analysis) => {
    setSelectedAnalysis(analysis);
    setEditingAnalysis(analysis);
    setShowForm(true); // Opens form in 'edit' mode
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      await db.deleteWaterAnalysis(analysisId);
      loadData();
      if (onSave) onSave(); // Refresh parent dashboard if needed
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
    if (!result || result === 'pending')
      return <span className="badge badge-yellow">En attente</span>;
    if (result === 'potable') return <span className="badge badge-green">Potable</span>;
    if (result === 'non_potable') return <span className="badge badge-red">Non Potable</span>;
    return '-';
  };

  // Calculate current status for the header
  const currentStatus = logic.getServiceWaterStatus(department.id, allAnalyses);
  const statusLabel = logic.getServiceWaterStatusLabel(currentStatus.status);
  const statusColor = logic.getServiceWaterStatusColor(currentStatus.status);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
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
              Historique complet des analyses
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleNewAnalysis}>
            <FaFlask /> Nouvelle Analyse
          </button>
        </div>
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <strong>Statut ce mois-ci:</strong>
          <span style={{ color: statusColor, fontWeight: 'bold', marginLeft: '0.5rem' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <h3>Historique</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="table-container"
          style={{ boxShadow: 'none', border: 'none', borderRadius: 0 }}
        >
          <table>
            <thead>
              <tr>
                {/* 3 STATISTICS AS REQUESTED */}
                <th>Date Demande</th>
                <th>Date Prélèvement</th>
                <th>Date Résultat</th>
                <th>Verdict</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  {/* 1. Date Demande */}
                  <td>{a.request_date ? logic.formatDate(new Date(a.request_date)) : '-'}</td>

                  {/* 2. Date Prélèvement */}
                  <td style={{ fontWeight: 600 }}>
                    {a.sample_date ? logic.formatDate(new Date(a.sample_date)) : '-'}
                  </td>

                  {/* 3. Date Résultat */}
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

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEdit(a)}
                      style={{ marginRight: '0.5rem' }}
                      title="Détails"
                    >
                      <FaEdit /> Détails
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
                    colSpan="6"
                    style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
                  >
                    Aucune analyse enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <WaterAnalysisForm
          // FIX: Pass 'edit' if we are editing, 'launch' if new
          type={editingAnalysis ? 'edit' : 'launch'}
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
