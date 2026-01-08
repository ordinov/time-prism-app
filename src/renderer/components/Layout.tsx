import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)]">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
