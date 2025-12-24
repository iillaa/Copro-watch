import { FaUsers, FaChartLine, FaCog, FaFlask } from 'react-icons/fa';

export default function Sidebar({ view, setView, onResetWater }) {
  return (
    <aside className="sidebar no-print">
      {/* Brand */}
      <div className="brand">
        <span className="brand-text">𝓒𝓸𝓹𝓻𝓸</span>
        <span className="brand-icon">🧪</span>
        <span className="brand-text">𝓦𝓪𝓽𝓬𝓱</span>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <NavItem
          active={view === 'dashboard'}
          onClick={() => setView('dashboard')}
          icon={<FaChartLine />}
          label="Tableau de bord"
        />
        <NavItem
          active={view === 'workers' || view === 'worker-detail'}
          onClick={() => setView('workers')}
          icon={<FaUsers />}
          label="Travailleurs"
        />
        <NavItem
          active={view === 'water-analyses'}
          onClick={() => {
            setView('water-analyses');
            if (onResetWater) onResetWater();
          }}
          icon={<FaFlask />}
          label="Analyses d'eau"
        />
        <NavItem
          active={view === 'settings'}
          onClick={() => setView('settings')}
          icon={<FaCog />}
          label="Paramètres"
        />
      </nav>

      {/* Credits */}
      <div className="credit" style={{ marginTop: 'auto' }}>
        <div className="credit-title">Développé par</div>
        <div className="credit-author">Dr Kibeche Ali Dia Eddine</div>
        <div className="credit-version">1.2</div>
      </div>
    </aside>
  );
}

// Internal helper for cleaner code
function NavItem({ active, onClick, icon, label }) {
  return (
    <div
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-text">{label}</span>
    </div>
  );
}
