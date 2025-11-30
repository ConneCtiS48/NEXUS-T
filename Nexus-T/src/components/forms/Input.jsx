/**
 * Componente Input reutilizable con estilos consistentes
 */
export default function Input({
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  ...props
}) {
  const baseClasses = 'w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
  const borderClasses = error
    ? 'border-red-300 dark:border-red-700'
    : 'border-gray-300 dark:border-slate-700'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <div className="w-full">
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${baseClasses} ${borderClasses} ${disabledClasses} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

