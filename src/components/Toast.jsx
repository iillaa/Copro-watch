import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  // Use callback to prevent unnecessary re-renders
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const ToastContainer = () => (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none', // Allow clicking through the container
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="card"
          style={{
            background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
            borderLeft: `5px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
            padding: '1rem',
            minWidth: '250px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'modalSlideIn 0.3s ease',
            pointerEvents: 'auto', // Re-enable clicks on the toast itself
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ fontWeight: 600 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
};
