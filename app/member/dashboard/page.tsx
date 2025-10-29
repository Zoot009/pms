'use client'

import { JSX, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  TrendingUp,
  Loader2,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface DashboardStats {
  assignedCount: number
  inProgressCount: number
  completedTodayCount: number
  overdueCount: number
}

interface TaskItem {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  orderNumber?: string
  serviceName?: string
  deadline?: string | null
}

interface DashboardData {
  stats: DashboardStats & {
    totalTasks?: number
    averageCompletionTimeHours?: number
  }
  recentTasks: TaskItem[]
  upcomingDeadlines: TaskItem[]
}

const defaultStats: DashboardStats = {
  assignedCount: 0,
  inProgressCount: 0,
  completedTodayCount: 0,
  overdueCount: 0,
}

const getStatusBadge = (status: TaskStatus) => {
  const variants: Record<
    TaskStatus,
    { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    ASSIGNED: { label: 'NOT STARTED', variant: 'secondary' },
    IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },
    COMPLETED: { label: 'COMPLETED', variant: 'outline' },
    OVERDUE: { label: 'OVERDUE', variant: 'destructive' },
  }

  const config = variants[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const getPriorityBadge = (priority: TaskPriority) => {
  const variants: Record<
    TaskPriority,
    { label?: string; variant: 'default' | 'secondary' | 'destructive' }
  > = {
    LOW: { variant: 'secondary' },
    MEDIUM: { variant: 'default' },
    HIGH: { variant: 'default' },
    URGENT: { variant: 'destructive' },
  }

  const config = variants[priority] || { variant: 'default' as const }
  return <Badge variant={config.variant}>{priority}</Badge>
}

export default function MemberDashboard(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Replace this with a real API call in your app
      const resp = await fetch('/api/member/dashboard')
      if (!resp.ok) {
        throw new Error(`Failed to fetch: ${resp.status}`)
      }
      const json = (await resp.json()) as DashboardData
      setData(json)
    } catch (err) {
      // Fallback: use mocked data if API is not available
      console.error('Error fetching dashboard data:', err)
      const now = new Date()
      const mock: DashboardData = {
        stats: {
          assignedCount: 5,
          inProgressCount: 3,
          completedTodayCount: 2,
          overdueCount: 1,
          totalTasks: 11,
          averageCompletionTimeHours: 4,
        },
        recentTasks: [
          {
            id: 't1',
            title: 'Prepare monthly report',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            orderNumber: 'ORD-1234',
            serviceName: 'Reporting',
            deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 't2',
            title: 'Customer follow-up',
            status: 'ASSIGNED',
            priority: 'MEDIUM',
            orderNumber: 'ORD-1235',
            serviceName: 'Support',
            deadline: null,
          },
        ],
        upcomingDeadlines: [
          {
            id: 't3',
            title: 'Deploy hotfix',
            status: 'ASSIGNED',
            priority: 'URGENT',
            orderNumber: 'ORD-1236',
            serviceName: 'Ops',
            deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      }
      setData(mock)
      setError('Using fallback mock data (failed to fetch from API)')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    )
  }

  const { stats, recentTasks, upcomingDeadlines } = data

  const statCards = [
    {
      title: 'Assigned Tasks',
      value: stats.assignedCount,
      description: 'Tasks waiting to start',
      icon: ListTodo,
    },
    {
      title: 'In Progress',
      value: stats.inProgressCount,
      description: 'Currently working on',
      icon: Clock,
    },
    {
      title: 'Completed Today',
      value: stats.completedTodayCount,
      description: 'Tasks finished today',
      icon: CheckCircle2,
    },
    {
      title: 'Overdue',
      value: stats.overdueCount,
      description: 'Past deadline',
      icon: AlertCircle,
      destructive: true,
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Overview of your tasks and performance</p>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>

        <Button asChild variant="outline">
          <Link href="/member/tasks">View All Tasks</Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon
                  className={`h-4 w-4 ${
                    stat.destructive ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest assigned tasks</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/member/tasks">View All</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks assigned yet</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{task.title}</div>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Order: {task.orderNumber ?? '—'} | {task.serviceName ?? '—'}
                    </div>
                    {task.deadline && (
                      <div className="text-xs text-muted-foreground">
                        Deadline: {format(new Date(task.deadline), 'MMM d, yyyy, hh:mm a')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks due in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{task.title}</div>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Order: {task.orderNumber ?? '—'} | {task.serviceName ?? '—'}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {task.deadline ? format(new Date(task.deadline), 'MMM d, hh:mm a') : '—'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}