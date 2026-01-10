import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { TimerProvider } from './context/TimerContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/ToastContainer'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute before refetch
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ToastProvider>
          <TimerProvider>
            <App />
            <ToastContainer />
          </TimerProvider>
        </ToastProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
