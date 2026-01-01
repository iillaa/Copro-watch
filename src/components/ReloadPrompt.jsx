import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Styles for the toast notification
  const styles = {
    container: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      padding: '16px',
      backgroundColor: 'var(--bg-card, #fff)',
      border: '1px solid var(--border, #ddd)',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '300px',
    },
    message: {
      marginBottom: '8px',
      color: 'var(--text-main, #333)',
      fontWeight: '500',
    },
    buttonRow: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
    },
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div style={styles.container}>
      <div style={styles.message}>
        {offlineReady ? (
          <span>App ready to work offline</span>
        ) : (
          <span>Nouveau contenu disponible, cliquez pour mettre à jour.</span>
        )}
      </div>
      <div style={styles.buttonRow}>
        {needRefresh && (
          <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
            Mettre à jour
          </button>
        )}
        <button className="btn btn-outline" onClick={close}>
          Fermer
        </button>
      </div>
    </div>
  );
}
