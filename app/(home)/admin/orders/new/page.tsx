'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowLeft, X, Plus } from 'lucide-react'
import Link from 'next/link'

const orderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  orderTypeId: z.string().min(1, 'Order type is required'),
  amount: z.string().min(1, 'Amount is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  deliveryDateTime: z.string().min(1, 'Delivery date and time is required'),
  notes: z.string().optional(),
})

type OrderFormValues = z.infer<typeof orderSchema>

interface OrderType {
  id: string
  name: string
  timeLimitDays: number
  services: Array<{
    id: string
    name: string
    type: string
    team: { name: string } | null
    timeLimit: number | null
  }>
}

interface Service {
  id: string
  name: string
  type: string
  team: { name: string } | null
  timeLimit: number | null
}

export default function NewOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderNumber: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      orderTypeId: '',
      amount: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDateTime: '',
      notes: '',
    },
  })

  useEffect(() => {
    fetchOrderTypes()
    fetchAllServices()
  }, [])

  const fetchOrderTypes = async () => {
    try {
      const response = await axios.get('/api/admin/order-types')
      // Filter only active order types
      const activeOrderTypes = response.data.filter((ot: any) => ot.isActive)
      
      // Fetch services for each order type
      const orderTypesWithServices = await Promise.all(
        activeOrderTypes.map(async (ot: any) => {
          const detailsResponse = await axios.get(`/api/admin/order-types/${ot.id}`)
          return {
            id: ot.id,
            name: ot.name,
            timeLimitDays: ot.timeLimitDays,
            services: detailsResponse.data.services,
          }
        })
      )
      
      setOrderTypes(orderTypesWithServices)
    } catch (error) {
      console.error('Error fetching order types:', error)
      toast.error('Failed to load order types')
    }
  }

  const fetchAllServices = async () => {
    try {
      const response = await axios.get('/api/admin/services')
      // Filter only active services
      const activeServices = response.data.filter((s: any) => s.isActive)
      setAllServices(activeServices)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to load services')
    }
  }

  const handleOrderTypeChange = (orderTypeId: string) => {
    const orderType = orderTypes.find((ot) => ot.id === orderTypeId)
    setSelectedOrderType(orderType || null)
    // Initialize selected services with order type services
    if (orderType) {
      setSelectedServiceIds(orderType.services.map(s => s.id))
    } else {
      setSelectedServiceIds([])
    }
  }

  const handleRemoveService = (serviceId: string) => {
    setSelectedServiceIds(prev => prev.filter(id => id !== serviceId))
  }

  const handleAddService = (serviceId: string) => {
    if (!selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(prev => [...prev, serviceId])
    }
    setIsAddServiceDialogOpen(false)
  }

  const getSelectedServices = () => {
    return allServices.filter(s => selectedServiceIds.includes(s.id))
  }

  const isCustomized = () => {
    if (!selectedOrderType) return false
    const originalServiceIds = selectedOrderType.services.map(s => s.id).sort()
    const currentServiceIds = [...selectedServiceIds].sort()
    return JSON.stringify(originalServiceIds) !== JSON.stringify(currentServiceIds)
  }

  const onSubmit = async (data: OrderFormValues) => {
    setIsLoading(true)
    try {
      // Split deliveryDateTime into date and time
      const [deliveryDate, deliveryTime] = data.deliveryDateTime.split('T')

      const payload = {
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        orderTypeId: data.orderTypeId,
        amount: parseFloat(data.amount),
        orderDate: new Date(data.orderDate).toISOString(),
        deliveryDate: new Date(deliveryDate).toISOString(),
        deliveryTime: deliveryTime,
        notes: data.notes || null,
        customServiceIds: selectedServiceIds, // Send selected service IDs
        isCustomized: isCustomized(), // Flag if customized
      }

      await axios.post('/api/admin/orders', payload)
      toast.success('Order created successfully')
      router.push('/admin/orders')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to create order')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Order</h1>
          <p className="text-muted-foreground">Add a new customer order</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>Enter the order details below</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., #FO82F666884C6" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter a unique order number (e.g., #FO82F666884C6)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
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
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                            />
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
                            <Input placeholder="+1 234 567 8900" {...field} />
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
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="orderTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Type *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleOrderTypeChange(value)
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an order type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {orderTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes or instructions..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Order'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/admin/orders">Cancel</Link>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Selected Services</CardTitle>
                  <CardDescription>
                    Customize services for this order
                  </CardDescription>
                </div>
                {selectedOrderType && (
                  <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Service</DialogTitle>
                        <DialogDescription>
                          Select a service to add to this order
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 mt-4">
                        {allServices
                          .filter(s => !selectedServiceIds.includes(s.id))
                          .map((service) => (
                            <div
                              key={service.id}
                              className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                              onClick={() => handleAddService(service.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{service.name}</div>
                                  <div className="text-xs text-muted-foreground space-y-1 mt-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {service.type.replace('_', ' ')}
                                      </Badge>
                                      {service.team && (
                                        <span>Team: {service.team.name}</span>
                                      )}
                                    </div>
                                    {service.timeLimit && (
                                      <div>Time: {service.timeLimit}h</div>
                                    )}
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        {allServices.filter(s => !selectedServiceIds.includes(s.id)).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            All available services have been added
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedOrderType ? (
                <p className="text-sm text-muted-foreground">
                  Select an order type to view and customize services
                </p>
              ) : getSelectedServices().length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    No services selected
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setIsAddServiceDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">
                      {getSelectedServices().length} service
                      {getSelectedServices().length !== 1 ? 's' : ''}
                      {isCustomized() && (
                        <Badge variant="secondary" className="ml-2">
                          Customized
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {getSelectedServices().map((service) => (
                      <div
                        key={service.id}
                        className="p-3 border rounded-lg space-y-1 group relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{service.name}</div>
                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {service.type.replace('_', ' ')}
                                </Badge>
                                {service.team && (
                                  <span>Team: {service.team.name}</span>
                                )}
                              </div>
                              {service.timeLimit && (
                                <div>Time: {service.timeLimit}h</div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveService(service.id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    Tasks will be auto-created for each service upon order creation
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
