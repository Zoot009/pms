'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Loader2, Calendar, AlertCircle, ArrowLeft, Package, Users, CheckCircle2, Clock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'

interface Task {
  id: string
  status: string
  priority: string
  title: string
  deadline: string | null
  notes: string | null
  service: {
    id: string
    name: string
    type: string
    timeLimit: number | null
    teamId: string | null
  }
  assignedUser: {
    id: string
    email: string
    displayName: string | null
  } | null
}

interface TeamMember {
  id: string
  email: string
  displayName: string | null
  activeTasksCount: number
  workloadLevel: string
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderDate: string
  deliveryDate: string
  folderLink: string | null
  orderType: {
    name: string
  }
  tasks: Task[]
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [myTeamIds, setMyTeamIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assignmentData, setAssignmentData] = useState({
    memberId: '',
    deadline: '',
    priority: 'MEDIUM',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [orderId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [orderRes, membersRes, teamsRes] = await Promise.all([
        axios.get(`/api/team-leader/orders-with-tasks?orderId=${orderId}`),
        axios.get('/api/team-leader/team-members'),
        axios.get('/api/team-leader/my-teams'),
      ])

      if (orderRes.data.orders && orderRes.data.orders.length > 0) {
        // Find the order that matches the orderId from params
        const foundOrder = orderRes.data.orders.find((o: Order) => o.id === orderId)
        if (foundOrder) {
          setOrder(foundOrder)
        } else {
          toast.error('Order not found')
          router.push('/member/team/assign-tasks')
        }
      } else {
        toast.error('Order not found')
        router.push('/member/team/assign-tasks')
      }

      setTeamMembers(membersRes.data.members || [])
      setMyTeamIds(teamsRes.data.teamIds || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load order details')
    } finally {
      setIsLoading(false)
    }
  }

  const openAssignDialog = (task: Task) => {
    setSelectedTask(task)
    setAssignmentData({
      memberId: '',
      deadline: '',
      priority: task.priority || 'MEDIUM',
      notes: '',
    })
  }

  const closeAssignDialog = () => {
    setSelectedTask(null)
    setAssignmentData({
      memberId: '',
      deadline: '',
      priority: 'MEDIUM',
      notes: '',
    })
  }

  const handleAssignTask = async () => {
    if (!selectedTask || !assignmentData.memberId) {
      toast.error('Please select a team member')
      return
    }

    if (!assignmentData.deadline) {
      toast.error('Please set a deadline')
      return
    }

    setIsAssigning(true)
    try {
      await axios.post(`/api/team-leader/tasks/${selectedTask.id}/assign`, {
        assignedTo: assignmentData.memberId,
        deadline: assignmentData.deadline,
        priority: assignmentData.priority,
        notes: assignmentData.notes,
      })

      toast.success('Task assigned successfully')
      closeAssignDialog()
      fetchData() // Refresh data
    } catch (error) {
      console.error('Error assigning task:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to assign task')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsAssigning(false)
    }
  }

  const canAssignTask = (task: Task) => {
    return task.service.teamId && myTeamIds.includes(task.service.teamId)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      NOT_ASSIGNED: { label: 'READY TO ASSIGN', variant: 'secondary' },
      ASSIGNED: { label: 'ASSIGNED', variant: 'default' },
      IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },
      COMPLETED: { label: 'COMPLETED', variant: 'outline' },
    }
    const config = variants[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {
      LOW: { variant: 'secondary' },
      MEDIUM: { variant: 'default' },
      HIGH: { variant: 'default' },
      URGENT: { variant: 'destructive' },
    }
    const config = variants[priority] || { variant: 'default' as const }
    return <Badge variant={config.variant}>{priority}</Badge>
  }

  const getWorkloadBadge = (level: string) => {
    const colors: Record<string, string> = {
      Low: 'bg-green-100 text-green-800 border-green-200',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      High: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return (
      <Badge variant="outline" className={`${colors[level] || ''}`}>
        {level}
      </Badge>
    )
  }

  const getMaxDeadline = (deliveryDate: string) => {
    const deliveryDateTime = new Date(deliveryDate)
    deliveryDateTime.setMinutes(deliveryDateTime.getMinutes() - 1)
    return format(deliveryDateTime, "yyyy-MM-dd'T'HH:mm")
  }

  const getMinDeadline = (orderDate: string) => {
    const orderDateTime = new Date(orderDate)
    return format(orderDateTime, "yyyy-MM-dd'T'HH:mm")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Order not found</p>
      </div>
    )
  }

  const assignableTasks = order.tasks.filter((t) => canAssignTask(t))
  const askingTasks = order.tasks.filter((t) => !canAssignTask(t))

  const taskCounts = {
    unassigned: order.tasks.filter((t) => t.status === 'NOT_ASSIGNED').length,
    assigned: order.tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length,
    completed: order.tasks.filter((t) => t.status === 'COMPLETED').length,
  }

  const daysLeft = Math.ceil(
    (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/member/team/assign-tasks">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Assign tasks to your team members and track progress
            </p>
          </div>
        </div>

        {/* Order Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Order Information</CardTitle>
                <CardDescription>Details about this order</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={daysLeft < 2 ? 'destructive' : 'outline'}>
                  {daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`}
                </Badge>
                {!order.folderLink && (
                  <Badge variant="destructive">No Folder Link</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Warning Alert if no folder link */}
            {!order.folderLink && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-semibold text-destructive">Folder Link Required</div>
                  <div className="text-sm text-muted-foreground">
                    A folder link must be added to this order before tasks can be assigned. 
                    Please add the folder link in the order management section.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Customer Name</div>
                <div className="text-base font-medium">{order.customerName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Order Type</div>
                <div className="text-base font-medium">{order.orderType.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Order Date</div>
                <div className="text-base font-medium">
                  {format(new Date(order.orderDate), 'MMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Delivery Date</div>
                <div className="text-base font-medium">
                  {format(new Date(order.deliveryDate), 'MMM d, yyyy, hh:mm a')}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex gap-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{taskCounts.unassigned}</div>
                  <div className="text-sm text-muted-foreground">Pending Tasks</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{taskCounts.assigned}</div>
                  <div className="text-sm text-muted-foreground">Assigned Tasks</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{taskCounts.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed Tasks</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignable Tasks (Own Team) */}
        {assignableTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Team's Tasks ({assignableTasks.length})</CardTitle>
              <CardDescription>Tasks that you can assign to your team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignableTasks.map((task) => (
                <div key={task.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{task.service.name}</h3>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {task.service.type.replace('_', ' ')}
                        {task.service.timeLimit && ` · ${task.service.timeLimit}h time limit`}
                      </div>
                      {task.assignedUser && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4" />
                          <span>
                            Assigned to: {task.assignedUser.displayName || task.assignedUser.email}
                          </span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span>Deadline: {format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a')}</span>
                        </div>
                      )}
                      {task.notes && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {task.notes}
                        </div>
                      )}
                    </div>
                    {task.status === 'NOT_ASSIGNED' && (
                      <Button 
                        onClick={() => openAssignDialog(task)}
                        disabled={!order.folderLink}
                      >
                        Assign Task
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Asking Tasks (Other Teams) */}
        {askingTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Asking Tasks ({askingTasks.length})</CardTitle>
              <CardDescription>
                Tasks handled by other teams - you can view progress but cannot assign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {askingTasks.map((task) => (
                <div key={task.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{task.service.name}</h3>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                        <Badge variant="outline" className="text-xs">
                          Other Team's Task
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {task.service.type.replace('_', ' ')}
                      </div>
                      {task.assignedUser && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4" />
                          <span>
                            Assigned to: {task.assignedUser.displayName || task.assignedUser.email}
                          </span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span>Deadline: {format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Assignment Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && closeAssignDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Task to Team Member</DialogTitle>
              <DialogDescription>
                Order: {order.orderNumber} | Service: {selectedTask?.service.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="font-medium">{selectedTask?.service.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedTask?.service.type.replace('_', ' ')}
                  {selectedTask?.service.timeLimit && ` · ${selectedTask.service.timeLimit}h time limit`}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>
                    Delivery: {format(new Date(order.deliveryDate), 'MMM d, yyyy, hh:mm a')}
                  </span>
                </div>
              </div>

              {/* Team Member Selection */}
              <div>
                <Label>Select Team Member *</Label>
                <Select
                  value={assignmentData.memberId}
                  onValueChange={(value) =>
                    setAssignmentData({ ...assignmentData, memberId: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{member.displayName || member.email}</span>
                          <div className="flex items-center gap-2">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Select based on workload to balance task distribution
                </p>
              </div>

              {/* Deadline */}
              <div>
                <Label>Deadline *</Label>
                <Input
                  type="datetime-local"
                  value={assignmentData.deadline}
                  onChange={(e) =>
                    setAssignmentData({ ...assignmentData, deadline: e.target.value })
                  }
                  min={getMinDeadline(order.orderDate)}
                  max={getMaxDeadline(order.deliveryDate)}
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
                  value={assignmentData.priority}
                  onValueChange={(value) =>
                    setAssignmentData({ ...assignmentData, priority: value })
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
                  placeholder="Add any additional instructions or notes for the team member..."
                  value={assignmentData.notes}
                  onChange={(e) =>
                    setAssignmentData({ ...assignmentData, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeAssignDialog} disabled={isAssigning}>
                Cancel
              </Button>
              <Button onClick={handleAssignTask} disabled={isAssigning}>
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Task'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
