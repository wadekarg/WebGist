import React from 'react'
import { Settings, Zap, Clock, Sun, Moon } from 'lucide-react'

type ActiveTab = 'summary' | 'history' | 'settings'
type Theme = 'dark' | 'light'

interface HeaderProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  theme: Theme | 'system'
  onThemeChange: (theme: Theme) => void
}

export default function Header({ activeTab, onTabChange, theme, onThemeChange }: HeaderProps) {
  const isDark = theme === 'dark' || theme === 'system'

  return (
    <header className="flex items-center justify-between px-4 py-3
                        bg-gradient-to-r from-violet-950 via-gray-900 to-indigo-950
                        border-b border-violet-800/30">
      {/* Logo — fixed colors, doesn't change with theme */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: '#3b82f6', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
          <Zap size={15} style={{ color: '#ffffff' }} fill="#ffffff" />
        </div>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>
          Web<span style={{ color: '#3b82f6' }}>Gist</span>
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
                ? 'text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
              }`}
            style={activeTab === id ? { background: 'linear-gradient(to right, var(--grad-from), var(--grad-to))' } : undefined}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Theme toggle */}
        <button
          onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg transition-all
                     text-gray-400 hover:text-white hover:bg-gray-700"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Settings */}
        <button
          onClick={() => onTabChange(activeTab === 'settings' ? 'summary' : 'settings')}
          title={activeTab === 'settings' ? 'Back' : 'Settings'}
          className={`p-1.5 rounded-lg transition-all
            ${activeTab === 'settings'
              ? 'text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          style={activeTab === 'settings' ? { background: 'var(--accent)' } : undefined}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
