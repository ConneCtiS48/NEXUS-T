import { useState, useRef, useEffect } from 'react'

/**
 * Componente de menú de acciones estilo AWS Console
 * Se muestra fuera de la tabla y se activa cuando hay un item seleccionado
 */
export default function ActionMenu({
  selectedId,
  actions = [],
  disabled = false,
  className = '',
  buttonLabel = 'Acciones',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleAction = (action, event) => {
    event.stopPropagation()
    if (action.onClick && selectedId) {
      action.onClick(selectedId)
      setIsOpen(false)
    }
  }

  const isDisabled = disabled || !selectedId || actions.length === 0

  if (actions.length === 0) return null

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-colors
          ${isDisabled
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }
        `}
        aria-label={buttonLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {buttonLabel}
        <svg
          className={`inline-block ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && !isDisabled && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {actions.map((action, index) => {
              const isDanger = action.variant === 'danger'
              return (
                <button
                  key={index}
                  onClick={(e) => handleAction(action, e)}
                  className={`
                    w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors
                    ${isDanger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  role="menuitem"
                >
                  {action.icon && <span>{action.icon}</span>}
                  <span>{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

