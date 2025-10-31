'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, DollarSign, Plus, FileText, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import axios from 'axios'

interface Team {
  id: string
  name: string
  slug: string
}

interface OrderActionButtonsProps {
  orderId: string
  currentDeliveryDate: string
  currentAmount: string
  currentNotes?: string
  onUpdate?: () => void
  variant?: 'default' | 'compact'
}

export function OrderActionButtons({
  orderId,
  currentDeliveryDate,
  currentAmount,
  currentNotes,
  onUpdate,
  variant = 'default',
}: OrderActionButtonsProps) {
  // Modal States
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showAmountDialog, setShowAmountDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)

  // Form States
  const [newDeliveryDate, setNewDeliveryDate] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskTeamId, setTaskTeamId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Teams data
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)

  // Fetch teams when task dialog opens
  useEffect(() => {
    if (showTaskDialog && teams.length === 0) {
      fetchTeams()
    }
  }, [showTaskDialog])

  const fetchTeams = async () => {
    try {
      setIsLoadingTeams(true)
      const response = await axios.get('/api/admin/teams')
      setTeams(response.data.teams)
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setIsLoadingTeams(false)
    }
  }

  const handleExtendDelivery = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/orders/${orderId}/extend-delivery`, {
        deliveryDate: newDeliveryDate,
      })
      toast.success('Delivery date updated successfully')
      setShowExtendDialog(false)
      setNewDeliveryDate('')
      onUpdate?.()
    } catch (error) {
      console.error('Error updating delivery date:', error)
      toast.error('Failed to update delivery date')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAmount = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/orders/${orderId}/amount`, {
        amount: parseFloat(newAmount),
      })
      toast.success('Amount updated successfully')
      setShowAmountDialog(false)
      setNewAmount('')
      onUpdate?.()
    } catch (error) {
      console.error('Error updating amount:', error)
      toast.error('Failed to update amount')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateNotes = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/orders/${orderId}/notes`, {
        notes: newNotes,
      })
      toast.success('Notes updated successfully')
      setShowNotesDialog(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error('Failed to update notes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTask = async () => {
    try {
      setIsSubmitting(true)
      await axios.post(`/api/orders/${orderId}/custom-task`, {
        title: taskTitle,
        description: taskDescription,
        teamId: taskTeamId,
      })
      toast.success('Custom task created successfully')
      setShowTaskDialog(false)
      setTaskTitle('')
      setTaskDescription('')
      setTaskTeamId('')
      onUpdate?.()
    } catch (error) {
      console.error('Error creating custom task:', error)
      toast.error('Failed to create custom task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonClass = variant === 'compact' 
    ? "bg-zinc-950 hover:bg-zinc-800 flex-1 dark:text-white"
    : "bg-zinc-950 hover:bg-zinc-800 dark:text-white"

  const iconSize = variant === 'compact' ? "h-3 w-3" : "h-4 w-4"

  return (
    <>
      {/* Action Buttons */}
      <div className={variant === 'compact' ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
        <Button 
          variant="default"
          size="sm"
          onClick={() => {
            setNewDeliveryDate(format(new Date(currentDeliveryDate), 'yyyy-MM-dd'))
            setShowExtendDialog(true)
          }}
          className={buttonClass}
        >
          <Calendar className={`${iconSize} mr-1`} />
          {variant === 'compact' ? 'Extend' : 'Extend Delivery'}
        </Button>
        
        <Button 
          variant="default"
          size="sm"
          onClick={() => {
            setNewAmount(currentAmount)
            setShowAmountDialog(true)
          }}
          className={buttonClass}
        >
          <DollarSign className={`${iconSize} mr-1`} />
          {variant === 'compact' ? 'Amount' : 'Edit Amount'}
        </Button>
        
        <Button 
          variant="default"
          size="sm"
          onClick={() => setShowTaskDialog(true)}
          className={buttonClass}
        >
          <Plus className={`${iconSize} mr-1`} />
          {variant === 'compact' ? 'Task' : 'Add Task'}
        </Button>
        
        <Button 
          variant="default"
          size="sm"
          onClick={() => {
            setNewNotes(currentNotes || '')
            setShowNotesDialog(true)
          }}
          className={buttonClass}
        >
          <FileText className={`${iconSize} mr-1`} />
          {variant === 'compact' ? 'Notes' : 'Edit Notes'}
        </Button>
      </div>

      {/* Extend Delivery Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
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
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendDelivery} disabled={isSubmitting || !newDeliveryDate}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Amount Dialog */}
      <Dialog open={showAmountDialog} onOpenChange={setShowAmountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Amount</DialogTitle>
            <DialogDescription>
              Update the total amount for this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAmountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAmount} disabled={isSubmitting || !newAmount}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Amount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Task</DialogTitle>
            <DialogDescription>
              Add a custom task to this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description..."
              />
            </div>
            <div>
              <Label htmlFor="teamId">Team</Label>
              <Select 
                value={taskTeamId} 
                onValueChange={setTaskTeamId}
                disabled={isLoadingTeams}
              >
                <SelectTrigger id="teamId">
                  <SelectValue placeholder={isLoadingTeams ? "Loading teams..." : "Select a team..."} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={isSubmitting || !taskTitle || !taskTeamId}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Update notes for this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={5}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Enter order notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
