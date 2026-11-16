import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

type TablePaginationProps = {
  page: number
  pageSize: number
  totalRows: number
  pageSizeOptions?: number[]
  itemLabel?: string
  showPageSize?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function TablePagination({
  page,
  pageSize,
  totalRows,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'items',
  showPageSize = true,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const canGoBack = safePage > 1
  const canGoForward = safePage < pageCount

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 sm:flex-row">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        {showPageSize ? (
          <Select
            size="sm"
            className="w-fit"
            aria-label={`${itemLabel} per page`}
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange?.(Number(event.target.value))
            }
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </Select>
        ) : null}
        <span className="text-foreground-secondary text-sm">
          Page {safePage} of {pageCount}
        </span>
        <span className="text-foreground-secondary text-sm">
          {totalRows.toLocaleString()} {itemLabel}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          square
          aria-label="First page"
          disabled={!canGoBack}
          onClick={() => onPageChange(1)}
        >
          <CaretDoubleLeftIcon />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          square
          aria-label="Previous page"
          disabled={!canGoBack}
          onClick={() => onPageChange(safePage - 1)}
        >
          <CaretLeftIcon />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          square
          aria-label="Next page"
          disabled={!canGoForward}
          onClick={() => onPageChange(safePage + 1)}
        >
          <CaretRightIcon />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          square
          aria-label="Last page"
          disabled={!canGoForward}
          onClick={() => onPageChange(pageCount)}
        >
          <CaretDoubleRightIcon />
        </Button>
      </div>
    </div>
  )
}
