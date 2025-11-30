import { useState } from 'react'
import SimpleTable from './SimpleTable'
import DetailView from './DetailView'

/**
 * Wrapper que organiza SimpleTable arriba y DetailView abajo
 * Coordina estados de selección y colapso
 */
export default function TableWithDetails({
  tableProps = {},
  detailProps = {},
  selectedId,
  onSelect,
  selectedItem,
  className = '',
}) {
  const [tableCollapsed, setTableCollapsed] = useState(false)
  const [detailCollapsed, setDetailCollapsed] = useState(false)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tabla arriba */}
      <SimpleTable
        {...tableProps}
        selectedId={selectedId}
        onSelect={onSelect}
        collapsible={tableProps.collapsible !== false}
        onCollapseChange={setTableCollapsed}
      />

      {/* Detalles abajo */}
      <DetailView
        {...detailProps}
        selectedItem={selectedItem}
        collapsible={detailProps.collapsible !== false}
        onCollapseChange={setDetailCollapsed}
      />
    </div>
  )
}

