import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocenteGroupsAndStudents } from '../../hooks/useDocenteGroupsAndStudents'
import Justificantes from '../justificantes/Justificantes'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'

export default function DocenteJustificantes(props) {
  const { user } = useAuth()
  const { groups, studentsWithGroup, tutorGroupId, loading: loadingData, error: dataError } = useDocenteGroupsAndStudents(user?.id ?? null)
  const [filterGroupId, setFilterGroupId] = useState('')
  const [filterControlNumber, setFilterControlNumber] = useState('')

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
          <label htmlFor="docente-justificantes-group" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filtrar por grupo
          </label>
          <Select
            id="docente-justificantes-group"
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
          <label htmlFor="docente-justificantes-control" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número de control
          </label>
          <Input
            id="docente-justificantes-control"
            type="text"
            placeholder="Ej. 2024001"
            value={filterControlNumber}
            onChange={(e) => setFilterControlNumber(e.target.value)}
          />
        </div>
      </div>
      <Justificantes
        {...props}
        readOnly={true}
        studentIdsFilter={studentIdsFilter}
      />
    </div>
  )
}
