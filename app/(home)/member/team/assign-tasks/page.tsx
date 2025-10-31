'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, AlertCircle, ArrowRight, Package, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderDate: string
  deliveryDate: string
  orderType: {
    name: string
  }
  folderLink: string | null
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  service: {
    id: string
    name: string
    type: string
    timeLimit: number | null
    teamId: string | null
  }
  assignedUser: {
    displayName: string
    email: string
  } | null
}

interface TeamMember {
  id: string
  displayName: string
  email: string
  activeTasksCount: number
  workloadLevel: 'Low' | 'Medium' | 'High'
}

export default function AssignTasksPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const ordersResponse = await axios.get('/api/team-leader/orders-with-tasks')
      setOrders(ordersResponse.data.orders)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => {
        const taskCounts = getTaskCountByStatus(order.tasks)
        
        switch (statusFilter) {
          case 'pending':
            return taskCounts.unassigned > 0
          case 'in-progress':
            return taskCounts.assigned > 0 && taskCounts.unassigned === 0
          case 'completed':
            return taskCounts.completed === order.tasks.length && order.tasks.length > 0
          default:
            return true
        }
      })
    }

    setFilteredOrders(filtered)
  }

  const getTaskCountByStatus = (tasks: Task[]) => {
    return {
      unassigned: tasks.filter((t) => t.status === 'NOT_ASSIGNED').length,
      assigned: tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    }
  }

  const getUrgencyBadge = (deliveryDate: string) => {
    const daysLeft = Math.ceil(
      (new Date(deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysLeft < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Overdue
        </Badge>
      )
    } else if (daysLeft < 2) {
      return (
        <Badge variant="destructive" className="text-xs">
          Urgent ({daysLeft}d)
        </Badge>
      )
    } else if (daysLeft < 5) {
      return (
        <Badge variant="default" className="text-xs bg-orange-600">
          {daysLeft} days left
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          {daysLeft} days left
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold">Assign Tasks</h1>
          <p className="text-muted-foreground">
            Select an order to view details and assign tasks to team members
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => sum + getTaskCountByStatus(order.tasks).unassigned, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => sum + getTaskCountByStatus(order.tasks).assigned, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Has Pending Tasks</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>Click on an order to view details and assign tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No orders found matching your filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Type</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Assigned</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const taskCounts = getTaskCountByStatus(order.tasks)
                      const progress = order.tasks.length > 0 
                        ? Math.round((taskCounts.completed / order.tasks.length) * 100)
                        : 0

                      return (
                        <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">
                            #{order.orderNumber}
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{order.orderType.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">
                                {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(order.deliveryDate), 'hh:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={taskCounts.unassigned > 0 ? 'secondary' : 'outline'}>
                              {taskCounts.unassigned}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">{taskCounts.assigned}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{taskCounts.completed}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getUrgencyBadge(order.deliveryDate)}
                              <span className="text-xs text-muted-foreground">
                                {progress}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/member/team/assign-tasks/${order.id}`}>
                              <Button size="sm" variant="ghost">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
