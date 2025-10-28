'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

interface StageHistoryItem {
  id: string
  stage: string
  initialConfirmation: string | null
  initialStaff: string | null
  updateRequest: string | null
  updateStaff: string | null
  notes: string | null
  completedAt: string | null
  createdAt: string
}

interface AskingTask {
  id: string
  serviceName: string
  currentStage: string
  deadline: string | null
  stageHistory: StageHistoryItem[]
}

interface AskingTaskModalProps {
  askingTask: AskingTask
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

export function AskingTaskModal({ askingTask, isOpen, onClose, onUpdate }: AskingTaskModalProps) {
  const [selectedStage, setSelectedStage] = useState<string>(askingTask.currentStage)
  const [initialConfirmation, setInitialConfirmation] = useState<string>('')
  const [initialStaff, setInitialStaff] = useState<string>('')
  const [updateRequest, setUpdateRequest] = useState<string>('')
  const [updateStaff, setUpdateStaff] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/member/asking-tasks/${askingTask.id}/stage`, {
        stage: selectedStage,
        initialConfirmation: initialConfirmation || undefined,
        initialStaff: initialStaff || undefined,
        updateRequest: updateRequest || undefined,
        updateStaff: updateStaff || undefined,
        notes: notes || undefined,
      })

      // Reset form
      setInitialConfirmation('')
      setInitialStaff('')
      setUpdateRequest('')
      setUpdateStaff('')
      setNotes('')

      // Notify parent to refresh
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('Error updating asking task:', error)
      alert(error.response?.data?.error || 'Failed to update asking task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStageBadge = (stage: string) => {
    const colors: Record<string, 'secondary' | 'default' | 'outline'> = {
      ASKED: 'secondary',
      SHARED: 'default',
      VERIFIED: 'default',
      INFORMED_TEAM: 'outline',
    }
    return <Badge variant={colors[stage] || 'default'}>{stage.replace('_', ' ')}</Badge>
  }

  const getStageHistory = (stage: string) => {
    return askingTask.stageHistory.filter(h => h.stage === stage)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asking Task Details - {askingTask.serviceName}</DialogTitle>
          <DialogDescription>
            Update the stage and track progress for this asking task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stage & Deadline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Stage:</span>
              {getStageBadge(askingTask.currentStage)}
            </div>
            {askingTask.deadline && (
              <div className="text-sm text-muted-foreground">
                Deadline: {format(new Date(askingTask.deadline), 'MMM d, yyyy, hh:mm a')}
              </div>
            )}
          </div>

          {/* Stage Progress Table */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Stage History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>Initial Confirmation</TableHead>
                  <TableHead>Initial Staff</TableHead>
                  <TableHead>Update Request</TableHead>
                  <TableHead>Update Staff</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {STAGES.map(({ value, label }) => {
                  const history = getStageHistory(value)
                  const latestEntry = history[0] // Most recent entry for this stage

                  return (
                    <TableRow key={value}>
                      <TableCell className="font-medium">
                        {getStageBadge(value)}
                      </TableCell>
                      <TableCell>
                        {latestEntry?.initialConfirmation || '-'}
                      </TableCell>
                      <TableCell>
                        {latestEntry?.initialStaff || '-'}
                      </TableCell>
                      <TableCell>
                        {latestEntry?.updateRequest || '-'}
                      </TableCell>
                      <TableCell>
                        {latestEntry?.updateStaff || '-'}
                      </TableCell>
                      <TableCell>
                        {latestEntry?.completedAt ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-xs">
                              {format(new Date(latestEntry.completedAt), 'MMM d, hh:mm a')}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Update Form */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Update Stage</h3>

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Initial Staff Name</label>
                <Input
                  value={initialStaff}
                  onChange={(e) => setInitialStaff(e.target.value)}
                  placeholder="Enter staff name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Update Request</label>
                <Select value={updateRequest} onValueChange={setUpdateRequest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Required">Not Required</SelectItem>
                    <SelectItem value="Asked Changes">Asked Changes</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Reshared">Reshared</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Update Staff Name</label>
                <Input
                  value={updateStaff}
                  onChange={(e) => setUpdateStaff(e.target.value)}
                  placeholder="Enter staff name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this update..."
                rows={3}
              />
            </div>

            {/* Notes from History */}
            {askingTask.stageHistory.filter(h => h.notes).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Previous Notes</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {askingTask.stageHistory
                    .filter(h => h.notes)
                    .map((history) => (
                      <div key={history.id} className="text-sm bg-muted p-2 rounded">
                        <div className="flex items-center justify-between mb-1">
                          {getStageBadge(history.stage)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(history.createdAt), 'MMM d, yyyy, hh:mm a')}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{history.notes}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  )
}
