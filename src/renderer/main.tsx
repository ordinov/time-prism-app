import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { TimerProvider } from './context/TimerContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/ToastContainer'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <TimerProvider>
          <App />
          <ToastContainer />
        </TimerProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
)
