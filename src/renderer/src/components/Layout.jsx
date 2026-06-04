import { Outlet, NavLink } from 'react-router-dom'
import { Wand2, Library, Settings, TrendingUp } from 'lucide-react'

export default function Layout() {
  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-tiktok-red text-white'
        : 'text-tiktok-muted hover:text-white hover:bg-white/5'
    }`

  return (
    <div className="flex flex-col h-screen bg-tiktok-dark">
      <header className="flex items-center justify-between px-6 py-3 border-b border-tiktok-border bg-tiktok-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tiktok-red to-tiktok-cyan flex items-center justify-center">
            <span className="text-white font-bold text-sm">TT</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">TikTok Content Generator</h1>
            <p className="text-tiktok-muted text-xs">Sauerteig Backbuch</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/generator" className={navClass}>
            <Wand2 size={16} />
            Generator
          </NavLink>
          <NavLink to="/library" className={navClass}>
            <Library size={16} />
            Bibliothek
          </NavLink>
          <NavLink to="/viral" className={navClass}>
            <TrendingUp size={16} />
            Viral Research
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings size={16} />
            Einstellungen
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
