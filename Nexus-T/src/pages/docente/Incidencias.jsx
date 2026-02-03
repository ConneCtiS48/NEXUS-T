import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useDocenteGroupsAndStudents } from '../../hooks/useDocenteGroupsAndStudents'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'

const incidentTableColumns = [
  { key: 'created_at', label: 'Fecha', render: (v) => (v ? new Date(v).toLocaleDateString('es-MX') : '-') },
  { key: 'incident_types', label: 'Tipo', render: (v) => v?.name || '-' },
  {
    key: 'student',
    label: 'Alumno',
    render: (v) => (v ? `${v.first_name || ''} ${v.paternal_last_name || ''} ${v.maternal_last_name || ''}`.trim() || '-' : '-'),
  },
  { key: 'student', label: 'No. Control', render: (v) => (v?.control_number ?? '-') },
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

  useEffect(() => {
    if (!user?.id || studentIdsFilter.length === 0) {
      setIncidents([])
      return
    }
    let cancelled = false
    setIncidentsLoading(true)
    const query = supabase
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
      .or(`created_by.eq.${user.id},teacher_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    query
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setErrorMessage?.(error.message)
          setIncidents([])
        } else {
          setIncidents(data || [])
        }
      })
      .finally(() => {
        if (!cancelled) setIncidentsLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id, studentIdsFilter, setErrorMessage])

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
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Incidentes ({incidents.length})
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Solo se muestran incidentes que creaste o en los que eres el tutor del alumno.
          </p>
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
              No hay incidentes que cumplan los criterios (creados por ti o donde eres tutor del alumno).
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
    </div>
  )
}
