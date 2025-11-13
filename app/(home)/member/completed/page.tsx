'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Loader2,
  ExternalLink,
  Calendar,
  User,
  DollarSign,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

interface CompletedTask {
  id: string
  title: string
  serviceName: string
  completedAt: string
  timeSpent: string | null
  completionNotes: string | null
  priority: string
}

interface CompletedOrder {
  orderId: string
  orderNumber: string
  customerName: string
  deliveryDate: string | null
  amount: number
  orderTypeName: string
  tasks: CompletedTask[]
}

export default function CompletedTasksPage() {
  const [orders, setOrders] = useState<CompletedOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalTasks, setTotalTasks] = useState(0)

  useEffect(() => {
    fetchCompletedTasks()
  }, [])

  const fetchCompletedTasks = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/member/tasks', {
        params: {
          status: 'completed',
          sortBy: 'default'
        }
      })
      
      // Process orders and their completed tasks
      const completedOrders: CompletedOrder[] = response.data.orders
        .filter((order: any) => order.tasks.length > 0) // Only orders with completed tasks
        .map((order: any) => ({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          deliveryDate: order.deliveryDate,
          amount: order.amount,
          orderTypeName: order.orderTypeName,
          tasks: order.tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            serviceName: task.serviceName,
            completedAt: task.completedAt,
            timeSpent: task.timeSpent,
            completionNotes: task.completionNotes,
            priority: task.priority
          }))
        }))
      
      // Sort orders by most recent completion
      completedOrders.sort((a, b) => {
        const aLatest = Math.max(...a.tasks.map(t => new Date(t.completedAt).getTime()))
        const bLatest = Math.max(...b.tasks.map(t => new Date(t.completedAt).getTime()))
        return bLatest - aLatest
      })
      
      // Calculate total tasks
      const total = completedOrders.reduce((sum, order) => sum + order.tasks.length, 0)
      
      setOrders(completedOrders)
      setTotalTasks(total)
    } catch (error) {
      console.error('Error fetching completed tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {
      LOW: { variant: 'secondary' },
      MEDIUM: { variant: 'default' },
      HIGH: { variant: 'default' },
      URGENT: { variant: 'destructive' },
    }
    const config = variants[priority] || { variant: 'default' as const }
    return <Badge variant={config.variant}>{priority}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-3xl font-bold">Completed Tasks</h1>
        <p className="text-muted-foreground">
          View your completed tasks and time spent
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">No completed tasks yet</p>
            <Button asChild>
              <Link href="/member/tasks">View Active Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.orderId} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Order Header - Simple and clean */}
                <div className="border-b px-6 pb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link 
                          href={`/member/tasks/${order.orderId}`}
                          className="text-2xl font-bold text-primary hover:underline flex items-center gap-2"
                        >
                          {order.customerName}
                          <ExternalLink className="h-5 w-5" />
                        </Link>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {order.orderTypeName}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">#{order.orderNumber}</p>
                            <p className="text-muted-foreground">Order Number</p>
                          </div>
                        </div>
                        {order.deliveryDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</p>
                              <p className="text-muted-foreground">Delivery Date</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">${order.amount.toLocaleString()}</p>
                            <p className="text-muted-foreground">Order Value</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-semibold">{order.tasks.length} Task{order.tasks.length !== 1 ? 's' : ''}</p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tasks Section */}
                <div className="p-6">
                  <div className="space-y-4">
                  <div className="grid gap-3">
                    {order.tasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium">{task.title}</h5>
                              {getPriorityBadge(task.priority)}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {task.serviceName}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.completedAt), 'MMM d, yyyy, hh:mm a')}
                              </div>
                              {task.timeSpent && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.timeSpent}
                                </div>
                              )}
                            </div>
                            {task.completionNotes && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <strong>Notes:</strong> {task.completionNotes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {orders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                Completed Orders
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                Total Completed Tasks
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => 
                  sum + order.tasks.filter(t => t.timeSpent).length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks with Time Tracking
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => 
                  sum + order.tasks.filter(t => t.completionNotes).length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks with Notes
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
