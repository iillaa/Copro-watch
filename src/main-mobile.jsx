import React from 'react'
import ReactDOM from 'react-dom/client'
import AppMobile from './AppMobile.jsx' 
import ErrorBoundary from './components/ErrorBoundary';
import './index.css' // <--- Make sure there is a space after import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppMobile />
    </ErrorBoundary>
  </React.StrictMode>,
)