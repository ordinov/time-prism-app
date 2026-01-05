import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/tracking', label: 'Track', icon: '📅' },
  { to: '/projects', label: 'Progetti', icon: '📁' },
  { to: '/clients', label: 'Clienti', icon: '👤' },
  { to: '/reports', label: 'Report', icon: '📊' },
]

export default function Sidebar() {
  return (
    <nav className="w-20 bg-gray-800 text-white flex flex-col">
      <div className="p-2 text-center border-b border-gray-700">
        <span className="text-xs font-bold">Time Prism</span>
      </div>
      <div className="flex-1 py-4">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-3 px-2 hover:bg-gray-700 transition-colors ${
                isActive ? 'bg-gray-700 border-l-2 border-blue-400' : ''
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
