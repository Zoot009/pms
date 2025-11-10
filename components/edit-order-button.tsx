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
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

interface EditOrderButtonProps {
  orderId: string
  currentCustomerName: string
  currentCustomerEmail: string
  currentCustomerPhone: string
  currentAmount: string
  currentNotes?: string
  onUpdate?: () => void
}

export function EditOrderButton({
  orderId,
  currentCustomerName,
  currentCustomerEmail,
  currentCustomerPhone,
  currentAmount,
  currentNotes,
  onUpdate,
}: EditOrderButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form States - convert null to empty string for inputs
  const [customerName, setCustomerName] = useState(currentCustomerName || '')
  const [customerEmail, setCustomerEmail] = useState(currentCustomerEmail || '')
  const [customerPhone, setCustomerPhone] = useState(currentCustomerPhone || '')
  const [amount, setAmount] = useState(currentAmount)
  const [notes, setNotes] = useState(currentNotes || '')

  const handleOpenDialog = () => {
    // Reset form to current values when opening - convert null to empty string
    setCustomerName(currentCustomerName || '')
    setCustomerEmail(currentCustomerEmail || '')
    setCustomerPhone(currentCustomerPhone || '')
    setAmount(currentAmount)
    setNotes(currentNotes || '')
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true)
      
      // Validate required fields
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Valid amount is required')
        return
      }

      // Update order details
      await axios.patch(`/api/orders/${orderId}`, {
        customerName: customerName.trim() || null,
        customerEmail: customerEmail.trim() || null,
        customerPhone: customerPhone.trim() || null,
        amount: parseFloat(amount),
        notes: notes.trim() || null,
      })

      toast.success('Order updated successfully')
      setShowDialog(false)
      onUpdate?.()
    } catch (error: any) {
      console.error('Error updating order:', error)
      toast.error(error.response?.data?.message || 'Failed to update order')
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
        <Pencil className="h-4 w-4 mr-2" />
        Edit Order
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle>
            <DialogDescription>
              Update customer information, price, and notes for this order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Customer Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Customer Details</h3>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter customer email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerPhone">Customer Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter customer phone"
                  />
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Price</h3>
              <div>
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Notes</h3>
              <div>
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter order notes..."
                />
              </div>
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
              onClick={handleSave} 
              disabled={isSubmitting || !amount}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )}