/**
 * Safe query parameter utilities
 * Prevents SQL injection and validates user input
 */

import { OrderStatus, TaskStatus, TaskPriority } from '@/lib/generated/prisma'

/**
 * Allowed sort columns for orders
 */
const ALLOWED_ORDER_SORT_COLUMNS = [
  'orderNumber',
  'deliveryDate',
  'createdAt',
  'orderDate',
  'amount',
  'status',
  'customerName',
] as const

type OrderSortColumn = typeof ALLOWED_ORDER_SORT_COLUMNS[number]

/**
 * Allowed sort columns for tasks
 */
const ALLOWED_TASK_SORT_COLUMNS = [
  'title',
  'priority',
  'status',
  'deadline',
  'createdAt',
  'startedAt',
  'completedAt',
] as const

type TaskSortColumn = typeof ALLOWED_TASK_SORT_COLUMNS[number]

/**
 * Sort direction
 */
const SORT_DIRECTIONS = ['asc', 'desc'] as const
type SortDirection = typeof SORT_DIRECTIONS[number]

/**
 * Validate and sanitize order sort column
 * Returns validated column or default value
 */
export function validateOrderSortColumn(column: unknown): OrderSortColumn {
  if (
    typeof column === 'string' &&
    ALLOWED_ORDER_SORT_COLUMNS.includes(column as OrderSortColumn)
  ) {
    return column as OrderSortColumn
  }
  return 'deliveryDate' // Default
}

/**
 * Validate and sanitize task sort column
 * Returns validated column or default value
 */
export function validateTaskSortColumn(column: unknown): TaskSortColumn {
  if (
    typeof column === 'string' &&
    ALLOWED_TASK_SORT_COLUMNS.includes(column as TaskSortColumn)
  ) {
    return column as TaskSortColumn
  }
  return 'deadline' // Default
}

/**
 * Validate sort direction
 */
export function validateSortDirection(direction: unknown): SortDirection {
  if (
    typeof direction === 'string' &&
    SORT_DIRECTIONS.includes(direction as SortDirection)
  ) {
    return direction as SortDirection
  }
  return 'asc' // Default
}

/**
 * Validate order status
 */
export function validateOrderStatus(status: unknown): OrderStatus | undefined {
  if (typeof status === 'string' && status in OrderStatus) {
    return status as OrderStatus
  }
  return undefined
}

/**
 * Validate task status
 */
export function validateTaskStatus(status: unknown): TaskStatus | undefined {
  if (typeof status === 'string' && status in TaskStatus) {
    return status as TaskStatus
  }
  return undefined
}

/**
 * Validate task priority
 */
export function validateTaskPriority(priority: unknown): TaskPriority | undefined {
  if (typeof priority === 'string' && priority in TaskPriority) {
    return priority as TaskPriority
  }
  return undefined
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  page?: unknown
  limit?: unknown
}): { page: number; limit: number } {
  let page = 1
  let limit = 20

  if (typeof params.page === 'string') {
    const parsed = parseInt(params.page, 10)
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed
    }
  } else if (typeof params.page === 'number' && params.page > 0) {
    page = params.page
  }

  if (typeof params.limit === 'string') {
    const parsed = parseInt(params.limit, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      limit = parsed
    }
  } else if (typeof params.limit === 'number' && params.limit > 0 && params.limit <= 100) {
    limit = params.limit
  }

  return { page, limit }
}

/**
 * Validate CUID (Prisma ID format)
 */
export function isValidCuid(value: unknown): boolean {
  if (typeof value !== 'string') return false
  // Basic CUID format check (starts with 'c' and contains alphanumeric)
  return /^c[a-z0-9]{24}$/i.test(value)
}

/**
 * Validate UUID (for Supabase user IDs)
 */
export function isValidUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Safe order by clause builder
 */
export function buildOrderBy<T extends OrderSortColumn | TaskSortColumn>(
  column: T,
  direction: SortDirection = 'asc'
): { [key: string]: SortDirection } {
  return { [column]: direction }
}

/**
 * Sanitize search query
 * Removes special characters that could be used for injection
 */
export function sanitizeSearchQuery(query: unknown): string {
  if (typeof query !== 'string') return ''
  
  // Remove any potential SQL/NoSQL injection characters
  return query
    .trim()
    .replace(/[;'"\\]/g, '') // Remove quotes, semicolons, backslashes
    .substring(0, 255) // Limit length
}

/**
 * Build safe WHERE clause for search
 */
export function buildSearchWhere(
  searchQuery: string,
  searchFields: string[]
): { OR: Array<{ [key: string]: { contains: string; mode: 'insensitive' } }> } | {} {
  const sanitized = sanitizeSearchQuery(searchQuery)
  
  if (!sanitized) return {}
  
  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: sanitized,
        mode: 'insensitive' as const,
      },
    })),
  }
}
