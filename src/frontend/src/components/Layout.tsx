import { NavLink } from 'react-router-dom';
import {
  Gauge, Buildings, Gear, Sun, Moon, Crosshair, Bell,
} from '@phosphor-icons/react';
import { useTheme } from '../hooks/useTheme';

const nav = [
  { to: '/dashboard',     icon: Gauge,     label: 'Dashboard' },
  { to: '/empresas',      icon: Buildings, label: 'Empresas' },
  { to: '/notificacoes',  icon: Bell,      label: 'Notificações' },
  { to: '/configuracoes', icon: Gear,      label: 'Configurações' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { dark, toggle } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0 print:hidden">
        <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Crosshair size={28} weight="fill" className="text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Radar</p>
            <p className="font-bold text-sm text-blue-600 dark:text-blue-400 leading-tight">Societário</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={toggle}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Modo claro' : 'Modo escuro'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
        {children}
      </main>
    </div>
  );
}
