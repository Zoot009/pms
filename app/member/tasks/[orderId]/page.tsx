'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AskingTaskModal } from '@/components/asking-task-modal'
import Link from 'next/link'
import { 
  ArrowLeft,
  Play,
  CheckCircle2,
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  Loader2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  deadline: string | null
  serviceName: string
  startedAt: string | null
  completedAt: string | null
  completionNotes: string | null
  timeSpent: string | null
}

interface AskingTask {
  id: string
  serviceName: string
  currentStage: string
  deadline: string | null
  notes: string | null
  stageHistory: any[]
}

interface OrderDetail {
  id: string
  orderNumber: string
  customerName: string
  createdAt: string
  amount: number
  deliveryDate: string | null
  folderLink: string | null
  orderTypeName: string
  status: string
  priority: string
  tasks: Task[]
  askingTasks: AskingTask[]
}

export default function TaskDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({})
  const [selectedAskingTask, setSelectedAskingTask] = useState<AskingTask | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [resolvedParams.orderId])

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true)
  const response = await axios.get(`/api/member/tasks/order/${resolvedParams.orderId}`)
      setOrder(response.data)
    } catch (error) {
      console.error('Error fetching order details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoading(taskId)
      await axios.post(`/api/member/tasks/${taskId}/start`)
      await fetchOrderDetails()
    } catch (error: any) {
      console.error('Error starting task:', error)
      alert(error.response?.data?.error || 'Failed to start task')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      setActionLoading(taskId)
      await axios.patch(`/api/member/tasks/${taskId}/complete`, {
        completionNotes: completionNotes[taskId] || undefined
      })
      await fetchOrderDetails()
      setCompletionNotes(prev => {
        const updated = { ...prev }
        delete updated[taskId]
        return updated
      })
    } catch (error: any) {
      console.error('Error completing task:', error)
      alert(error.response?.data?.error || 'Failed to complete task')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      ASSIGNED: { label: 'NOT STARTED', variant: 'secondary' },
      IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },
      COMPLETED: { label: 'COMPLETED', variant: 'outline' },
      PENDING: { label: 'PENDING', variant: 'secondary' },
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

  const getDaysOverdue = (deliveryDate: string | null) => {
    if (!deliveryDate) return 0
    const days = differenceInDays(new Date(), new Date(deliveryDate))
    return days > 0 ? days : 0
  }

  const handleShowAskingTaskDetails = (askingTask: AskingTask) => {
    setSelectedAskingTask(askingTask)
    setIsModalOpen(true)
  }

  const handleAskingTaskUpdate = () => {
    fetchOrderDetails()
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
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Order not found or you don't have tasks in this order</p>
        <Button asChild>
          <Link href="/member/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
      </div>
    )
  }

  const daysOverdue = getDaysOverdue(order.deliveryDate)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/member/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">Order ID: {order.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(order.status)}
          {getPriorityBadge(order.priority)}
          {daysOverdue > 0 && (
            <Badge variant="destructive">
              {daysOverdue} days overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Client Name</div>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <span className="font-medium">{order.customerName}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Order Created</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {format(new Date(order.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Order Amount</div>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">${order.amount.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Delivery Date</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {order.deliveryDate 
                    ? format(new Date(order.deliveryDate), 'MMM d, yyyy')
                    : 'Not set'
                  }
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Order Type</div>
              <div className="mt-1">
                <Badge variant="outline">{order.orderTypeName}</Badge>
              </div>
            </div>
            {order.folderLink && (
              <div>
                <div className="text-sm text-muted-foreground">Resources</div>
                <div className="mt-1">
                  <Button variant="outline" size="sm" asChild>
                    <a href={order.folderLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open Folder
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Timeline */}
      {order.deliveryDate && (
        <Alert variant={daysOverdue > 0 ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {daysOverdue > 0 ? (
              `This order is ${daysOverdue} days overdue. Delivery was expected on ${format(new Date(order.deliveryDate), 'MMMM d, yyyy')}.`
            ) : (
              `Delivery scheduled for ${format(new Date(order.deliveryDate), 'MMMM d, yyyy')} (${differenceInDays(new Date(order.deliveryDate), new Date())} days remaining)`
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>Tasks assigned to you for this order</CardDescription>
        </CardHeader>
        <CardContent>
          {order.tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks assigned</p>
          ) : (
            <div className="space-y-4">
              {order.tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <CardDescription>{task.serviceName}</CardDescription>
                        {task.description && (
                          <p className="text-sm mt-2">{task.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Task Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {task.deadline && (
                        <div>
                          <span className="text-muted-foreground">Deadline: </span>
                          <span className="font-medium">
                            {format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a')}
                          </span>
                        </div>
                      )}
                      {task.startedAt && (
                        <div>
                          <span className="text-muted-foreground">Started: </span>
                          <span className="font-medium">
                            {format(new Date(task.startedAt), 'MMM d, yyyy, hh:mm a')}
                          </span>
                        </div>
                      )}
                      {task.completedAt && (
                        <div>
                          <span className="text-muted-foreground">Completed: </span>
                          <span className="font-medium">
                            {format(new Date(task.completedAt), 'MMM d, yyyy, hh:mm a')}
                          </span>
                        </div>
                      )}
                      {task.timeSpent && (
                        <div>
                          <span className="text-muted-foreground">Time Spent: </span>
                          <span className="font-medium">{task.timeSpent}</span>
                        </div>
                      )}
                    </div>

                    {/* Completion Notes (if completed) */}
                    {task.completionNotes && (
                      <div>
                        <Separator className="my-3" />
                        <div className="text-sm">
                          <span className="text-muted-foreground font-medium">Completion Notes:</span>
                          <p className="mt-1">{task.completionNotes}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {task.status !== 'COMPLETED' && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          {task.status === 'IN_PROGRESS' && (
                            <Textarea
                              placeholder="Add completion notes (optional)"
                              value={completionNotes[task.id] || ''}
                              onChange={(e) => setCompletionNotes(prev => ({
                                ...prev,
                                [task.id]: e.target.value
                              }))}
                            />
                          )}
                          <div className="flex gap-2">
                            {task.status === 'ASSIGNED' && (
                              <Button
                                onClick={() => handleStartTask(task.id)}
                                disabled={actionLoading === task.id}
                              >
                                {actionLoading === task.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 mr-2" />
                                )}
                                Start Task
                              </Button>
                            )}
                            {task.status === 'IN_PROGRESS' && (
                              <Button
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={actionLoading === task.id}
                              >
                                {actionLoading === task.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                Complete Task
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asking Tasks */}
      {order.askingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asking Tasks</CardTitle>
            <CardDescription>Client communication tasks for this order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.askingTasks.map((askingTask) => (
                <div
                  key={askingTask.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{askingTask.serviceName}</div>
                      <Badge>{askingTask.currentStage.replace('_', ' ')}</Badge>
                    </div>
                    {askingTask.deadline && (
                      <div className="text-sm text-muted-foreground">
                        Deadline: {format(new Date(askingTask.deadline), 'MMM d, yyyy, hh:mm a')}
                      </div>
                    )}
                    {askingTask.notes && (
                      <div className="text-sm text-muted-foreground">
                        Notes: {askingTask.notes}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShowAskingTaskDetails(askingTask)}
                  >
                    Show Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asking Task Modal */}
      {selectedAskingTask && (
        <AskingTaskModal
          askingTask={selectedAskingTask}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedAskingTask(null)
          }}
          onUpdate={handleAskingTaskUpdate}
        />
      )}
    </div>
  )
}
