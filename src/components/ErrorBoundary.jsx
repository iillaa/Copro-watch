import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Advanced: Clear local storage if it's a persistent data corruption
    // localStorage.clear(); 
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          textAlign: 'center',
          background: '#f8d7da',
          color: '#721c24'
        }}>
          <h2>Oups ! Une erreur est survenue.</h2>
          <p>L'application a rencontré un problème inattendu.</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={this.handleReload} 
              style={{ padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Recharger l'application
            </button>
          </div>
          <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.7 }}>
            Code d'erreur : {this.state.error?.toString()}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}