'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2, Calendar, RefreshCw, Trash2, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  deadline: string | null
  notes: string | null
  order: {
    id: string
    orderNumber: string
    customerName: string
    orderDate: string
    deliveryDate: string
  }
  service: {
    id: string
    name: string
    type: string
    timeLimit: number | null
  }
  assignedUser: {
    id: string
    displayName: string
    email: string
  } | null
  createdAt: string
}

interface TeamMember {
  id: string
  displayName: string
  email: string
  activeTasksCount: number
  workloadLevel: 'Low' | 'Medium' | 'High'
}

export default function TeamTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  
  // Filters
  const [memberFilter, setMemberFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Reassignment dialog state
  const [reassignTask, setReassignTask] = useState<Task | null>(null)
  const [reassignmentData, setReassignmentData] = useState({
    memberId: '',
    deadline: '',
    priority: 'MEDIUM',
    notes: '',
  })
  
  // Discard dialog state
  const [discardTask, setDiscardTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, memberFilter, statusFilter, serviceTypeFilter, searchQuery])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [tasksResponse, membersResponse] = await Promise.all([
        axios.get('/api/team-leader/team-tasks'),
        axios.get('/api/team-leader/team-members'),
      ])
      
      setTasks(tasksResponse.data.tasks)
      setTeamMembers(membersResponse.data.members)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    // Filter by assigned member
    if (memberFilter !== 'all') {
      filtered = filtered.filter((task) => task.assignedUser?.id === memberFilter)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // Filter by service type
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter((task) => task.service.type === serviceTypeFilter)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
  }

  const openReassignDialog = (task: Task) => {
    setReassignTask(task)
    setReassignmentData({
      memberId: task.assignedUser?.id || '',
      deadline: task.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : '',
      priority: task.priority || 'MEDIUM',
      notes: task.notes || '',
    })
  }

  const closeReassignDialog = () => {
    setReassignTask(null)
    setReassignmentData({
      memberId: '',
      deadline: '',
      priority: 'MEDIUM',
      notes: '',
    })
  }

  const handleReassignTask = async () => {
    if (!reassignTask || !reassignmentData.memberId) {
      toast.error('Please select a team member')
      return
    }

    if (!reassignmentData.deadline) {
      toast.error('Please set a deadline')
      return
    }

    setIsReassigning(true)
    try {
      await axios.patch(`/api/team-leader/tasks/${reassignTask.id}/reassign`, {
        assignedTo: reassignmentData.memberId,
        deadline: reassignmentData.deadline,
        priority: reassignmentData.priority,
        notes: reassignmentData.notes,
      })

      toast.success('Task reassigned successfully')
      closeReassignDialog()
      fetchData()
    } catch (error) {
      console.error('Error reassigning task:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to reassign task')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsReassigning(false)
    }
  }

  const handleDiscardTask = async () => {
    if (!discardTask) return

    setIsDiscarding(true)
    try {
      await axios.delete(`/api/team-leader/tasks/${discardTask.id}/discard`)

      toast.success('Task discarded and returned to unassigned status')
      setDiscardTask(null)
      fetchData()
    } catch (error) {
      console.error('Error discarding task:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to discard task')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsDiscarding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      NOT_ASSIGNED: { label: 'UNASSIGNED', variant: 'secondary' },
      ASSIGNED: { label: 'ASSIGNED', variant: 'default' },
      IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },
      COMPLETED: { label: 'COMPLETED', variant: 'outline' },
      OVERDUE: { label: 'OVERDUE', variant: 'destructive' },
    }
    const config = variants[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {
      LOW: { variant: 'secondary' },
      MEDIUM: { variant: 'default' },
      HIGH: { variant: 'default' },
      URGENT: { variant: 'destructive' },
    }
    const config = variants[priority] || { variant: 'default' as const }
    return <Badge variant={config.variant} className="text-xs">{priority}</Badge>
  }

  const getWorkloadBadge = (level: string) => {
    const colors: Record<string, string> = {
      Low: 'bg-green-100 text-green-800 border-green-200',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      High: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return (
      <Badge variant="outline" className={`text-xs ${colors[level] || ''}`}>
        {level}
      </Badge>
    )
  }

  const getMaxDeadline = (deliveryDate: string) => {
    // Format as datetime-local max (one minute before delivery)
    const deliveryDateTime = new Date(deliveryDate)
    deliveryDateTime.setMinutes(deliveryDateTime.getMinutes() - 1)
    return format(deliveryDateTime, "yyyy-MM-dd'T'HH:mm")
  }

  const getMinDeadline = (orderDate: string) => {
    // Minimum is the order creation date
    const orderDateTime = new Date(orderDate)
    return format(orderDateTime, "yyyy-MM-dd'T'HH:mm")
  }

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold">Team Tasks Overview</h1>
          <p className="text-muted-foreground">
            View and manage all tasks assigned to your team members
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Tasks</CardTitle>
            <CardDescription>Search and filter tasks by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Order, customer, service, task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Team Member</Label>
                <Select value={memberFilter} onValueChange={setMemberFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.displayName || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="SERVICE_TASK">Service Task</SelectItem>
                    <SelectItem value="ASKING_SERVICE">Asking Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Team Tasks</CardTitle>
            <CardDescription>All tasks assigned to your team members</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No tasks found matching your filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">#{task.order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.order.customerName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{task.service.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.service.type.replace('_', ' ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] space-y-1">
                            <div className="text-sm font-medium truncate">{task.title}</div>
                            {task.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.assignedUser ? (
                            <div className="text-sm">
                              {task.assignedUser.displayName || task.assignedUser.email}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          {task.deadline ? (
                            <div className="flex items-center gap-2">
                              <div className="text-sm">
                                {format(new Date(task.deadline), 'MMM d, yyyy')}
                              </div>
                              {isOverdue(task.deadline) && task.status !== 'COMPLETED' && (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No deadline</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.status !== 'COMPLETED' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReassignDialog(task)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Reassign
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDiscardTask(task)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reassignment Dialog */}
        <Dialog open={!!reassignTask} onOpenChange={(open) => !open && closeReassignDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reassign Task</DialogTitle>
              <DialogDescription>
                Order: {reassignTask?.order.orderNumber} | Service: {reassignTask?.service.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="font-medium">{reassignTask?.title}</div>
                {reassignTask?.description && (
                  <div className="text-sm text-muted-foreground">{reassignTask.description}</div>
                )}
                {reassignTask?.assignedUser && (
                  <div className="text-sm">
                    Currently assigned to: {reassignTask.assignedUser.displayName || reassignTask.assignedUser.email}
                  </div>
                )}
                {reassignTask && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span>
                      Delivery Date: {format(new Date(reassignTask.order.deliveryDate), 'MMM d, yyyy, hh:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* Team Member Selection */}
              <div>
                <Label>Select Team Member *</Label>
                <Select
                  value={reassignmentData.memberId}
                  onValueChange={(value) =>
                    setReassignmentData({ ...reassignmentData, memberId: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{member.displayName || member.email}</span>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-muted-foreground">
                              {member.activeTasksCount} active
                            </span>
                            {getWorkloadBadge(member.workloadLevel)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline */}
              <div>
                <Label>Deadline *</Label>
                <Input
                  type="datetime-local"
                  value={reassignmentData.deadline}
                  onChange={(e) =>
                    setReassignmentData({ ...reassignmentData, deadline: e.target.value })
                  }
                  min={reassignTask ? getMinDeadline(reassignTask.order.orderDate) : undefined}
                  max={reassignTask ? getMaxDeadline(reassignTask.order.deliveryDate) : undefined}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be after order date and before delivery time
                </p>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority *</Label>
                <Select
                  value={reassignmentData.priority}
                  onValueChange={(value) =>
                    setReassignmentData({ ...reassignmentData, priority: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional instructions or notes..."
                  value={reassignmentData.notes}
                  onChange={(e) =>
                    setReassignmentData({ ...reassignmentData, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeReassignDialog} disabled={isReassigning}>
                Cancel
              </Button>
              <Button onClick={handleReassignTask} disabled={isReassigning}>
                {isReassigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reassigning...
                  </>
                ) : (
                  'Reassign Task'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Discard Confirmation Dialog */}
        <AlertDialog open={!!discardTask} onOpenChange={(open) => !open && setDiscardTask(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Task Assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will return the task to unassigned status. The task can be reassigned later.
                {discardTask && (
                  <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                    <div className="font-medium text-foreground">{discardTask.title}</div>
                    <div className="text-sm">Order: #{discardTask.order.orderNumber}</div>
                    <div className="text-sm">Service: {discardTask.service.name}</div>
                    {discardTask.assignedUser && (
                      <div className="text-sm">
                        Currently assigned to: {discardTask.assignedUser.displayName || discardTask.assignedUser.email}
                      </div>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDiscarding}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDiscardTask}
                disabled={isDiscarding}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDiscarding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Discarding...
                  </>
                ) : (
                  'Discard Assignment'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
