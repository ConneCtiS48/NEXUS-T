# UI y Componentes

## Stack de UI

- **React 19**
- **TailwindCSS 4** (con modo oscuro)
- **React Router DOM** para navegación
- **Vite** como bundler

## Estructura de Componentes

```
src/components/
├── base/              # Componentes base reutilizables
├── layout/            # Componentes de estructura/layout
├── forms/             # Componentes de formularios
├── data/              # Componentes para manejo de datos
└── admin/             # Componentes específicos de admin (estilo AWS Console)
```

### Base (`components/base/`)

Componentes fundamentales reutilizables:

#### Alert
Mensajes de éxito/error/advertencia

```jsx
<Alert type="error" message="Error al guardar" />
<Alert type="success" message="Guardado correctamente" />
```

#### Modal
Modal reutilizable con dark mode

```jsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Título del Modal"
  size="lg" // sm, md, lg, xl, full
>
  <div>Contenido del modal</div>
</Modal>
```

### Layout (`components/layout/`)

Componentes de estructura visual:

#### PageHeader
Encabezado estándar de página

```jsx
<PageHeader
  title="Gestión de Grupos"
  description="Administra grupos, sus miembros y asignaturas."
/>
```

#### Section
Sección con fondo y bordes

```jsx
<Section title="Información">
  <div>Contenido</div>
</Section>
```

#### CollapsibleSection
Sección que se puede colapsar/expandir

```jsx
<CollapsibleSection
  title="Detalles"
  collapsed={collapsed}
  onToggle={setCollapsed}
>
  <div>Contenido colapsable</div>
</CollapsibleSection>
```

### Forms (`components/forms/`)

Componentes de formularios consistentes:

#### Input
Input con estilos y manejo de errores

```jsx
<Input
  type="text"
  name="nombre"
  value={formData.nombre}
  onChange={handleChange}
  placeholder="Ingresa el nombre"
  required
  error={errors.nombre}
/>
```

#### Select
Select con estilos consistentes

```jsx
<Select
  name="rol"
  value={formData.rol}
  onChange={handleChange}
  options={[
    { value: '', label: 'Seleccionar...' },
    { value: '1', label: 'Admin' },
    { value: '2', label: 'Docente' },
  ]}
  required
/>
```

#### FormField
Wrapper con label y error

```jsx
<FormField label="Nombre" htmlFor="nombre" required error={errors.nombre}>
  <Input
    name="nombre"
    value={formData.nombre}
    onChange={handleChange}
  />
</FormField>
```

#### FormRow
Grid responsive para campos lado a lado

```jsx
<FormRow columns={2}>
  <FormField label="Nombre" htmlFor="nombre" required>
    <Input name="nombre" value={formData.nombre} onChange={handleChange} />
  </FormField>
  <FormField label="Apellido" htmlFor="apellido" required>
    <Input name="apellido" value={formData.apellido} onChange={handleChange} />
  </FormField>
</FormRow>
```

### Data (`components/data/`)

Componentes para visualización de datos:

#### SimpleTable
Tabla con selección por radio button (estilo AWS)

```jsx
<SimpleTable
  columns={[
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
  ]}
  data={users}
  selectedId={selectedId}
  onSelect={handleSelect}
  loading={loading}
  maxHeight="500px"
  collapsible={true}
  title="Lista de Usuarios"
/>
```

#### DetailView
Panel de detalles con tabs

```jsx
<DetailView
  selectedItem={selectedUser}
  title={`Detalles: ${selectedUser.name}`}
  tabs={[
    { id: 'overview', label: 'Resumen' },
    { id: 'roles', label: 'Roles', badge: 3 },
  ]}
  defaultTab="overview"
  renderContent={(item, tab) => {
    if (tab === 'overview') {
      return <div>Detalles del usuario</div>
    }
    // ...
  }}
/>
```

#### ActionMenu
Menú de acciones estilo AWS Console

```jsx
<ActionMenu
  selectedId={selectedId}
  actions={[
    {
      label: 'Editar',
      icon: '✏️',
      onClick: (id) => handleEdit(id),
    },
    {
      label: 'Eliminar',
      icon: '🗑️',
      variant: 'danger',
      onClick: (id) => handleDelete(id),
    },
  ]}
  disabled={submitting}
/>
```

## TailwindCSS

### Modo Oscuro

Todos los componentes soportan dark mode:

```jsx
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
  Contenido
</div>
```

### Clases Comunes

```css
/* Contenedores */
max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10

/* Tarjetas */
bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-4

/* Botones primarios */
px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500

/* Botones secundarios */
px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300

/* Botones peligro */
px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700

/* Inputs */
w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500
```

## Layout Estándar de Página

### Estructura Recomendada

```jsx
export default function AdminEntity() {
  const {
    entities,
    selectedEntity,
    loading,
    error,
    // ... hooks
  } = useAdminEntity()

  // Estados de UI
  const [selectedId, setSelectedId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <PageHeader
        title="Título de la Página"
        description="Descripción breve"
      />

      {/* Alertas */}
      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Contenido principal */}
      <div className="space-y-4">
        {/* Tabla con acciones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Entidades ({entities.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu selectedId={selectedId} actions={[...]} />
              <button onClick={handleCreate}>Crear Nuevo</button>
            </div>
          </div>
          
          <SimpleTable
            columns={columns}
            data={entities}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
          />
        </div>

        {/* Panel de detalles */}
        {selectedId && (
          <DetailView
            selectedItem={selectedEntity}
            title="Detalles"
            tabs={tabs}
            renderContent={(item, tab) => {
              // Renderizar contenido por tab
            }}
          />
        )}
      </div>

      {/* Modales */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        {/* Formulario */}
      </Modal>
    </div>
  )
}
```

## Estándares de Diseño

### Colores

- **Primario:** Blue (600, 700)
- **Éxito:** Green (600, 700)
- **Peligro:** Red (600, 700)
- **Advertencia:** Yellow (600, 700)
- **Neutro:** Gray (varios tonos)
- **Fondo claro:** White / Gray-50
- **Fondo oscuro:** Slate-900 / Gray-800

### Espaciado

- **Padding contenedor:** `px-4 sm:px-6 py-6 sm:py-10`
- **Espaciado entre elementos:** `space-y-4` o `gap-4`
- **Padding interno:** `p-4` o `p-6`

### Tipografía

- **Títulos principales:** `text-2xl font-bold`
- **Subtítulos:** `text-lg font-semibold`
- **Etiquetas:** `text-sm font-medium`
- **Texto normal:** `text-sm` o `text-base`
- **Texto pequeño:** `text-xs`

### Responsive

- Mobile first
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## Buenas Prácticas

1. **Reutilizar componentes** existentes antes de crear nuevos
2. **Usar FormRow y FormField** para formularios consistentes
3. **Dark mode** en todos los componentes nuevos
4. **PageHeader** en todas las páginas
5. **Alert** para mensajes de éxito/error
6. **Modal** para formularios y confirmaciones
7. **SimpleTable + DetailView** para listados con detalles
8. **ActionMenu** para acciones sobre elementos seleccionados
9. **Estados de loading** visibles al usuario
10. **Manejo de errores** con mensajes claros

## Ejemplo Completo

Ver: `src/pages/admin/AdminGroups.jsx`

