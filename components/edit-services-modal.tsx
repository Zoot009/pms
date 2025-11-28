'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Lock,
  CheckCircle2,
  Search,
  ShoppingCart
} from 'lucide-react'

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
  removableCount?: number // How many instances can be removed (don't have assigned tasks)
  assignedCount?: number // How many instances have assigned tasks
}

interface EditServicesModalProps {
  orderId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditServicesModal({ orderId, isOpen, onClose, onSuccess }: EditServicesModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [serviceInstances, setServiceInstances] = useState<ServiceInstance[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [order, setOrder] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderServices()
    }
  }, [isOpen, orderId])

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
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddService = (service: Service) => {
    setServiceInstances(prev => {
      const existing = prev.find(si => si.serviceId === service.id)
      if (existing) {
        // Show warning when adding a service that already exists
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
    // Clear search after adding
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
      
      // Check if we can remove instances
      const assignedCount = instance.assignedCount || 0
      const removableCount = instance.removableCount || 0
      const currentQuantity = instance.quantity
      
      // If trying to go below the number of assigned instances, block it
      if (currentQuantity - 1 < assignedCount) {
        toast.error('Cannot remove service instances with assigned tasks. Unassign tasks first.')
        return prev
      }
      
      if (currentQuantity === 1) {
        // Remove completely if quantity is 1
        return prev.filter(si => si.serviceId !== serviceId)
      }
      
      return prev.map(si =>
        si.serviceId === serviceId
          ? { ...si, quantity: si.quantity - 1 }
          : si
      )
    })
  }

  const handleRemoveService = (serviceId: string) => {
    const instance = serviceInstances.find(si => si.serviceId === serviceId)
    if (instance && (instance.assignedCount || 0) > 0) {
      toast.error('Cannot remove service with assigned tasks. Unassign all tasks first.')
      return
    }
    setServiceInstances(prev => prev.filter(si => si.serviceId !== serviceId))
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
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error updating services:', error)
      toast.error(error.response?.data?.message || 'Failed to update services')
    } finally {
      setIsSaving(false)
    }
  }

  const getChanges = () => {
    // Initial services are those that came from the API (already on order)
    const initialServiceMap = new Map<string, number>()
    serviceInstances.forEach(si => {
      if ((si.assignedCount || 0) > 0 || (si.removableCount || 0) > 0) {
        // This was an existing service
        const totalExisting = (si.assignedCount || 0) + (si.removableCount || 0)
        initialServiceMap.set(si.serviceId, totalExisting)
      }
    })
    
    // Current services are what user has selected
    const currentServiceMap = new Map<string, number>()
    serviceInstances.forEach(si => {
      currentServiceMap.set(si.serviceId, si.quantity)
    })
    
    const changes: Array<{ serviceId: string, serviceName: string, change: number }> = []
    
    // Check for additions and modifications
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
    
    // Check for removals
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

  // Filter services by search query
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
      <div className="p-2 border rounded bg-card text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-medium text-xs truncate">{service.name}</span>
              {service.isMandatory && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">Mandatory</Badge>
              )}
              {service.team && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">{service.team.name}</Badge>
              )}
              {quantity > 1 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
                  {quantity}x
                </Badge>
              )}
            </div>
            
            {service.description && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">{service.description}</p>
            )}
            
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              <span className="capitalize">{service.type.replace('_', ' ')}</span>
              {isExisting && assignedCount > 0 && (
                <div className="flex items-center gap-0.5 text-orange-600">
                  <Lock className="h-2.5 w-2.5" />
                  <span>{assignedCount} assigned</span>
                </div>
              )}
              {isExisting && removableCount > 0 && (
                <div className="flex items-center gap-0.5 text-green-600">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>{removableCount} removable</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleDecreaseQuantity(serviceInstance.serviceId)}
              disabled={!canDecreaseQuantity || isSaving}
              title={!canDecreaseQuantity ? 'Cannot remove instances with assigned tasks' : 'Decrease quantity'}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="w-6 text-center font-semibold text-xs">{quantity}</div>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleIncreaseQuantity(serviceInstance.serviceId)}
              disabled={isSaving}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const AvailableServiceItem = ({ service }: { service: Service }) => {
    const isAlreadyAdded = serviceInstances.some(si => si.serviceId === service.id)
    
    return (
      <div className="p-2 border rounded hover:bg-accent transition-colors text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-medium text-xs truncate">{service.name}</span>
              {service.isMandatory && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">Mandatory</Badge>
              )}
              {service.team && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">{service.team.name}</Badge>
              )}
              {isAlreadyAdded && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">Added</Badge>
              )}
            </div>
            
            {service.description && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">{service.description}</p>
            )}
            
            <div className="text-[10px] text-muted-foreground capitalize">
              {service.type.replace('_', ' ')}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] shrink-0"
            onClick={() => handleAddService(service)}
            disabled={isSaving}
          >
            <Plus className="h-3 w-3 mr-0.5" />
            Add
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Edit Order Services</DialogTitle>
          <DialogDescription className="text-xs">
            Order #{order?.orderNumber} - Add or remove services using quantity controls
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col px-6 pb-4">
            {/* Warning and Changes Summary */}
            <div className="space-y-3 mb-4 shrink-0">
              {/* Warning about restrictions */}
              <div className="p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-xs flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-amber-800 dark:text-amber-200">Rules:</div>
                  <span className="text-amber-700 dark:text-amber-300">Services with assigned tasks cannot be removed • Use +/- to adjust quantities • New instances create tasks automatically</span>
                </div>
              </div>

              {/* Duplicate Warning */}
              {showDuplicateWarning && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 p-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                      You're adding multiple instances. Each creates separate tasks.
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Changes Summary */}
              {hasChanges && (
                <div className="p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
                  <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Pending Changes:</div>
                  <div className="flex flex-wrap gap-2 text-xs text-blue-700 dark:text-blue-300">
                    {changes.map((change, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                        {change.change > 0 ? (
                          <>
                            <Plus className="h-3 w-3 text-green-600" />
                            <span>+{Math.abs(change.change)}x {change.serviceName}</span>
                          </>
                        ) : (
                          <>
                            <Minus className="h-3 w-3 text-red-600" />
                            <span>-{Math.abs(change.change)}x {change.serviceName}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left Column - Selected Services */}
              <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/10">
                <div className="shrink-0 px-3 py-2 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Selected Services ({serviceInstances.length})
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {serviceInstances.length > 0 ? (
                      serviceInstances.map(instance => (
                        <ServiceItem
                          key={instance.serviceId}
                          serviceInstance={instance}
                          isExisting={(instance.assignedCount || 0) > 0 || (instance.removableCount || 0) > 0}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-xs">
                        No services selected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Column - Available Services */}
              <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/10">
                <div className="shrink-0 px-3 py-2 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold mb-2">Add Services</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 h-7 text-xs"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {filteredAvailableServices.length > 0 ? (
                      filteredAvailableServices.map(service => (
                        <AvailableServiceItem key={service.id} service={service} />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-xs">
                        {searchQuery ? 'No services match your search' : 'No available services'}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving} size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges || isLoading}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}