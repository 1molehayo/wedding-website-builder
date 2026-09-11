import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import { flexRender } from '@tanstack/react-table'
import type { Table } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

type ColumnMeta = {
  minWidth?: number
  className?: string
}

function columnMeta(value: unknown): ColumnMeta | undefined {
  if (!value || typeof value !== 'object') return undefined
  return value
}

type TableViewProps<TData> = {
  table: Table<TData>
  className?: string
  emptyMessage?: string
  onRowClick?: (row: TData) => void
}

export function TableView<TData>({
  table,
  className,
  emptyMessage = 'No results found',
  onRowClick,
}: TableViewProps<TData>) {
  return (
    <div
      className={cn(
        'border-border overflow-x-auto rounded-xl border',
        className,
      )}
    >
      <table className="divide-border min-w-full divide-y">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = columnMeta(header.column.columnDef.meta)
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'bg-background-secondary text-foreground-secondary px-4 py-3 text-left text-xs font-medium tracking-wide whitespace-nowrap uppercase',
                      header.column.getCanSort() &&
                        'hover:text-foreground cursor-pointer select-none',
                      meta?.className,
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    style={
                      meta?.minWidth
                        ? { minWidth: `${meta.minWidth}px` }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {header.column.getCanSort() ? (
                        <span className="ml-1 flex flex-col">
                          <CaretUpIcon
                            size={10}
                            weight="bold"
                            className={
                              header.column.getIsSorted() === 'asc'
                                ? 'text-foreground opacity-100'
                                : 'opacity-30'
                            }
                          />
                          <CaretDownIcon
                            size={10}
                            weight="bold"
                            className={
                              header.column.getIsSorted() === 'desc'
                                ? 'text-foreground opacity-100'
                                : 'opacity-30'
                            }
                          />
                        </span>
                      ) : null}
                    </div>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="bg-surface divide-border divide-y">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="text-foreground-secondary px-4 py-12 text-center text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'hover:bg-foreground/2',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = columnMeta(cell.column.columnDef.meta)
                  return (
                    <td
                      key={cell.id}
                      className={cn('px-4 py-3 align-middle', meta?.className)}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            '[data-row-stop]',
                          )
                        ) {
                          event.stopPropagation()
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
