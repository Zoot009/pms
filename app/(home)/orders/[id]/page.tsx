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
import { StageDetailsModal } from '@/components/stage-details-modal'
import { OrderActionButtons } from '@/components/order-action-buttons'
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
  const [canEdit, setCanEdit] = useState(false)

  // UI State
  const [showServiceTasks, setShowServiceTasks] = useState(true)
  const [showAskingTasks, setShowAskingTasks] = useState(true)
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedAskingTaskId, setSelectedAskingTaskId] = useState<string | null>(null)

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
      // Get current user info
      const userResponse = await axios.get('/api/auth/sync')
      setCurrentUser(userResponse.data.user)
      
      const user = userResponse.data.user
      
      // Check if user can edit orders
      const isAdmin = user?.role === 'ADMIN'
      const isOrderCreator = user?.role === 'ORDER_CREATOR'
      
      // Check if user is a team leader
      const teamResponse = await axios.get('/api/team-leader/my-teams')
      const isTeamLeaderRole = teamResponse.data.teams && teamResponse.data.teams.length > 0
      setIsTeamLeader(isTeamLeaderRole)
      
      // User can edit if they are admin, order creator, or team leader
      setCanEdit(isAdmin || isOrderCreator || isTeamLeaderRole)
    } catch (error) {
      console.error('Error checking user role:', error)
      setIsTeamLeader(false)
      setCanEdit(false)
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
            {canEdit && (
              <OrderActionButtons
                orderId={orderId}
                currentDeliveryDate={order.deliveryDate}
                currentAmount={order.amount.toString()}
                currentNotes={order.notes}
                onUpdate={fetchOrderDetails}
                variant="default"
              />
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
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-zinc-500" />
                  Mandatory Tasks
                </CardTitle>
                <CardDescription className="mt-1">
                  {statistics.mandatoryRemaining} task{statistics.mandatoryRemaining !== 1 ? 's' : ''} must be completed before delivery
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                {statistics.mandatoryRemaining} Remaining
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {taskGroups.mandatoryTasks && taskGroups.mandatoryTasks.length > 0 ? (
                taskGroups.mandatoryTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          {'service' in task && task.service ? (
                            <Badge variant="outline" className="text-xs">
                              Asking
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Service
                            </Badge>
                          )}
                          <span className="font-medium text-sm">
                            {task.service?.name || task.title || 'Custom Task'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {'currentStage' in task && task.currentStage && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              <span>{task.currentStage.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          
                          {task.assignedUser ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              <span>{task.assignedUser.displayName || task.assignedUser.email}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500">
                              <AlertCircle className="h-3 w-3" />
                              <span>Unassigned</span>
                            </div>
                          )}
                        </div>
                        
                        {'progress' in task && task.progress && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {task.progress.completed} of {task.progress.total} stages
                              </span>
                              <span className="font-medium">{task.progress.percentage}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                                style={{ width: `${task.progress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        {'currentStage' in task ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowAskingTaskDetails(task.id)}
                          >
                            Details
                          </Button>
                        ) : (
                          <Link href={`/member/tasks/${orderId}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No mandatory tasks remaining
                </div>
              )}
            </div>
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
