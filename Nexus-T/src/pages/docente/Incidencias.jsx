import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useDocenteGroupsAndStudents } from '../../hooks/useDocenteGroupsAndStudents'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import Modal from '../../components/base/Modal'
import Alert from '../../components/base/Alert'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import Textarea from '../../components/forms/Textarea'
import FormField from '../../components/forms/FormField'

const INITIAL_INCIDENT_FORM = {
  studentId: '',
  incidentTypeId: '',
  situation: '',
  action: '',
  follow_up: '',
  observation: '',
}

const formatProfile = (p) =>
  p ? (`${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email || '-') : '-'

const incidentTableColumns = [
  { key: 'created_at', label: 'Fecha', render: (v) => (v ? new Date(v).toLocaleDateString('es-MX') : '-') },
  { key: 'incident_types', label: 'Tipo', render: (v) => v?.name || '-' },
  {
    key: 'student',
    label: 'Alumno',
    render: (v) => (v ? `${v.first_name || ''} ${v.paternal_last_name || ''} ${v.maternal_last_name || ''}`.trim() || '-' : '-'),
  },
  { key: 'student', label: 'No. Control', render: (v) => (v?.control_number ?? '-') },
  { key: 'creator', label: 'Creado por', render: (v) => formatProfile(v) },
  { key: 'tutor', label: 'Tutor del alumno', render: (v) => formatProfile(v) },
  { key: 'situation', label: 'Situación', render: (v) => (v && v.length > 50 ? `${v.substring(0, 50)}...` : v) || '-' },
]

export default function DocenteIncidencias({ setErrorMessage }) {
  const { user } = useAuth()
  const { groups, studentsWithGroup, tutorGroupId, loading: loadingData, error: dataError } = useDocenteGroupsAndStudents(user?.id ?? null)
  const [filterGroupId, setFilterGroupId] = useState('')
  const [filterControlNumber, setFilterControlNumber] = useState('')
  const [incidents, setIncidents] = useState([])
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [incidentForm, setIncidentForm] = useState(INITIAL_INCIDENT_FORM)
  const [incidentTypes, setIncidentTypes] = useState([])
  const [selectedStudentForIncident, setSelectedStudentForIncident] = useState(null)
  const [createModalGroupFilter, setCreateModalGroupFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [pageSuccessMessage, setPageSuccessMessage] = useState(null)
  const [incidentsRefresh, setIncidentsRefresh] = useState(0)

  const studentIdsFilter = useMemo(() => {
    let list = studentsWithGroup.map((x) => x.student.id)
    if (filterGroupId) {
      list = studentsWithGroup.filter((x) => x.group?.id === filterGroupId).map((x) => x.student.id)
    }
    if (filterControlNumber.trim()) {
      const term = filterControlNumber.trim().toLowerCase()
      list = studentsWithGroup
        .filter((x) => (x.student?.control_number || '').toLowerCase().includes(term))
        .map((x) => x.student.id)
    }
    return list
  }, [studentsWithGroup, filterGroupId, filterControlNumber])

  const studentsForCreateModal = useMemo(() => {
    if (!createModalGroupFilter) return studentsWithGroup
    return studentsWithGroup.filter((x) => x.group?.id === createModalGroupFilter)
  }, [studentsWithGroup, createModalGroupFilter])

  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase
        .from('incident_types')
        .select('id, name, code, category')
        .order('name')
      if (error) return
      setIncidentTypes(data || [])
    }
    fetchTypes()
  }, [])

  useEffect(() => {
    if (!user?.id || studentIdsFilter.length === 0) {
      setIncidents([])
      return
    }
    let cancelled = false
    setIncidentsLoading(true)
    let query = supabase
      .from('incidents')
      .select(
        `
        id,
        situation,
        action,
        follow_up,
        created_at,
        updated_at,
        incident_type_id,
        student_id,
        created_by,
        teacher_id,
        incident_types ( id, name, code, category ),
        student:students!incidents_student_id_fkey ( id, first_name, paternal_last_name, maternal_last_name, control_number, email ),
        observations:incident_observations (
          id,
          comment,
          created_at,
          user:user_profiles!incident_observations_user_id_fkey ( first_name, last_name, email )
        )
        `
      )
      .in('student_id', studentIdsFilter)

    if (tutorGroupId) {
      query = query.or(`teacher_id.eq.${user.id},created_by.eq.${user.id}`)
    } else {
      query = query.eq('created_by', user.id)
    }

    query = query.order('created_at', { ascending: false })

    query
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error) {
          setErrorMessage?.(error.message)
          setIncidents([])
          return
        }
        const list = data || []
        const userIds = [...new Set(list.flatMap((i) => [i.created_by, i.teacher_id].filter(Boolean)))]
        if (userIds.length === 0) {
          setIncidents(list.map((i) => ({ ...i, creator: null, tutor: null })))
          return
        }
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds)
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]))
        const enriched = list.map((inc) => ({
          ...inc,
          creator: inc.created_by ? profileMap.get(inc.created_by) ?? null : null,
          tutor: inc.teacher_id ? profileMap.get(inc.teacher_id) ?? null : null,
        }))
        if (!cancelled) setIncidents(enriched)
      })
      .finally(() => {
        if (!cancelled) setIncidentsLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id, studentIdsFilter, tutorGroupId, setErrorMessage, incidentsRefresh])

  const handleOpenCreateModal = () => {
    setIncidentForm(INITIAL_INCIDENT_FORM)
    setSelectedStudentForIncident(null)
    setCreateModalGroupFilter('')
    setSuccessMessage(null)
    setPageSuccessMessage(null)
    setErrorMessage?.(null)
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setIncidentForm(INITIAL_INCIDENT_FORM)
    setSelectedStudentForIncident(null)
    setSuccessMessage(null)
  }

  const handleSelectStudentForIncident = (item) => {
    setSelectedStudentForIncident(item.student)
    setIncidentForm((prev) => ({ ...prev, studentId: item.student?.id ?? '' }))
  }

  const handleCreateIncident = async (e) => {
    e.preventDefault()
    if (!incidentForm.studentId || !incidentForm.incidentTypeId) {
      setErrorMessage?.('Completa alumno y tipo de incidente.')
      return
    }
    setSubmitting(true)
    setErrorMessage?.(null)
    setSuccessMessage(null)
    try {
      const item = studentsWithGroup.find((x) => x.student?.id === incidentForm.studentId)
      const groupId = item?.group?.id ?? null
      let teacherIdTutor = null
      if (groupId) {
        const { data: tutorRow } = await supabase
          .from('teacher_groups')
          .select('teacher_id')
          .eq('group_id', groupId)
          .eq('is_tutor', true)
          .maybeSingle()
        teacherIdTutor = tutorRow?.teacher_id ?? null
      }
      const { data: newIncident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          incident_type_id: incidentForm.incidentTypeId,
          student_id: incidentForm.studentId,
          situation: incidentForm.situation || null,
          action: incidentForm.action || null,
          follow_up: incidentForm.follow_up || null,
          created_by: user?.id ?? null,
          teacher_id: teacherIdTutor ?? user?.id ?? null,
          group_id: groupId,
        })
        .select()
        .single()
      if (incidentError) throw incidentError
      if (incidentForm.observation?.trim() && user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (profile?.id) {
          await supabase.from('incident_observations').insert({
            incident_id: newIncident.id,
            user_id: profile.id,
            comment: incidentForm.observation.trim(),
          })
        }
      }
      setSuccessMessage('Incidencia creada.')
      setPageSuccessMessage('Incidencia creada.')
      setIncidentsRefresh((r) => r + 1)
      setTimeout(() => {
        handleCloseCreateModal()
        setTimeout(() => setPageSuccessMessage(null), 4000)
      }, 1500)
    } catch (err) {
      setErrorMessage?.(err?.message ?? 'Error al crear el incidente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectIncident = (id) => {
    const incident = incidents.find((i) => i.id === id)
    if (incident) {
      setSelectedIncidentId(id)
      setSelectedIncident(incident)
    }
  }

  if (loadingData) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Cargando grupos y alumnos...
      </div>
    )
  }
  if (dataError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
        {dataError}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[180px]">
          <label htmlFor="docente-incidencias-group" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filtrar por grupo
          </label>
          <Select
            id="docente-incidencias-group"
            value={filterGroupId}
            onChange={(e) => setFilterGroupId(e.target.value)}
            options={[
              { value: '', label: 'Todos los grupos' },
              ...groups.map((g) => ({
                value: g.id,
                label: tutorGroupId === g.id ? `${g.nomenclature} (mi grupo tutorado)` : g.nomenclature,
              })),
            ]}
          />
        </div>
        <div className="min-w-[200px]">
          <label htmlFor="docente-incidencias-control" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número de control
          </label>
          <Input
            id="docente-incidencias-control"
            type="text"
            placeholder="Ej. 2024001"
            value={filterControlNumber}
            onChange={(e) => setFilterControlNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col min-h-[400px]">
        {pageSuccessMessage && (
          <Alert type="success" message={pageSuccessMessage} className="mb-4" />
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Incidentes ({incidents.length})
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tutorGroupId
                ? 'Se muestran incidencias donde eres tutor del alumno o las creaste tú.'
                : 'Solo se muestran las incidencias que tú creaste (alumnos de tus grupos).'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Crear incidencia
          </button>
        </div>
        {incidentsLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando incidentes...</div>
        ) : studentIdsFilter.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              No hay alumnos en los grupos seleccionados. Ajusta los filtros o verifica tus grupos asignados.
            </p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              {tutorGroupId
                ? 'No hay incidencias donde seas tutor o que hayas creado tú.'
                : 'No hay incidencias creadas por ti en los grupos seleccionados.'}
            </p>
          </div>
        ) : (
          <SimpleTable
            columns={incidentTableColumns}
            data={incidents}
            selectedId={selectedIncidentId}
            onSelect={handleSelectIncident}
            loading={false}
            maxHeight="400px"
            collapsible
            title="Lista de Incidentes"
            itemKey="id"
          />
        )}

        {selectedIncidentId && selectedIncident && (
          <DetailView
            selectedItem={selectedIncident}
            title={`Incidente: ${selectedIncident.incident_types?.name || 'Sin tipo'}`}
            tabs={[
              { id: 'overview', label: 'Detalles' },
              { id: 'student', label: 'Alumno' },
              { id: 'observations', label: 'Observaciones', badge: selectedIncident.observations?.length > 0 ? selectedIncident.observations.length : undefined },
            ]}
            defaultTab="overview"
            collapsible
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Información del Incidente</h3>
                        <div className="space-y-2">
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.incident_types?.name || '-'} {item.incident_types?.code && `(${item.incident_types.code})`}</p></div>
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Categoría:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.incident_types?.category || '-'}</p></div>
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.created_at ? new Date(item.created_at).toLocaleString('es-MX') : '-'}</p></div>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Detalles</h3>
                        <div className="space-y-2">
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Situación:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.situation || '-'}</p></div>
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Acción:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.action || '-'}</p></div>
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Seguimiento:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.follow_up || '-'}</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Contactos</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Creado por (docente/orientador)</p>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{item.creator ? `${formatProfile(item.creator)}${item.creator.email ? ` · ${item.creator.email}` : ''}` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tutor del alumno</p>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{item.tutor ? `${formatProfile(item.tutor)}${item.tutor.email ? ` · ${item.tutor.email}` : ''}` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              if (tab === 'student') {
                return (
                  <div className="space-y-4">
                    {item.student ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Información del Alumno</h3>
                        <div className="space-y-2">
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{`${item.student.first_name || ''} ${item.student.paternal_last_name || ''} ${item.student.maternal_last_name || ''}`.trim() || '-'}</p></div>
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Número de Control:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.student.control_number || '-'}</p></div>
                          <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.student.email || '-'}</p></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay información del alumno disponible.</p>
                    )}
                  </div>
                )
              }
              if (tab === 'observations') {
                return (
                  <div className="space-y-4">
                    {item.observations?.length > 0 ? (
                      <div className="space-y-3">
                        {item.observations.map((obs) => (
                          <div key={obs.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {obs.user ? `${(obs.user.first_name || '').trim()} ${(obs.user.last_name || '').trim()}`.trim() || obs.user.email || 'Usuario' : 'Usuario'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{obs.created_at ? new Date(obs.created_at).toLocaleString('es-MX') : '-'}</p>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{obs.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay observaciones registradas.</p>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Crear incidencia"
        size="xl"
      >
        <form onSubmit={handleCreateIncident} className="space-y-6">
          {successMessage && <Alert type="success" message={successMessage} />}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Alumno (solo de tus grupos)</h3>
            <Select
              value={createModalGroupFilter}
              onChange={(e) => setCreateModalGroupFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los grupos' },
                ...groups.map((g) => ({
                  value: g.id,
                  label: tutorGroupId === g.id ? `${g.nomenclature} (tutorado)` : g.nomenclature,
                })),
              ]}
            />
            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-200 dark:divide-slate-700">
              {studentsForCreateModal.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No hay alumnos en los grupos seleccionados.</div>
              ) : (
                studentsForCreateModal.map((item) => (
                  <button
                    key={item.student?.id}
                    type="button"
                    onClick={() => handleSelectStudentForIncident(item)}
                    className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedStudentForIncident?.id === item.student?.id
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-600'
                        : ''
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {`${item.student?.first_name || ''} ${item.student?.paternal_last_name || ''} ${item.student?.maternal_last_name || ''}`.trim()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.student?.control_number} {item.group && `• ${item.group.nomenclature}`}
                    </div>
                  </button>
                ))
              )}
            </div>
            {selectedStudentForIncident && (
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Alumno: {selectedStudentForIncident.first_name} {selectedStudentForIncident.paternal_last_name}
              </p>
            )}
          </div>
          <div className="space-y-4 border-t border-gray-200 dark:border-slate-700 pt-4">
            <FormField label="Tipo de incidente *" htmlFor="incident_type">
              <Select
                id="incident_type"
                value={incidentForm.incidentTypeId}
                onChange={(e) => setIncidentForm((prev) => ({ ...prev, incidentTypeId: e.target.value }))}
                options={[
                  { value: '', label: 'Selecciona un tipo' },
                  ...incidentTypes.map((t) => ({ value: t.id, label: `${t.name}${t.code ? ` (${t.code})` : ''}` })),
                ]}
                required
              />
            </FormField>
            <FormField label="Situación" htmlFor="situation">
              <Textarea
                id="situation"
                value={incidentForm.situation}
                onChange={(e) => setIncidentForm((prev) => ({ ...prev, situation: e.target.value }))}
                rows={3}
                placeholder="Describe la situación..."
              />
            </FormField>
            <FormField label="Acción" htmlFor="action">
              <Textarea
                id="action"
                value={incidentForm.action}
                onChange={(e) => setIncidentForm((prev) => ({ ...prev, action: e.target.value }))}
                rows={3}
                placeholder="Acción tomada..."
              />
            </FormField>
            <FormField label="Seguimiento" htmlFor="follow_up">
              <Textarea
                id="follow_up"
                value={incidentForm.follow_up}
                onChange={(e) => setIncidentForm((prev) => ({ ...prev, follow_up: e.target.value }))}
                rows={3}
                placeholder="Seguimiento..."
              />
            </FormField>
            <FormField label="Observación (opcional)" htmlFor="observation">
              <Textarea
                id="observation"
                value={incidentForm.observation}
                onChange={(e) => setIncidentForm((prev) => ({ ...prev, observation: e.target.value }))}
                rows={2}
                placeholder="Observación inicial..."
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !incidentForm.studentId || !incidentForm.incidentTypeId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creando...' : 'Crear incidencia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
