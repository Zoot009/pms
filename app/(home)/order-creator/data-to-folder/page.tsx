'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, ExternalLink, Search } from 'lucide-react'
import { date } from 'zod'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderDate: string
  deliveryDate: string
  notes: string | null
  folderLink: string | null
  orderType: {
    id: string
    name: string
  }
}

export default function OrderCreatorDataToFolderPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [folderLinks, setFolderLinks] = useState<Record<string, string>>({})
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/order-creator/orders/data-to-folder')
      const fetchedOrders = response.data.orders
      setOrders(fetchedOrders)
      
      const initialLinks: Record<string, string> = {}
      fetchedOrders.forEach((order: Order) => {
        if (order.folderLink) {
          initialLinks[order.id] = order.folderLink
        }
      })
      setFolderLinks(initialLinks)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFolderLinkChange = (orderId: string, value: string) => {
    setFolderLinks((prev) => ({
      ...prev,
      [orderId]: value,
    }))
  }

  const handleAddFolderLink = async (orderId: string) => {
    const folderLink = folderLinks[orderId]

    if (!folderLink || !folderLink.trim()) {
      toast.error('Please enter a folder link')
      return
    }

    // Validate URL format
    try {
      new URL(folderLink.trim())
    } catch (error) {
      toast.error('Please enter a valid URL (e.g., https://drive.google.com/...)')
      return
    }

    try {
      setSavingOrderId(orderId)
      await axios.patch(`/api/order-creator/orders/data-to-folder/${orderId}`, {
        folderLink: folderLink.trim(),
      })
      
      const isEdit = editingOrderId === orderId
      toast.success(isEdit ? 'Folder link updated successfully' : 'Folder link added successfully')
      
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, folderLink: folderLink.trim() }
            : order
        )
      )
      
      setEditingOrderId(null)
      router.refresh()
    } catch (error) {
      console.error('Error adding folder link:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to add folder link')
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setSavingOrderId(null)
    }
  }

  const handleEditClick = (orderId: string) => {
    setEditingOrderId(orderId)
  }

  const handleCancelEdit = (orderId: string, originalLink: string | null) => {
    setEditingOrderId(null)
    if (originalLink) {
      setFolderLinks((prev) => ({
        ...prev,
        [orderId]: originalLink,
      }))
    } else {
      setFolderLinks((prev) => {
        const updated = { ...prev }
        delete updated[orderId]
        return updated
      })
    }
  }

  const renderOrderCard = (order: Order, isCompleted = false) => (
    <Card key={order.id} className={`${isCompleted ? 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-l-4 border-l-primary'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Order #{order.orderNumber}</CardTitle>
              {isCompleted && (
                <span className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30">
                  Link Added
                </span>
              )}
            </div>
            <CardDescription className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">Customer</span>
                  <div className="text-sm font-normal text-foreground">{order.customerName}</div>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">Order Type</span>
                  <div className="text-sm font-normal text-foreground">{order.orderType.name}</div>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">Order Date</span>
                  <div className="text-sm font-normal text-foreground">{format(new Date(order.orderDate), 'yyyy-MM-dd')}</div>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">Delivery Date</span>
                  <div className="text-sm font-normal text-foreground">{format(new Date(order.deliveryDate), 'MMM d, yyyy, hh:mm a')}</div>
                </div>
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {order.notes && (
          <div className="mb-4">
            <Label className="text-xs font-medium uppercase text-muted-foreground">Notes</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md">{order.notes}</p>
          </div>
        )}
        
        {order.folderLink && editingOrderId !== order.id && (
          <div className="mb-4">
            <Label className="text-xs font-medium uppercase text-muted-foreground">Current Folder Link</Label>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={order.folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 truncate"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{order.folderLink}</span>
              </a>
              <Button size="sm" variant="outline" onClick={() => handleEditClick(order.id)}>Edit</Button>
            </div>
          </div>
        )}
        
        {(!order.folderLink || editingOrderId === order.id) && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor={`folder-link-${order.id}`}>
                {order.folderLink ? 'Update Folder Link' : 'Folder Link'}
              </Label>
              <Input
                id={`folder-link-${order.id}`}
                type="url"
                placeholder="https://docs.google.com/document/d/..."
                value={folderLinks[order.id] || ''}
                onChange={(e) => handleFolderLinkChange(order.id, e.target.value)}
                disabled={savingOrderId === order.id}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => handleAddFolderLink(order.id)}
              disabled={!folderLinks[order.id] || !folderLinks[order.id].trim() || savingOrderId === order.id}
            >
              {savingOrderId === order.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {order.folderLink ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                order.folderLink ? 'Update' : 'Add Folder Link'
              )}
            </Button>
            {editingOrderId === order.id && (
              <Button
                variant="outline"
                onClick={() => handleCancelEdit(order.id, order.folderLink)}
                disabled={savingOrderId === order.id}
              >
                Cancel
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/orders/${order.id}`}>View Details</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const filterOrders = (ordersList: Order[]) => {
    if (!searchQuery.trim()) return ordersList
    
    const query = searchQuery.toLowerCase()
    return ordersList.filter(order =>
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.orderType.name.toLowerCase().includes(query)
    )
  }

  const ordersWithoutLinks = filterOrders(orders.filter(order => !order.folderLink))
  const ordersWithLinks = filterOrders(orders.filter(order => order.folderLink))

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-6 pt-0">
        <div>
          <h1 className="text-3xl font-bold">Data to Folder Management</h1>
          <p className="text-muted-foreground">Manage folder links for your orders</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by order number, customer name, or order type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="without-links" className="w-full">
          <TabsList>
            <TabsTrigger value="without-links">Pending ({ordersWithoutLinks.length})</TabsTrigger>
            <TabsTrigger value="with-links">Completed ({ordersWithLinks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="without-links" className="mt-4">
            {ordersWithoutLinks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">No orders pending folder link assignment</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/order-creator/orders">View Your Orders</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ordersWithoutLinks.map((order) => renderOrderCard(order, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="with-links" className="mt-4">
            {ordersWithLinks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">No orders with folder links yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ordersWithLinks.map((order) => renderOrderCard(order, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
