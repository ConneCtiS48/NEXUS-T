import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import RoleNavigation from '../components/RoleNavigation'

const formatName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Sin nombre'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin fecha'

export default function PadreFamilia() {
  const { user } = useAuth()
  const [childrenGroups, setChildrenGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [tutorProfile, setTutorProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  })
  const [contactSubmitting, setContactSubmitting] = useState(false)

  const selectedGroup = useMemo(
    () => childrenGroups.find((g) => g.id === selectedGroupId) ?? null,
    [childrenGroups, selectedGroupId]
  )

  useEffect(() => {
    if (!user) {
      return
    }

    const fetchChildrenGroups = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        // Buscar los hijos del padre usando el email del padre
        // Asumiendo que hay un campo parent_email en user_profiles o similar relación
        // Si no existe, podríamos buscar por apellidos compartidos o usar otra lógica
        
        // Opción 1: Buscar hijos por parent_email (si existe en el esquema)
        // Opción 2: Buscar por apellidos compartidos
        // Opción 3: Permitir que el padre busque/ingrese información de sus hijos
        
        // Por ahora, voy a buscar todos los grupos donde hay alumnos
        // y permitir que el padre seleccione los grupos de sus hijos
        // En producción, esto debería filtrarse por la relación padre-hijo real
        
        // Buscar grupos únicos donde hay alumnos
        // Primero obtenemos todos los grupos con sus miembros
        const { data: allGroups, error: groupsError } = await supabase
          .from('groups')
          .select('id, grade, specialty, section, nomenclature, tutor_id')
          .order('nomenclature', { ascending: true })

        if (groupsError) {
          throw groupsError
        }

        // Obtener perfiles de tutores por separado
        const tutorIds = [...new Set((allGroups || []).map((g) => g.tutor_id).filter(Boolean))]
        const tutorsMap = new Map()

        if (tutorIds.length > 0) {
          const { data: tutors, error: tutorsError } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', tutorIds)

          if (!tutorsError && tutors) {
            tutors.forEach((tutor) => {
              tutorsMap.set(tutor.user_id, tutor)
            })
          }
        }

        // Para cada grupo, verificar si tiene miembros
        // En producción, esto debería filtrarse por hijos del padre
        const groupsWithMembers = await Promise.all(
          (allGroups || []).map(async (group) => {
            const { data: members } = await supabase
              .from('group_members')
              .select('id')
              .eq('group_id', group.id)
              .limit(1)

            return {
              ...group,
              hasMembers: (members || []).length > 0,
              tutor: group.tutor_id ? tutorsMap.get(group.tutor_id) || null : null,
            }
          })
        )

        // Filtrar solo grupos con miembros
        const filteredGroups = groupsWithMembers.filter((g) => g.hasMembers)

        setChildrenGroups(filteredGroups)
        if (!selectedGroupId && filteredGroups.length > 0) {
          setSelectedGroupId(filteredGroups[0].id)
        }
      } catch (error) {
        console.error('Error al cargar grupos de hijos', error)
        setErrorMessage('No pudimos obtener los grupos de tus hijos.')
        setChildrenGroups([])
      } finally {
        setLoading(false)
      }
    }

    fetchChildrenGroups()
  }, [user])

  useEffect(() => {
    if (!selectedGroup) {
      setIncidents([])
      setTutorProfile(null)
      return
    }

    const fetchGroupData = async () => {
      setIncidentsLoading(true)
      setErrorMessage(null)

      try {
        await Promise.all([
          fetchGroupIncidents(selectedGroup.id),
          fetchTutorProfile(selectedGroup.tutor_id),
        ])
      } catch (error) {
        console.error('Error al cargar datos del grupo', error)
        setErrorMessage('Ocurrió un error al cargar la información del grupo.')
      } finally {
        setIncidentsLoading(false)
      }
    }

    fetchGroupData()
  }, [selectedGroup?.id, selectedGroup?.tutor_id])

  const fetchGroupIncidents = async (groupId) => {
    if (!groupId) {
      setIncidents([])
      return
    }

    try {
      // Obtener todos los teacher_subjects del grupo
      const { data: subjects, error: subjectsError } = await supabase
        .from('teacher_subjects')
        .select('id')
        .eq('group_id', groupId)

      if (subjectsError) {
        throw subjectsError
      }

      if (!subjects || subjects.length === 0) {
        setIncidents([])
        return
      }

      const subjectIds = subjects.map((s) => s.id)

      // Obtener todos los incidentes de esos teacher_subjects
      const { data, error } = await supabase
        .from('incidents')
        .select(
          `
          id,
          situation,
          action,
          follow_up,
          created_at,
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
        throw error
      }

      setIncidents(data ?? [])
    } catch (error) {
      console.error('Error al obtener incidentes del grupo', error)
      throw error
    }
  }

  const fetchTutorProfile = async (tutorUserId) => {
    if (!tutorUserId) {
      setTutorProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .eq('user_id', tutorUserId)
      .maybeSingle()

    if (error) {
      console.error('No se pudo obtener la información del tutor', error)
      setTutorProfile(null)
    } else {
      setTutorProfile(data)
    }
  }

  const handleContactChange = (event) => {
    const { name, value } = event.target
    setContactForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleContactSubmit = async (event) => {
    event.preventDefault()

    if (!selectedGroup || !tutorProfile) {
      setErrorMessage('No hay tutor asignado para contactar.')
      return
    }

    setContactSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    // Aquí podrías implementar:
    // 1. Enviar email al tutor
    // 2. Guardar mensaje en una tabla de mensajes/notificaciones
    // 3. Usar un servicio de email externo
    
    // Por ahora, solo simulamos el envío
    // En producción, esto debería integrarse con un servicio de email o sistema de mensajería
    
    setTimeout(() => {
      setSuccessMessage(
        `Mensaje preparado para enviar a ${formatName(tutorProfile)} (${tutorProfile.email}). ` +
        `En producción, esto se enviaría por email o se guardaría en el sistema de mensajería.`
      )
      setContactForm({ subject: '', message: '' })
      setContactSubmitting(false)
    }, 1000)

    // Ejemplo de cómo podría guardarse en una tabla de mensajes (si existe):
    /*
    const { error } = await supabase.from('messages').insert({
      from_user_id: user.id,
      to_user_id: selectedGroup.tutor_id,
      subject: contactForm.subject,
      message: contactForm.message,
      group_id: selectedGroup.id,
    })
    */
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="padreFamilia" />
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
            Sesión padre de familia
          </p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Seguimiento de incidentes escolares
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
          </p>
        </header>

        {(errorMessage || successMessage) && (
          <div
            className={`p-4 rounded-lg border ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            {errorMessage ?? successMessage}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando grupos de tus hijos...</p>
        ) : childrenGroups.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron grupos asignados. Si tus hijos están registrados en el sistema,
              contacta a Orientación Educativa para verificar la asignación.
            </p>
          </div>
        ) : (
          <>
            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-blue-100 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Grupos de tus hijos
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Selecciona un grupo para ver los incidentes registrados.
                  </p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {childrenGroups.length} {childrenGroups.length === 1 ? 'grupo' : 'grupos'} disponibles
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {childrenGroups.map((group) => (
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
                    {group.tutor && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Tutor: {formatName(group.tutor)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {selectedGroup && (
              <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
                {/* Sección de Incidentes */}
                <section className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Incidentes del grupo {selectedGroup.nomenclature}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedGroup.grade}° {selectedGroup.specialty}
                        {selectedGroup.section ? ` • ${selectedGroup.section}` : ''}
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
                </section>

                {/* Sección de Contacto con Tutor */}
                <section className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Contactar al tutor del grupo
                  </h3>

                  {selectedGroup.tutor ? (
                    <>
                      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                          Información del tutor:
                        </p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {formatName(selectedGroup.tutor)}
                        </p>
                        {tutorProfile?.email && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {tutorProfile.email}
                          </p>
                        )}
                      </div>

                      <form className="space-y-4" onSubmit={handleContactSubmit}>
                        <div>
                          <label
                            htmlFor="subject"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                          >
                            Asunto
                          </label>
                          <input
                            id="subject"
                            name="subject"
                            type="text"
                            value={contactForm.subject}
                            onChange={handleContactChange}
                            placeholder="Ej: Consulta sobre incidente del grupo"
                            required
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="message"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                          >
                            Mensaje
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            value={contactForm.message}
                            onChange={handleContactChange}
                            placeholder="Escribe tu mensaje aquí..."
                            required
                            rows="6"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={contactSubmitting}
                          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50"
                        >
                          {contactSubmitting ? 'Enviando...' : 'Enviar mensaje al tutor'}
                        </button>
                      </form>

                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Nota:</strong> En producción, este mensaje se enviaría por email al tutor
                          o se guardaría en un sistema de mensajería interno.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                      <p className="text-gray-500 dark:text-gray-400">
                        Este grupo aún no tiene un tutor asignado. Contacta a Orientación Educativa
                        para más información.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

