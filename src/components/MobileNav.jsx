import { FaUsers, FaChartLine, FaCog, FaFlask } from 'react-icons/fa';

export default function MobileNav({ view, setView, onResetWater }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        paddingBottom: 'env(safe-area-inset-bottom)', // Fits iPhone/Android gestures
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <MobileNavItem
        active={view === 'dashboard'}
        onClick={() => setView('dashboard')}
        icon={<FaChartLine size={20} />}
        label="Accueil"
      />
      <MobileNavItem
        active={view === 'workers' || view === 'worker-detail'}
        onClick={() => setView('workers')}
        icon={<FaUsers size={20} />}
        label="RH"
      />
      <MobileNavItem
        active={view === 'water-analyses'}
        onClick={() => {
          setView('water-analyses');
          if (onResetWater) onResetWater();
        }}
        icon={<FaFlask size={20} />}
        label="Eau"
      />
      <MobileNavItem
        active={view === 'settings'}
        onClick={() => setView('settings')}
        icon={<FaCog size={20} />}
        label="Options"
      />
    </div>
  );
}

function MobileNavItem({ active, onClick, icon, label }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '25%',
        height: '100%',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'all 0.2s',
        borderTop: active ? '3px solid var(--primary)' : '3px solid transparent',
      }}
    >
      <div style={{ marginBottom: '2px' }}>{icon}</div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{label}</span>
    </div>
  );
}
