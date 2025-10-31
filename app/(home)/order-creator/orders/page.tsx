'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  ExternalLink,
  Edit,
  CheckCircle2,
  Package,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  amount: any
  orderDate: string
  deliveryDate: string
  status: string
  folderLink: string | null
  isCustomized: boolean
  completedAt: string | null
  orderType: {
    id: string
    name: string
  }
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Folder link dialog
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [folderLink, setFolderLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Deliver order dialog
  const [showDeliverDialog, setShowDeliverDialog] = useState(false)
  const [deliveryNotes, setDeliveryNotes] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
      })
      const response = await axios.get(`/api/order-creator/orders?${params}`)
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOrders()
  }

  const handleUpdateFolderLink = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      await axios.patch(`/api/order-creator/orders/${selectedOrder.id}/folder-link`, {
        folderLink,
      })
      toast.success('Folder link updated successfully')
      setShowFolderDialog(false)
      setSelectedOrder(null)
      setFolderLink('')
      fetchOrders()
    } catch (error) {
      console.error('Error updating folder link:', error)
      toast.error('Failed to update folder link')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeliverOrder = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      await axios.patch(`/api/order-creator/orders/${selectedOrder.id}/deliver`, {
        notes: deliveryNotes || undefined,
      })
      toast.success('Order marked as delivered')
      setShowDeliverDialog(false)
      setSelectedOrder(null)
      setDeliveryNotes('')
      fetchOrders()
    } catch (error: any) {
      console.error('Error delivering order:', error)
      toast.error(error.response?.data?.error || 'Failed to deliver order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      IN_PROGRESS: { variant: 'default', label: 'In Progress' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      OVERDUE: { variant: 'destructive', label: 'Overdue' },
    }
    const config = variants[status] || { variant: 'default', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">
          Manage orders you've created
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number or customer..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              No orders found
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>Order #{order.orderNumber}</CardTitle>
                      {order.isCustomized && <span className="text-primary">*</span>}
                      {getStatusBadge(order.status)}
                    </div>
                    <CardDescription>{order.orderType.name}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order)
                        setFolderLink(order.folderLink || '')
                        setShowFolderDialog(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {order.folderLink ? 'Update' : 'Add'} Folder Link
                    </Button>
                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowDeliverDialog(true)
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Deliver Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                    <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">
                      ${typeof order.amount === 'object' 
                        ? parseFloat(order.amount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : parseFloat(String(order.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">{format(new Date(order.orderDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Date</p>
                    <p className="font-medium">{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                {order.folderLink && (
                  <div className="mt-4">
                    <a
                      href={order.folderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Folder
                    </a>
                  </div>
                )}
                {order.completedAt && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Delivered on {format(new Date(order.completedAt), 'MMM d, yyyy, hh:mm a')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Folder Link Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Folder Link</DialogTitle>
            <DialogDescription>
              Add or update the folder link for this order
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Order #{selectedOrder.orderNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Folder Link (URL)
                </label>
                <Input
                  placeholder="https://..."
                  value={folderLink}
                  onChange={(e) => setFolderLink(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFolderDialog(false)
                setSelectedOrder(null)
                setFolderLink('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateFolderLink} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliver Order Dialog */}
      <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deliver Order</DialogTitle>
            <DialogDescription>
              Mark this order as delivered and completed
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Order #{selectedOrder.orderNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Delivery Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any delivery notes..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeliverDialog(false)
                setSelectedOrder(null)
                setDeliveryNotes('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleDeliverOrder} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark as Delivered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
