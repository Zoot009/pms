import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import type {
  Order,
  OrdersResponse,
  OrdersQueryParams,
  UpdateOrderStatusRequest,
  ExtendDeliveryRequest,
  UpdateOrderServicesRequest,
} from '@/lib/types/api'

// ============================================
// QUERY KEYS
// ============================================

export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (params: OrdersQueryParams) => [...ordersKeys.lists(), params] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchOrders(params: OrdersQueryParams & { pageParam?: number }): Promise<OrdersResponse> {
  const searchParams = new URLSearchParams({
    status: params.status || 'ALL',
    search: params.search || '',
    page: (params.pageParam || params.page || 1).toString(),
    limit: (params.limit || 20).toString(),
  })

  if (params.daysLeft && params.daysLeft !== 'all') {
    searchParams.append('daysLeft', params.daysLeft)
  }

  const response = await axios.get(`/api/orders?${searchParams}`)
  return response.data
}

async function fetchOrderById(id: string): Promise<Order> {
  const response = await axios.get(`/api/orders/${id}`)
  return response.data.order
}

async function updateOrderStatus(id: string, data: UpdateOrderStatusRequest): Promise<Order> {
  const response = await axios.patch(`/api/orders/${id}/status`, data)
  return response.data.order
}

async function extendDelivery(id: string, data: ExtendDeliveryRequest): Promise<Order> {
  const response = await axios.patch(`/api/orders/${id}/extend-delivery`, data)
  return response.data.order
}

async function updateOrderServices(id: string, data: UpdateOrderServicesRequest): Promise<Order> {
  const response = await axios.patch(`/api/orders/${id}/services`, data)
  return response.data.order
}

async function deleteOrder(id: string): Promise<void> {
  await axios.delete(`/api/orders/${id}`)
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching paginated orders with infinite scroll
 */
export function useOrders(params: OrdersQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: ordersKeys.list(params),
    queryFn: ({ pageParam = 1 }) => fetchOrders({ ...params, pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined
    },
    initialPageParam: 1,
  })
}

/**
 * Hook for fetching a single order by ID
 */
export function useOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: ordersKeys.detail(id),
    queryFn: () => fetchOrderById(id),
    enabled: enabled && !!id,
  })
}

/**
 * Hook for updating order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderStatusRequest }) =>
      updateOrderStatus(id, data),
    onSuccess: (updatedOrder) => {
      // Invalidate orders list to refetch
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() })
      // Update the specific order in cache
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
      toast.success('Order status updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update order status')
    },
  })
}

/**
 * Hook for extending delivery date
 */
export function useExtendDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExtendDeliveryRequest }) =>
      extendDelivery(id, data),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() })
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
      toast.success('Delivery date extended successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to extend delivery date')
    },
  })
}

/**
 * Hook for updating order services
 */
export function useUpdateOrderServices() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderServicesRequest }) =>
      updateOrderServices(id, data),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() })
      queryClient.setQueryData(ordersKeys.detail(updatedOrder.id), updatedOrder)
      toast.success('Order services updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update order services')
    },
  })
}

/**
 * Hook for deleting an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() })
      toast.success('Order deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete order')
    },
  })
}
