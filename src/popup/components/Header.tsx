import React from 'react'
import { Settings, Zap, Clock, BookOpen } from 'lucide-react'

type ActiveTab = 'summary' | 'reader' | 'history' | 'settings'

interface HeaderProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
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
        {(['summary', 'reader', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
              ${activeTab === tab
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            {tab === 'history' && <Clock size={10} />}
            {tab === 'reader'  && <BookOpen size={10} />}
            {tab === 'summary' ? 'Summary' : tab === 'reader' ? 'Read' : 'History'}
          </button>
        ))}
      </div>

      {/* Settings icon */}
      <button
        onClick={() => onTabChange(activeTab === 'settings' ? 'summary' : 'settings')}
        title={activeTab === 'settings' ? 'Back' : 'Settings'}
        className={`p-1.5 rounded-lg transition-all flex-shrink-0
          ${activeTab === 'settings'
            ? 'bg-violet-600 text-white shadow-md shadow-violet-900/50'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
      >
        <Settings size={16} />
      </button>
    </header>
  )
}
