import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Carga grupos del docente (teacher_groups) -> miembros por grupo (group_members) -> datos de alumnos (students).
 * Para usar en Justificantes e Incidencias del docente.
 * @param {string|null} userId - auth user id del docente
 * @returns {{
 *   groups: Array<{ id, nomenclature, grade, specialty, section }>,
 *   studentIds: string[],
 *   studentsWithGroup: Array<{ student: object, group: object }>,
 *   tutorGroupId: string|null,
 *   loading: boolean,
 *   error: string|null,
 *   refetch: function
 * }}
 */
export function useDocenteGroupsAndStudents(userId) {
  const [groups, setGroups] = useState([])
  const [studentIds, setStudentIds] = useState([])
  const [studentsWithGroup, setStudentsWithGroup] = useState([])
  const [tutorGroupId, setTutorGroupId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) {
      setGroups([])
      setStudentIds([])
      setStudentsWithGroup([])
      setTutorGroupId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Grupos del docente (teacher_groups)
      const { data: tgData, error: tgError } = await supabase
        .from('teacher_groups')
        .select('group_id, is_tutor, group:groups (id, nomenclature, grade, specialty, section)')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: true })

      if (tgError) throw tgError
      const rows = tgData || []
      const groupIds = [...new Set(rows.map((r) => r.group_id))]
      const groupMap = new Map()
      let tutorId = null
      rows.forEach((r) => {
        const g = Array.isArray(r.group) ? r.group[0] : r.group
        if (g) groupMap.set(g.id, g)
        if (r.is_tutor === true) tutorId = r.group_id
      })
      setTutorGroupId(tutorId)
      setGroups(Array.from(groupMap.values()))

      if (groupIds.length === 0) {
        setStudentIds([])
        setStudentsWithGroup([])
        setLoading(false)
        return
      }

      // 2. Miembros por grupo (group_members)
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('student_id, group_id')
        .in('group_id', groupIds)

      if (membersError) throw membersError
      const members = membersData || []
      const ids = [...new Set(members.map((m) => m.student_id))]
      setStudentIds(ids)

      if (ids.length === 0) {
        setStudentsWithGroup([])
        setLoading(false)
        return
      }

      // 3. Datos de alumnos (students)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email')
        .in('id', ids)

      if (studentsError) throw studentsError
      const studentsMap = new Map((studentsData || []).map((s) => [s.id, s]))

      const withGroup = members.map((m) => ({
        student: studentsMap.get(m.student_id),
        group: groupMap.get(m.group_id),
      })).filter((x) => x.student && x.group)
      setStudentsWithGroup(withGroup)
    } catch (err) {
      console.error('useDocenteGroupsAndStudents:', err)
      setError(err?.message || 'Error al cargar grupos y alumnos.')
      setGroups([])
      setStudentIds([])
      setStudentsWithGroup([])
      setTutorGroupId(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    groups,
    studentIds,
    studentsWithGroup,
    tutorGroupId,
    loading,
    error,
    refetch: fetch,
  }
}
