'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Truck,
  ListChecks,
  Filter,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Task {
  id: string
  title: string
  status: string
  completedAt: string | null
  service: {
    id: string
    name: string
    type: string
  } | null
}

interface AskingTask {
  id: string
  title: string
  currentStage: string
  completedAt: string | null
  isMandatory: boolean
  service: {
    id: string
    name: string
    type: string
  }
}

interface OrderStats {
  totalTasks: number
  completedTasks: number
  unassignedTasks: number
  overdueTasks: number
  mandatoryTasks: number
  mandatoryCompleted: number
  mandatoryRemaining: number
  daysOld: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string
  amount: string
  orderDate: string
  deliveryDate: string
  deliveryTime: string | null
  status: string
  folderLink: string | null
  notes: string | null
  orderType: {
    id: string
    name: string
  }
  tasks: Task[]
  askingTasks: AskingTask[]
  statistics: OrderStats
}

interface ServiceGroup {
  serviceName: string
  serviceType: string
  tasks: Array<{
    id: string
    title: string
    isCompleted: boolean
    type: 'task' | 'asking_task'
    isMandatory?: boolean
  }>
}

export default function DeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const [verifiedTasks, setVerifiedTasks] = useState<Record<string, boolean>>({})
  const [isDelivering, setIsDelivering] = useState(false)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('deliveryDate')
  const [readyFilter, setReadyFilter] = useState<string>('all')

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, searchQuery, dateFrom, dateTo, sortBy, readyFilter])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      // Fetch all non-completed orders (PENDING and IN_PROGRESS)
      const response = await axios.get('/api/order-creator/orders?status=ALL')
      
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        (order.customerEmail && order.customerEmail.toLowerCase().includes(query))
      )
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(order => new Date(order.deliveryDate) >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(order => new Date(order.deliveryDate) <= dateTo)
    }

    // Ready to deliver filter
    if (readyFilter === 'ready') {
      filtered = filtered.filter(order => {
        const status = getDeliveryStatus(order)
        return status.type === 'complete'
      })
    } else if (readyFilter === 'not-ready') {
      filtered = filtered.filter(order => {
        const status = getDeliveryStatus(order)
        return status.type !== 'complete'
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deliveryDate':
          return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
        case 'deliveryDate-desc':
          return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
        case 'customerName':
          return a.customerName.localeCompare(b.customerName)
        case 'amount':
          return parseFloat(b.amount) - parseFloat(a.amount)
        case 'progress':
          const aProgress = a.statistics.totalTasks > 0 ? (a.statistics.completedTasks / a.statistics.totalTasks) : 0
          const bProgress = b.statistics.totalTasks > 0 ? (b.statistics.completedTasks / b.statistics.totalTasks) : 0
          return bProgress - aProgress
        default:
          return 0
      }
    })

    setFilteredOrders(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setDateFrom(undefined)
    setDateTo(undefined)
    setSortBy('deliveryDate')
    setReadyFilter('all')
  }

  const hasActiveFilters = searchQuery || dateFrom || dateTo || sortBy !== 'deliveryDate' || readyFilter !== 'all'

  const handleOpenDeliveryModal = (order: Order) => {
    setSelectedOrder(order)
    
    // Group tasks by service
    const grouped: Record<string, ServiceGroup> = {}
    
    // Add regular tasks
    order.tasks.forEach(task => {
      const serviceName = task.service?.name || 'Unassigned Tasks'
      const serviceType = task.service?.type || 'SERVICE_TASK'
      
      if (!grouped[serviceName]) {
        grouped[serviceName] = {
          serviceName,
          serviceType,
          tasks: []
        }
      }
      
      grouped[serviceName].tasks.push({
        id: task.id,
        title: task.title,
        isCompleted: !!task.completedAt,
        type: 'task'
      })
    })
    
    // Add asking tasks
    order.askingTasks.forEach(task => {
      const serviceName = task.service.name
      const serviceType = task.service.type
      
      if (!grouped[serviceName]) {
        grouped[serviceName] = {
          serviceName,
          serviceType,
          tasks: []
        }
      }
      
      grouped[serviceName].tasks.push({
        id: task.id,
        title: task.title,
        isCompleted: !!task.completedAt,
        type: 'asking_task',
        isMandatory: task.isMandatory
      })
    })
    
    const groupsArray = Object.values(grouped)
    setServiceGroups(groupsArray)
    
    // Initialize all tasks as unchecked
    const initialVerified: Record<string, boolean> = {}
    groupsArray.forEach(group => {
      group.tasks.forEach(task => {
        initialVerified[task.id] = false
      })
    })
    setVerifiedTasks(initialVerified)
    
    setIsDeliveryModalOpen(true)
  }

  const handleTaskVerification = (taskId: string, checked: boolean) => {
    setVerifiedTasks(prev => ({
      ...prev,
      [taskId]: checked
    }))
  }

  const handleDeliver = async () => {
    console.log("Clicked Deliver")
    if (!selectedOrder) return

    // Check if all tasks are verified
    const allVerified = Object.values(verifiedTasks).every(v => v === true)
    
    if (!allVerified) {
      console.log("Not all tasks verified")
      toast.error('Please verify all tasks before delivering')
      return
    }

    // Check for incomplete tasks and show confirmation
    const allTasks = [...selectedOrder.tasks, ...selectedOrder.askingTasks]
    const incompleteTasks = allTasks.filter(task => !task.completedAt)
    const incompleteMandatory = selectedOrder.askingTasks.filter(
      task => task.isMandatory && !task.completedAt
    )

    // Show warning if there are incomplete tasks
    if (incompleteTasks.length > 0) {
      const confirmMessage = incompleteMandatory.length > 0
        ? `Warning: This order has ${incompleteMandatory.length} incomplete mandatory task(s) and ${incompleteTasks.length} total incomplete task(s). Are you sure you want to deliver?`
        : `Note: This order has ${incompleteTasks.length} incomplete task(s). Do you want to proceed with delivery?`
      
      if (!window.confirm(confirmMessage)) {
        return
      }
    }

    try {
      setIsDelivering(true)
      await axios.post(`/api/orders/${selectedOrder.id}/deliver`)
      
      toast.success('Order delivered successfully!')
      setIsDeliveryModalOpen(false)
      setSelectedOrder(null)
      setVerifiedTasks({})
      
      // Refresh orders list
      fetchOrders()
    } catch (error: any) {
      console.error('Error delivering order:', error)
      toast.error(error.response?.data?.error || 'Failed to deliver order')
    } finally {
      setIsDelivering(false)
    }
  }

  const getProgressColor = (completed: number, total: number) => {
    if (total === 0) return 'bg-gray-300'
    const percentage = (completed / total) * 100
    if (percentage === 100) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const canDeliver = (order: Order) => {
    // Any order can be delivered, but we show status badges
    return true
  }

  const getDeliveryStatus = (order: Order) => {
    const allComplete = order.statistics.completedTasks === order.statistics.totalTasks
    const mandatoryComplete = order.statistics.mandatoryRemaining === 0
    
    if (allComplete) {
      return { type: 'complete', label: 'All Tasks Complete', color: 'green' }
    } else if (mandatoryComplete) {
      return { type: 'partial', label: 'Ready (Some Incomplete)', color: 'blue' }
    } else {
      return { type: 'incomplete', label: 'Has Incomplete Mandatory', color: 'amber' }
    }
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const progressPercentage = order.statistics.totalTasks > 0
      ? Math.round((order.statistics.completedTasks / order.statistics.totalTasks) * 100)
      : 0

    const deliveryStatus = getDeliveryStatus(order)

    return (
      <Card className="hover:shadow-lg transition-shadow flex flex-col">
        <CardHeader className="pb-3">
          <div className="space-y-2">
            {/* Customer Name and Order ID */}
            <div>
              <CardTitle className="text-xl font-bold mb-1">
                {order.customerName}
              </CardTitle>
              <CardDescription className="text-sm">
                <span className="font-mono">ID: #{order.orderNumber}</span>
              </CardDescription>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={order.status === 'PENDING' ? 'secondary' : 'default'}>
                {order.status === 'PENDING' ? 'Pending' : 'In Progress'}
              </Badge>
              <Badge variant="secondary">{order.orderType.name}</Badge>
              {deliveryStatus.type === 'complete' ? (
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {deliveryStatus.label}
                </Badge>
              ) : deliveryStatus.type === 'partial' ? (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {deliveryStatus.label}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {deliveryStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 flex-1">
          {/* Order Details Grid */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b">
            <div>
              <p className="text-xs text-muted-foreground">Customer Email</p>
              <p className="text-sm font-medium truncate">{order.customerEmail || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{order.customerPhone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivery Date</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(order.deliveryDate), 'MMM dd, yyyy')}
                {order.deliveryTime && ` at ${order.deliveryTime}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${order.amount}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium">Task Progress</span>
              <span className="text-muted-foreground">
                {order.statistics.completedTasks} / {order.statistics.totalTasks} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(
                  order.statistics.completedTasks,
                  order.statistics.totalTasks
                )}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
              <ListChecks className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{order.statistics.totalTasks}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-green-50 dark:bg-green-950/50 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Done</p>
                <p className="text-sm font-bold">{order.statistics.completedTasks}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Mand.</p>
                <p className="text-sm font-bold">
                  {order.statistics.mandatoryCompleted}/{order.statistics.mandatoryTasks}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {order.folderLink && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(order.folderLink!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Folder
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleOpenDeliveryModal(order)}
            >
              <Truck className="h-4 w-4 mr-1" />
              Deliver
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Order Delivery</h1>
        <p className="text-muted-foreground mt-1">
          Verify completed tasks and deliver orders to customers
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by order number, customer name, or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={clearFilters} disabled={!hasActiveFilters}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'From Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'To Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Ready Status Filter */}
          <Select value={readyFilter} onValueChange={setReadyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="ready">All Tasks Complete</SelectItem>
              <SelectItem value="not-ready">With Incomplete Tasks</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deliveryDate">Delivery Date (Asc)</SelectItem>
              <SelectItem value="deliveryDate-desc">Delivery Date (Desc)</SelectItem>
              <SelectItem value="customerName">Customer Name</SelectItem>
              <SelectItem value="amount">Amount (High to Low)</SelectItem>
              <SelectItem value="progress">Progress (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl">{filteredOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>All Tasks Complete</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">
              {filteredOrders.filter(o => getDeliveryStatus(o).type === 'complete').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>With Incomplete Tasks</CardDescription>
            <CardTitle className="text-3xl text-amber-600 dark:text-amber-400">
              {filteredOrders.filter(o => getDeliveryStatus(o).type !== 'complete').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Orders that are ready for delivery will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Delivery Verification Modal */}
      <Dialog open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle>Verify Order Delivery</DialogTitle>
            <DialogDescription>
              Please verify that all tasks have been completed before delivering this order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Order #{selectedOrder.orderNumber}</span>
                  <Badge variant="secondary">{selectedOrder.orderType.name}</Badge>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <p className="text-muted-foreground">{selectedOrder.customerEmail || 'No email provided'}</p>
                </div>
              </div>

              <Separator />

              {/* Tasks Verification List */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {serviceGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{group.serviceName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {group.serviceType === 'ASKING_SERVICE' ? 'Asking' : 'Service'}
                        </Badge>
                      </div>
                      <div className="space-y-2 pl-4">
                        {group.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <Checkbox
                              id={task.id}
                              checked={verifiedTasks[task.id] || false}
                              onCheckedChange={(checked) =>
                                handleTaskVerification(task.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 space-y-1">
                              <Label
                                htmlFor={task.id}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {task.title}
                              </Label>
                              <div className="flex items-center gap-2">
                                {task.isCompleted ? (
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {task.isMandatory && (
                                  <Badge variant="destructive" className="text-xs">
                                    Mandatory
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeliveryModalOpen(false)}
              disabled={isDelivering}
            >
              Cancel
            </Button>
            <Button onClick={handleDeliver} disabled={isDelivering}>
              {isDelivering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Delivering...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Confirm Delivery
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
