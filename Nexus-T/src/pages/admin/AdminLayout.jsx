import { Outlet } from 'react-router-dom'
import RoleNavigation from '../../components/RoleNavigation'
import SubPageMenu from '../../components/layout/SubPageMenu'

export default function AdminLayout() {
  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Usuarios', icon: '👥' },
    { path: '/admin/groups', label: 'Grupos', icon: '👨‍👩‍👧‍👦' },
    { path: '/admin/subjects', label: 'Asignaturas', icon: '📚' },
    { path: '/admin/roles', label: 'Roles', icon: '🔐' },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="admin" />
      <SubPageMenu items={adminMenuItems} basePath="/admin" />
      <Outlet />
    </div>
  )
}

