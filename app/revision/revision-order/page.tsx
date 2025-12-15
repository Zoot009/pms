'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Search,
  Package,
  Clock,
  DollarSign,
  ExternalLink,
  X,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Link as LinkIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { RevisionTaskModal } from '@/components/revision-task-modal'
import { RevisionCompleteButton } from '@/components/revision-complete-button'

interface Task {
  id: string
  title: string
  status: string
  deadline: string | null
  team: {
    id: string
    name: string
  }
  assignedUser: {
    id: string
    displayName: string
    email: string
  } | null
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
  status: string
  folderLink: string | null
  notes: string | null
  revisionOrderId: string | null
  orderType: {
    id: string
    name: string
  }
  originalOrder: {
    id: string
    orderNumber: string
    completedAt: string
  } | null
  tasks: Task[]
  _count: {
    tasks: number
  }
}

export default function RevisionOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('orderDate-desc')
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const [selectedOrderForTask, setSelectedOrderForTask] = useState<{
    id: string
    orderNumber: string
  } | null>(null)

  // Fetch revision orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['revision', 'revision-orders'],
    queryFn: async () => {
      const response = await axios.get('/api/revision/orders?type=revision')
      return response.data.orders as Order[]
    },
  })

  const orders = ordersData ?? []

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  // Apply filters
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        (order.customerEmail?.toLowerCase() || '').includes(query) ||
        order.originalOrder?.orderNumber.toLowerCase().includes(query)
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'orderDate-desc':
          return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        case 'orderDate':
          return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
        case 'customer':
          return a.customerName.localeCompare(b.customerName)
        case 'amount-desc':
          return parseFloat(b.amount) - parseFloat(a.amount)
        case 'amount':
          return parseFloat(a.amount) - parseFloat(b.amount)
        default:
          return 0
      }
    })

    return filtered
  }, [orders, searchQuery, sortBy])

  const getTaskStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      NOT_ASSIGNED: { 
        className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300', 
        label: 'Not Assigned' 
      },
      ASSIGNED: { 
        className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400', 
        label: 'Assigned' 
      },
      IN_PROGRESS: { 
        className: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400', 
        label: 'In Progress' 
      },
      PAUSED: { 
        className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400', 
        label: 'Paused' 
      },
      COMPLETED: { 
        className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400', 
        label: 'Completed' 
      },
      OVERDUE: { 
        className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400', 
        label: 'Overdue' 
      },
    }

    const config = statusConfig[status] || { 
      className: 'bg-gray-100 text-gray-700 border-gray-300', 
      label: status 
    }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revision Orders</h1>
        <p className="text-muted-foreground mt-2">
          Manage revision orders and create revision tasks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orderDate-desc">Order Date (Newest)</SelectItem>
                <SelectItem value="orderDate">Order Date (Oldest)</SelectItem>
                <SelectItem value="customer">Customer Name</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="w-full md:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Search
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} revision orders
        </p>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RotateCcw className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No revision orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Converted revision orders will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders[order.id]
            const completedTasks = order.tasks.filter(t => t.status === 'COMPLETED').length
            const totalTasks = order.tasks.length

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-orange-600" />
                        {order.orderNumber}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1">
                            <strong>Customer:</strong> {order.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <strong>Type:</strong> {order.orderType.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <strong>{order.amount}</strong>
                          </span>
                        </div>
                        {order.originalOrder && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <LinkIcon className="h-3 w-3" />
                            <span>
                              Original Order: <strong>{order.originalOrder.orderNumber}</strong>
                              {' '}(Completed: {format(new Date(order.originalOrder.completedAt), 'PP')})
                            </span>
                          </div>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Revision
                      </Badge>
                      <Badge variant="secondary">
                        {completedTasks}/{totalTasks} Tasks
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Separator />

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Order Date</p>
                      <p className="font-medium">{format(new Date(order.orderDate), 'PPP')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Delivery Date</p>
                      <p className="font-medium">
                        {format(new Date(order.deliveryDate), 'PPP')}
                        {order.deliveryTime && <span className="text-xs text-muted-foreground ml-1">({order.deliveryTime})</span>}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Tasks */}
                  {order.tasks.length > 0 && (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleOrder(order.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Revision Tasks ({order.tasks.length})
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
                        <div className="border rounded-md divide-y">
                          {order.tasks.map((task) => (
                            <div key={task.id} className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{task.title}</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                                    <span>Team: {task.team.name}</span>
                                    {task.assignedUser && (
                                      <span>Assigned to: {task.assignedUser.displayName || task.assignedUser.email}</span>
                                    )}
                                    {task.deadline && (
                                      <span>Deadline: {format(new Date(task.deadline), 'PPP')}</span>
                                    )}
                                  </div>
                                </div>
                                {getTaskStatusBadge(task.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {order.folderLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(order.folderLink!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Folder
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrderForTask({ id: order.id, orderNumber: order.orderNumber })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Task
                    </Button>
                    <RevisionCompleteButton
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      variant="default"
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Revision Task Modal */}
      {selectedOrderForTask && (
        <RevisionTaskModal
          orderId={selectedOrderForTask.id}
          orderNumber={selectedOrderForTask.orderNumber}
          open={!!selectedOrderForTask}
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForTask(null)
          }}
        />
      )}
    </div>
  )
}
