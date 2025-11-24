import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const formatName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Sin nombre'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin fecha'

export default function JefeGrupo() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  useEffect(() => {
    if (!user) {
      return
    }

    const fetchGroups = async () => {
      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature')
        .eq('tutor_id', user.id)
        .order('nomenclature', { ascending: true })

      if (error) {
        console.error('❌ Error al cargar grupos del jefe:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        
        let errorMsg = 'No pudimos obtener tus grupos asignados.'
        if (error.code === 'PGRST116') {
          errorMsg = 'Error de permisos. Verifica las políticas RLS en Supabase.'
        } else if (error.message) {
          errorMsg = `Error: ${error.message}`
        }
        
        setErrorMessage(errorMsg)
        setGroups([])
      } else {
        setGroups(data ?? [])
        if (!selectedGroupId && data && data.length > 0) {
          setSelectedGroupId(data[0].id)
        }
      }

      setLoading(false)
    }

    fetchGroups()
  }, [user])

  useEffect(() => {
    if (!selectedGroupId) {
      setIncidents([])
      return
    }

    const fetchIncidents = async () => {
      setIncidentsLoading(true)
      setErrorMessage(null)

      try {
        // Primero obtenemos los teacher_subjects de este grupo
        const { data: subjects, error: subjectsError } = await supabase
          .from('teacher_subjects')
          .select('id')
          .eq('group_id', selectedGroupId)

        if (subjectsError) {
          throw subjectsError
        }

        if (!subjects || subjects.length === 0) {
          setIncidents([])
          setIncidentsLoading(false)
          return
        }

        const subjectIds = subjects.map((s) => s.id)

        // Luego obtenemos todos los incidentes de esos teacher_subjects
        const { data, error } = await supabase
          .from('incidents')
          .select(
            `
            id,
            situation,
            action,
            follow_up,
            created_at,
            updated_at,
            incident_types (
              id,
              name,
              code,
              category
            ),
            student:user_profiles!incidents_student_id_fkey (
              id,
              first_name,
              last_name,
              email
            ),
            teacher_subject:teacher_subjects (
              id,
              subject_name,
              shift,
              teacher:user_profiles!teacher_subjects_teacher_id_fkey1 (
                first_name,
                last_name,
                email
              )
            ),
            observations:incident_observations (
              id,
              comment,
              created_at,
              user:user_profiles!incident_observations_user_id_fkey (
                first_name,
                last_name,
                email
              )
            )
          `
          )
          .in('teacher_subject_id', subjectIds)
          .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error al obtener incidentes del grupo:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw error
      }

        setIncidents(data ?? [])
      } catch (error) {
        console.error('Error al obtener incidentes del grupo', error)
        setErrorMessage('Ocurrió un error al cargar los incidentes del grupo.')
        setIncidents([])
      } finally {
        setIncidentsLoading(false)
      }
    }

    fetchIncidents()
  }, [selectedGroupId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
            Sesión jefe de grupo
          </p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Incidentes de mis grupos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
          </p>
        </header>

        {errorMessage && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-blue-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Grupos asignados
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona un grupo para ver los incidentes registrados.
              </p>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {groups.length} {groups.length === 1 ? 'grupo' : 'grupos'} activos
            </span>
          </div>

          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
          ) : groups.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No encontramos grupos asignados a tu perfil como jefe de grupo.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`text-left rounded-xl border p-4 transition focus:outline-none focus:ring-4 ${
                    group.id === selectedGroupId
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-lg'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300'
                  }`}
                >
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {group.nomenclature}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {group.grade}° {group.specialty}
                  </h3>
                  {group.section && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Sección: {group.section}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedGroup && (
          <section className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Información del grupo
              </h3>
              <dl className="grid sm:grid-cols-3 gap-4 text-gray-700 dark:text-gray-200">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Grupo</dt>
                  <dd className="text-lg font-medium">{selectedGroup.nomenclature}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Grado y Especialidad</dt>
                  <dd className="text-lg font-medium">
                    {selectedGroup.grade}° {selectedGroup.specialty}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Sección</dt>
                  <dd className="text-lg font-medium">
                    {selectedGroup.section ?? 'Sin sección'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Incidentes registrados
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Todos los incidentes reportados en las materias de este grupo
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {incidents.length} {incidents.length === 1 ? 'incidente' : 'incidentes'}
                </span>
              </div>

              {incidentsLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Cargando incidentes...</p>
              ) : incidents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No hay incidentes registrados para este grupo.
                </p>
              ) : (
                <ul className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {incidents.map((incident) => (
                    <li
                      key={incident.id}
                      className="rounded-xl border border-gray-100 dark:border-slate-800 p-5 bg-gray-50/70 dark:bg-slate-900"
                    >
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {incident.incident_types?.name}
                            </p>
                            {incident.incident_types?.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                {incident.incident_types.category}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatName(incident.student)}
                          </p>
                          {incident.teacher_subject && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Materia: {incident.teacher_subject.subject_name} • Docente:{' '}
                              {formatName(incident.teacher_subject.teacher)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(incident.created_at)}
                        </span>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            Situación:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-200">
                            {incident.situation}
                          </p>
                        </div>

                        {incident.action && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                              Acción tomada:
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              {incident.action}
                            </p>
                          </div>
                        )}

                        {incident.follow_up && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                              Seguimiento:
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              {incident.follow_up}
                            </p>
                          </div>
                        )}
                      </div>

                      {incident.observations && incident.observations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            Observaciones ({incident.observations.length}):
                          </p>
                          <div className="space-y-2">
                            {incident.observations.map((observation) => (
                              <div
                                key={observation.id}
                                className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700"
                              >
                                <p className="font-medium mb-1">
                                  {formatName(observation.user)}{' '}
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                    {formatDate(observation.created_at)}
                                  </span>
                                </p>
                                <p>{observation.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
