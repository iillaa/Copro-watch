import { useState, useEffect } from 'react';
import { db } from './services/db';
import backupService from './services/backup';

import Dashboard from './components/Dashboard';
import WorkerList from './components/WorkerList';
import WorkerDetail from './components/WorkerDetail';
import PinLock from './components/PinLock';
import Settings from './components/Settings';
import WaterAnalyses from './components/WaterAnalyses';

import { FaUsers, FaChartLine, FaCog, FaFlask } from 'react-icons/fa';

function App() {
  // --- STATE (Original) ---
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [waterResetKey, setWaterResetKey] = useState(0);
  const [pin, setPin] = useState('0011');

  // --- ENGINE STARTUP (The Only Change) ---
  const initApp = async () => {
    try {
      setLoading(true);

      // 1. Start the Database (Triggers Migration to Dexie)
      await db.init();

      // 2. Start Backup Service
      await backupService.init();
      try {
        await backupService.checkAndAutoImport(db);
      } catch (e) {
        console.warn('Auto-import check failed:', e);
      }

      // 3. Load User Settings
      const settings = await db.getSettings();
      if (settings.pin) {
        setPin(settings.pin);
      }
    } catch (error) {
      console.error('App Initialization Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // --- NAVIGATION ---
  const navigateToWorker = (id) => {
    setSelectedWorkerId(id);
    setView('worker-detail');
  };

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
        }}
      >
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Chargement...</p>
      </div>
    );
  }

  // --- PIN LOCK ---
  if (isLocked) {
    return <PinLock correctPin={pin} onUnlock={() => setIsLocked(false)} />;
  }

  // --- MAIN UI (Original Layout Restored) ---
  return (
    <div className={`app-shell ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      {/* SIDEBAR */}
      <aside className="sidebar no-print">
        <div className="brand">
          <span className="brand-text">𝓒𝓸𝓹𝓻𝓸</span>
          <span className="brand-icon">🧪</span>
          <span className="brand-text">𝓦𝓪𝓽𝓬𝓱</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
            title="Tableau de bord"
          >
            <FaChartLine className="nav-icon" />
            <span className="nav-text">Tableau de bord</span>
          </div>
          <div
            className={`nav-item ${view === 'workers' || view === 'worker-detail' ? 'active' : ''}`}
            onClick={() => {
              setView('workers');
              setSelectedWorkerId(null);
            }}
            title="Travailleurs"
          >
            <FaUsers className="nav-icon" />
            <span className="nav-text">Travailleurs</span>
          </div>
          <div
            className={`nav-item ${view === 'water-analyses' ? 'active' : ''}`}
            onClick={() => {
              setView('water-analyses');
              setWaterResetKey((prev) => prev + 1);
            }}
            title="Analyses d'eau"
          >
            <FaFlask className="nav-icon" />
            <span className="nav-text">Analyses d'eau</span>
          </div>
          <div
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
            title="Paramètres"
          >
            <FaCog className="nav-icon" />
            <span className="nav-text">Paramètres</span>
          </div>
        </nav>

        {/* CREDITS: Restored to 1.1 as requested */}
        <div className="credit" style={{ marginTop: 'auto' }}>
          <div className="credit-title">Développé par</div>
          <div className="credit-author">Dr Kibeche Ali Dia Eddine</div>
          <div className="credit-version">1.1</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="container">
          <button
            aria-label="Toggle sidebar"
            className="btn btn-sm no-print toggle-sidebar"
            style={{ marginBottom: '2.5rem' }}
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? 'Masquer' : 'Afficher'}
          </button>

          {view === 'dashboard' && <Dashboard onNavigateWorker={navigateToWorker} />}
          {view === 'workers' && <WorkerList onNavigateWorker={navigateToWorker} />}
          {view === 'worker-detail' && selectedWorkerId && (
            <WorkerDetail workerId={selectedWorkerId} onBack={() => setView('workers')} />
          )}
          {view === 'water-analyses' && <WaterAnalyses key={waterResetKey} />}
          {view === 'settings' && <Settings currentPin={pin} onPinChange={setPin} />}
        </div>
      </main>
    </div>
  );
}

export default App;
