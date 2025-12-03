# NEXUS-T

Sistema de gestión escolar para control de grupos, docentes, estudiantes e incidentes.

## 🚀 Stack Tecnológico

- **Frontend:** React 19 + Vite 7
- **Estilos:** TailwindCSS 4 (con dark mode)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Routing:** React Router DOM 7

## 📁 Estructura del Proyecto

```
Nexus-T/
├── docs/                 # Documentación completa
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── contexts/        # React Contexts
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Páginas/Vistas
│   ├── services/        # Acceso a datos (Supabase)
│   └── lib/             # Configuración
└── supabase/            # Scripts SQL
```

## 📚 Documentación

Ver **[`docs/README.md`](./docs/README.md)** para documentación completa.

### Documentos Principales

1. **[Database](./docs/01-DATABASE.md)** - Estructura de BD y acceso a datos
2. **[UI Components](./docs/02-UI-COMPONENTS.md)** - Componentes y estándares de UI
3. **[Stack](./docs/03-STACK.md)** - Arquitectura y estructura del proyecto
4. **[Workflow](./docs/04-WORKFLOW.md)** - Proceso de desarrollo y Git

## ⚙️ Setup

### 1. Instalación

```bash
npm install
```

### 2. Configuración

Crear archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key_aqui
VITE_ALLOW_SIGNUP=false
```

Ver [docs/01-DATABASE.md](./docs/01-DATABASE.md) para más detalles.

### 3. Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

## 🏗️ Scripts Disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build para producción
npm run preview   # Preview del build
npm run lint      # Linter
```

## 👥 Módulos de la Aplicación

- **Admin** (`/admin`) - Gestión de usuarios, grupos, roles, asignaturas
- **Docente** (`/docente`) - Ver grupos, registrar incidentes
- **Tutor** (`/tutor`) - Gestión de grupo asignado
- **Orientación** (`/orientacion`) - Vista general, reportes

## 🔐 Autenticación

Sistema de autenticación basado en Supabase Auth:

- Inicio de sesión: `/signin`
- Rutas protegidas por rol
- Context de autenticación global

## 🎨 Componentes Reutilizables

El proyecto incluye componentes reutilizables organizados en:

- **base/** - Alert, Modal
- **layout/** - PageHeader, Section, CollapsibleSection
- **forms/** - Input, Select, FormField, FormRow
- **data/** - SimpleTable, DetailView, ActionMenu, CsvImporter

Ver [docs/02-UI-COMPONENTS.md](./docs/02-UI-COMPONENTS.md) para detalles.

## 📦 Dependencias Principales

- `@supabase/supabase-js` - Cliente de Supabase
- `react` & `react-dom` - Framework UI
- `react-router-dom` - Routing
- `tailwindcss` - Estilos

## 🤝 Contribuir

1. Leer [docs/04-WORKFLOW.md](./docs/04-WORKFLOW.md)
2. Crear branch para feature (opcional)
3. Commits graduales y descriptivos
4. Push frecuente
5. Seguir convenciones del proyecto

## 📝 Convenciones

- **Componentes:** PascalCase (`.jsx`)
- **Hooks:** camelCase con `use` prefix (`.js`)
- **Services:** camelCase con `Service` suffix (`.js`)
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)

Ver [docs/03-STACK.md](./docs/03-STACK.md) para todas las convenciones.

## 📖 Más Información

- **Documentación completa:** [`docs/`](./docs/)
- **Configuración Supabase:** [docs/01-DATABASE.md](./docs/01-DATABASE.md)
- **Guía de componentes:** [docs/02-UI-COMPONENTS.md](./docs/02-UI-COMPONENTS.md)

---

**NEXUS-T** - Sistema de Gestión Escolar
