import { z } from 'zod'
import { OrderStatus, TaskPriority, TaskStatus } from '@/lib/generated/prisma'

/**
 * Validation schemas for Order-related API endpoints
 * Use these to validate incoming requests and prevent invalid data
 */

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required').max(50),
  customerName: z.string().min(1, 'Customer name is required').max(255),
  customerEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional().or(z.literal('')),
  orderTypeId: z.string().cuid('Invalid order type ID'),
  amount: z.number().positive('Amount must be positive').or(
    z.string().transform((val) => parseFloat(val))
  ),
  orderDate: z.string().datetime('Invalid order date'),
  deliveryDate: z.string().datetime('Invalid delivery date'),
  deliveryTime: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  folderLink: z.string().url('Invalid folder link').optional().or(z.literal('')),
  services: z.array(z.object({
    serviceId: z.string().cuid('Invalid service ID'),
    targetName: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
})

export const updateOrderSchema = z.object({
  orderNumber: z.string().min(1).max(50).optional(),
  customerName: z.string().min(1).max(255).optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional(),
  amount: z.number().positive().optional(),
  deliveryDate: z.string().datetime().optional(),
  deliveryTime: z.string().max(50).optional(),
  notes: z.string().optional(),
  folderLink: z.string().url().optional().or(z.literal('')),
  status: z.nativeEnum(OrderStatus).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus).refine((val) => val in OrderStatus, {
    message: 'Invalid order status',
  }),
})

export const createTaskSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
  serviceId: z.string().cuid('Invalid service ID'),
  teamId: z.string().cuid('Invalid team ID'),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default('MEDIUM'),
  deadline: z.string().datetime().optional(),
  isMandatory: z.boolean().default(false),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  deadline: z.string().datetime().optional(),
})

// Pagination and filtering schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1).or(
    z.string().transform((val) => parseInt(val, 10))
  ),
  limit: z.number().int().positive().max(100).default(20).or(
    z.string().transform((val) => parseInt(val, 10))
  ),
})

export const orderFilterSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  orderTypeId: z.string().cuid().optional(),
  search: z.string().max(255).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isRevision: z.boolean().optional().or(
    z.string().transform((val) => val === 'true')
  ),
})

// Type exports for use in API routes
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type OrderFilter = z.infer<typeof orderFilterSchema>
export type Pagination = z.infer<typeof paginationSchema>
