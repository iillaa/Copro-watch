import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// [DEBUG] CSS Diagnostic Script - Validates potential CSS bugs
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const appShell = document.querySelector('.app-shell');
      const root = document.getElementById('root');
      
      console.log('[DEBUG] CSS Diagnosis Report:');
      if (appShell) {
        const styles = window.getComputedStyle(appShell);
        console.log('[DEBUG] .app-shell computed styles:', {
          display: styles.display,
          flexDirection: styles.flexDirection,
          position: styles.position,
          height: styles.height,
          overflow: styles.overflow
        });
        
        // Check for CSS conflict
        if (styles.display === 'block' && styles.flexDirection !== 'none') {
          console.warn('[BUG DETECTED] CSS Conflict: display:block ignores flex-direction:', styles.flexDirection);
        }
      } else {
        console.warn('[DEBUG] .app-shell element not found');
      }
      
      if (root) {
        const rootStyles = window.getComputedStyle(root);
        console.log('[DEBUG] #root computed styles:', {
          display: rootStyles.display,
          height: rootStyles.height,
          minHeight: rootStyles.minHeight,
          overflow: rootStyles.overflow
        });
      }
      
      // Check if sidebar is positioned correctly
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        const sidebarStyles = window.getComputedStyle(sidebar);
        console.log('[DEBUG] .sidebar computed styles:', {
          position: sidebarStyles.position,
          bottom: sidebarStyles.bottom,
          zIndex: sidebarStyles.zIndex
        });
      }
    }, 1000); // Wait for React to render
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);