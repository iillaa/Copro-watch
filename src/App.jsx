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

export default App;
