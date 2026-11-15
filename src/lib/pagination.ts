export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 10

export function parsePage(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 1
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}

export function parsePageSize(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : DEFAULT_PAGE_SIZE
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE
}

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (parsePage(page) - 1) * parsePageSize(pageSize)
  return items.slice(start, start + parsePageSize(pageSize))
}
