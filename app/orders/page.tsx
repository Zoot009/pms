'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface OrderStats {
  totalTasks: number
  completedTasks: number
  unassignedTasks: number
  overdueTasks: number
  mandatoryRemaining: number
  daysOld: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  amount: string
  orderDate: string
  deliveryDate: string
  status: string
  isCustomized: boolean
  orderType: {
    id: string
    name: string
  }
  statistics: OrderStats
}

interface GroupedOrders {
  [date: string]: Order[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrders>({})
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('list')

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
      })
      const response = await axios.get(`/api/orders?${params}`)
      setOrders(response.data.orders)
      setGroupedOrders(response.data.groupedByDate)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOrders()
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

  const getProgressColor = (completed: number, total: number) => {
    if (total === 0) return 'bg-gray-300'
    const percentage = (completed / total) * 100
    if (percentage === 100) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const progressPercentage = order.statistics.totalTasks > 0
      ? Math.round((order.statistics.completedTasks / order.statistics.totalTasks) * 100)
      : 0

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <div className="space-y-3">
            {/* Customer Name and Order ID */}
            <div>
              <CardTitle className="text-2xl font-bold mb-1">
                {order.customerName}
              </CardTitle>
              <CardDescription className="text-base">
                <span className="font-mono">ID: #{order.orderNumber}</span>
              </CardDescription>
            </div>

            {/* Status and Priority Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(order.status)}
              <Badge variant="secondary">MEDIUM PRIORITY</Badge>
              {order.status === 'PENDING' && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Delivery Blocked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Details Grid */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Package className="h-3 w-3" />
                ORDER TYPE
              </div>
              <div className="font-medium text-sm">
                {order.orderType.name}
                {order.isCustomized && <span className="text-primary ml-1">*</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                AMOUNT
              </div>
              <div className="font-medium text-sm">${order.amount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                ORDER DATE
              </div>
              <div className="font-medium text-sm">
                {format(new Date(order.orderDate), 'MMM d, yyyy')}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                DELIVERY
              </div>
              <div className="font-medium text-sm">
                {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Task Statistics */}
          <div className="grid grid-cols-4 gap-3 pb-4 border-b">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-lg font-bold">
                {order.statistics.completedTasks}/{order.statistics.totalTasks}
              </div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="text-lg font-bold">{order.statistics.unassignedTasks}</div>
              <div className="text-xs text-muted-foreground">Unassigned</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-lg font-bold">{order.statistics.overdueTasks}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-lg font-bold">{order.statistics.daysOld}</div>
              <div className="text-xs text-muted-foreground">Days Old</div>
            </div>
          </div>

          {/* Mandatory Tasks Alert */}
          {order.statistics.mandatoryRemaining > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
                <Package className="h-4 w-4" />
                <span>{order.statistics.mandatoryRemaining} Mandatory Tasks Remaining</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="font-bold">{progressPercentage}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor(
                  order.statistics.completedTasks,
                  order.statistics.totalTasks
                )}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <Button asChild className="w-full">
            <Link href={`/orders/${order.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Details
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6 px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders Dashboard</h1>
          <p className="text-muted-foreground">
            Track and manage all orders and their progress
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by order number, customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="PENDING">Pending</TabsTrigger>
                <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
                <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grouped">Grouped by Date</SelectItem>
                <SelectItem value="list">List View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Display */}
      {viewMode === 'grouped' ? (
        // Grouped by delivery date
        <div className="space-y-8 ">
          {Object.keys(groupedOrders).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedOrders)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, dateOrders]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">
                      {date === 'no-date'
                        ? 'No Delivery Date'
                        : format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <Badge variant="secondary">{dateOrders.length} orders</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dateOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        // List view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {orders.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      )}
    </div>
  )
}
