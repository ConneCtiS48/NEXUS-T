import { Link } from 'react-router-dom'

/**
 * Componente de tarjeta de estadística para el dashboard
 * Soporta bloques simples y bloques con desglose
 */
export default function StatCard({
  title,
  icon,
  count,
  details = [],
  link,
  loading = false,
  className = '',
}) {
  const content = (
    <div className={`p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800 ${className}`}>
      {/* Header con ícono */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        <span className="text-3xl">{icon}</span>
      </div>
      
      {/* Count principal */}
      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : (
        <>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {count}
          </p>
          
          {/* Desglose (si existe) */}
          {details.length > 0 && (
            <div className="space-y-1.5 text-sm">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    {detail.icon && <span>{detail.icon}</span>}
                    {detail.label}
                  </span>
                  <span className={`font-medium ${
                    detail.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    detail.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                    detail.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    'text-gray-900 dark:text-white'
                  }`}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Link opcional */}
      {link && !loading && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Ver todos →
          </span>
        </div>
      )}
    </div>
  )

  if (link && !loading) {
    return (
      <Link to={link} className="block hover:scale-105 transition-transform">
        {content}
      </Link>
    )
  }

  return content
}

