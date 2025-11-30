/**
 * Componente de header de página reutilizable
 * @param {string} title - Título de la página
 * @param {string} description - Descripción opcional
 * @param {'default' | 'dashboard'} variant - Variante del header (default usa text-2xl sm:text-3xl, dashboard usa text-2xl sm:text-3xl md:text-4xl)
 */
export default function PageHeader({ title, description, variant = 'default' }) {
  const titleClasses =
    variant === 'dashboard'
      ? 'text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white'
      : 'text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'

  const containerClasses =
    variant === 'dashboard'
      ? 'flex flex-col gap-2'
      : 'mb-6'

  return (
    <header className={containerClasses}>
      {title && <h1 className={titleClasses}>{title}</h1>}
      {description && (
        <p className={`text-sm sm:text-base text-gray-600 dark:text-gray-300 ${variant === 'dashboard' ? '' : 'mt-2'}`}>
          {description}
        </p>
      )}
    </header>
  )
}

