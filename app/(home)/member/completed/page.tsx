'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { 
  Loader2,
  ExternalLink,
  Calendar,
  User,
  DollarSign,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// Helper function to convert to IST
const formatInIST = (date: Date | string, formatStr: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const istDate = toZonedTime(dateObj, 'Asia/Kolkata')
  return format(istDate, formatStr)
}

interface CompletedTask {
  id: string
  title: string
  serviceName: string
  completedAt: string
  timeSpent: string | null
  completionNotes: string | null
  priority: string
  taskType: 'TASK' | 'ASKING_TASK'
}

interface CompletedOrder {
  orderId: string
  orderNumber: string
  customerName: string
  deliveryDate: string | null
  amount: number
  orderTypeName: string
  tasks: CompletedTask[]
}

export default function CompletedTasksPage() {
  const [orders, setOrders] = useState<CompletedOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<CompletedOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalTasks, setTotalTasks] = useState(0)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, custom
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchCompletedTasks()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, searchTerm, dateFilter, startDate, endDate])

  const fetchCompletedTasks = async () => {
    try {
      setIsLoading(true)
      
      // Fetch regular completed tasks
      const tasksResponse = await axios.get('/api/member/tasks', {
        params: {
          status: 'completed',
          sortBy: 'default'
        }
      })
      
      // Fetch completed asking tasks
      const askingTasksResponse = await axios.get('/api/member/asking-tasks', {
        params: {
          status: 'completed',
          sortBy: 'default'
        }
      })
      
      // Create a map to group tasks by order
      const ordersMap = new Map<string, any>()
      
      // Process regular tasks
      tasksResponse.data.orders.forEach((order: any) => {
        if (order.tasks.length > 0) {
          if (!ordersMap.has(order.orderId)) {
            ordersMap.set(order.orderId, {
              orderId: order.orderId,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              deliveryDate: order.deliveryDate,
              amount: order.amount,
              orderTypeName: order.orderTypeName,
              tasks: []
            })
          }
          
          order.tasks.forEach((task: any) => {
            ordersMap.get(order.orderId).tasks.push({
              id: task.id,
              title: task.title,
              serviceName: task.serviceName,
              completedAt: task.completedAt,
              timeSpent: task.timeSpent,
              completionNotes: task.completionNotes,
              priority: task.priority,
              taskType: 'TASK' as const
            })
          })
        }
      })
      
      // Process asking tasks
      askingTasksResponse.data.orders.forEach((order: any) => {
        if (order.tasks.length > 0) {
          if (!ordersMap.has(order.orderId)) {
            ordersMap.set(order.orderId, {
              orderId: order.orderId,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              deliveryDate: order.deliveryDate,
              amount: order.amount,
              orderTypeName: order.orderTypeName,
              tasks: []
            })
          }
          
          order.tasks.forEach((task: any) => {
            ordersMap.get(order.orderId).tasks.push({
              id: task.id,
              title: task.title,
              serviceName: task.serviceName,
              completedAt: task.completedAt,
              timeSpent: null, // Asking tasks don't have time spent
              completionNotes: task.notes,
              priority: task.priority,
              taskType: 'ASKING_TASK' as const
            })
          })
        }
      })
      
      // Convert map to array
      const completedOrders: CompletedOrder[] = Array.from(ordersMap.values())
      
      // Sort orders by most recent completion
      completedOrders.sort((a, b) => {
        const aLatest = Math.max(...a.tasks.map(t => new Date(t.completedAt).getTime()))
        const bLatest = Math.max(...b.tasks.map(t => new Date(t.completedAt).getTime()))
        return bLatest - aLatest
      })
      
      // Calculate total tasks
      const total = completedOrders.reduce((sum, order) => sum + order.tasks.length, 0)
      
      setOrders(completedOrders)
      setTotalTasks(total)
    } catch (error) {
      console.error('Error fetching completed tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(order => {
        const hasMatchingTask = order.tasks.some(task => {
          const completedDate = new Date(task.completedAt)
          const completedDateOnly = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate())
          
          switch (dateFilter) {
            case 'today':
              return completedDateOnly.getTime() === today.getTime()
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              return completedDateOnly >= weekAgo
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              return completedDateOnly >= monthAgo
            case 'custom':
              if (startDate && endDate) {
                const start = new Date(startDate)
                const end = new Date(endDate)
                return completedDateOnly >= start && completedDateOnly <= end
              }
              return true
            default:
              return true
          }
        })
        return hasMatchingTask
      })
    }
    
    setFilteredOrders(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
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
        <h1 className="text-3xl font-bold">Completed Tasks</h1>
        <p className="text-muted-foreground">
          View your completed tasks and time spent
        </p>
      </div>

          {/* Summary Stats */}
      {orders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filteredOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                Filtered Orders
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredOrders.reduce((sum, order) => sum + order.tasks.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Filtered Tasks
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredOrders.reduce((sum, order) => 
                  sum + order.tasks.filter(t => t.timeSpent).length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks with Time Tracking
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {orders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total Orders
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </>
              )}
            </div>
          </div>

      {currentOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">No completed tasks yet</p>
            <Button asChild>
              <Link href="/member/tasks">View Active Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Order Value</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOrders.map((order) =>
                order.tasks.map((task, index) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Link 
                        href={`/member/tasks/${order.orderId}`}
                        className="text-primary hover:underline font-medium"
                      >
                        #{order.orderNumber}
                      </Link>
                      <div className="mt-1">
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{task.serviceName}</span>
                        {task.taskType === 'ASKING_TASK' && (
                          <Badge variant="outline" className="w-fit mt-1 text-xs">
                            Asking Task
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {formatInIST(task.completedAt, 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatInIST(task.completedAt, 'hh:mm a')} IST
                        </span>
                      </div>InIST(order.deliveryDate
                    </TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {index === 0 && (
                        <div className="flex flex-col">
                          <span className="font-medium">${order.amount.toLocaleString()}</span>
                          {order.deliveryDate && (
                            <span className="text-xs text-muted-foreground">
                              Due: {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                      <TableCell>
                        {task.timeSpent ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.timeSpent}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/member/tasks/${order.orderId}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
      )}
      
      {/* Pagination */}
      {filteredOrders.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                if (pageNum <= totalPages) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}


    </div>
  )
}
