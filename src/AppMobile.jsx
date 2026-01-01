import { useState, useEffect } from 'react';
import { db } from './services/db';
import backupService from './services/backup';

// Components
import MobileDashboard from './components/mobile/MobileDashboard';
import MobileWorkerList from './components/mobile/MobileWorkerList';
import MobileWaterAnalyses from './components/mobile/MobileWaterAnalyses';
import MobileWorkerDetail from './components/mobile/MobileWorkerDetail';
import PinLock from './components/PinLock';
import Settings from './components/Settings';
import ReloadPrompt from './components/ReloadPrompt';

// Icons & Styles
import { FaChartLine, FaUsers, FaFlask, FaCog, FaExclamationTriangle } from 'react-icons/fa';
import './index.css';
import './styles/mobile.css';

export default function AppMobile() {
  const [view, setView] = useState('dashboard');
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [isLocked, setIsLocked] = useState(true);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  const [pin, setPin] = useState('0011');

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Database (Critical - Must work)
        await db.init();

        // 2. Backup Service (Non-Critical - Can fail safely)
        try {
          await backupService.init();
          await backupService.checkAndAutoImport(db);
        } catch (backupErr) {
          console.warn('Backup service failed (ignoring):', backupErr);
          // We do NOT stop the app here. We continue.
        }

        // 3. Load Settings
        const s = await db.getSettings();
        if (s.pin) setPin(s.pin);
      } catch (e) {
        console.error('Critical App Crash:', e);
        setInitError(e.message || 'Unknown Error');
      } finally {
        // 4. ALWAYS turn off loading, even if there was an error
        setLoading(false);
      }
    };
    init();
  }, []);

  // --- RENDERING ---

  // 1. Loading Screen (Centered now!)
  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f8fafc',
        }}
      >
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>Chargement...</p>
      </div>
    );
  }

  // 2. Critical Error Screen
  if (initError) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <FaExclamationTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h3>Erreur de Démarrage</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{initError}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    );
  }

  // 3. Pin Lock
  if (isLocked) return <PinLock correctPin={pin} onUnlock={() => setIsLocked(false)} />;

  // 4. Main App Helper
  const NavButton = ({ target, icon: Icon, label }) => (
    <button
      className={`bottom-nav-item ${view === target ? 'active' : ''}`}
      onClick={() => {
        setView(target);
        setSelectedWorkerId(null);
      }}
    >
      <Icon className="bottom-nav-icon" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="mobile-app-container">
      <ReloadPrompt />

      <main style={{ paddingBottom: '80px' }}>
        {view === 'dashboard' && (
          <MobileDashboard
            onNavigateWorker={(id) => {
              setSelectedWorkerId(id);
              setView('worker-detail');
            }}
          />
        )}

        {view === 'workers' && (
          <MobileWorkerList
            onNavigateWorker={(id) => {
              setSelectedWorkerId(id);
              setView('worker-detail');
            }}
          />
        )}

        {view === 'worker-detail' && selectedWorkerId && (
          <MobileWorkerDetail workerId={selectedWorkerId} onBack={() => setView('workers')} />
        )}

        {view === 'water' && <MobileWaterAnalyses />}

        {view === 'settings' && <Settings currentPin={pin} onPinChange={setPin} />}
      </main>

      <nav className="bottom-nav">
        <NavButton target="dashboard" icon={FaChartLine} label="Accueil" />
        <NavButton target="workers" icon={FaUsers} label="Personne" />
        <NavButton target="water" icon={FaFlask} label="Eau" />
        <NavButton target="settings" icon={FaCog} label="Reglage" />
      </nav>
    </div>
  );
}
