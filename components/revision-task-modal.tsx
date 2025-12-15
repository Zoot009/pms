'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Member {
  id: string
  displayName: string
  email: string
}

interface RevisionTaskModalProps {
  orderId: string
  orderNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevisionTaskModal({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: RevisionTaskModalProps) {
  const queryClient = useQueryClient()
  const [taskName, setTaskName] = useState('')
  const [memberId, setMemberId] = useState('')
  const [notes, setNotes] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')

  // Fetch all members
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['all-members'],
    queryFn: async () => {
      const response = await axios.get('/api/revision/members')
      return response.data.members as Member[]
    },
    enabled: open,
  })

  const members = membersData ?? []

  // Create revision task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      taskName: string
      memberId: string
      notes: string
      deadline: string
    }) => {
      const response = await axios.post(`/api/orders/${orderId}/revision-tasks`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision', 'revision-orders'] })
      toast.success('Revision task created and assigned successfully')
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create revision task')
    },
  })

  const handleClose = () => {
    setTaskName('')
    setMemberId('')
    setNotes('')
    setDeadlineDate('')
    setDeadlineTime('')
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!taskName.trim()) {
      toast.error('Task name is required')
      return
    }

    if (!memberId) {
      toast.error('Please select a member')
      return
    }

    if (!deadlineDate) {
      toast.error('Deadline date is required')
      return
    }

    // Combine date and time
    const deadline = deadlineTime
      ? `${deadlineDate}T${deadlineTime}:00`
      : `${deadlineDate}T23:59:59`

    createTaskMutation.mutate({
      taskName,
      memberId,
      notes,
      deadline,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Revision Task</DialogTitle>
            <DialogDescription>
              Create and assign a revision task for order <strong>{orderNumber}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="taskName">
                Task Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="taskName"
                placeholder="Enter task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                disabled={createTaskMutation.isPending}
              />
            </div>

            {/* Member */}
            <div className="space-y-2">
              <Label htmlFor="member">
                Assign to Member <span className="text-red-500">*</span>
              </Label>
              <Select value={memberId} onValueChange={setMemberId} disabled={createTaskMutation.isPending || isLoading}>
                <SelectTrigger id="member">
                  <SelectValue placeholder={isLoading ? "Loading members..." : "Select member"} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex flex-col">
                        <span>{member.displayName || member.email}</span>
                        {member.displayName && (
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Task will be directly assigned to the selected member
              </p>
            </div>

            {/* Deadline Date */}
            <div className="space-y-2">
              <Label htmlFor="deadlineDate">
                Deadline Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deadlineDate"
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                disabled={createTaskMutation.isPending}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Deadline Time */}
            <div className="space-y-2">
              <Label htmlFor="deadlineTime">Deadline Time (Optional)</Label>
              <Input
                id="deadlineTime"
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                disabled={createTaskMutation.isPending}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or instructions for this task"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={createTaskMutation.isPending}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create & Assign Task
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
