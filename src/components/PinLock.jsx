import { useState, useEffect } from 'react';
import { FaLock, FaTimes } from 'react-icons/fa';

// 1. Import the Mobile Detector and Mobile View
// Ensure you have created 'src/hooks/useIsMobile.js'
import { useIsMobile } from '../hooks/useIsMobile';
// Ensure you have created 'src/components/PinLockMobile.jsx'
import PinLockMobile from './PinLockMobile';

export default function PinLock({ onUnlock, correctPin = '0000' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // 2. Detect if we are on a phone
  const isMobile = useIsMobile();

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        // Haptic feedback (vibration) for better mobile feel
        if (navigator.vibrate) navigator.vibrate(200);

        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  }, [pin, correctPin, onUnlock]);

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError(false);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // 3. RENDER MOBILE VIEW (New Touch Interface)
  if (isMobile) {
    return (
      <PinLockMobile
        pin={pin}
        error={error}
        handleDigit={handleDigit}
        handleClear={handleClear}
        handleBackspace={handleBackspace}
      />
    );
  }

  // 4. RENDER DESKTOP VIEW (Original "Card" Interface)
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div className="card" style={{ width: '300px', textAlign: 'center', padding: '2rem' }}>
        <div style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
          <FaLock size={40} />
        </div>
        <h2 style={{ marginBottom: '1.5rem' }}>Sécurité</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Entrez votre code PIN</p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '2rem',
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background:
                  i < pin.length
                    ? error
                      ? 'var(--danger)'
                      : 'var(--primary)'
                    : 'var(--border-color)',
                border: '1px solid var(--border-color)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="btn btn-outline"
              style={{ height: '50px', fontSize: '1.2rem', fontWeight: 'bold' }}
              onClick={() => handleDigit(num)}
            >
              {num}
            </button>
          ))}
          <button
            className="btn btn-outline"
            style={{ height: '50px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={handleClear}
          >
            C
          </button>
          <button
            className="btn btn-outline"
            style={{ height: '50px', fontSize: '1.2rem', fontWeight: 'bold' }}
            onClick={() => handleDigit(0)}
          >
            0
          </button>
          <button className="btn btn-outline" style={{ height: '50px' }} onClick={handleBackspace}>
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}
