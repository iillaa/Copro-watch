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
import ReloadPrompt from './components/ReloadPrompt'; // <--- PWA Update

// Icons & Styles
import { FaChartLine, FaUsers, FaFlask, FaCog } from 'react-icons/fa';
import './index.css';
import './styles/mobile.css';

export default function AppMobile() {
  const [view, setView] = useState('dashboard');
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('0011');

  useEffect(() => {
    const init = async () => {
      // 1. Start Database
      await db.init();

      // 2. Start Backup Service
      await backupService.init();

      // 3. Auto-Import (Restored for Mobile)
      try {
        await backupService.checkAndAutoImport(db);
      } catch (e) {
        console.warn('Mobile auto-import failed:', e);
      }

      // 4. Load Pin
      const s = await db.getSettings();
      if (s.pin) setPin(s.pin);

      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="loading-spinner"></div>;
  if (isLocked) return <PinLock correctPin={pin} onUnlock={() => setIsLocked(false)} />;

  // Navigation Button Helper
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
      {/* PWA UPDATE PROMPT */}
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
