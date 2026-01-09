import { useState } from 'react'
import BackupTab from '../components/Settings/BackupTab'

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
)

type TabId = 'database'

interface Tab {
  id: TabId
  label: string
  icon: () => JSX.Element
}

const tabs: Tab[] = [
  { id: 'database', label: 'Database', icon: DatabaseIcon },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('database')

  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Impostazioni</h1>
      </div>

      {/* Tab Bar */}
      <div className="px-6 border-b border-[var(--border-subtle)]">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer
                ${activeTab === tab.id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              <tab.icon />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--prism-violet)] to-[var(--prism-cyan)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'database' && <BackupTab />}
      </div>
    </div>
  )
}
