/**
 * Componente FormRow para crear grids de campos lado a lado
 */
export default function FormRow({
  children,
  columns = 1,
  gap = 4,
  className = '',
}) {
  const gridClasses = {
    1: 'grid grid-cols-1',
    2: 'grid grid-cols-1 sm:grid-cols-2',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`${gridClasses[columns]} gap-${gap} ${className}`}>
      {children}
    </div>
  )
}

