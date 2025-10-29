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
import { Plus, Search } from 'lucide-react'

async function getOrderTypesList(searchQuery?: string, statusFilter?: string) {
  const whereCondition: any = {}

  if (searchQuery) {
    whereCondition.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  if (statusFilter === 'active') {
    whereCondition.isActive = true
  } else if (statusFilter === 'inactive') {
    whereCondition.isActive = false
  }

  const orderTypes = await prisma.orderType.findMany({
    where: whereCondition,
    include: {
      _count: {
        select: {
          services: true,
          orders: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return orderTypes
}

function OrderTypesTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  )
}

async function OrderTypesTable({
  searchQuery,
  statusFilter,
}: {
  searchQuery?: string
  statusFilter?: string
}) {
  const orderTypes = await getOrderTypesList(searchQuery, statusFilter)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Type</TableHead>
            <TableHead>Time Limit</TableHead>
            <TableHead>Services Count</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No order types found. Create your first order type to get started.
              </TableCell>
            </TableRow>
          ) : (
            orderTypes.map((orderType) => (
              <TableRow key={orderType.id}>
                <TableCell>
                  <div className="font-medium">{orderType.name}</div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {orderType.timeLimitDays} {orderType.timeLimitDays === 1 ? 'day' : 'days'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {orderType._count.services} {orderType._count.services === 1 ? 'service' : 'services'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground max-w-md truncate block">
                    {orderType.description || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={orderType.isActive ? 'default' : 'secondary'}>
                    {orderType.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/order-types/${orderType.id}`}>Edit</Link>
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

export default async function OrderTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Types Management</h1>
          <p className="text-muted-foreground">Manage order types and their services</p>
        </div>
        <Button asChild>
          <Link href="/admin/order-types/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Order Type
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All Order Types</CardTitle>
              <CardDescription>
                A list of all order types with their services
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <form action="/admin/order-types" method="get" className="flex gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    name="search"
                    placeholder="Search order types..."
                    className="pl-8"
                    defaultValue={params.search}
                  />
                </div>
                <Select name="status" defaultValue={params.status || 'all'}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="secondary">
                  Filter
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<OrderTypesTableSkeleton />}>
            <OrderTypesTable
              searchQuery={params.search}
              statusFilter={params.status}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
