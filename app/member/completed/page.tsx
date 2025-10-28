'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { 
  Loader2,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'

interface CompletedTask {
  id: string
  title: string
  orderNumber: string
  orderId: string
  serviceName: string
  completedAt: string
  timeSpent: string | null
  completionNotes: string | null
  priority: string
}

export default function CompletedTasksPage() {
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      
      // Flatten tasks from all orders
      const allTasks: CompletedTask[] = []
      response.data.orders.forEach((order: any) => {
        order.tasks.forEach((task: any) => {
          allTasks.push({
            id: task.id,
            title: task.title,
            orderNumber: order.orderNumber,
            orderId: order.orderId,
            serviceName: task.serviceName,
            completedAt: task.completedAt,
            timeSpent: task.timeSpent,
            completionNotes: task.completionNotes,
            priority: task.priority
          })
        })
      })
      
      // Sort by completion date (most recent first)
      allTasks.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
      
      setTasks(allTasks)
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

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">No completed tasks yet</p>
            <Button asChild>
              <Link href="/member/tasks">View Active Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Link 
                        href={`/member/tasks/${task.orderId}`}
                        className="text-primary hover:underline"
                      >
                        #{task.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{task.serviceName}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {format(new Date(task.completedAt), 'MMM d, yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell>
                      {task.timeSpent || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {task.completionNotes ? (
                        <div className="truncate" title={task.completionNotes}>
                          {task.completionNotes}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/member/tasks/${task.orderId}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {tasks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{tasks.length}</div>
              <p className="text-xs text-muted-foreground">
                Total Completed Tasks
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {tasks.filter(t => t.timeSpent).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks with Time Tracking
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {tasks.filter(t => t.completionNotes).length}
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
