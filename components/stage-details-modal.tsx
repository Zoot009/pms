'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, CheckCircle2, User, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface StageHistoryItem {
  id: string
  stage: string
  initialConfirmationValue: string | null
  initialConfirmationUpdatedBy: string | null
  initialConfirmationUpdatedAt: string | null
  updateRequestValue: string | null
  updateRequestUpdatedBy: string | null
  updateRequestUpdatedAt: string | null
  createdAt: string
}

interface AskingTaskDetails {
  id: string
  title: string
  currentStage: string
  deadline: string | null
  order: {
    orderNumber: string
    customerName: string
  }
  service: {
    name: string
  }
  stageHistory: StageHistoryItem[]
}

interface StageDetailsModalProps {
  taskId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const STAGES = [
  { value: 'ASKED', label: 'Asked' },
  { value: 'SHARED', label: 'Shared' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'INFORMED_TEAM', label: 'Team Informed' },
]

const INITIAL_CONFIRMATION_OPTIONS = ['Yes', 'No']

const UPDATE_REQUEST_OPTIONS = [
  'Not Required',
  'Asked Changes',
  'Approved',
  'Reshared waiting for approval',
]

export function StageDetailsModal({ taskId, isOpen, onClose, onUpdate }: StageDetailsModalProps) {
  const [task, setTask] = useState<AskingTaskDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state for each stage
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [initialConfirmation, setInitialConfirmation] = useState<string>('')
  const [updateRequest, setUpdateRequest] = useState<string>('')

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails()
    }
  }, [isOpen, taskId])

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/asking-tasks/${taskId}`)
      setTask(response.data.askingTask)
      setSelectedStage(response.data.askingTask.currentStage)
    } catch (error) {
      console.error('Error fetching task details:', error)
      toast.error('Failed to load task details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStage = async () => {
    if (!selectedStage) {
      toast.error('Please select a stage')
      return
    }

    if (!initialConfirmation && !updateRequest) {
      toast.error('Please select at least one option to update')
      return
    }

    try {
      setIsSubmitting(true)
      await axios.post(`/api/asking-tasks/${taskId}/stage`, {
        stage: selectedStage,
        initialConfirmationValue: initialConfirmation || undefined,
        updateRequestValue: updateRequest || undefined,
      })

      toast.success('Stage updated successfully')
      
      // Reset form
      setInitialConfirmation('')
      setUpdateRequest('')
      
      // Refresh data
      await fetchTaskDetails()
      onUpdate()
    } catch (error: any) {
      console.error('Error updating stage:', error)
      toast.error(error.response?.data?.error || 'Failed to update stage')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStageBadge = (stage: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      ASKED: 'secondary',
      SHARED: 'default',
      VERIFIED: 'default',
      INFORMED_TEAM: 'outline',
    }
    return <Badge variant={variants[stage] || 'outline'}>{stage.replace('_', ' ')}</Badge>
  }

  // Get latest entry for each stage
  const getLatestStageEntry = (stage: string) => {
    return task?.stageHistory
      .filter(h => h.stage === stage)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Stage Details...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!task) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stage Details - {task.service.name}</DialogTitle>
          <DialogDescription>
            Order: #{task.order.orderNumber} - {task.order.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 -mt-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current Stage:</span>
              {getStageBadge(task.currentStage)}
            </div>
            {task.deadline && (
              <div className="text-muted-foreground">
                Deadline: {format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Stage History Table */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Stage History</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Stage</TableHead>
                    <TableHead>Initial Confirmation</TableHead>
                    <TableHead>Update Request</TableHead>
                    <TableHead className="w-[100px]">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STAGES.map(({ value, label }) => {
                    const latestEntry = getLatestStageEntry(value)

                    return (
                      <TableRow key={value} className={!latestEntry ? 'bg-muted/30' : ''}>
                        <TableCell className="font-medium">
                          {getStageBadge(value)}
                        </TableCell>
                        <TableCell>
                          {latestEntry?.initialConfirmationValue ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {latestEntry.initialConfirmationValue}
                              </div>
                              {latestEntry.initialConfirmationUpdatedAt && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(
                                    new Date(latestEntry.initialConfirmationUpdatedAt),
                                    'MMM d, hh:mm a'
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {latestEntry?.updateRequestValue ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {latestEntry.updateRequestValue}
                              </div>
                              {latestEntry.updateRequestUpdatedAt && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(
                                    new Date(latestEntry.updateRequestUpdatedAt),
                                    'MMM d, hh:mm a'
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {latestEntry ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Full History Timeline */}
          {task.stageHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Complete History Timeline</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {task.stageHistory.map((history) => (
                  <div key={history.id} className="text-sm border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      {getStageBadge(history.stage)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(history.createdAt), 'MMM d, yyyy, hh:mm a')}
                      </span>
                    </div>
                    {history.initialConfirmationValue && (
                      <div className="text-xs">
                        Initial Confirmation: <strong>{history.initialConfirmationValue}</strong>
                        {history.initialConfirmationUpdatedAt && (
                          <span className="text-muted-foreground ml-2">
                            at {format(new Date(history.initialConfirmationUpdatedAt), 'hh:mm a')}
                          </span>
                        )}
                      </div>
                    )}
                    {history.updateRequestValue && (
                      <div className="text-xs">
                        Update Request: <strong>{history.updateRequestValue}</strong>
                        {history.updateRequestUpdatedAt && (
                          <span className="text-muted-foreground ml-2">
                            at {format(new Date(history.updateRequestUpdatedAt), 'hh:mm a')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Update Form */}
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Update Stage</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Stage</label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Initial Confirmation</label>
                <Select value={initialConfirmation} onValueChange={setInitialConfirmation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INITIAL_CONFIRMATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Update Request</label>
                <Select value={updateRequest} onValueChange={setUpdateRequest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UPDATE_REQUEST_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleUpdateStage} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Stage'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
