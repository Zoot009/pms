'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { 
  Loader2,
  Search,
  CheckCircle2,
  Flag,
  ExternalLink,
  AlertCircle,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { StageDetailsModal } from '@/components/stage-details-modal'

interface AskingTask {
  id: string
  title: string
  currentStage: string
  priority: string
  deadline: string | null
  isFlagged: boolean
  completedAt: string | null
  order: {
    id: string
    orderNumber: string
    customerName: string
    folderLink: string | null
  }
  service: {
    id: string
    name: string
  }
  team: {
    id: string
    name: string
  }
  assignedUser: {
    id: string
    email: string
    displayName: string | null
  } | null
}

export default function AskingTasksPage() {
  const [askingTasks, setAskingTasks] = useState<AskingTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [flaggedFilter, setFlaggedFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Complete dialog state
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AskingTask | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Stage details modal state
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    fetchAskingTasks()
  }, [statusFilter, flaggedFilter, stageFilter])

  const fetchAskingTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        flagged: flaggedFilter,
        stage: stageFilter,
        search: searchQuery,
      })
      const response = await axios.get(`/api/asking-tasks?${params}`)
      setAskingTasks(response.data.askingTasks)
    } catch (error) {
      console.error('Error fetching asking tasks:', error)
      toast.error('Failed to load asking tasks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    fetchAskingTasks()
  }

  const handleToggleFlag = async (taskId: string, currentFlag: boolean) => {
    try {
      await axios.patch(`/api/asking-tasks/${taskId}/flag`, {
        isFlagged: !currentFlag,
      })
      toast.success(currentFlag ? 'Task unflagged' : 'Task flagged as issue')
      fetchAskingTasks()
    } catch (error) {
      console.error('Error toggling flag:', error)
      toast.error('Failed to update task')
    }
  }

  const handleMarkComplete = async () => {
    if (!selectedTask) return

    try {
      setIsSubmitting(true)
      await axios.patch(`/api/asking-tasks/${selectedTask.id}/complete`, {
        notes: completionNotes || undefined,
      })
      toast.success('Task marked as complete')
      setShowCompleteDialog(false)
      setSelectedTask(null)
      setCompletionNotes('')
      fetchAskingTasks()
    } catch (error: any) {
      console.error('Error completing task:', error)
      toast.error(error.response?.data?.error || 'Failed to complete task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShowDetails = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowStageModal(true)
  }

  const handleCloseStageModal = () => {
    setShowStageModal(false)
    setSelectedTaskId(null)
  }

  const handleStageUpdate = () => {
    fetchAskingTasks()
  }

  const getStageBadge = (stage: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' }> = {
      ASKED: { variant: 'secondary' },
      SHARED: { variant: 'default' },
      VERIFIED: { variant: 'default' },
      INFORMED_TEAM: { variant: 'outline' },
    }
    const config = variants[stage] || { variant: 'outline' }
    return <Badge variant={config.variant}>{stage.replace('_', ' ')}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {
      LOW: { variant: 'secondary' },
      MEDIUM: { variant: 'default' },
      HIGH: { variant: 'default' },
      URGENT: { variant: 'destructive' },
    }
    const config = variants[priority] || { variant: 'default' }
    return <Badge variant={config.variant}>{priority}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-3xl font-bold">Asking Tasks</h1>
        <p className="text-muted-foreground">
          Manage client communication and asking service tasks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={flaggedFilter} onValueChange={setFlaggedFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Flag status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
                <SelectItem value="unflagged">Unflagged Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="ASKED">Asked</SelectItem>
                <SelectItem value="SHARED">Shared</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="INFORMED_TEAM">Team Informed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, orders, customers..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({askingTasks.length})</CardTitle>
          <CardDescription>
            Click on "Show Details" to view and update stage information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {askingTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No asking tasks found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {askingTasks.map((task) => (
                  <TableRow 
                    key={task.id}
                    className={task.isFlagged ? 'bg-red-50 dark:bg-red-950/20' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={task.isFlagged}
                        onCheckedChange={() => handleToggleFlag(task.id, task.isFlagged)}
                        className={task.isFlagged ? 'border-red-600' : ''}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{task.service.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>#{task.order.orderNumber}</span>
                        {task.order.folderLink && (
                          <a
                            href={task.order.folderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{task.order.customerName}</TableCell>
                    <TableCell>{getStageBadge(task.currentStage)}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {task.deadline 
                        ? format(new Date(task.deadline), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {task.completedAt ? (
                        <Badge variant="outline">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleShowDetails(task.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Show Details
                        </Button>
                        {!task.completedAt && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task)
                              setShowCompleteDialog(true)
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Task as Complete</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <>
                  <div className="mt-2">
                    <strong>Service:</strong> {selectedTask.service.name}
                  </div>
                  <div>
                    <strong>Order:</strong> #{selectedTask.order.orderNumber}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Completion Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any completion notes..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompleteDialog(false)
                setSelectedTask(null)
                setCompletionNotes('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkComplete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Details Modal */}
      {selectedTaskId && (
        <StageDetailsModal
          taskId={selectedTaskId}
          isOpen={showStageModal}
          onClose={handleCloseStageModal}
          onUpdate={handleStageUpdate}
        />
      )}
    </div>
  )
}
