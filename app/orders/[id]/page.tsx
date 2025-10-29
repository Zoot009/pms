'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { StageDetailsModal } from '@/components/stage-details-modal'
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Package,
  ExternalLink,
  FileText,
  Plus,
  Edit,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const orderId = resolvedParams.id

  const [order, setOrder] = useState<any>(null)
  const [statistics, setStatistics] = useState<any>(null)
  const [taskGroups, setTaskGroups] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isTeamLeader, setIsTeamLeader] = useState(false)

  // UI State
  const [showServiceTasks, setShowServiceTasks] = useState(true)
  const [showAskingTasks, setShowAskingTasks] = useState(true)

  // Modal States
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [showExtendDeliveryDialog, setShowExtendDeliveryDialog] = useState(false)
  const [showAmountDialog, setShowAmountDialog] = useState(false)
  const [showCustomTaskDialog, setShowCustomTaskDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedAskingTaskId, setSelectedAskingTaskId] = useState<string | null>(null)

  // Form States
  const [newDeliveryDate, setNewDeliveryDate] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [customTaskTitle, setCustomTaskTitle] = useState('')
  const [customTaskDescription, setCustomTaskDescription] = useState('')
  const [customTaskTeamId, setCustomTaskTeamId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
    checkUserRole()
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/orders/${orderId}`)
      setOrder(response.data.order)
      setStatistics(response.data.statistics)
      setTaskGroups(response.data.taskGroups)
    } catch (error: any) {
      console.error('Error fetching order details:', error)
      if (error.response?.status === 403) {
        toast.error('You do not have access to this order')
        router.push('/orders')
      } else {
        toast.error('Failed to load order details')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const checkUserRole = async () => {
    try {
      const response = await axios.get('/api/team-leader/my-teams')
      setIsTeamLeader(response.data.teams && response.data.teams.length > 0)
    } catch (error) {
      setIsTeamLeader(false)
    }
  }

  const canEditOrder = isTeamLeader // Admins will also be team leaders in this context

  const handleVerifyOrder = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/orders/${orderId}/verify`)
      toast.success('Order verified successfully')
      setShowVerifyDialog(false)
      fetchOrderDetails()
    } catch (error) {
      console.error('Error verifying order:', error)
      toast.error('Failed to verify order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExtendDelivery = async () => {
    try {
      setIsSubmitting(true)
      await axios.patch(`/api/orders/${orderId}/extend-delivery`, {
        deliveryDate: newDeliveryDate,
      })
      toast.success('Delivery date updated successfully')
      setShowExtendDeliveryDialog(false)
      setNewDeliveryDate('')
      fetchOrderDetails()
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
      fetchOrderDetails()
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
      fetchOrderDetails()
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error('Failed to update notes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCustomTask = async () => {
    try {
      setIsSubmitting(true)
      await axios.post(`/api/orders/${orderId}/custom-task`, {
        title: customTaskTitle,
        description: customTaskDescription,
        teamId: customTaskTeamId,
      })
      toast.success('Custom task created successfully')
      setShowCustomTaskDialog(false)
      setCustomTaskTitle('')
      setCustomTaskDescription('')
      setCustomTaskTeamId('')
      fetchOrderDetails()
    } catch (error) {
      console.error('Error creating custom task:', error)
      toast.error('Failed to create custom task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShowAskingTaskDetails = (taskId: string) => {
    setSelectedAskingTaskId(taskId)
    setShowStageModal(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      IN_PROGRESS: { variant: 'default', label: 'In Progress' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
    }
    const config = variants[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      LOW: { variant: 'outline', label: 'Low' },
      MEDIUM: { variant: 'secondary', label: 'Medium' },
      HIGH: { variant: 'default', label: 'High' },
    }
    const config = variants[priority] || { variant: 'outline', label: priority }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Order not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{order.orderType.name}</h1>
            <p className="text-muted-foreground">
              Order #{order.orderNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Order Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">ID: #{order.orderNumber.slice(-4)}</CardTitle>
                {getStatusBadge(order.status)}
                <Badge variant="secondary">MEDIUM PRIORITY</Badge>
              </div>
              {order.status === 'PENDING' && (
                <Badge variant="destructive" className="w-fit">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Delivery Blocked
                </Badge>
              )}
            </div>
            {canEditOrder && (
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => setShowVerifyDialog(true)}
                  disabled={order.status !== 'PENDING'}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Verify Order
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewDeliveryDate(format(new Date(order.deliveryDate), 'yyyy-MM-dd'))
                    setShowExtendDeliveryDialog(true)
                  }}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Extend Delivery
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewAmount(order.amount.toString())
                    setShowAmountDialog(true)
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Add Amount
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomTaskDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewNotes(order.notes || '')
                    setShowNotesDialog(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Notes
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                CUSTOMER
              </div>
              <div className="font-medium">{order.customerName}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                CREATED
              </div>
              <div className="font-medium">
                {format(new Date(order.createdAt), 'MMM d, yyyy, hh:mm a')}
              </div>
              <div className="text-xs text-muted-foreground">
                by {order.createdBy?.displayName || 'System'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                ORDER TYPE
              </div>
              <div className="font-medium">{order.orderType.name}</div>
              <div className="text-xs text-muted-foreground">ID: #{order.orderType.id.slice(-4)}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                AMOUNT
              </div>
              <div className="font-medium">${order.amount}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                ORDER DATE
              </div>
              <div className="font-medium">
                {format(new Date(order.orderDate), 'MMM d, yyyy')}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                DELIVERY
              </div>
              <div className="font-medium">
                {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.completedTasks}/{statistics.totalTasks}</div>
                <div className="text-sm text-muted-foreground">Tasks Completed</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.unassignedTasks}</div>
                <div className="text-sm text-muted-foreground">Unassigned Tasks</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
                <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.overdueTasks}</div>
                <div className="text-sm text-muted-foreground">Overdue Tasks</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.daysOld}</div>
                <div className="text-sm text-muted-foreground">Days Old</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mandatory Tasks Remaining */}
      {statistics.mandatoryRemaining > 0 && (
        <Card className="border-pink-200 bg-pink-50 dark:bg-pink-950">
          <CardHeader className="bg-pink-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Mandatory Tasks Remaining ({statistics.mandatoryRemaining})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {taskGroups.mandatoryAskingTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">ASKING</Badge>
                    <span className="font-medium">{task.service?.name || 'Custom Task'}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    (Current phase: {task.currentStage.replace('_', ' ')})
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShowAskingTaskDetails(task.id)}
                >
                  Show Details
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Service Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Service Tasks</CardTitle>
              <Badge variant="secondary">
                {taskGroups.serviceTasks.filter((t: any) => t.status === 'DONE').length} done
              </Badge>
              <Badge variant="outline">
                {taskGroups.serviceTasks.filter((t: any) => t.status !== 'ASSIGNED').length} ready to assign
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowServiceTasks(!showServiceTasks)}
            >
              {showServiceTasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showServiceTasks ? 'Hide' : 'Show'} Service Tasks
            </Button>
          </div>
        </CardHeader>
        {showServiceTasks && (
          <CardContent>
            <div className="space-y-3">
              {taskGroups.serviceTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{task.service?.name || 'Custom Task'}</span>
                      <Badge variant={task.status === 'DONE' ? 'default' : 'secondary'}>
                        {task.status}
                      </Badge>
                      {getPriorityBadge(task.priority)}
                    </div>
                    {task.assignedUser && (
                      <div className="text-sm text-muted-foreground">
                        Assigned to: {task.assignedUser.displayName || task.assignedUser.email}
                      </div>
                    )}
                  </div>
                  <Link href={`/member/tasks/${orderId}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                </div>
              ))}
              {taskGroups.serviceTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No service tasks
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Asking Task Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Asking Task Progress</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAskingTasks(!showAskingTasks)}
            >
              {showAskingTasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAskingTasks ? 'Hide' : 'Show'} Asking Tasks
            </Button>
          </div>
        </CardHeader>
        {showAskingTasks && (
          <CardContent>
            <div className="space-y-3">
              {taskGroups.askingTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium mb-1">{task.service?.name || 'Custom Task'}</div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={task.completedAt ? 'default' : 'secondary'}
                        >
                          {task.completedAt ? 'Fully Completed' : `${task.currentStage.replace('_', ' ')}: ${task.progress.completed}/${task.progress.total} completed`}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowAskingTaskDetails(task.id)}
                    >
                      Show Details
                    </Button>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${task.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {taskGroups.askingTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No asking tasks
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dialogs */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to verify this order? This will mark it as IN_PROGRESS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyOrder} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExtendDeliveryDialog} onOpenChange={setShowExtendDeliveryDialog}>
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
            <Button variant="outline" onClick={() => setShowExtendDeliveryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendDelivery} disabled={isSubmitting || !newDeliveryDate}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={showCustomTaskDialog} onOpenChange={setShowCustomTaskDialog}>
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
                value={customTaskTitle}
                onChange={(e) => setCustomTaskTitle(e.target.value)}
                placeholder="Enter task title..."
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={customTaskDescription}
                onChange={(e) => setCustomTaskDescription(e.target.value)}
                placeholder="Enter task description..."
              />
            </div>
            <div>
              <Label htmlFor="teamId">Team ID</Label>
              <Input
                id="teamId"
                value={customTaskTeamId}
                onChange={(e) => setCustomTaskTeamId(e.target.value)}
                placeholder="Enter team ID..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCustomTask} 
              disabled={isSubmitting || !customTaskTitle || !customTaskTeamId}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Details Modal */}
      {selectedAskingTaskId && (
        <StageDetailsModal
          taskId={selectedAskingTaskId}
          isOpen={showStageModal}
          onClose={() => {
            setShowStageModal(false)
            setSelectedAskingTaskId(null)
          }}
          onUpdate={fetchOrderDetails}
        />
      )}
    </div>
  )
}
