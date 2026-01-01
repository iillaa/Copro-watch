import { useState, useEffect } from 'react';
import { FaLock, FaCheck, FaTimes } from 'react-icons/fa';

export default function PinLock({ onUnlock, correctPin = '0000' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
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

  return (
    <div className="pin-lock-container">
      <div className="card pin-card">
        {/* Left Side: Info & Status */}
        <div className="pin-info">
          <div className="pin-icon-wrapper">
            <FaLock size={32} />
          </div>
          <h2 className="pin-title">Sécurité</h2>
          <p className="pin-subtitle">Entrez votre code PIN</p>

          <div className="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-dot ${
                  i < pin.length ? (error ? 'error' : 'filled') : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Keypad */}
        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="btn btn-outline pin-btn"
              onClick={() => handleDigit(num)}
            >
              {num}
            </button>
          ))}
          <button
            className="btn btn-outline pin-btn btn-danger-outline"
            onClick={handleClear}
          >
            C
          </button>
          <button
            className="btn btn-outline pin-btn"
            onClick={() => handleDigit(0)}
          >
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