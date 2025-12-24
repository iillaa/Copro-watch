import { FaLock, FaBackspace } from 'react-icons/fa';

export default function PinLockMobile({ pin, error, handleDigit, handleClear, handleBackspace }) {
  return (
    <div className="pin-container">
      {/* 1. Header Section */}
      <div className="pin-header">
        <div
          style={{
            width: '60px',
            height: '60px',
            background: 'var(--primary-light)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            marginBottom: '1rem',
          }}
        >
          <FaLock size={24} />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Bienvenue</h2>
        <p style={{ color: 'var(--text-muted)' }}>Saisir le code PIN</p>

        {/* Dots Indicator */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '2px solid var(--border-color)',
                background:
                  i < pin.length ? (error ? 'var(--danger)' : 'var(--text-main)') : 'transparent',
                transition: 'all 0.2s',
                transform: error ? 'translateX(5px)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* 2. Keypad Section */}
      <div className="pin-keypad">
        <div className="pin-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="pin-btn"
              style={{
                background: 'transparent',
                border: '2px solid var(--border-color)',
                borderRadius: '50%',
                width: '70px',
                height: '70px',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-hard)',
                cursor: 'pointer',
              }}
            >
              {num}
            </button>
          ))}

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 'bold',
              }}
            >
              CLR
            </button>
          </div>

          <button
            onClick={() => handleDigit(0)}
            className="pin-btn"
            style={{
              background: 'transparent',
              border: '2px solid var(--border-color)',
              borderRadius: '50%',
              width: '70px',
              height: '70px',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: 'var(--text-main)',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            0
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={handleBackspace}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)' }}
            >
              <FaBackspace size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
