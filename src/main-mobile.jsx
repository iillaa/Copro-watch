import React from 'react'
import ReactDOM from 'react-dom/client'
import AppMobile from './AppMobile.jsx' // Loads the Mobile App
import ErrorBoundary from './components/ErrorBoundary';
import './index.css'
import './styles/mobile.css' // Loads Mobile Styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppMobile />
    </ErrorBoundary>
  </React.StrictMode>,
)