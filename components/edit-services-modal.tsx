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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Users, 
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react'

interface Service {
  id: string
  name: string
  type: string
  description?: string
  isMandatory: boolean
  canRemove?: boolean
  hasAssignedTasks?: boolean
  taskCount?: number
  team?: {
    name: string
  }
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
  const [currentServices, setCurrentServices] = useState<Service[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderServices()
    }
  }, [isOpen, orderId])

  const fetchOrderServices = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/orders/${orderId}/services`)
      const { order, currentServices, availableServices } = response.data
      
      setOrder(order)
      setCurrentServices(currentServices)
      setAvailableServices(availableServices)
      setSelectedServiceIds(currentServices.map((s: Service) => s.id))
    } catch (error: any) {
      console.error('Error fetching order services:', error)
      toast.error(error.response?.data?.message || 'Failed to load services')
    } finally {
      setIsLoading(false)
    }
  }

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServiceIds(prev => [...prev, serviceId])
    } else {
      // Check if service can be removed
      const service = currentServices.find(s => s.id === serviceId)
      if (service && !service.canRemove) {
        toast.error('Cannot remove service with assigned tasks')
        return
      }
      setSelectedServiceIds(prev => prev.filter(id => id !== serviceId))
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await axios.patch(`/api/orders/${orderId}/services`, {
        serviceIds: selectedServiceIds
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
    const currentIds = currentServices.map(s => s.id)
    const toAdd = selectedServiceIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !selectedServiceIds.includes(id))
    return { toAdd, toRemove }
  }

  const changes = getChanges()
  const hasChanges = changes.toAdd.length > 0 || changes.toRemove.length > 0

  const ServiceItem = ({ service, isSelected, isCurrentService }: { 
    service: Service
    isSelected: boolean
    isCurrentService: boolean
  }) => (
    <div className={`p-3 border rounded-lg ${isCurrentService && !service.canRemove ? 'bg-muted/50' : ''}`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={service.id}
          checked={isSelected}
          onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
          disabled={isCurrentService && !service.canRemove}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={service.id}
              className={`font-medium cursor-pointer ${isCurrentService && !service.canRemove ? 'text-muted-foreground' : ''}`}
            >
              {service.name}
            </Label>
            {service.isMandatory && (
              <Badge variant="destructive" className="text-xs">Mandatory</Badge>
            )}
            {service.team && (
              <Badge variant="outline" className="text-xs">{service.team.name}</Badge>
            )}
          </div>
          
          {service.description && (
            <p className="text-sm text-muted-foreground">{service.description}</p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{service.type.replace('_', ' ')}</span>
            {isCurrentService && (
              <>
                {service.hasAssignedTasks ? (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Lock className="h-3 w-3" />
                    <span>Has assigned tasks</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Can be removed</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {isCurrentService && !isSelected && (
          <Minus className="h-4 w-4 text-red-500" />
        )}
        {!isCurrentService && isSelected && (
          <Plus className="h-4 w-4 text-green-500" />
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Order Services</DialogTitle>
          <DialogDescription>
            Order #{order?.orderNumber} - Add or remove services for this order (Admin and Order Creator access)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Warning about restrictions */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-800">Service Editing Rules</div>
                <ul className="mt-1 text-amber-700 list-disc list-inside">
                  <li>Available to Admins and Order Creators</li>
                  <li>Services with assigned tasks cannot be removed</li>
                  <li>New services will automatically create tasks</li>
                  <li>Changes are logged for audit purposes</li>
                </ul>
              </div>
            </div>

            {/* Changes Summary */}
            {hasChanges && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">Pending Changes:</div>
                <div className="space-y-1 text-sm text-blue-700">
                  {changes.toAdd.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Adding {changes.toAdd.length} service(s)</span>
                    </div>
                  )}
                  {changes.toRemove.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4" />
                      <span>Removing {changes.toRemove.length} service(s)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Current Services */}
                <div>
                  <h3 className="font-semibold mb-3">Current Services</h3>
                  <div className="space-y-2">
                    {currentServices.map(service => (
                      <ServiceItem
                        key={service.id}
                        service={service}
                        isSelected={selectedServiceIds.includes(service.id)}
                        isCurrentService={true}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Available Services */}
                <div>
                  <h3 className="font-semibold mb-3">Available Services to Add</h3>
                  <div className="space-y-2">
                    {availableServices
                      .filter(service => !currentServices.some(cs => cs.id === service.id))
                      .map(service => (
                        <ServiceItem
                          key={service.id}
                          service={service}
                          isSelected={selectedServiceIds.includes(service.id)}
                          isCurrentService={false}
                        />
                      ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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