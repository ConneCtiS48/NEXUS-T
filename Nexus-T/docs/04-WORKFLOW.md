# Workflow de Desarrollo

## Metodología de Trabajo

### Desarrollo por Página

Trabajamos implementando funcionalidades completas por página, dividiendo el trabajo en **sub-features** para mantener commits pequeños y cambios graduales.

## Proceso de Implementación

### 1. Planificación

Antes de empezar a codificar:

1. **Identificar la página o feature** a implementar
2. **Revisar el diseño** y funcionalidad esperada
3. **Dividir en sub-features** manejables
4. **Verificar componentes** reutilizables disponibles

### 2. Sub-Features (Implementación Gradual)

Dividimos cada página en sub-features para commits más pequeños:

#### Sub-feature 1: Estructura y Estilos Base
```
- Crear archivo de la página
- Implementar PageHeader
- Definir layout básico (contenedores, spacing)
- Agregar estilos de Tailwind
- Sin funcionalidad, solo UI estática
```

**Commit:**
```bash
git add src/pages/admin/AdminEntity.jsx
git commit -m "feat(admin): estructura base de AdminEntity

- PageHeader con título y descripción
- Layout responsive con contenedores
- Estilos dark mode"

git push
```

#### Sub-feature 2: Componentes Reutilizables
```
- Integrar SimpleTable
- Agregar Modal para crear/editar
- Implementar ActionMenu
- Integrar Alert para mensajes
- Todavía sin lógica de datos
```

**Commit:**
```bash
git commit -m "feat(admin): componentes base en AdminEntity

- SimpleTable con columnas definidas
- Modal de crear/editar grupo
- ActionMenu con acciones
- Alert para éxito/error"

git push
```

#### Sub-feature 3: Service y Hook
```
- Crear entityService.js con CRUD básico
- Crear useAdminEntity.js con estados y funciones
- Sin conectar a UI todavía
```

**Commit:**
```bash
git add src/services/entityService.js src/hooks/useAdminEntity.js
git commit -m "feat(admin): service y hook para AdminEntity

Service:
- fetchAll, create, update, delete

Hook:
- estados: entities, selectedEntity, loading, error
- funciones CRUD con manejo de errores"

git push
```

#### Sub-feature 4: Conexión UI con Datos
```
- Conectar hook con componentes
- Implementar fetchAll al cargar
- Mostrar loading/error states
- Implementar selección de elemento
```

**Commit:**
```bash
git commit -m "feat(admin): conexión de datos en AdminEntity

- Fetch de entidades al cargar
- Estados de loading y error
- Selección de elemento en tabla
- Mostrar detalles en DetailView"

git push
```

#### Sub-feature 5: CRUD - Crear
```
- Implementar formulario de creación
- Validación de campos
- Manejo de errores
- Mensaje de éxito
```

**Commit:**
```bash
git commit -m "feat(admin): crear entidad en AdminEntity

- Formulario con Input y FormField
- Validación de campos requeridos
- Creación y actualización de lista
- Mensajes de éxito/error"

git push
```

#### Sub-feature 6: CRUD - Editar
```
- Implementar formulario de edición
- Cargar datos al abrir modal
- Actualizar entidad
- Refrescar lista y detalles
```

**Commit:**
```bash
git commit -m "feat(admin): editar entidad en AdminEntity

- Modal de edición con datos precargados
- Actualización de entidad
- Refresh automático de lista y detalles"

git push
```

#### Sub-feature 7: CRUD - Eliminar
```
- Implementar confirmación de eliminación
- Eliminar de BD
- Actualizar lista
- Limpiar selección si era el elemento activo
```

**Commit:**
```bash
git commit -m "feat(admin): eliminar entidad en AdminEntity

- Confirmación antes de eliminar
- Eliminación de BD
- Actualización de lista
- Limpieza de selección"

git push
```

#### Sub-feature 8: Features Adicionales
```
- Administración de relaciones (si aplica)
- Búsqueda/filtros
- Importación CSV
- Etc.
```

**Commit:**
```bash
git commit -m "feat(admin): administración de relaciones en AdminEntity

- Modal de administrar relaciones
- Búsqueda en tiempo real
- Asignación/remoción de relaciones
- Validaciones específicas"

git push
```

## Formato de Commits

### Estructura del Mensaje

```
<tipo>(<scope>): <descripción breve>

<lista de cambios>
- Cambio 1
- Cambio 2
- Cambio 3
```

### Tipos de Commit

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización sin cambio de funcionalidad
- `style`: Cambios de estilos/formato
- `docs`: Documentación
- `chore`: Tareas de mantenimiento
- `test`: Tests

### Scopes Comunes

- `admin`: Módulo de administración
- `docente`: Módulo de docentes
- `tutor`: Módulo de tutores
- `components`: Componentes reutilizables
- `services`: Capa de servicios
- `hooks`: Custom hooks
- `ui`: Cambios generales de UI

### Ejemplos de Commits

#### Feature Simple
```bash
git commit -m "feat(admin): estructura base de AdminGroups

- PageHeader con título
- Layout responsive
- Tabla básica sin datos"
```

#### Feature Completa
```bash
git commit -m "feat(admin): CRUD completo de grupos con administración

CRUD básico:
- Crear y editar grupos
- Eliminar con confirmación
- Validación de campos

Administración:
- Asignar/remover docentes
- Asignar tutor (solo uno por grupo)
- Asignar/remover asignaturas
- Asignar/remover alumnos con jefe de grupo

UI:
- Modales con búsqueda en tiempo real
- Validaciones visuales
- Mensajes de éxito/error"
```

#### Refactor
```bash
git commit -m "refactor(components): extraer lógica de tabla a hook reutilizable

- Crear useTable hook
- Mover estado de selección
- Mover lógica de paginación
- Actualizar SimpleTable para usar hook"
```

#### Fix
```bash
git commit -m "fix(admin): corregir actualización de detalles al editar

- Refrescar detalles después de editar
- Corregir race condition en fetch
- Agregar loading state durante actualización"
```

#### Docs
```bash
git commit -m "docs: agregar documentación de workflow y estructura

- 01-DATABASE.md: estructura y acceso a datos
- 02-UI-COMPONENTS.md: componentes y estándares UI
- 03-STACK.md: stack y arquitectura
- 04-WORKFLOW.md: proceso de desarrollo"
```

## Git Flow

### Branches

```
main (producción)
  └─ develop (desarrollo)
      └─ feature/nombre-feature
```

### Trabajo Diario

```bash
# 1. Asegurarse de estar en main actualizado
git checkout main
git pull

# 2. Crear branch para feature (opcional para proyectos pequeños)
git checkout -b feature/admin-groups

# 3. Hacer cambios y commits graduales
git add <archivos>
git commit -m "mensaje"
git push

# 4. Cuando la feature esté completa, merge a main
git checkout main
git merge feature/admin-groups
git push

# 5. Eliminar branch (opcional)
git branch -d feature/admin-groups
```

### Commits Frecuentes

**✅ HACER:**
- Commits pequeños y frecuentes
- Un commit por sub-feature
- Mensajes descriptivos
- Push después de cada commit funcional

**❌ NO HACER:**
- Commits gigantes con muchos cambios
- Mensajes vagos ("fix", "update", "cambios")
- Acumular muchos commits sin push
- Mezclar múltiples features en un commit

## Checklist Antes de Push

- [ ] Código funciona sin errores
- [ ] No hay errores de lint (`npm run lint`)
- [ ] No hay console.logs de debug
- [ ] Componentes reutilizables usados cuando es posible
- [ ] Dark mode funciona
- [ ] Responsive en móvil
- [ ] Mensaje de commit descriptivo
- [ ] Archivos innecesarios no incluidos

## Revisión de Código

### Auto-revisión

Antes de commit, revisar:

1. **Funcionalidad:** ¿Funciona como se espera?
2. **Reutilización:** ¿Estoy usando componentes existentes?
3. **Consistencia:** ¿Sigue el estándar del proyecto?
4. **Performance:** ¿Hay renders innecesarios?
5. **Errores:** ¿Manejo todos los casos de error?
6. **UX:** ¿Loading states? ¿Mensajes claros?

### Code Review (si aplica)

- Revisar PRs de otros desarrolladores
- Comentarios constructivos
- Verificar funcionalidad
- Verificar consistencia con estándares

## Resolución de Conflictos

```bash
# Si hay conflictos al hacer pull
git pull

# Resolver conflictos manualmente en los archivos
# Buscar marcadores: <<<<<<<, =======, >>>>>>>

# Después de resolver
git add <archivos-resueltos>
git commit -m "fix: resolver conflictos de merge"
git push
```

## Buenas Prácticas

### 1. Commits Atómicos
Cada commit debe ser una unidad lógica de cambio que funciona por sí sola.

### 2. Mensajes Descriptivos
```bash
# ❌ Mal
git commit -m "cambios"
git commit -m "fix"
git commit -m "update"

# ✅ Bien
git commit -m "feat(admin): agregar validación de email en formulario de usuarios"
git commit -m "fix(docente): corregir carga de grupos asignados"
```

### 3. Push Frecuente
```bash
# Después de cada sub-feature funcional
git push
```

### 4. Branches Limpios
```bash
# Eliminar branches locales ya mergeados
git branch -d feature/nombre

# Ver branches
git branch -a
```

### 5. Historial Limpio
```bash
# Ver historial
git log --oneline --graph

# Si necesitas modificar el último commit (antes de push)
git commit --amend
```

## Ejemplo Completo de Feature

```bash
# Feature: AdminGroups completo

# Sub-feature 1: Estructura base
git add src/pages/admin/AdminGroups.jsx
git commit -m "feat(admin): estructura base de AdminGroups

- PageHeader
- Layout responsive
- Tabla y panel de detalles (vacíos)"
git push

# Sub-feature 2: Service y Hook
git add src/services/groupsService.js src/hooks/useAdminGroups.js
git commit -m "feat(admin): service y hook para grupos

Service: fetchAll, fetchById, delete
Hook: estados y funciones básicas"
git push

# Sub-feature 3: Conexión de datos
git add src/pages/admin/AdminGroups.jsx
git commit -m "feat(admin): mostrar grupos en tabla

- Fetch al cargar
- Loading state
- Selección y detalles"
git push

# Sub-feature 4: CRUD crear/editar
git add src/services/groupsService.js src/hooks/useAdminGroups.js src/pages/admin/AdminGroups.jsx
git commit -m "feat(admin): CRUD de grupos (crear y editar)

Service: create, update
Hook: funciones CRUD
UI: modales con formularios"
git push

# Sub-feature 5: Administración completa
git add src/services/groupsService.js src/hooks/useAdminGroups.js src/pages/admin/AdminGroups.jsx
git commit -m "feat(admin): administración de docentes, asignaturas y alumnos

- Modal docentes con búsqueda y tutor
- Modal asignaturas con búsqueda
- Modal alumnos con jefe de grupo
- Validaciones y mensajes"
git push
```

## Recursos

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Semantic Versioning](https://semver.org/)

