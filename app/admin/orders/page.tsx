import { Suspense } from 'react'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'

async function getOrdersList(
  searchQuery?: string,
  statusFilter?: string,
  orderTypeFilter?: string,
  startDate?: string,
  endDate?: string
) {
  const whereCondition: any = {}

  if (searchQuery) {
    whereCondition.OR = [
      { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerEmail: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  if (statusFilter && statusFilter !== 'ALL') {
    whereCondition.status = statusFilter
  }

  if (orderTypeFilter) {
    whereCondition.orderTypeId = orderTypeFilter
  }

  if (startDate || endDate) {
    whereCondition.orderDate = {}
    if (startDate) {
      whereCondition.orderDate.gte = new Date(startDate)
    }
    if (endDate) {
      whereCondition.orderDate.lte = new Date(endDate)
    }
  }

  const orders = await prisma.order.findMany({
    where: whereCondition,
    include: {
      orderType: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return orders
}

async function getOrderTypes() {
  return prisma.orderType.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  )
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING: { label: 'PENDING', variant: 'secondary' },
    IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },
    COMPLETED: { label: 'COMPLETED', variant: 'outline' },
    CANCELLED: { label: 'CANCELLED', variant: 'destructive' },
    OVERDUE: { label: 'OVERDUE', variant: 'destructive' },
  }
  
  const config = variants[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
}

const getFolderStatusBadge = (folderLink: string | null) => {
  if (folderLink) {
    return <Badge variant="default" className="text-xs">ADDED</Badge>
  }
  return <Badge variant="secondary" className="text-xs">PENDING</Badge>
}

async function OrdersTable({
  searchQuery,
  statusFilter,
  orderTypeFilter,
  startDate,
  endDate,
}: {
  searchQuery?: string
  statusFilter?: string
  orderTypeFilter?: string
  startDate?: string
  endDate?: string
}) {
  const orders = await getOrdersList(searchQuery, statusFilter, orderTypeFilter, startDate, endDate)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Order Type</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Delivery Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Order Status</TableHead>
            <TableHead>Folder Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No orders found. Create your first order to get started.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="font-medium text-sm">{order.orderNumber}</div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    {order.customerEmail && (
                      <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{order.orderType.name}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {format(new Date(order.orderDate), 'yyyy-MM-dd')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</div>
                    {order.deliveryTime && (
                      <div className="text-xs text-muted-foreground">{order.deliveryTime}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm">${order.amount.toString()}</span>
                </TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>{getFolderStatusBadge(order.folderLink)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/orders/${order.id}`}>Edit</Link>
                    </Button>
                    <Button variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    status?: string
    orderType?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const params = await searchParams
  const orderTypes = await getOrderTypes()
  const statusFilter = params.status || 'ALL'
  
  // Create query parameters for links
  const createQueryString = (newStatus: string) => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.orderType) query.set('orderType', params.orderType)
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
    query.set('status', newStatus)
    return `/admin/orders?${query.toString()}`
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">Manage customer orders and track their progress</p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <Tabs value={statusFilter} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="ALL" asChild>
                      <Link href={createQueryString('ALL')}>
                        All
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger value="PENDING" asChild>
                      <Link href={createQueryString('PENDING')}>
                        Pending
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger value="IN_PROGRESS" asChild>
                      <Link href={createQueryString('IN_PROGRESS')}>
                        In Progress
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger value="COMPLETED" asChild>
                      <Link href={createQueryString('COMPLETED')}>
                        Completed
                      </Link>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                View and manage all customer orders
              </CardDescription>
            </div>
          </div>
          <form action="/admin/orders" method="get" className="flex gap-3 mt-4">
            <input type="hidden" name="status" value={statusFilter} />
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search by order #, customer name or email..."
                className="pl-8"
                defaultValue={params.search}
              />
            </div>
            <Select name="orderType" defaultValue={params.orderType || 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Order Types</SelectItem>
                {orderTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              name="startDate"
              placeholder="Start Date"
              className="w-[150px]"
              defaultValue={params.startDate}
            />
            <Input
              type="date"
              name="endDate"
              placeholder="End Date"
              className="w-[150px]"
              defaultValue={params.endDate}
            />
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<OrdersTableSkeleton />}>
            <OrdersTable
              searchQuery={params.search}
              statusFilter={statusFilter === 'ALL' ? undefined : statusFilter}
              orderTypeFilter={params.orderType === 'all' ? undefined : params.orderType}
              startDate={params.startDate}
              endDate={params.endDate}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
