import React from 'react'
import { Settings, Zap, Clock, X } from 'lucide-react'

type ActiveTab = 'summary' | 'history' | 'settings'

interface HeaderProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

// Detect if we're running inside the injected side panel (iframe)
const isInSidePanel = window.self !== window.top

function closePanel() {
  window.parent.postMessage({ type: 'WG_CLOSE_PANEL' }, '*')
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3
                        bg-gradient-to-r from-violet-950 via-gray-900 to-indigo-950
                        border-b border-violet-800/30">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600
                        flex items-center justify-center shadow-lg shadow-violet-900/50">
          <Zap size={15} className="text-white" fill="white" />
        </div>
        <span className="text-white font-bold text-base tracking-tight">
          Web<span className="text-violet-400">Gist</span>
        </span>
      </div>

      {/* Center tabs */}
      <div className="flex items-center bg-gray-800/60 border border-gray-700/40 rounded-lg p-0.5 gap-0.5">
        {([
          { id: 'summary', label: 'Summary', icon: null },
          { id: 'history', label: 'History', icon: <Clock size={10} /> },
        ] as const).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap
              ${activeTab === id
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Right controls: Settings + Close (when in side panel) */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onTabChange(activeTab === 'settings' ? 'summary' : 'settings')}
          title={activeTab === 'settings' ? 'Back' : 'Settings'}
          className={`p-1.5 rounded-lg transition-all
            ${activeTab === 'settings'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-900/50'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
        >
          <Settings size={16} />
        </button>

        {isInSidePanel && (
          <button
            onClick={closePanel}
            title="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </header>
  )
}
