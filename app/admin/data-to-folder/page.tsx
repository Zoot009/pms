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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  orderDate: string
  deliveryDate: string
  notes: string | null
  orderType: {
    id: string
    name: string
  }
}

export default function DataToFolderPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [folderLinks, setFolderLinks] = useState<Record<string, string>>({})
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/admin/orders/data-to-folder')
      setOrders(response.data.orders)
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

    try {
      setSavingOrderId(orderId)
      await axios.patch(`/api/admin/orders/data-to-folder/${orderId}`, {
        folderLink: folderLink.trim(),
      })
      toast.success('Folder link added successfully')
      
      // Remove the order from the list
      setOrders((prev) => prev.filter((order) => order.id !== orderId))
      
      // Clear the input
      setFolderLinks((prev) => {
        const updated = { ...prev }
        delete updated[orderId]
        return updated
      })
      
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* <PageHeader
        customBreadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Data to Folder Management', href: '/admin/data-to-folder' },
        ]}
      /> */}
      <div className="flex flex-1 flex-col gap-4 p-6 pt-0">
        <div>
          <h1 className="text-3xl font-bold">Data to Folder Management</h1>
          <p className="text-muted-foreground">
            Orders that need data to be added to folder before task assignment
          </p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                No orders pending folder link assignment
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/admin/orders">View All Orders</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        Order #{order.orderNumber}
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                          <div>
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              Customer
                            </span>
                            <div className="text-sm font-normal text-foreground">
                              {order.customerName}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              Order Type
                            </span>
                            <div className="text-sm font-normal text-foreground">
                              {order.orderType.name}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              Order Date
                            </span>
                            <div className="text-sm font-normal text-foreground">
                              {format(new Date(order.orderDate), 'yyyy-MM-dd')}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              Delivery Date
                            </span>
                            <div className="text-sm font-normal text-foreground">
                              {format(new Date(order.deliveryDate), 'MMM d, yyyy, hh:mm a')}
                            </div>
                          </div>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {order.notes && (
                    <div className="mb-4">
                      <Label className="text-xs font-medium uppercase text-muted-foreground">
                        Notes
                      </Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                        {order.notes}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`folder-link-${order.id}`}>
                        Folder Link
                      </Label>
                      <Input
                        id={`folder-link-${order.id}`}
                        type="url"
                        placeholder="https://docs.google.com/document/d/..."
                        value={folderLinks[order.id] || ''}
                        onChange={(e) =>
                          handleFolderLinkChange(order.id, e.target.value)
                        }
                        disabled={savingOrderId === order.id}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={() => handleAddFolderLink(order.id)}
                      disabled={
                        !folderLinks[order.id] ||
                        !folderLinks[order.id].trim() ||
                        savingOrderId === order.id
                      }
                    >
                      {savingOrderId === order.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Folder Link'
                      )}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/admin/orders/${order.id}`}>
                        View Full Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
