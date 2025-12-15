'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Calendar as CalendarIcon,
  X,
  RotateCcw,
  Link as LinkIcon,
} from 'lucide-react'
import { format } from 'date-fns'

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
  revisionCompletedAt: string
  status: string
  folderLink: string | null
  notes: string | null
  orderType: {
    id: string
    name: string
  }
  originalOrder: {
    id: string
    orderNumber: string
    completedAt: string
  } | null
  _count: {
    tasks: number
  }
}

export default function CompletedRevisionPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('revisionCompletedAt-desc')

  // Fetch completed revision orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['revision', 'completed-revisions'],
    queryFn: async () => {
      const response = await axios.get('/api/revision/orders?type=completed')
      return response.data.orders as Order[]
    },
  })

  const orders = ordersData ?? []

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

    if (dateFrom) {
      filtered = filtered.filter(order => new Date(order.revisionCompletedAt) >= dateFrom)
    }
    if (dateTo) {
      const adjustedDateTo = new Date(dateTo)
      adjustedDateTo.setHours(23, 59, 59, 999)
      filtered = filtered.filter(order => new Date(order.revisionCompletedAt) <= adjustedDateTo)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'revisionCompletedAt-desc':
          return new Date(b.revisionCompletedAt).getTime() - new Date(a.revisionCompletedAt).getTime()
        case 'revisionCompletedAt':
          return new Date(a.revisionCompletedAt).getTime() - new Date(b.revisionCompletedAt).getTime()
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
        <h1 className="text-3xl font-bold tracking-tight">Completed Revisions</h1>
        <p className="text-muted-foreground mt-2">
          View all completed revision orders
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
                <SelectItem value="revisionCompletedAt-desc">Completion Date (Newest)</SelectItem>
                <SelectItem value="revisionCompletedAt">Completion Date (Oldest)</SelectItem>
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
          Showing {filteredOrders.length} of {orders.length} completed revisions
        </p>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No completed revisions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || dateFrom || dateTo
                ? 'Try adjusting your filters'
                : 'Completed revision orders will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
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
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                    <Badge variant="secondary">
                      {order._count.tasks} Tasks
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                  <div>
                    <p className="text-muted-foreground">Revision Completed</p>
                    <p className="font-medium">{format(new Date(order.revisionCompletedAt), 'PPP')}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                {order.folderLink && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(order.folderLink!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Folder
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
