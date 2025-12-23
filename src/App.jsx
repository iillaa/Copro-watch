import { useState, useEffect } from 'react';
import { db } from './services/db';
import backupService from './services/backup';
import { useIsMobile } from './hooks/useIsMobile';

// Components
import Dashboard from './components/Dashboard';
import WorkerList from './components/WorkerList';
import WorkerDetail from './components/WorkerDetail';
import PinLock from './components/PinLock';
import Settings from './components/Settings';
import WaterAnalyses from './components/WaterAnalyses';

// Navigation Layouts
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';

function App() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [waterResetKey, setWaterResetKey] = useState(0);
  const [pin, setPin] = useState('0011');

  // Detect Device
  const isMobile = useIsMobile();

  const initApp = async () => {
    setLoading(true);
    await db.init();
    await backupService.init();
    try {
      await backupService.checkAndAutoImport(db);
    } catch (e) {
      console.warn('auto import check failed', e);
    }
    const settings = await db.getSettings();
    if (settings.pin) setPin(settings.pin);
    setLoading(false);
  };

  useEffect(() => { initApp(); }, []);

  const navigateToWorker = (id) => {
    setSelectedWorkerId(id);
    setView('worker-detail');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Chargement...
    </div>
  );

  if (isLocked) {
    return <PinLock correctPin={pin} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className={`app-shell ${!isMobile && !isSidebarOpen ? 'sidebar-closed' : ''}`}>
      
      {/* 1. DESKTOP NAVIGATION (Sidebar) */}
      {!isMobile && isSidebarOpen && (
        <Sidebar 
          view={view} 
          setView={setView} 
          onResetWater={() => setWaterResetKey((k) => k + 1)} 
        />
      )}

      {/* 2. MAIN CONTENT */}
      <main className="main-content" style={{ paddingBottom: isMobile ? '80px' : '2rem' }}>
        <div className="container">
          
          {/* Toggle Button (Desktop Only) */}
          {!isMobile && (
            <button
              className="btn btn-sm no-print toggle-sidebar"
              style={{ marginBottom: '1rem', position:'static' }} // Override fixed pos if needed
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? 'Masquer Menu' : 'Afficher Menu'}
            </button>
          )}

          {/* Views */}
          {view === 'dashboard' && <Dashboard onNavigateWorker={navigateToWorker} />}
          {view === 'workers' && <WorkerList onNavigateWorker={navigateToWorker} />}
          {view === 'worker-detail' && selectedWorkerId && (
            <WorkerDetail workerId={selectedWorkerId} onBack={() => setView('workers')} />
          )}
          {view === 'water-analyses' && <WaterAnalyses key={waterResetKey} />}
          {view === 'settings' && <Settings currentPin={pin} onPinChange={setPin} />}
        </div>
      </main>

      {/* 3. MOBILE NAVIGATION (Bottom Bar) */}
      {isMobile && (
        <MobileNav 
          view={view} 
          setView={setView} 
          onResetWater={() => setWaterResetKey((k) => k + 1)} 
        />
      )}
    </div>
  );
}

export default App;  };

  useEffect(() => {
    initApp();
  }, []);

  const navigateToWorker = (id) => {
    setSelectedWorkerId(id);
    setView('worker-detail');
  };

  if (loading)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        Chargement...
      </div>
    );

  if (isLocked) {
    return <PinLock correctPin={pin} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
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

        <div className="credit" style={{ marginTop: 'auto' }}>
          <div className="credit-title">Développer par</div>
          <div className="credit-author">Dr Kibeche Ali Dia Eddine</div>
          <div className="credit-version">1.1</div>
        </div>
      </aside>

      <main className="main-content">
        <div className="container">
          <button
            aria-label="Toggle sidebar"
            className="btn btn-sm no-print"
            style={{ marginBottom: '1rem' }}
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
