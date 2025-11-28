'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { 
  Loader2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Lock,
  CheckCircle2,
  Search,
  ShoppingCart,
  ArrowLeft,
  Save,
  Settings,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  type: string
  description?: string
  isMandatory: boolean
  team?: {
    name: string
  }
}

interface ServiceInstance {
  serviceId: string
  service: Service
  quantity: number
  removableCount?: number
  assignedCount?: number
}

interface EditServicesPageProps {
  params: Promise<{ id: string }>
}

export default function EditServicesPage({ params }: EditServicesPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const orderId = resolvedParams.id

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [serviceInstances, setServiceInstances] = useState<ServiceInstance[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [order, setOrder] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  useEffect(() => {
    if (orderId) {
      fetchOrderServices()
    }
  }, [orderId])

  const fetchOrderServices = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/orders/${orderId}/services`)
      const { order, serviceInstances, availableServices } = response.data
      
      setOrder(order)
      setServiceInstances(serviceInstances)
      setAvailableServices(availableServices)
    } catch (error: any) {
      console.error('Error fetching order services:', error)
      toast.error(error.response?.data?.message || 'Failed to load services')
      if (error.response?.status === 403) {
        router.push(`/orders/${orderId}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddService = (service: Service) => {
    setServiceInstances(prev => {
      const existing = prev.find(si => si.serviceId === service.id)
      if (existing) {
        setShowDuplicateWarning(true)
        setTimeout(() => setShowDuplicateWarning(false), 3000)
        
        return prev.map(si => 
          si.serviceId === service.id 
            ? { ...si, quantity: si.quantity + 1 }
            : si
        )
      }
      return [...prev, { serviceId: service.id, service, quantity: 1 }]
    })
    setSearchQuery('')
  }

  const handleIncreaseQuantity = (serviceId: string) => {
    setServiceInstances(prev =>
      prev.map(si =>
        si.serviceId === serviceId
          ? { ...si, quantity: si.quantity + 1 }
          : si
      )
    )
    setShowDuplicateWarning(true)
    setTimeout(() => setShowDuplicateWarning(false), 3000)
  }

  const handleDecreaseQuantity = (serviceId: string) => {
    setServiceInstances(prev => {
      const instance = prev.find(si => si.serviceId === serviceId)
      if (!instance) return prev
      
      const assignedCount = instance.assignedCount || 0
      const currentQuantity = instance.quantity
      
      if (currentQuantity - 1 < assignedCount) {
        toast.error('Cannot remove service instances with assigned tasks. Unassign tasks first.')
        return prev
      }
      
      if (currentQuantity === 1) {
        return prev.filter(si => si.serviceId !== serviceId)
      }
      
      return prev.map(si =>
        si.serviceId === serviceId
          ? { ...si, quantity: si.quantity - 1 }
          : si
      )
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await axios.patch(`/api/orders/${orderId}/services`, {
        serviceInstances: serviceInstances.map(si => ({
          serviceId: si.serviceId,
          quantity: si.quantity
        }))
      })
      
      toast.success('Order services updated successfully')
      router.push(`/orders/${orderId}`)
    } catch (error: any) {
      console.error('Error updating services:', error)
      toast.error(error.response?.data?.message || 'Failed to update services')
    } finally {
      setIsSaving(false)
    }
  }

  const getChanges = () => {
    const initialServiceMap = new Map<string, number>()
    serviceInstances.forEach(si => {
      if ((si.assignedCount || 0) > 0 || (si.removableCount || 0) > 0) {
        const totalExisting = (si.assignedCount || 0) + (si.removableCount || 0)
        initialServiceMap.set(si.serviceId, totalExisting)
      }
    })
    
    const currentServiceMap = new Map<string, number>()
    serviceInstances.forEach(si => {
      currentServiceMap.set(si.serviceId, si.quantity)
    })
    
    const changes: Array<{ serviceId: string, serviceName: string, change: number }> = []
    
    currentServiceMap.forEach((quantity, serviceId) => {
      const initial = initialServiceMap.get(serviceId) || 0
      if (quantity > initial) {
        const instance = serviceInstances.find(si => si.serviceId === serviceId)
        changes.push({
          serviceId,
          serviceName: instance?.service.name || 'Unknown Service',
          change: quantity - initial
        })
      }
    })
    
    initialServiceMap.forEach((quantity, serviceId) => {
      const current = currentServiceMap.get(serviceId) || 0
      if (current < quantity) {
        const instance = serviceInstances.find(si => si.serviceId === serviceId)
        changes.push({
          serviceId,
          serviceName: instance?.service.name || 'Unknown Service',
          change: current - quantity
        })
      }
    })
    
    return changes
  }

  const changes = getChanges()
  const hasChanges = changes.length > 0

  const filteredAvailableServices = availableServices.filter(service => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      service.name.toLowerCase().includes(query) ||
      service.type.toLowerCase().includes(query) ||
      service.team?.name.toLowerCase().includes(query)
    )
  })

  const ServiceItem = ({ serviceInstance, isExisting }: { 
    serviceInstance: ServiceInstance
    isExisting: boolean
  }) => {
    const service = serviceInstance.service
    const quantity = serviceInstance.quantity
    const assignedCount = serviceInstance.assignedCount || 0
    const removableCount = serviceInstance.removableCount || 0
    const canDecreaseQuantity = quantity > assignedCount

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{service.name}</span>
                {service.isMandatory && (
                  <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                )}
                {service.team && (
                  <Badge variant="outline" className="text-xs">{service.team.name}</Badge>
                )}
                {quantity > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {quantity}x
                  </Badge>
                )}
              </div>
              
              {service.description && (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              )}
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="capitalize">{service.type.replace('_', ' ')}</span>
                {isExisting && assignedCount > 0 && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Lock className="h-3 w-3" />
                    <span>{assignedCount} with assigned tasks</span>
                  </div>
                )}
                {isExisting && removableCount > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{removableCount} removable</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDecreaseQuantity(serviceInstance.serviceId)}
                disabled={!canDecreaseQuantity || isSaving}
                title={!canDecreaseQuantity ? 'Cannot remove instances with assigned tasks' : 'Decrease quantity'}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-10 text-center font-semibold">{quantity}</div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleIncreaseQuantity(serviceInstance.serviceId)}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const AvailableServiceItem = ({ service }: { service: Service }) => {
    const isAlreadyAdded = serviceInstances.some(si => si.serviceId === service.id)
    
    return (
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{service.name}</span>
                {service.isMandatory && (
                  <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                )}
                {service.team && (
                  <Badge variant="outline" className="text-xs">{service.team.name}</Badge>
                )}
                {isAlreadyAdded && (
                  <Badge variant="secondary" className="text-xs">Already Added</Badge>
                )}
              </div>
              
              {service.description && (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              )}
              
              <div className="text-xs text-muted-foreground capitalize">
                {service.type.replace('_', ' ')}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddService(service)}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Order not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/orders/${orderId}`}>Order #{order.orderNumber}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Services</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Edit Services
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage services for Order #{order.orderNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)} disabled={isSaving}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customerName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Type</p>
              <p className="font-medium">{order.orderType?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge>{order.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customized</p>
              {order.isCustomized ? (
                <Badge variant="outline">Yes</Badge>
              ) : (
                <span className="text-sm">No</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="space-y-3">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Services with assigned tasks cannot be removed. Use +/- buttons to adjust quantities. New service instances will automatically create tasks.
          </AlertDescription>
        </Alert>

        {showDuplicateWarning && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              You're adding multiple instances of this service. Each instance will create separate tasks.
            </AlertDescription>
          </Alert>
        )}

        {hasChanges && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <div className="font-medium mb-2">Pending Changes:</div>
              <div className="flex flex-wrap gap-2">
                {changes.map((change, idx) => (
                  <Badge key={idx} variant={change.change > 0 ? 'default' : 'destructive'}>
                    {change.change > 0 ? '+' : ''}{change.change}x {change.serviceName}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Selected Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selected Services ({serviceInstances.length})
            </CardTitle>
            <CardDescription>
              Services currently added to this order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {serviceInstances.length > 0 ? (
                  serviceInstances.map(instance => (
                    <ServiceItem
                      key={instance.serviceId}
                      serviceInstance={instance}
                      isExisting={(instance.assignedCount || 0) > 0 || (instance.removableCount || 0) > 0}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No services selected. Add services from the right panel.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column - Available Services */}
        <Card>
          <CardHeader>
            <CardTitle>Add Services</CardTitle>
            <CardDescription>
              Browse and add available services
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services by name, type, or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredAvailableServices.length > 0 ? (
                  filteredAvailableServices.map(service => (
                    <AvailableServiceItem key={service.id} service={service} />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? 'No services match your search' : 'No available services'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
