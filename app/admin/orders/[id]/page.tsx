'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const orderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  deliveryDateTime: z.string().min(1, 'Delivery date and time is required'),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE']),
})

type OrderFormValues = z.infer<typeof orderSchema>

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  amount: string
  orderDate: string
  deliveryDate: string
  deliveryTime: string | null
  notes: string | null
  folderLink: string | null
  status: string
  createdAt: string
  orderType: {
    id: string
    name: string
    timeLimitDays: number
  }
  services: Array<{
    id: string
    service: {
      id: string
      name: string
      type: string
      team: { name: string } | null
      timeLimit: number | null
    }
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    service: {
      id: string
      name: string
    }
    assignedUser: {
      id: string
      displayName: string | null
      email: string
    } | null
  }>
  createdBy: {
    id: string
    displayName: string | null
    email: string
  } | null
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'PENDING', className: 'bg-yellow-100 text-yellow-800' },
    IN_PROGRESS: { label: 'IN PROGRESS', className: 'bg-blue-100 text-blue-800' },
    COMPLETED: { label: 'COMPLETED', className: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'CANCELLED', className: 'bg-red-100 text-red-800' },
    OVERDUE: { label: 'OVERDUE', className: 'bg-red-100 text-red-800' },
    NOT_ASSIGNED: { label: 'NOT ASSIGNED', className: 'bg-gray-100 text-gray-800' },
    ASSIGNED: { label: 'ASSIGNED', className: 'bg-blue-100 text-blue-800' },
  }
  
  const config = variants[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  return <Badge className={`text-xs ${config.className}`}>{config.label}</Badge>
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      amount: '',
      orderDate: '',
      deliveryDateTime: '',
      notes: '',
      status: 'PENDING',
    },
  })

  useEffect(() => {
    fetchOrder()
  }, [])

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/api/admin/orders/${params.id}`)
      const orderData = response.data
      setOrder(orderData)

      // Combine deliveryDate and deliveryTime
      const deliveryDateTime = orderData.deliveryTime
        ? `${format(new Date(orderData.deliveryDate), 'yyyy-MM-dd')}T${orderData.deliveryTime}`
        : format(new Date(orderData.deliveryDate), "yyyy-MM-dd'T'HH:mm")

      form.reset({
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail || '',
        customerPhone: orderData.customerPhone || '',
        amount: orderData.amount.toString(),
        orderDate: format(new Date(orderData.orderDate), 'yyyy-MM-dd'),
        deliveryDateTime: deliveryDateTime,
        notes: orderData.notes || '',
        status: orderData.status,
      })
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order details')
    }
  }

  const onSubmit = async (data: OrderFormValues) => {
    setIsLoading(true)
    try {
      // Split deliveryDateTime into date and time
      const [deliveryDate, deliveryTime] = data.deliveryDateTime.split('T')

      const payload = {
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        amount: parseFloat(data.amount),
        orderDate: new Date(data.orderDate).toISOString(),
        deliveryDate: new Date(deliveryDate).toISOString(),
        deliveryTime: deliveryTime,
        notes: data.notes || null,
        status: data.status,
      }

      await axios.patch(`/api/admin/orders/${params.id}`, payload)
      toast.success('Order updated successfully')
      fetchOrder() // Refresh order data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to update order')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await axios.delete(`/api/admin/orders/${params.id}`)
      toast.success('Order deleted successfully')
      router.push('/admin/orders')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to delete order')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (!order) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading order details...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">Order Type: {order.orderType.name}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Order
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the order and all associated tasks. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>Update order details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="orderDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Date & Time *</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            <SelectItem value="OVERDUE">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/admin/orders">Cancel</Link>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Tasks created for this order</CardDescription>
            </CardHeader>
            <CardContent>
              {order.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks found for this order.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.service.name}</TableCell>
                        <TableCell>
                          {task.assignedUser ? (
                            <div>
                              <div className="text-sm">
                                {task.assignedUser.displayName || 'No Name'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {task.assignedUser.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Created At</div>
                <div className="font-medium">
                  {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created By</div>
                <div className="font-medium">
                  {order.createdBy?.displayName || order.createdBy?.email || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Order Type</div>
                <div className="font-medium">{order.orderType.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Time Limit</div>
                <div className="font-medium">{order.orderType.timeLimitDays} days</div>
              </div>
              {order.folderLink && (
                <div>
                  <div className="text-sm text-muted-foreground">Folder Link</div>
                  <div className="font-medium">
                    <a
                      href={order.folderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View Folder
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" x2="21" y1="14" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
              <CardDescription>Services included in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.services.map((os) => (
                  <div key={os.id} className="p-3 border rounded-lg space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{os.service.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {os.service.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {os.service.team && <div>Team: {os.service.team.name}</div>}
                      {os.service.timeLimit && <div>Time: {os.service.timeLimit}h</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
