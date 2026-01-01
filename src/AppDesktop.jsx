import { useState, useEffect } from 'react';
import { db } from './services/db';
import backupService from './services/backup';

import Dashboard from './components/Dashboard';
import WorkerList from './components/WorkerList';
import WorkerDetail from './components/WorkerDetail';
import PinLock from './components/PinLock';
import Settings from './components/Settings';
import WaterAnalyses from './components/WaterAnalyses';
import ReloadPrompt from './components/ReloadPrompt';

import { FaUsers, FaChartLine, FaCog, FaFlask } from 'react-icons/fa';

function AppDesktop() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [waterResetKey, setWaterResetKey] = useState(0);
  const [pin, setPin] = useState('0000');

  const initApp = async () => {
    try {
      setLoading(true);
      await db.init();
      await backupService.init();
      const settings = await db.getSettings();
      if (settings && settings.pin) {
        setPin(settings.pin);
      }
    } catch (error) {
      setInitError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  // Render PinLock and strictly pass onUnlock
  if (isLocked) {
    return (
      <PinLock 
        correctPin={pin} 
        onUnlock={() => setIsLocked(false)} 
      />
    );
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      <ReloadPrompt />
      <aside className="sidebar no-print">
        <div className="brand">
          <span className="brand-text">𝓒𝓸𝓹𝓻𝓸</span>
          <span className="brand-icon">🧪</span>
          <span className="brand-text">𝓦𝓪𝓽𝓬𝓱</span>
        </div>
        <nav>
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <FaChartLine className="nav-icon" /> <span className="nav-text">Dashboard</span>
          </div>
          <div className={`nav-item ${view === 'workers' ? 'active' : ''}`} onClick={() => setView('workers')}>
            <FaUsers className="nav-icon" /> <span className="nav-text">Travailleurs</span>
          </div>
          <div className={`nav-item ${view === 'water-analyses' ? 'active' : ''}`} onClick={() => setView('water-analyses')}>
            <FaFlask className="nav-icon" /> <span className="nav-text">Eau</span>
          </div>
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <FaCog className="nav-icon" /> <span className="nav-text">Paramètres</span>
          </div>
        </nav>
      </aside>
      <main className="main-content">
        <div className="container">
          {view === 'dashboard' && <Dashboard onNavigateWorker={(id) => { setSelectedWorkerId(id); setView('worker-detail'); }} />}
          {view === 'workers' && <WorkerList onNavigateWorker={(id) => { setSelectedWorkerId(id); setView('worker-detail'); }} />}
          {view === 'worker-detail' && <WorkerDetail workerId={selectedWorkerId} onBack={() => setView('workers')} />}
          {view === 'water-analyses' && <WaterAnalyses key={waterResetKey} />}
          {view === 'settings' && <Settings currentPin={pin} onPinChange={setPin} />}
        </div>
      </main>
    </div>
  );
}

export default AppDesktop;