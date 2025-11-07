'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { 
  AlertTriangle, 
  ExternalLink,
  Loader2,
  Calendar,
  DollarSign
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  serviceName: string
  startedAt: string | null
  completedAt: string | null
}

interface AskingTask {
  id: string
  title: string
  serviceName: string
  completedAt: string | null
}

interface Order {
  orderId: string
  orderNumber: string
  customerName: string
  deliveryDate: string | null
  amount: number
  folderLink: string | null
  orderTypeName: string
  tasks: Task[]
  askingTasks?: AskingTask[]
}

export default function MyTasksPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [statusFilter, priorityFilter, sortBy])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/member/tasks', {
        params: {
          status: statusFilter,
          priority: priorityFilter,
          sortBy
        }
      })
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      setStartingTaskId(taskId)
      await axios.post(`/api/member/tasks/${taskId}/start`)
      // Refresh the tasks after starting
      await fetchTasks()
    } catch (error) {
      console.error('Error starting task:', error)
    } finally {
      setStartingTaskId(null)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTaskId(taskId)
      await axios.patch(`/api/member/tasks/${taskId}/complete`, {
        completionNotes: ''
      })
      // Refresh the tasks after completing
      await fetchTasks()
    } catch (error) {
      console.error('Error completing task:', error)
    } finally {
      setCompletingTaskId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      ASSIGNED: { label: 'NOT STARTED', variant: 'secondary' },
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

  const getDeadlineWarning = (task: Task) => {
    if (!task.deadline || task.status === 'COMPLETED') return null

    const daysUntil = differenceInDays(new Date(task.deadline), new Date())
    
    if (daysUntil < 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Overdue by {Math.abs(daysUntil)} days
        </div>
      )
    }

    if (task.status === 'ASSIGNED' && daysUntil <= 2) {
      return (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Not started - Due in {daysUntil} days
        </div>
      )
    }

    if (daysUntil <= 1) {
      return (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Due in {daysUntil === 0 ? 'less than 1 day' : '1 day'}
        </div>
      )
    }

    return null
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
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="text-muted-foreground">
          Manage and track your assigned tasks
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="orderDate">Order Date</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders and Tasks */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.orderId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      Order #{order.orderNumber}
                      <Badge variant="outline">{order.orderTypeName}</Badge>
                    </CardTitle>
                    <CardDescription>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <span>Customer: {order.customerName}</span>
                        {order.deliveryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Delivery: {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${order.amount.toLocaleString()}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {order.folderLink && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={order.folderLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Folder
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/member/tasks/${order.orderId}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
                
                {/* Asking Tasks Badges */}
                {order.askingTasks && order.askingTasks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Asking Tasks
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.askingTasks.map((askingTask) => (
                        <Link key={askingTask.id} href={`/asking-tasks`}>
                          <Badge
                            variant="secondary"
                            className={`cursor-pointer transition-transform hover:scale-105 ${
                              askingTask.completedAt
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {askingTask.serviceName}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Warnings</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.serviceName}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>
                          {task.deadline 
                            ? format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{getDeadlineWarning(task)}</TableCell>
                        <TableCell>
                          {task.status === 'ASSIGNED' && (
                            <Button
                              size="sm"
                              onClick={() => handleStartTask(task.id)}
                              disabled={startingTaskId === task.id}
                            >
                              {startingTaskId === task.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                'Start Work'
                              )}
                            </Button>
                          )}
                          {task.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={completingTaskId === task.id}
                              className='text-green-500 hover:text-green-700'
                            >
                              {completingTaskId === task.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Completing...
                                </>
                              ) : (
                                'Complete Task'
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
