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

interface ServiceInstance {
  serviceId: string
  service: Service
  targetName?: string
  targetUrl?: string
  description?: string
  instanceId: string // Unique ID for this instance in the UI
}

export default function NewOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(null)
  const [serviceInstances, setServiceInstances] = useState<ServiceInstance[]>([])
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<ServiceInstance | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

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
            services: detailsResponse.data.services.map((s: any) => s.service),
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
    // Initialize service instances with order type services
    if (orderType) {
      setServiceInstances(orderType.services.map(s => ({
        serviceId: s.id,
        service: s,
        instanceId: `${s.id}-${Date.now()}-${Math.random()}`,
      })))
    } else {
      setServiceInstances([])
    }
  }

  const handleRemoveInstance = (instanceId: string) => {
    setServiceInstances(prev => prev.filter(inst => inst.instanceId !== instanceId))
  }

  const handleAddService = (serviceId: string) => {
    const service = allServices.find(s => s.id === serviceId)
    if (service) {
      setServiceInstances(prev => [...prev, {
        serviceId: service.id,
        service: service,
        instanceId: `${service.id}-${Date.now()}-${Math.random()}`,
      }])
    }
    setIsAddServiceDialogOpen(false)
  }

  const handleEditInstance = (instance: ServiceInstance) => {
    setEditingInstance(instance)
    setIsEditDialogOpen(true)
  }

  const handleSaveInstanceDetails = (instanceId: string, details: { targetName?: string; targetUrl?: string; description?: string }) => {
    setServiceInstances(prev => prev.map(inst => 
      inst.instanceId === instanceId 
        ? { ...inst, ...details }
        : inst
    ))
    setIsEditDialogOpen(false)
    setEditingInstance(null)
  }

  const isCustomized = () => {
    if (!selectedOrderType) return false
    const originalServiceIds = selectedOrderType.services.map(s => s.id).sort()
    const currentServiceIds = [...new Set(serviceInstances.map(i => i.serviceId))].sort()
    
    // Check if service IDs are different
    if (JSON.stringify(originalServiceIds) !== JSON.stringify(currentServiceIds)) {
      return true
    }
    
    // Check if any instances have been added (duplicates)
    const serviceCounts = serviceInstances.reduce((acc, inst) => {
      acc[inst.serviceId] = (acc[inst.serviceId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    if (Object.values(serviceCounts).some(count => count > 1)) {
      return true
    }
    
    return false
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
        serviceInstances: serviceInstances.map(inst => ({
          serviceId: inst.serviceId,
          service: inst.service,
          targetName: inst.targetName || null,
          targetUrl: inst.targetUrl || null,
          description: inst.description || null,
        })),
        isCustomized: isCustomized(),
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
                        {allServices.map((service) => (
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
              ) : serviceInstances.length === 0 ? (
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
                      {serviceInstances.length} service instance
                      {serviceInstances.length !== 1 ? 's' : ''}
                      {isCustomized() && (
                        <Badge variant="secondary" className="ml-2">
                          Customized
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {serviceInstances.map((instance) => (
                      <div
                        key={instance.instanceId}
                        className="p-3 border rounded-lg space-y-1 group relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{instance.service.name}</div>
                            {instance.targetName && (
                              <div className="text-sm text-blue-600 mt-1">
                                Target: {instance.targetName}
                              </div>
                            )}
                            {instance.targetUrl && (
                              <div className="text-xs text-muted-foreground truncate">
                                {instance.targetUrl}
                              </div>
                            )}
                            {instance.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {instance.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {instance.service.type.replace('_', ' ')}
                                </Badge>
                                {instance.service.team && (
                                  <span>Team: {instance.service.team.name}</span>
                                )}
                              </div>
                              {instance.service.timeLimit && (
                                <div>Time: {instance.service.timeLimit}h</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditInstance(instance)}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleRemoveInstance(instance.instanceId)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    Tasks will be auto-created for each service instance upon order creation
                  </div>
                </div>
              )}

              {/* Edit Instance Dialog */}
              {editingInstance && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Service Instance</DialogTitle>
                      <DialogDescription>
                        Add details to differentiate this instance of {editingInstance.service.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">Target Name</label>
                        <Input
                          id="edit-target-name"
                          placeholder="e.g., Main Website, Blog Site"
                          defaultValue={editingInstance.targetName || ''}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Target URL</label>
                        <Input
                          id="edit-target-url"
                          placeholder="e.g., https://example.com"
                          defaultValue={editingInstance.targetUrl || ''}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          id="edit-description"
                          placeholder="Add any specific notes..."
                          defaultValue={editingInstance.description || ''}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={() => {
                          const targetName = (document.getElementById('edit-target-name') as HTMLInputElement)?.value
                          const targetUrl = (document.getElementById('edit-target-url') as HTMLInputElement)?.value
                          const description = (document.getElementById('edit-description') as HTMLTextAreaElement)?.value
                          handleSaveInstanceDetails(editingInstance.instanceId, {
                            targetName: targetName || undefined,
                            targetUrl: targetUrl || undefined,
                            description: description || undefined,
                          })
                        }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
