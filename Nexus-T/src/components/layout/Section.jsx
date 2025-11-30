/**
 * Componente de sección reutilizable con fondo blanco, sombra y bordes
 * @param {string} title - Título opcional de la sección
 * @param {React.ReactNode} children - Contenido de la sección
 * @param {string} className - Clases CSS adicionales
 */
export default function Section({ title, children, className = '' }) {
  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800 ${className}`}
    >
      {title && (
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

