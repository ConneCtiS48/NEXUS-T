# Documentación de NEXUS-T

Sistema de gestión escolar para control de grupos, docentes, estudiantes e incidentes.

## 📚 Índice de Documentación

### Documentación Principal (NUEVA)

1. **[01-DATABASE.md](./01-DATABASE.md)** - Base de Datos y Acceso a Datos
   - Estructura de la base de datos
   - Configuración de Supabase
   - Patrones de acceso a datos (Services, Hooks)
   - Relaciones importantes
   - Buenas prácticas

2. **[02-UI-COMPONENTS.md](./02-UI-COMPONENTS.md)** - UI y Componentes
   - Estructura de componentes
   - Componentes reutilizables (base, layout, forms, data)
   - TailwindCSS y dark mode
   - Layout estándar de página
   - Estándares de diseño

3. **[03-STACK.md](./03-STACK.md)** - Stack Tecnológico y Estructura
   - Stack principal (React, Vite, Tailwind, Supabase)
   - Estructura del proyecto
   - Arquitectura de la aplicación
   - Módulos y rutas
   - Configuración
   - Convenciones de código

4. **[04-WORKFLOW.md](./04-WORKFLOW.md)** - Workflow de Desarrollo
   - Metodología de trabajo (desarrollo por página)
   - Sub-features y commits graduales
   - Formato de commits
   - Git flow
   - Buenas prácticas

### Documentación Legacy (Para Referencia)

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Guía de configuración inicial de Supabase
- **[supabase-schema-analysis.md](./supabase-schema-analysis.md)** - Análisis del schema de la BD
- **[components.md](./components.md)** - Propuesta inicial de estructura de componentes
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Resumen de implementaciones anteriores

---

## 🚀 Quick Start

### Para Nuevos Desarrolladores

1. **Leer primero:**
   - [03-STACK.md](./03-STACK.md) - Entender la arquitectura
   - [04-WORKFLOW.md](./04-WORKFLOW.md) - Cómo trabajamos

2. **Setup inicial:**
   - Clonar el repositorio
   - Instalar dependencias: `npm install`
   - Configurar `.env` según [01-DATABASE.md](./01-DATABASE.md)
   - Correr: `npm run dev`

3. **Antes de codificar:**
   - [02-UI-COMPONENTS.md](./02-UI-COMPONENTS.md) - Conocer componentes disponibles
   - [01-DATABASE.md](./01-DATABASE.md) - Entender patrón de datos

### Para Implementar una Nueva Feature

1. **Planificar** sub-features según [04-WORKFLOW.md](./04-WORKFLOW.md)
2. **Reutilizar** componentes de [02-UI-COMPONENTS.md](./02-UI-COMPONENTS.md)
3. **Seguir patrón** de [01-DATABASE.md](./01-DATABASE.md) para datos
4. **Commits graduales** según [04-WORKFLOW.md](./04-WORKFLOW.md)

---

## 📋 Archivos a Eliminar (Legacy)

Los siguientes archivos pueden eliminarse si ya no son necesarios:

- `plan-admin-iam-redesign.md` - Plan de diseño antiguo
- `plan-forms-data-components.md` - Plan de componentes antiguo
- `refactor-admin-users.md` - Refactor antiguo de AdminUsers

**Nota:** Revisar contenido antes de eliminar por si hay información útil no migrada.

---

## 🔄 Actualización de Documentación

Esta documentación debe actualizarse cuando:

- Se agreguen nuevos componentes reutilizables
- Se modifique la estructura del proyecto
- Se agreguen nuevas tablas a la BD
- Cambien las convenciones de código
- Se actualice el workflow de desarrollo

---

## 📞 Contacto

Para dudas sobre la documentación o el proyecto, contactar al equipo de desarrollo.

---

**Última actualización:** Diciembre 2025

