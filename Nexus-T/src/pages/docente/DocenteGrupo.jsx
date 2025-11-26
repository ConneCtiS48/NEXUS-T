import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const INITIAL_INCIDENT_FORM = {
  studentId: '',
  incidentTypeId: '',
  situation: '',
  action: '',
  followUp: '',
}

const formatName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Sin nombre'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin fecha'

export default function DocenteGrupo() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subjectId = searchParams.get('subjectId')
  const groupId = searchParams.get('groupId')

  const [subject, setSubject] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [incidents, setIncidents] = useState([])
  const [tutorProfile, setTutorProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [incidentForm, setIncidentForm] = useState(INITIAL_INCIDENT_FORM)
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)

  const studentsOptions = useMemo(
    () =>
      groupMembers.map((member) => ({
        id: member.student?.id,
        label: formatName(member.student),
      })),
    [groupMembers]
  )

  useEffect(() => {
    const fetchIncidentTypes = async () => {
      const { data, error } = await supabase
        .from('incident_types')
        .select('id, name, code, category')
        .order('name')

      if (!error) {
        setIncidentTypes(data ?? [])
      } else {
        console.error('No se pudieron cargar los tipos de incidente', error)
      }
    }

    fetchIncidentTypes()
  }, [])

  useEffect(() => {
    if (!subjectId || !groupId || !user) {
      if (!subjectId || !groupId) {
        navigate('/docente')
      }
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        // Obtener información de la materia/grupo
        const { data: subjectData, error: subjectError } = await supabase
          .from('teacher_group_subjects')
          .select(
            `
              id,
              shift,
              subject:subjects!teacher_group_subjects_subject_id_fkey (
                id,
                subject_name
              ),
              group:groups (
                id,
                grade,
                specialty,
                section,
                nomenclature,
                tutor_id
              )
            `
          )
          .eq('id', subjectId)
          .eq('teacher_id', user.id)
          .single()

        if (subjectError) throw subjectError

        const normalized = {
          ...subjectData,
          group: Array.isArray(subjectData.group) ? subjectData.group[0] : subjectData.group,
          subject_name: subjectData.subject?.subject_name || 'Sin nombre',
        }
        setSubject(normalized)

        // Cargar datos del grupo
        await Promise.all([
          fetchGroupMembers(groupId),
          fetchIncidents(subjectId),
          fetchTutorProfile(normalized.group?.tutor_id),
        ])
      } catch (error) {
        console.error('Error al cargar datos del grupo:', error)
        setErrorMessage('Ocurrió un error al cargar la información del grupo.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [subjectId, groupId, user, navigate])

  const fetchGroupMembers = async (groupId) => {
    if (!groupId) {
      setGroupMembers([])
      return
    }

    const { data, error } = await supabase
      .from('group_members')
      .select(
        `
          id,
          created_at,
          student:user_profiles!group_members_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error al obtener alumnos del grupo:', error)
      throw error
    }

    setGroupMembers(data ?? [])
  }

  const fetchIncidents = async (subjectId) => {
    if (!subjectId) {
      setIncidents([])
      return
    }

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
      .eq('teacher_subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error al obtener incidentes:', error)
      throw error
    }

    setIncidents(data ?? [])
  }

  const fetchTutorProfile = async (tutorUserId) => {
    if (!tutorUserId) {
      setTutorProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('user_id', tutorUserId)
      .maybeSingle()

    if (error) {
      console.error('No se pudo obtener la información del tutor', error)
      throw error
    }

    setTutorProfile(data)
  }

  const handleIncidentChange = (event) => {
    const { name, value } = event.target
    setIncidentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleIncidentSubmit = async (event) => {
    event.preventDefault()

    if (!subject) return

    setIncidentSubmitting(true)
    setErrorMessage(null)

    const payload = {
      incident_type_id: incidentForm.incidentTypeId,
      student_id: incidentForm.studentId,
      teacher_subject_id: subject.id,
      situation: incidentForm.situation,
      action: incidentForm.action,
      follow_up: incidentForm.followUp,
    }

    const { error } = await supabase.from('incidents').insert(payload)

    if (error) {
      console.error('No se pudo registrar el incidente', error)
      setErrorMessage('No se pudo registrar el incidente. Intenta nuevamente.')
    } else {
      setIncidentForm(INITIAL_INCIDENT_FORM)
      await fetchIncidents(subject.id)
    }

    setIncidentSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Cargando información del grupo...</p>
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No se encontró la información del grupo.</p>
          <button
            onClick={() => navigate('/docente')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/docente')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {subject.subject_name}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {subject.group?.nomenclature}
          </p>
        </div>
      </header>

      {errorMessage && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Información del grupo
          </h3>
          {subject.group ? (
            <dl className="grid sm:grid-cols-2 gap-4 text-gray-700 dark:text-gray-200">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Grupo</dt>
                <dd className="text-lg font-medium">
                  {subject.group.nomenclature} ({subject.group.grade}° {subject.group.specialty})
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Sección</dt>
                <dd className="text-lg font-medium">
                  {subject.group.section ?? 'Sin sección'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Esta materia aún no tiene un grupo asignado.
            </p>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tutor del grupo
          </h3>
          {tutorProfile ? (
            <div className="space-y-1 text-gray-700 dark:text-gray-200">
              <p className="text-lg font-medium">{formatName(tutorProfile)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tutorProfile.email}</p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No hay tutor asignado o no se encontró su perfil.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1.8fr]">
        <div className="space-y-6">
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Alumnos del grupo ({groupMembers.length})
            </h3>
            {groupMembers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Sin alumnos registrados.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {groupMembers.map((member) => (
                  <li
                    key={member.id}
                    className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900 flex flex-col"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatName(member.student)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {member.student?.email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Registrar incidente
            </h3>
            <form className="space-y-4" onSubmit={handleIncidentSubmit}>
              <select
                name="studentId"
                value={incidentForm.studentId}
                onChange={handleIncidentChange}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
              >
                <option value="">Selecciona un alumno</option>
                {studentsOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                name="incidentTypeId"
                value={incidentForm.incidentTypeId}
                onChange={handleIncidentChange}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
              >
                <option value="">Tipo de incidente</option>
                {incidentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <textarea
                name="situation"
                value={incidentForm.situation}
                onChange={handleIncidentChange}
                placeholder="Describe la situación observada"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                rows="3"
              />

              <textarea
                name="action"
                value={incidentForm.action}
                onChange={handleIncidentChange}
                placeholder="Acción tomada"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                rows="2"
              />

              <textarea
                name="followUp"
                value={incidentForm.followUp}
                onChange={handleIncidentChange}
                placeholder="Seguimiento sugerido"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                rows="2"
              />

              <button
                type="submit"
                disabled={incidentSubmitting}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50"
              >
                {incidentSubmitting ? 'Guardando...' : 'Guardar incidente'}
              </button>
            </form>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Incidentes recientes ({incidents.length})
          </h3>
          {incidents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Sin registros.</p>
          ) : (
            <ul className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 bg-gray-50/70 dark:bg-slate-900"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {incident.incident_types?.name}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatName(incident.student)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(incident.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    {incident.situation}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">
                    <span className="font-semibold">Acción:</span> {incident.action}
                  </p>
                  {incident.follow_up && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                      <span className="font-semibold">Seguimiento:</span> {incident.follow_up}
                    </p>
                  )}
                  {incident.observations?.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 dark:border-slate-800 pt-2 space-y-2">
                      {incident.observations.map((observation) => (
                        <div key={observation.id} className="text-sm text-gray-600 dark:text-gray-300">
                          <p className="font-medium">
                            {formatName(observation.user)}{' '}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(observation.created_at)}
                            </span>
                          </p>
                          <p>{observation.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

