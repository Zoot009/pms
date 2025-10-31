'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  ExternalLink,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  X,
  PackageCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

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
  serviceTasks: number
  askingTasks: number
  mandatoryTasks: number
  mandatoryCompleted: number
  incompleteMandatoryTasks: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  amount: string
  orderDate: string
  deliveryDate: string
  deliveryTime: string | null
  completedAt: string
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

export default function DeliveredPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('completedAt-desc')
  const [deliveryStatus, setDeliveryStatus] = useState<string>('all')

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, searchQuery, dateFrom, dateTo, sortBy, deliveryStatus])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/orders/delivered')
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Error fetching delivered orders:', error)
      toast.error('Failed to load delivered orders')
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
        order.customerEmail.toLowerCase().includes(query)
      )
    }

    // Date range filter (by completion date)
    if (dateFrom) {
      filtered = filtered.filter(order => new Date(order.completedAt) >= dateFrom)
    }
    if (dateTo) {
      const adjustedDateTo = new Date(dateTo)
      adjustedDateTo.setHours(23, 59, 59, 999)
      filtered = filtered.filter(order => new Date(order.completedAt) <= adjustedDateTo)
    }

    // Delivery status filter (based on incomplete mandatory tasks)
    if (deliveryStatus === 'complete') {
      filtered = filtered.filter(order => order.statistics.incompleteMandatoryTasks === 0)
    } else if (deliveryStatus === 'incomplete') {
      filtered = filtered.filter(order => order.statistics.incompleteMandatoryTasks > 0)
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'completedAt-desc':
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        case 'completedAt':
          return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        case 'deliveryDate':
          return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
        case 'customerName':
          return a.customerName.localeCompare(b.customerName)
        case 'amount':
          return parseFloat(b.amount) - parseFloat(a.amount)
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
    setSortBy('completedAt-desc')
    setDeliveryStatus('all')
  }

  const hasActiveFilters = searchQuery || dateFrom || dateTo || sortBy !== 'completedAt-desc' || deliveryStatus !== 'all'

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const isExpanded = expandedOrders[order.id] || false
    const hasIncompleteMandatory = order.statistics.incompleteMandatoryTasks > 0

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              {/* Order Number and Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold text-lg">#{order.orderNumber}</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Delivered
                </Badge>
                {hasIncompleteMandatory && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {order.statistics.incompleteMandatoryTasks} Incomplete
                  </Badge>
                )}
              </div>

              {/* Warning Banner for Incomplete Mandatory Tasks */}
              {hasIncompleteMandatory && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Delivered with {order.statistics.incompleteMandatoryTasks} incomplete mandatory task(s)
                  </p>
                </div>
              )}

              {/* Customer Info */}
              <div>
                <p className="text-sm text-muted-foreground">Customer:</p>
                <p className="font-semibold">{order.customerName}</p>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount:</p>
                  <p className="font-medium">${order.amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivered:</p>
                  <p className="font-medium">{format(new Date(order.completedAt), 'MMM dd, yyyy h:mm a')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4 space-y-3">
          {/* Service Tasks Summary */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Service Tasks ({order.statistics.serviceTasks})</span>
            </div>
          </div>

          {/* Asking Tasks Summary */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Asking Tasks ({order.statistics.askingTasks})</span>
            </div>
          </div>

          {/* Show Incomplete Mandatory Tasks */}
          {hasIncompleteMandatory && (
            <Collapsible open={isExpanded} onOpenChange={() => toggleOrder(order.id)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">
                      Incomplete Mandatory tasks
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <ul className="space-y-2 list-disc list-inside text-sm text-red-800">
                    {order.askingTasks
                      .filter(task => task.isMandatory && !task.completedAt)
                      .map(task => (
                        <li key={task.id}>
                          {task.title} <span className="text-xs text-muted-foreground">
                            (Asking Task - Status: {task.currentStage})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {order.folderLink && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(order.folderLink!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Folder
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => toggleOrder(order.id)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Tasks
                </>
              )}
            </Button>
          </div>

          {/* Expanded Task List */}
          {isExpanded && (
            <Collapsible open={isExpanded}>
              <CollapsibleContent className="space-y-3 pt-3 border-t">
                {/* Service Tasks */}
                {order.tasks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <PackageCheck className="h-4 w-4" />
                      Service Tasks
                    </h4>
                    <div className="space-y-1">
                      {order.tasks.map(task => (
                        <div key={task.id} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                          {task.completedAt ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                          )}
                          <span className="flex-1">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asking Tasks */}
                {order.askingTasks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Asking Tasks
                    </h4>
                    <div className="space-y-1">
                      {order.askingTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                          {task.completedAt ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p>{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Status: {task.currentStage}
                              </span>
                              {task.isMandatory && (
                                <Badge variant="destructive" className="text-xs h-5">
                                  Mandatory
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Delivered Orders</h1>
        <p className="text-muted-foreground mt-1">
          View history of all delivered orders
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

          {/* Delivery Status Filter */}
          <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Delivery status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deliveries</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="incomplete">With Incomplete Tasks</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completedAt-desc">Delivered Date (Newest)</SelectItem>
              <SelectItem value="completedAt">Delivered Date (Oldest)</SelectItem>
              <SelectItem value="deliveryDate">Original Delivery Date</SelectItem>
              <SelectItem value="customerName">Customer Name</SelectItem>
              <SelectItem value="amount">Amount (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Delivered</CardDescription>
            <CardTitle className="text-3xl">{filteredOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Complete Deliveries</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {filteredOrders.filter(o => o.statistics.incompleteMandatoryTasks === 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>With Incomplete Tasks</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {filteredOrders.filter(o => o.statistics.incompleteMandatoryTasks > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              ${filteredOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0).toFixed(2)}
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
            <p className="text-lg font-medium">No delivered orders found</p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Delivered orders will appear here'}
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
    </div>
  )
}
