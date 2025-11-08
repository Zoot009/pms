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
import { EditOrderButton } from '@/components/edit-order-button'
import { ExtendDeliveryButton } from '@/components/extend-delivery-button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  XCircle,
  PlayCircle,
  PauseCircle,
  Trash2,
  Settings,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
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
  const [canDelete, setCanDelete] = useState(false)

  // UI State
  const [showServiceTasks, setShowServiceTasks] = useState(true)
  const [showAskingTasks, setShowAskingTasks] = useState(true)
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedAskingTaskId, setSelectedAskingTaskId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
      const isAdminUser = user?.role === 'ADMIN'
      const isOrderCreator = user?.role === 'ORDER_CREATOR'
      
      // Check if user is a team leader
      const teamResponse = await axios.get('/api/team-leader/my-teams')
      const isTeamLeaderRole = teamResponse.data.teams && teamResponse.data.teams.length > 0
      setIsTeamLeader(isTeamLeaderRole)
      
      // User can edit if they are admin, order creator, or team leader
      setCanEdit(isAdminUser || isOrderCreator || isTeamLeaderRole)
      
      // User can delete if they are admin or order creator
      setCanDelete(isAdminUser || isOrderCreator)
    } catch (error) {
      console.error('Error checking user role:', error)
      setIsTeamLeader(false)
      setCanEdit(false)
      setCanDelete(false)
    }
  }

  const handleDeleteOrder = async () => {
    try {
      setIsDeleting(true)
      await axios.delete(`/api/orders/${orderId}`)
      toast.success('Order deleted successfully')
      
      // Redirect based on user role
      if (currentUser?.role === 'ADMIN') {
        router.push('/admin/orders')
      } else if (currentUser?.role === 'ORDER_CREATOR') {
        router.push('/order-creator/orders')
      } else {
        router.push('/orders')
      }
    } catch (error: any) {
      console.error('Error deleting order:', error)
      toast.error(error.response?.data?.message || 'Failed to delete order')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
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
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      LOW: { variant: 'outline', label: 'Low' },
      MEDIUM: { variant: 'secondary', label: 'Medium' },
      HIGH: { variant: 'default', label: 'High' },
      URGENT: { variant: 'destructive', label: 'Urgent' },
    }
    const config = variants[priority] || { variant: 'outline', label: priority }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const isTaskOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null
    return differenceInDays(new Date(deadline), new Date())
  }

  // Categorize tasks
  const unassignedTasks = taskGroups?.serviceTasks?.filter((t: any) => !t.assignedUser) || []
  const assignedTasks = taskGroups?.serviceTasks?.filter((t: any) => t.assignedUser && t.status === 'ASSIGNED') || []
  const inProgressTasks = taskGroups?.serviceTasks?.filter((t: any) => t.status === 'IN_PROGRESS') || []
  const completedTasks = taskGroups?.serviceTasks?.filter((t: any) => t.status === 'COMPLETED') || []
  const overdueTasks = taskGroups?.serviceTasks?.filter((t: any) => 
    t.status !== 'COMPLETED' && isTaskOverdue(t.deadline)
  ) || []

  // Categorize asking tasks
  const askingTasks = taskGroups?.askingTasks || []
  const completedAskingTasks = askingTasks.filter((t: any) => t.completedAt)
  const pendingAskingTasks = askingTasks.filter((t: any) => !t.completedAt)

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
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">{order.orderType.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <EditOrderButton
                orderId={orderId}
                currentCustomerName={order.customerName}
                currentCustomerEmail={order.customerEmail}
                currentCustomerPhone={order.customerPhone || ''}
                currentAmount={order.amount.toString()}
                currentNotes={order.notes}
                onUpdate={fetchOrderDetails}
              />
              <ExtendDeliveryButton
                orderId={orderId}
                currentDeliveryDate={order.deliveryDate}
                onUpdate={fetchOrderDetails}
              />
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Order
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Order Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Information</CardTitle>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                Customer Name
              </div>
              <div className="font-medium">{order.customerName}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                Customer Email
              </div>
              <div className="font-medium">{order.customerEmail}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                Customer Phone
              </div>
              <div className="font-medium">{order.customerPhone || '-'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Amount
              </div>
              <div className="font-medium text-lg">${order.amount.toLocaleString()}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Order Date
              </div>
              <div className="font-medium">{format(new Date(order.orderDate), 'MMM d, yyyy')}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Delivery Date
              </div>
              <div className="font-medium">{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                Order Type
              </div>
              <div className="font-medium">{order.orderType.name}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                Created By
              </div>
              <div className="font-medium">{order.createdBy?.displayName || 'System'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                Created At
              </div>
              <div className="font-medium">{format(new Date(order.createdAt), 'MMM d, yyyy, hh:mm a')}</div>
            </div>
            {order.folderLink && (
              <div className="col-span-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <ExternalLink className="h-4 w-4" />
                  Folder Link
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={order.folderLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Folder
                  </a>
                </Button>
              </div>
            )}
            {order.notes && (
              <div className="col-span-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  Notes
                </div>
                <div className="text-sm p-3 bg-muted rounded-md">{order.notes}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.totalTasks}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.completedTasks}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.unassignedTasks}</div>
                <div className="text-sm text-muted-foreground">Unassigned</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
                <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.overdueTasks}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistics.daysOld}</div>
                <div className="text-sm text-muted-foreground">Days Old</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asking Tasks */}
      {askingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Asking Tasks</CardTitle>
                <CardDescription>
                  Customer information and detail collection tasks
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{completedAskingTasks.length} Completed</Badge>
                <Badge variant="outline">{pendingAskingTasks.length} Pending</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {askingTasks.map((task: any) => (
                <Badge
                  key={task.id}
                  className={`cursor-pointer transition-transform hover:scale-105 ${
                    task.completedAt
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  onClick={() => handleShowAskingTaskDetails(task.id)}
                >
                  {task.service?.name || task.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Overdue Tasks ({overdueTasks.length})</CardTitle>
            </div>
            <CardDescription>These tasks have passed their deadline</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueTasks.map((task: any) => (
                  <TableRow key={task.id} className="bg-red-50 dark:bg-red-950/20">
                    <TableCell className="font-medium">{task.service?.name || task.title}</TableCell>
                    <TableCell>
                      {task.assignedUser ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {task.assignedUser.displayName || task.assignedUser.email}
                        </div>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {Math.abs(getDaysUntilDeadline(task.deadline) || 0)} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle>Unassigned Tasks ({unassignedTasks.length})</CardTitle>
            </div>
            <CardDescription>These tasks need to be assigned to team members</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedTasks.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.service?.name || task.title}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      {isTeamLeader && (
                        <Link href={`/member/tasks/${orderId}`}>
                          <Button variant="outline" size="sm">
                            Assign
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* In Progress Tasks */}
      {inProgressTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-blue-600" />
              <CardTitle>In Progress Tasks ({inProgressTasks.length})</CardTitle>
            </div>
            <CardDescription>Tasks currently being worked on</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Time Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inProgressTasks.map((task: any) => {
                  const daysRemaining = getDaysUntilDeadline(task.deadline)
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.service?.name || task.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {task.assignedUser?.displayName || task.assignedUser?.email}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        {task.startedAt ? format(new Date(task.startedAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a') : '-'}
                      </TableCell>
                      <TableCell>
                        {daysRemaining !== null && (
                          <Badge variant={daysRemaining < 0 ? 'destructive' : daysRemaining <= 1 ? 'secondary' : 'outline'}>
                            {daysRemaining < 0 
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : daysRemaining === 0 
                              ? 'Due today' 
                              : `${daysRemaining} days left`
                            }
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assigned (Not Started) Tasks */}
      {assignedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5" />
              <CardTitle>Assigned Tasks ({assignedTasks.length})</CardTitle>
            </div>
            <CardDescription>Tasks assigned but not yet started</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Days Until Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedTasks.map((task: any) => {
                  const daysRemaining = getDaysUntilDeadline(task.deadline)
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.service?.name || task.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {task.assignedUser?.displayName || task.assignedUser?.email}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a') : '-'}
                      </TableCell>
                      <TableCell>
                        {daysRemaining !== null && (
                          <Badge variant={daysRemaining <= 2 ? 'secondary' : 'outline'}>
                            {daysRemaining === 0 ? 'Due today' : `${daysRemaining} days`}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Completed Tasks ({completedTasks.length})</CardTitle>
            </div>
            <CardDescription>Successfully completed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTasks.map((task: any) => {
                  const duration = task.startedAt && task.completedAt
                    ? differenceInDays(new Date(task.completedAt), new Date(task.startedAt))
                    : null
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.service?.name || task.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {task.assignedUser?.displayName || task.assignedUser?.email}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        {task.startedAt ? format(new Date(task.startedAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {task.completedAt ? format(new Date(task.completedAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {duration !== null && (
                          <Badge variant="outline">
                            {duration === 0 ? 'Same day' : `${duration} days`}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order <strong>#{order.orderNumber}</strong> for{' '}
              <strong>{order.customerName}</strong>.
              <br />
              <br />
              This action cannot be undone. All associated tasks, asking tasks, and data will be
              permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Order
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
