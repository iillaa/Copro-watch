import { useState, useEffect } from 'react';
import { FaWater, FaHistory, FaEye } from 'react-icons/fa';
import WaterAnalysesOverview from './WaterAnalysesOverview';
import WaterAnalysesHistory from './WaterAnalysesHistory';

export default function WaterAnalyses() {
  const [view, setView] = useState('overview'); // overview, history
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Analyses d'eau</h2>
        <p>Suivi mensuel de la qualité microbiologique de l'eau.</p>
      </header>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: 'var(--border-width) solid var(--border-color)'
      }}>
        <button
          className={`btn ${view === 'overview' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setView('overview')}
          style={{ 
            borderBottom: view === 'overview' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            padding: '0.75rem 1.5rem'
          }}
        >
          <FaEye style={{ marginRight: '0.5rem' }} />
          Vue d'ensemble
        </button>
        <button
          className={`btn ${view === 'history' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setView('history')}
          style={{ 
            borderBottom: view === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            padding: '0.75rem 1.5rem'
          }}
        >
          <FaHistory style={{ marginRight: '0.5rem' }} />
          Historique
        </button>
      </div>

      {/* Content */}
      {view === 'overview' && <WaterAnalysesOverview />}
      {view === 'history' && <WaterAnalysesHistory />}
    </div>
  );
}
