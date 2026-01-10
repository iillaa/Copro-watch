import { useState, useEffect } from 'react';
import { FaLock, FaTimes } from 'react-icons/fa';

export default function PinLock({ onUnlock, onCheckPin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // LOGIC: Identical to your clean version
  useEffect(() => {
    const validate = async () => {
      if (pin.length === 4) {
        // Call the async validator passed from App.jsx
        const isValid = await onCheckPin(pin);
        
        if (isValid) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 500);
        }
      }
    };
    validate();
  }, [pin, onCheckPin, onUnlock]);

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

  return (
    // We use CSS classes instead of inline styles for responsiveness
    <div className="pin-lock-container">
      <div className="card pin-card">
        {/* WRAPPER 1: INFO (Left side on Mobile, Top on Desktop) */}
        <div className="pin-info">
          <div style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
            <FaLock size={40} />
          </div>
          <h2 className="pin-title">Sécurité</h2>
          <p className="pin-subtitle">Entrez votre code PIN</p>

          <div className="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-dot ${i < pin.length ? (error ? 'error' : 'filled') : ''}`}
              />
            ))}
          </div>
        </div>

        {/* WRAPPER 2: KEYS (Right side on Mobile, Bottom on Desktop) */}
        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} className="btn btn-outline pin-btn" onClick={() => handleDigit(num)}>
              {num}
            </button>
          ))}
          <button className="btn btn-outline pin-btn btn-danger-outline" onClick={handleClear}>
            C
          </button>
          <button className="btn btn-outline pin-btn" onClick={() => handleDigit(0)}>
            0
          </button>
          <button className="btn btn-outline pin-btn" onClick={handleBackspace}>
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}
