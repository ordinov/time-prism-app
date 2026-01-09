import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Tracking from './pages/Tracking'
import Projects from './pages/Projects'
import Clients from './pages/Clients'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/tracking" replace />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="projects" element={<Projects />} />
        <Route path="clients" element={<Clients />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
