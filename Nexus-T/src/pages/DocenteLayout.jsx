import { Outlet } from 'react-router-dom'
import RoleNavigation from '../components/RoleNavigation'
import SubPageMenu from '../components/layout/SubPageMenu'

export default function DocenteLayout() {
  const docenteMenuItems = [
    { path: '/docente', label: 'Inicio', icon: '🏠' },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="docente" />
      <SubPageMenu items={docenteMenuItems} basePath="/docente" />
      <Outlet />
    </div>
  )
}
