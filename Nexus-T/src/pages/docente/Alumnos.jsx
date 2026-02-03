import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import SimpleTable from '../../components/data/SimpleTable'
import Input from '../../components/forms/Input'

export default function Alumnos({ setErrorMessage }) {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [controlNumberInput, setControlNumberInput] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    if (!user) return

    const fetchStudents = async () => {
      setLoading(true)
      setErrorMessage?.(null)

      try {
        const { data: teacherSubjects, error: tgsError } = await supabase
          .from('teacher_group_subjects')
          .select('group_id')
          .eq('teacher_id', user.id)

        if (tgsError) throw tgsError

        const groupIds = [...new Set((teacherSubjects || []).map((t) => t.group_id))]
        if (groupIds.length === 0) {
          setStudents([])
          setLoading(false)
          return
        }

        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select('student_id, group_id')
          .in('group_id', groupIds)

        if (membersError) throw membersError

        if (!members || members.length === 0) {
          setStudents([])
          setLoading(false)
          return
        }

        const studentIds = [...new Set(members.map((m) => m.student_id))]
        const groupIdsUsed = [...new Set(members.map((m) => m.group_id))]

        const [studentsRes, groupsRes] = await Promise.all([
          supabase
            .from('students')
            .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email')
            .in('id', studentIds),
          supabase
            .from('groups')
            .select('id, nomenclature, grade, specialty, section')
            .in('id', groupIdsUsed),
        ])

        if (studentsRes.error) throw studentsRes.error
        if (groupsRes.error) throw groupsRes.error

        const groupsMap = new Map((groupsRes.data || []).map((g) => [g.id, g]))
        const studentToGroup = new Map()
        members.forEach((m) => {
          if (!studentToGroup.has(m.student_id)) {
            studentToGroup.set(m.student_id, groupsMap.get(m.group_id) || null)
          }
        })

        const combined = (studentsRes.data || []).map((student) => ({
          ...student,
          group: studentToGroup.get(student.id) || null,
        }))

        setStudents(combined)
      } catch (err) {
        console.error('Error al cargar alumnos:', err)
        setErrorMessage?.('No se pudieron cargar los alumnos asignados.')
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [user, setErrorMessage])

  const fullName = (row) =>
    `${row.first_name || ''} ${row.paternal_last_name || ''} ${row.maternal_last_name || ''}`.trim() || '-'

  const filteredStudents = searchFilter
    ? students.filter((s) =>
        (s.control_number || '')
          .toLowerCase()
          .includes(searchFilter.toLowerCase())
      )
    : students

  const handleBuscar = () => setSearchFilter(controlNumberInput.trim())
  const handleLimpiar = () => {
    setControlNumberInput('')
    setSearchFilter('')
  }

  const tableColumns = [
    { key: 'control_number', label: 'No. Control', render: (v) => v || '-' },
    { key: 'first_name', label: 'Nombre', render: (_, row) => fullName(row) },
    { key: 'email', label: 'Email', render: (v) => v || '-' },
    { key: 'group', label: 'Grupo', render: (v) => (v?.nomenclature ? v.nomenclature : '-') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          Mis alumnos asignados ({filteredStudents.length})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Solo se muestran los alumnos de los grupos donde impartes clase.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label htmlFor="control-number-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número de control
          </label>
          <Input
            id="control-number-search"
            type="text"
            placeholder="Ej. 2024001"
            value={controlNumberInput}
            onChange={(e) => setControlNumberInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleBuscar}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Buscar
          </button>
          {searchFilter && (
            <button
              type="button"
              onClick={handleLimpiar}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Ver todos
            </button>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lista de alumnos {!loading && <span className="text-gray-500 dark:text-gray-400 font-normal">({filteredStudents.length})</span>}
          </h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando alumnos...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {searchFilter
                  ? 'No hay alumnos con ese número de control.'
                  : 'No tienes alumnos asignados en tus grupos.'}
              </p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={filteredStudents}
              selectedId={null}
              onSelect={() => {}}
              loading={false}
              maxHeight="500px"
              collapsible={false}
              itemKey="id"
            />
          )}
        </div>
      </section>
    </div>
  )
}
