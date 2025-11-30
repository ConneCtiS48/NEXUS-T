/**
 * Componente FormActions para botones de acción de formularios
 */
export default function FormActions({
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
  loading = false,
  disabled = false,
  primaryVariant = 'primary',
  className = '',
}) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50',
    success: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/50',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50',
  }

  return (
    <div className={`flex gap-3 ${className}`}>
      <button
        type="button"
        onClick={onPrimaryClick}
        disabled={loading || disabled}
        className={`px-4 py-2 text-white font-semibold rounded-lg focus:outline-none focus:ring-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[primaryVariant]}`}
      >
        {loading ? 'Guardando...' : primaryLabel}
      </button>
      {secondaryLabel && onSecondaryClick && (
        <button
          type="button"
          onClick={onSecondaryClick}
          disabled={loading || disabled}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  )
}

