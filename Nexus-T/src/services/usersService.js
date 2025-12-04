import { supabase } from '../lib/supabase'

export const usersService = {
  /**
   * Obtener todos los usuarios con sus roles
   */
  async fetchAllUsers() {
    // Query 1: Obtener perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, email')
      .order('created_at', { ascending: false })

    if (profilesError) {
      return { data: [], error: profilesError }
    }

    const userIds = profiles.map((p) => p.user_id)

    // Query 2: Obtener roles de usuarios
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role_id')
      .in('user_id', userIds)

    if (rolesError) {
      return { data: [], error: rolesError }
    }

    // Query 3: Obtener información de roles
    const roleIds = [...new Set(userRoles.map((ur) => ur.role_id))]
    const { data: roles, error: rolesDataError } = await supabase
      .from('roles')
      .select('id, name')
      .in('id', roleIds)

    if (rolesDataError) {
      return { data: [], error: rolesDataError }
    }

    // Combinar datos
    const rolesMap = new Map(roles.map((r) => [r.id, r.name]))
    const userRolesMap = new Map()
    
    userRoles.forEach((ur) => {
      if (!userRolesMap.has(ur.user_id)) {
        userRolesMap.set(ur.user_id, [])
      }
      userRolesMap.get(ur.user_id).push({
        role_id: ur.role_id,
        role_name: rolesMap.get(ur.role_id) || 'Sin nombre',
      })
    })

    const usersWithRoles = profiles.map((profile) => ({
      id: profile.id,
      user_id: profile.user_id,
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      roles: userRolesMap.get(profile.user_id) || [],
      role_id: userRolesMap.get(profile.user_id)?.[0]?.role_id || '',
    }))

    return { data: usersWithRoles, error: null }
  },

  /**
   * Obtener usuario por ID
   */
  async fetchUserById(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, email')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  /**
   * Crear usuario en auth.users y user_profiles
   */
  async createUser(userData, password) {
    // Verificar si el usuario ya existe
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .eq('email', userData.email)
      .maybeSingle()

    let userId

    if (existingProfile) {
      // Si existe, actualizar perfil
      userId = existingProfile.user_id
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
        })
        .eq('id', existingProfile.id)

      if (updateError) {
        return { data: null, error: updateError }
      }
    } else {
      // Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          // Usuario existe en auth pero no en profiles
          const { data: profileCheck } = await supabase
            .from('user_profiles')
            .select('id, user_id')
            .eq('email', userData.email)
            .maybeSingle()

          if (profileCheck) {
            userId = profileCheck.user_id
          } else {
            return { data: null, error: new Error('Usuario ya existe en auth pero no se pudo obtener su ID') }
          }
        } else {
          return { data: null, error: authError }
        }
      } else if (!authData.user) {
        return { data: null, error: new Error('No se pudo crear el usuario en auth') }
      } else {
        userId = authData.user.id
      }

      // Crear perfil si userId es nuevo
      if (userId && !existingProfile) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
          })

        if (insertError && !insertError.message.includes('duplicate')) {
          return { data: null, error: insertError }
        }
      }
    }

    return { data: { user_id: userId }, error: null }
  },

  /**
   * Actualizar perfil de usuario
   */
  async updateUserProfile(profileId, userData) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
      })
      .eq('id', profileId)
      .select('id, user_id, first_name, last_name, email')
      .single()
    return { data, error }
  },

  /**
   * Eliminar usuario
   */
  async deleteUser(userId, profileId) {
    // Eliminar roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    // Eliminar perfil
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', profileId)

    return { error }
  },

  // ========== Gestión de Roles ==========

  /**
   * Obtener todos los roles
   */
  async fetchAllRoles() {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('name')
    return { data: data || [], error }
  },

  /**
   * Asignar rol a usuario
   */
  async assignUserRole(userId, roleId) {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .maybeSingle()

    if (existing) {
      return { data: existing, error: null }
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
      })
      .select('id')
      .single()

    return { data, error }
  },

  /**
   * Remover rol de usuario
   */
  async removeUserRole(userId, roleId) {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    return { error }
  },

  // ========== Gestión de Grupos ==========

  /**
   * Obtener todos los grupos
   */
  async fetchAllGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature, shift')
      .order('nomenclature')
    return { data: data || [], error }
  },

  /**
   * Obtener grupos del usuario (como docente o tutor)
   */
  async fetchUserGroups(userId) {
    // Query 1: Obtener asignaciones desde teacher_groups
    const { data: teacherGroups, error: tgError } = await supabase
      .from('teacher_groups')
      .select('id, group_id, is_tutor')
      .eq('teacher_id', userId)

    if (tgError) {
      return { data: [], error: tgError }
    }

    if (!teacherGroups || teacherGroups.length === 0) {
      return { data: [], error: null }
    }

    // Query 2: Obtener información de grupos
    const groupIds = teacherGroups.map((tg) => tg.group_id)
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature, shift')
      .in('id', groupIds)

    if (groupsError) {
      return { data: [], error: groupsError }
    }

    // Combinar datos
    const groupsMap = new Map(groups.map((g) => [g.id, g]))
    const combined = teacherGroups.map((tg) => ({
      id: tg.id,
      is_tutor: tg.is_tutor,
      group: groupsMap.get(tg.group_id),
    }))

    return { data: combined, error: null }
  },

  /**
   * Asignar usuario a grupo como docente o tutor
   */
  async assignUserToGroup(userId, groupId, isTutor = false) {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('teacher_groups')
      .select('id, is_tutor')
      .eq('teacher_id', userId)
      .eq('group_id', groupId)
      .maybeSingle()

    if (existing) {
      // Actualizar si ya existe
      const { data, error } = await supabase
        .from('teacher_groups')
        .update({ is_tutor: isTutor })
        .eq('id', existing.id)
        .select()
        .single()
      return { data, error }
    }

    // Insertar si no existe
    const { data, error } = await supabase
      .from('teacher_groups')
      .insert({
        teacher_id: userId,
        group_id: groupId,
        is_tutor: isTutor,
      })
      .select()
      .single()

    return { data, error }
  },

  /**
   * Remover usuario de grupo
   */
  async removeUserFromGroup(userId, groupId) {
    const { error } = await supabase
      .from('teacher_groups')
      .delete()
      .eq('teacher_id', userId)
      .eq('group_id', groupId)

    return { error }
  },

  /**
   * Remover usuario como tutor de todos los grupos
   */
  async removeUserAsTutor(userId) {
    const { error } = await supabase
      .from('teacher_groups')
      .delete()
      .eq('teacher_id', userId)
      .eq('is_tutor', true)

    return { error }
  },

  /**
   * Remover usuario como docente (no tutor) de todos los grupos
   */
  async removeUserAsTeacher(userId) {
    const { error } = await supabase
      .from('teacher_groups')
      .delete()
      .eq('teacher_id', userId)
      .eq('is_tutor', false)

    return { error }
  },
}

