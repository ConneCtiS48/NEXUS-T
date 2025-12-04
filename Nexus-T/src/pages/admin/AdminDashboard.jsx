import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'
import StatCard from '../../components/admin/StatCard'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    roles: { total: 0 },
    subjects: { total: 0 },
    users: {
      total: 0,
      byRole: {},
      newLastWeek: 0,
    },
    groups: {
      total: 0,
      withTutor: 0,
      withoutTutor: 0,
      bySpecialty: [],
    },
    students: {
      total: 0,
      inGroups: 0,
      withoutGroup: 0,
      groupLeaders: 0,
    },
    incidents: {
      total: 0,
      thisMonth: 0,
      lastMonth: 0,
      topCategory: { name: '-', count: 0 },
      last7Days: [0, 0, 0, 0, 0, 0, 0],
    },
  })
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

        // Queries en paralelo
        const [
          rolesResult,
          subjectsResult,
          usersResult,
          userRolesResult,
          newUsersResult,
          groupsResult,
          groupsWithTutorResult,
          studentsResult,
          groupMembersResult,
          groupLeadersResult,
          incidentsResult,
          incidentsThisMonthResult,
          incidentsLastMonthResult,
          incidentTypesResult,
          incidentsLast7DaysResult,
        ] = await Promise.all([
          // Simples
          supabase.from('roles').select('id', { count: 'exact', head: true }),
          supabase.from('subjects').select('id', { count: 'exact', head: true }),
          
          // Usuarios
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('user_roles').select('role_id, roles(name)'),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
          
          // Grupos
          supabase.from('groups').select('id, specialty'),
          supabase.from('teacher_groups').select('group_id').eq('is_tutor', true),
          
          // Estudiantes
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('group_members').select('student_id'),
          supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('is_group_leader', true),
          
          // Incidentes
          supabase.from('incidents').select('id', { count: 'exact', head: true }),
          supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth.toISOString()),
          supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', firstDayOfLastMonth.toISOString()).lt('created_at', firstDayOfMonth.toISOString()),
          supabase.from('incidents').select('incident_type_id, incident_types(name)'),
          supabase.from('incidents').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        ])

        // Procesar usuarios por rol
        const roleCount = {}
        userRolesResult.data?.forEach((ur) => {
          const roleName = ur.roles?.name || 'Sin rol'
          roleCount[roleName] = (roleCount[roleName] || 0) + 1
        })

        // Procesar grupos por especialidad
        const specialtyCount = {}
        groupsResult.data?.forEach((g) => {
          const spec = g.specialty || 'Sin especialidad'
          specialtyCount[spec] = (specialtyCount[spec] || 0) + 1
        })
        const topSpecialties = Object.entries(specialtyCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)

        // Procesar estudiantes en grupos (únicos)
        const uniqueStudentsInGroups = new Set(groupMembersResult.data?.map((gm) => gm.student_id) || [])

        // Procesar incidentes por categoría
        const categoryCount = {}
        incidentTypesResult.data?.forEach((inc) => {
          const catName = inc.incident_types?.name || 'Sin categoría'
          categoryCount[catName] = (categoryCount[catName] || 0) + 1
        })
        const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0] || ['Sin datos', 0]

        // Procesar incidentes por día (últimos 7 días)
        const incidentsByDay = new Array(7).fill(0)
        incidentsLast7DaysResult.data?.forEach((inc) => {
          const incDate = new Date(inc.created_at)
          const daysDiff = Math.floor((now - incDate) / (1000 * 60 * 60 * 24))
          if (daysDiff >= 0 && daysDiff < 7) {
            incidentsByDay[6 - daysDiff]++ // Más reciente a la derecha
          }
        })

        // Calcular tendencia de incidentes
        const monthChange = incidentsLastMonthResult.count > 0
          ? Math.round(((incidentsThisMonthResult.count - incidentsLastMonthResult.count) / incidentsLastMonthResult.count) * 100)
          : 0

        setStats({
          roles: { total: rolesResult.count || 0 },
          subjects: { total: subjectsResult.count || 0 },
          users: {
            total: usersResult.count || 0,
            byRole: roleCount,
            newLastWeek: newUsersResult.count || 0,
          },
          groups: {
            total: groupsResult.data?.length || 0,
            withTutor: groupsWithTutorResult.data?.length || 0,
            withoutTutor: (groupsResult.data?.length || 0) - (groupsWithTutorResult.data?.length || 0),
            bySpecialty: topSpecialties,
          },
          students: {
            total: studentsResult.count || 0,
            inGroups: uniqueStudentsInGroups.size,
            withoutGroup: (studentsResult.count || 0) - uniqueStudentsInGroups.size,
            groupLeaders: groupLeadersResult.count || 0,
          },
          incidents: {
            total: incidentsResult.count || 0,
            thisMonth: incidentsThisMonthResult.count || 0,
            lastMonth: incidentsLastMonthResult.count || 0,
            monthChange,
            topCategory: { name: topCategory[0], count: topCategory[1] },
            last7Days: incidentsByDay,
          },
        })

        // Generar alertas
        const alertsList = []
        
        if ((groupsResult.data?.length || 0) - (groupsWithTutorResult.data?.length || 0) > 0) {
          alertsList.push({
            type: 'warning',
            message: `${(groupsResult.data?.length || 0) - (groupsWithTutorResult.data?.length || 0)} grupo(s) sin tutor asignado`,
            action: 'Ver grupos',
            link: '/admin/groups',
          })
        }

        if ((studentsResult.count || 0) - uniqueStudentsInGroups.size > 0) {
          alertsList.push({
            type: 'warning',
            message: `${(studentsResult.count || 0) - uniqueStudentsInGroups.size} alumno(s) sin grupo asignado`,
            action: 'Asignar',
            link: '/admin/students',
          })
        }

        setAlerts(alertsList)
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
        setErrorMessage('No se pudieron cargar las estadísticas del sistema.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const getDayLabel = (idx) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const now = new Date()
    const targetDate = new Date(now.getTime() - (6 - idx) * 24 * 60 * 60 * 1000)
    return days[targetDate.getDay()]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <PageHeader
        variant="dashboard"
        title="Dashboard Administrativo"
        description={user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}

      {/* Fila 1: Bloques Simples */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Usuarios"
          icon="👥"
          count={stats.users.total}
          details={[
            { label: 'Nuevos (7d)', value: stats.users.newLastWeek, color: 'blue', icon: '↑' },
          ]}
          link="/admin/users"
          loading={loading}
        />

        <StatCard
          title="Roles"
          icon="🔐"
          count={stats.roles.total}
          link="/admin/roles"
          loading={loading}
        />

        <StatCard
          title="Asignaturas"
          icon="📚"
          count={stats.subjects.total}
          link="/admin/subjects"
          loading={loading}
        />
      </section>

      {/* Fila 2: Bloques con Info */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <StatCard
          title="Grupos"
          icon="👨‍👩‍👧‍👦"
          count={stats.groups.total}
          details={[
            { label: 'Con tutor', value: stats.groups.withTutor, color: 'green', icon: '✓' },
            { label: 'Sin tutor', value: stats.groups.withoutTutor, color: 'amber', icon: '⚠️' },
            ...(stats.groups.bySpecialty.length > 0 ? [
              { label: stats.groups.bySpecialty[0]?.[0] || '', value: stats.groups.bySpecialty[0]?.[1] || 0, color: 'blue' },
            ] : []),
          ]}
          link="/admin/groups"
          loading={loading}
        />

        <StatCard
          title="Alumnos"
          icon="🎓"
          count={stats.students.total}
          details={[
            { label: 'En grupos', value: stats.students.inGroups, color: 'green', icon: '✓' },
            { label: 'Sin grupo', value: stats.students.withoutGroup, color: 'amber', icon: '⚠️' },
            { label: 'Jefes de grupo', value: stats.students.groupLeaders, color: 'blue', icon: '⭐' },
          ]}
          link="/admin/students"
          loading={loading}
        />
      </section>

      {/* Fila 3: Incidentes Destacado (Full Width) */}
      <section className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">📋</span>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Incidentes</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Seguimiento y tendencias</p>
          </div>
        </div>
        
        {loading ? (
          <p className="text-gray-400">Cargando estadísticas de incidentes...</p>
        ) : (
          <>
            {/* Grid de 4 sub-bloques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.incidents.total}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Registrados</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.incidents.thisMonth}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Este Mes</p>
                {stats.incidents.monthChange !== 0 && (
                  <p className={`text-xs mt-1 ${stats.incidents.monthChange > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {stats.incidents.monthChange > 0 ? '↑' : '↓'} {Math.abs(stats.incidents.monthChange)}% vs mes anterior
                  </p>
                )}
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 truncate">
                  {stats.incidents.topCategory.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Categoría Principal</p>
                <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mt-2">
                  {stats.incidents.topCategory.count}
                </p>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-3xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.incidents.last7Days[6] || 0}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Hoy</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  {stats.incidents.last7Days.reduce((a, b) => a + b, 0)} en 7 días
                </p>
              </div>
            </div>
            
            {/* Mini gráfica de tendencia últimos 7 días */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tendencia de Incidentes (Últimos 7 días)
              </h4>
              <div className="flex items-end gap-2 h-32">
                {stats.incidents.last7Days.map((count, idx) => {
                  const maxCount = Math.max(...stats.incidents.last7Days, 1)
                  const height = (count / maxCount) * 100
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                      <div className="w-full flex flex-col items-center justify-end h-full">
                        {count > 0 && (
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                            {count}
                          </span>
                        )}
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-t transition-all hover:opacity-80"
                          style={{ height: count > 0 ? `${height}%` : '2px' }}
                          title={`${count} incidente${count !== 1 ? 's' : ''}`}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {getDayLabel(idx)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Fila 4: Alertas y Actividad */}
      {!loading && (alerts.length > 0) && (
        <section className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Alertas */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🚨</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Alertas
              </h3>
            </div>
            
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {alert.message}
                    </p>
                    {alert.link && (
                      <Link
                        to={alert.link}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        {alert.action} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">ℹ️</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Acceso Administrativo
              </h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Como administrador, tienes acceso completo al sistema.
              </p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Módulos Disponibles:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Gestión de usuarios y roles
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Administración de grupos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Registro de alumnos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Gestión de asignaturas
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
