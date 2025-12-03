# Stack Tecnológico y Estructura

## Stack Principal

### Frontend
- **React 19** - Biblioteca de UI
- **Vite 7** - Bundler y dev server
- **React Router DOM 7** - Enrutamiento
- **TailwindCSS 4** - Estilos con dark mode

### Backend (BaaS)
- **Supabase** - Backend as a Service
  - PostgreSQL (Base de datos)
  - Authentication (Auth.users)
  - Row Level Security (RLS)
  - Real-time (opcional)

### Librerías
- `@supabase/supabase-js` - Cliente de Supabase
- ESLint - Linter de código

## Estructura del Proyecto

```
Nexus-T/
├── docs/                      # Documentación
│   ├── 01-DATABASE.md
│   ├── 02-UI-COMPONENTS.md
│   ├── 03-STACK.md
│   └── 04-WORKFLOW.md
│
├── public/                    # Archivos estáticos
│   └── vite.svg
│
├── src/
│   ├── assets/               # Imágenes, iconos, etc.
│   │   └── img/
│   │
│   ├── components/           # Componentes reutilizables
│   │   ├── base/            # Componentes base (Alert, Modal)
│   │   ├── layout/          # Layout (PageHeader, Section)
│   │   ├── forms/           # Formularios (Input, Select, FormField)
│   │   ├── data/            # Datos (SimpleTable, DetailView, ActionMenu)
│   │   └── admin/           # Admin específicos (SelectableTable, etc.)
│   │
│   ├── contexts/            # React Contexts
│   │   └── AuthContext.jsx # Autenticación
│   │
│   ├── data/                # Datos estáticos/mock
│   │   └── alumnos.js
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useAdminGroups.js
│   │   └── useTheme.js
│   │
│   ├── lib/                 # Configuración de librerías
│   │   ├── supabase.js     # Cliente de Supabase
│   │   └── config.js       # Configuración general
│   │
│   ├── pages/               # Páginas/Vistas
│   │   ├── admin/          # Módulo de administración
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminGroups.jsx
│   │   │   ├── AdminRoles.jsx
│   │   │   └── AdminSubjects.jsx
│   │   │
│   │   ├── docente/        # Módulo de docentes
│   │   │   ├── DocenteLayout.jsx
│   │   │   ├── DocenteDashboard.jsx
│   │   │   └── DocenteGrupo.jsx
│   │   │
│   │   ├── Home.jsx
│   │   ├── Landing.jsx
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   ├── Docente.jsx
│   │   ├── Tutor.jsx
│   │   └── Orientacion.jsx
│   │
│   ├── services/            # Capa de acceso a datos
│   │   └── groupsService.js
│   │
│   ├── App.jsx              # Componente raíz con rutas
│   ├── main.jsx            # Entry point
│   └── index.css           # Estilos globales
│
├── supabase/               # Scripts SQL de referencia
│   └── schema-visualizer.sql
│
├── .env                    # Variables de entorno (NO subir a Git)
├── .gitignore
├── eslint.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js      # Configuración de Tailwind
├── vite.config.js          # Configuración de Vite
└── README.md
```

## Arquitectura de la Aplicación

### Flujo de Datos (Unidireccional)

```
UI (Páginas)
    ↓ llama
Hooks (useAdminGroups)
    ↓ usa
Services (groupsService)
    ↓ accede
Supabase (API)
    ↓ consulta
PostgreSQL (Base de datos)
```

### Capas de la Aplicación

1. **Presentación (UI)**
   - Páginas en `src/pages/`
   - Componentes reutilizables en `src/components/`
   - Solo maneja estado de UI local (modales, formularios)

2. **Lógica de Negocio (Hooks)**
   - Custom hooks en `src/hooks/`
   - Maneja estado global de entidades
   - Orquesta llamadas a services
   - Retorna datos y funciones a componentes

3. **Acceso a Datos (Services)**
   - Services en `src/services/`
   - Única capa que habla con Supabase
   - Retorna `{ data, error }`
   - Sin lógica de negocio

4. **Backend (Supabase)**
   - Autenticación
   - Base de datos PostgreSQL
   - RLS (Row Level Security)
   - API auto-generada

## Módulos de la Aplicación

### Admin
**Ruta:** `/admin`
**Roles:** admin
**Funcionalidad:**
- Gestión de usuarios y roles
- Gestión de grupos
- Gestión de asignaturas
- Configuración del sistema

### Docente
**Ruta:** `/docente`
**Roles:** docente
**Funcionalidad:**
- Ver grupos asignados
- Registrar incidentes
- Ver alumnos por grupo

### Tutor
**Ruta:** `/tutor`
**Roles:** tutor
**Funcionalidad:**
- Ver grupo asignado como tutor
- Gestión de alumnos del grupo
- Revisión de incidentes del grupo

### Orientación
**Ruta:** `/orientacion`
**Roles:** orientacion
**Funcionalidad:**
- Ver todos los grupos
- Gestión de incidentes
- Reportes generales

## Rutas y Autenticación

### Rutas Protegidas

```jsx
// App.jsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/signin" element={<SignIn />} />
  
  <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
    <Route index element={<AdminDashboard />} />
    <Route path="users" element={<AdminUsers />} />
    <Route path="groups" element={<AdminGroups />} />
    // ...
  </Route>
  
  <Route path="/docente" element={<ProtectedRoute><DocenteLayout /></ProtectedRoute>}>
    // ...
  </Route>
</Routes>
```

### Context de Autenticación

`src/contexts/AuthContext.jsx`:
- `user` - Usuario autenticado
- `session` - Sesión de Supabase
- `loading` - Estado de carga
- `signIn()` - Iniciar sesión
- `signOut()` - Cerrar sesión

## Configuración

### Variables de Entorno

`.env` (no subir a Git):
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key
VITE_ALLOW_SIGNUP=false
```

### Tailwind Config

`tailwind.config.js`:
- Dark mode habilitado
- Colores personalizados
- Fuentes y espaciados

### Vite Config

`vite.config.js`:
- Plugin de React
- Puerto de desarrollo
- Alias de rutas (si se usan)

## Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

## Dependencias Principales

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.84.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.9.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.17",
    "@vitejs/plugin-react": "^5.1.0",
    "eslint": "^9.39.1",
    "tailwindcss": "^4.1.17",
    "vite": "^7.2.2"
  }
}
```

## Convenciones

### Nomenclatura

- **Componentes:** PascalCase (`AdminGroups.jsx`)
- **Hooks:** camelCase con prefijo `use` (`useAdminGroups.js`)
- **Services:** camelCase con sufijo `Service` (`groupsService.js`)
- **Constantes:** UPPER_SNAKE_CASE (`INITIAL_FORM`)
- **Funciones:** camelCase (`handleSubmit`)
- **Variables:** camelCase (`selectedId`)

### Archivos

- **Componentes React:** `.jsx`
- **Lógica pura:** `.js`
- **Un componente por archivo**
- **Nombre del archivo = nombre del componente**

### Imports

Orden recomendado:
1. React y hooks
2. Librerías externas
3. Contexts y hooks propios
4. Services
5. Componentes
6. Estilos (si aplica)

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAdminGroups } from '../../hooks/useAdminGroups'
import { groupsService } from '../../services/groupsService'
import SimpleTable from '../../components/data/SimpleTable'
import Modal from '../../components/base/Modal'
```

## Extensión del Proyecto

### Agregar Nueva Entidad

1. Crear tabla en Supabase
2. Configurar RLS
3. Crear service en `src/services/entityService.js`
4. Crear hook en `src/hooks/useAdminEntity.js`
5. Crear página en `src/pages/admin/AdminEntity.jsx`
6. Agregar ruta en `App.jsx`

### Agregar Nuevo Módulo

1. Crear carpeta en `src/pages/`
2. Crear Layout del módulo
3. Crear páginas del módulo
4. Agregar rutas protegidas en `App.jsx`
5. Actualizar navegación

## Testing (Futuro)

- **Vitest** para unit tests
- **Testing Library** para component tests
- **Playwright/Cypress** para E2E tests

