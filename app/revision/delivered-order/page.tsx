'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Search,
  Package,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Calendar as CalendarIcon,
  X,
  PackageCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
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

export default function RevisionDeliveredOrdersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('completedAt-desc')

  // Fetch delivered orders (non-revision)
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['revision', 'delivered-orders'],
    queryFn: async () => {
      const response = await axios.get('/api/revision/orders?type=delivered')
      return response.data.orders as Order[]
    },
  })

  const orders = ordersData ?? []

  // Convert to revision mutation
  const convertToRevisionMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await axios.post(`/api/orders/${orderId}/convert-to-revision`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision', 'delivered-orders'] })
      queryClient.invalidateQueries({ queryKey: ['revision', 'revision-orders'] })
      toast.success('Order converted to revision successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to convert order to revision')
    },
  })

  const handleConvertToRevision = (orderId: string, orderNumber: string) => {
    if (confirm(`Convert order ${orderNumber} to revision?`)) {
      convertToRevisionMutation.mutate(orderId)
    }
  }

  // Apply filters
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        (order.customerEmail?.toLowerCase() || '').includes(query)
      )
    }

    if (dateFrom) {
      filtered = filtered.filter(order => new Date(order.completedAt) >= dateFrom)
    }
    if (dateTo) {
      const adjustedDateTo = new Date(dateTo)
      adjustedDateTo.setHours(23, 59, 59, 999)
      filtered = filtered.filter(order => new Date(order.completedAt) <= adjustedDateTo)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'completedAt-desc':
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        case 'completedAt':
          return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
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
  }, [orders, searchQuery, dateFrom, dateTo, sortBy])

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
        <h1 className="text-3xl font-bold tracking-tight">Delivered Orders</h1>
        <p className="text-muted-foreground mt-2">
          View delivered orders and convert them to revision
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'PPP') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'PPP') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completedAt-desc">Completion Date (Newest)</SelectItem>
                <SelectItem value="completedAt">Completion Date (Oldest)</SelectItem>
                <SelectItem value="customer">Customer Name</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setDateFrom(undefined)
                setDateTo(undefined)
              }}
              className="w-full md:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No delivered orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || dateFrom || dateTo
                ? 'Try adjusting your filters'
                : 'All delivered orders will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 ">
          {filteredOrders.map((order) => {
            const hasIncompleteMandatory = order.statistics.incompleteMandatoryTasks > 0

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-green-600" />
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
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Delivered
                      </Badge>
                      {hasIncompleteMandatory && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {order.statistics.incompleteMandatoryTasks} Incomplete
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Separator />

                  {/* Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Delivery Date</p>
                      <p className="font-medium">
                        {format(new Date(order.deliveryDate), 'PPP')}
                        {order.deliveryTime && <span className="text-xs text-muted-foreground ml-1">({order.deliveryTime})</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed At</p>
                      <p className="font-medium">{format(new Date(order.completedAt), 'PPP')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Task Statistics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium">Service Tasks</span>
                      </div>
                      <span className="text-sm font-bold">{order.statistics.serviceTasks}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg dark:bg-purple-950">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium">Asking Tasks</span>
                      </div>
                      <span className="text-sm font-bold">{order.statistics.askingTasks}</span>
                    </div>
                  </div>

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
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConvertToRevision(order.id, order.orderNumber)}
                      disabled={convertToRevisionMutation.isPending}
                    >
                      {convertToRevisionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      )}
                      Convert to Revision
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
