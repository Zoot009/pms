'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import axios from 'axios'

interface ExtendDeliveryButtonProps {
  orderId: string
  currentDeliveryDate: string
  onUpdate?: () => void
}

export function ExtendDeliveryButton({
  orderId,
  currentDeliveryDate,
  onUpdate,
}: ExtendDeliveryButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [newDeliveryDate, setNewDeliveryDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenDialog = () => {
    setNewDeliveryDate(format(new Date(currentDeliveryDate), 'yyyy-MM-dd'))
    setShowDialog(true)
  }

  const handleExtendDelivery = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/orders/${orderId}/extend-delivery`, {
        deliveryDate: newDeliveryDate,
      })
      toast.success('Delivery date updated successfully')
      setShowDialog(false)
      setNewDeliveryDate('')
      onUpdate?.()
    } catch (error: any) {
      console.error('Error updating delivery date:', error)
      toast.error(error.response?.data?.message || 'Failed to update delivery date')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button 
        variant="default"
        size="sm"
        onClick={handleOpenDialog}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Extend Delivery
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Delivery Date</DialogTitle>
            <DialogDescription>
              Update the delivery date for this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryDate">New Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExtendDelivery} 
              disabled={isSubmitting || !newDeliveryDate}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
