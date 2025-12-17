import { useState, useEffect } from 'react';
import { db } from './services/db';
import backupService from './services/backup';

import Dashboard from './components/Dashboard';
import WorkerList from './components/WorkerList';
import WorkerDetail from './components/WorkerDetail'; // We might need this or just modal
import PinLock from './components/PinLock';
import Settings from './components/Settings';
import WaterAnalyses from './components/WaterAnalyses';

import { FaUsers, FaChartLine, FaCog, FaFlask } from 'react-icons/fa';

function App() {

  const [view, setView] = useState('dashboard'); // dashboard, workers, water-analyses, settings
  const [loading, setLoading] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [pin, setPin] = useState("0011"); // Default PIN

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
    if (settings.pin) {
        setPin(settings.pin);
    }
    setLoading(false);
  };

  useEffect(() => {
    initApp();
  }, []);

  const navigateToWorker = (id) => {
    setSelectedWorkerId(id);
    setView('worker-detail');
  };

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>Chargement...</div>;

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
        


        <nav style={{display:'flex', flexDirection:'column', gap:'0.25rem'}}>
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
            onClick={() => { setView('workers'); setSelectedWorkerId(null); }}
            title="Travailleurs"
          >
            <FaUsers className="nav-icon" />
            <span className="nav-text">Travailleurs</span>
          </div>
          <div 
            className={`nav-item ${view === 'water-analyses' ? 'active' : ''}`}
            onClick={() => setView('water-analyses')}
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
        



        <div className="credit" style={{marginTop: 'auto'}}>
           <div className="credit-title">Développer par</div>
           <div className="credit-author">Dr Kibeche Ali Dia Eddine</div>
           <div className="credit-version">1.1</div>
        </div>
      </aside>

      <main className="main-content">
        <div className="container">
          <button aria-label="Toggle sidebar" className="btn btn-sm no-print" style={{marginBottom: '1rem'}} onClick={() => setSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? 'Masquer' : 'Afficher'}
          </button>

          {view === 'dashboard' && (
            <Dashboard onNavigateWorker={navigateToWorker} />
          )}
          {view === 'workers' && (
            <WorkerList onNavigateWorker={navigateToWorker} />
          )}
          {view === 'worker-detail' && selectedWorkerId && (
            <WorkerDetail 
              workerId={selectedWorkerId} 
              onBack={() => setView('workers')} 
            />
          )}
          {view === 'water-analyses' && (
            <WaterAnalyses />
          )}
          {view === 'settings' && (
            <Settings currentPin={pin} onPinChange={setPin} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
