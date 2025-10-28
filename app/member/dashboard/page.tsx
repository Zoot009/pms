'use client'import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import { useState, useEffect } from 'react'import { Button } from '@/components/ui/button'

import { useRouter } from 'next/navigation'import prisma from '@/lib/prisma'

import axios from 'axios'import { getCurrentUser } from '@/lib/auth-utils'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'import { TaskStatus, TaskPriority } from '@/lib/generated/prisma'

import { Badge } from '@/components/ui/badge'import { ListTodo, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'import { format } from 'date-fns'

import Link from 'next/link'

import { export default async function MemberDashboard() {

  Clock,   const user = await getCurrentUser()

  CheckCircle2,   

  AlertCircle,  if (!user) {

  TrendingUp,    return null

  ListTodo,  }

  PlayCircle,

  Loader2  // Get task statistics

} from 'lucide-react'  const [assignedCount, inProgressCount, completedTodayCount, overdueCount] = await Promise.all([

import { format } from 'date-fns'    prisma.task.count({

      where: {

interface DashboardData {        assignedTo: user.id,

  stats: {        status: TaskStatus.ASSIGNED,

    totalTasks: number      },

    notStarted: number    }),

    pendingTasks: number    prisma.task.count({

    inProgress: number      where: {

    completedToday: number        assignedTo: user.id,

    completedTotal: number        status: TaskStatus.IN_PROGRESS,

    overdue: number      },

    averageCompletionTimeHours: number    }),

  }    prisma.task.count({

  recentTasks: any[]      where: {

  upcomingDeadlines: any[]        assignedTo: user.id,

}        status: TaskStatus.COMPLETED,

        completedAt: {

export default function MemberDashboard() {          gte: new Date(new Date().setHours(0, 0, 0, 0)),

  const router = useRouter()        },

  const [data, setData] = useState<DashboardData | null>(null)      },

  const [isLoading, setIsLoading] = useState(true)    }),

    prisma.task.count({

  useEffect(() => {      where: {

    fetchDashboardData()        assignedTo: user.id,

  }, [])        status: TaskStatus.OVERDUE,

      },

  const fetchDashboardData = async () => {    }),

    try {  ])

      setIsLoading(true)

      const response = await axios.get('/api/member/dashboard')  // Get active tasks

      setData(response.data)  const activeTasks = await prisma.task.findMany({

    } catch (error) {    where: {

      console.error('Error fetching dashboard data:', error)      assignedTo: user.id,

    } finally {      status: {

      setIsLoading(false)        in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],

    }      },

  }    },

    include: {

  const getStatusBadge = (status: string) => {      order: true,

    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {      service: true,

      ASSIGNED: { label: 'NOT STARTED', variant: 'secondary' },      team: true,

      IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },    },

      COMPLETED: { label: 'COMPLETED', variant: 'outline' },    orderBy: {

    }      deadline: 'asc',

    const config = variants[status] || { label: status, variant: 'outline' as const }    },

    return <Badge variant={config.variant}>{config.label}</Badge>    take: 5,

  }  })



  const getPriorityBadge = (priority: string) => {  const stats = [

    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {    {

      LOW: { variant: 'secondary' },      title: 'Assigned Tasks',

      MEDIUM: { variant: 'default' },      value: assignedCount,

      HIGH: { variant: 'default' },      icon: ListTodo,

      URGENT: { variant: 'destructive' },      description: 'Tasks assigned to you',

    }    },

    const config = variants[priority] || { variant: 'default' as const }    {

    return <Badge variant={config.variant}>{priority}</Badge>      title: 'In Progress',

  }      value: inProgressCount,

      icon: Clock,

  if (isLoading) {      description: 'Tasks you are working on',

    return (    },

      <div className="flex items-center justify-center h-screen">    {

        <Loader2 className="h-8 w-8 animate-spin" />      title: 'Completed Today',

      </div>      value: completedTodayCount,

    )      icon: CheckCircle2,

  }      description: 'Tasks finished today',

    },

  if (!data) {    {

    return (      title: 'Overdue',

      <div className="flex items-center justify-center h-screen">      value: overdueCount,

        <p className="text-muted-foreground">Failed to load dashboard data</p>      icon: AlertCircle,

      </div>      description: 'Tasks past deadline',

    )    },

  }  ]



  const { stats, recentTasks, upcomingDeadlines } = data  const getPriorityColor = (priority: TaskPriority) => {

    switch (priority) {

  return (      case TaskPriority.HIGH:

    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">        return 'destructive'

      <div>      case TaskPriority.MEDIUM:

        <h1 className="text-3xl font-bold">My Dashboard</h1>        return 'default'

        <p className="text-muted-foreground">      case TaskPriority.LOW:

          Overview of your tasks and performance        return 'secondary'

        </p>      default:

      </div>        return 'default'

    }

      {/* Statistics Cards */}  }

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <Card>  const getStatusColor = (status: TaskStatus) => {

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">    switch (status) {

            <CardTitle className="text-sm font-medium">Not Started</CardTitle>      case TaskStatus.ASSIGNED:

            <PlayCircle className="h-4 w-4 text-muted-foreground" />        return 'bg-blue-100 text-blue-800'

          </CardHeader>      case TaskStatus.IN_PROGRESS:

          <CardContent>        return 'bg-yellow-100 text-yellow-800'

            <div className="text-2xl font-bold">{stats.notStarted}</div>      case TaskStatus.COMPLETED:

            <p className="text-xs text-muted-foreground">        return 'bg-green-100 text-green-800'

              Assigned but not started      case TaskStatus.OVERDUE:

            </p>        return 'bg-red-100 text-red-800'

          </CardContent>      default:

        </Card>        return 'bg-gray-100 text-gray-800'

    }

        <Card>  }

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">In Progress</CardTitle>  return (

            <Clock className="h-4 w-4 text-muted-foreground" />    <>

          </CardHeader>      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

          <CardContent>        <div className="mb-4">

            <div className="text-2xl font-bold">{stats.inProgress}</div>          <h1 className="text-3xl font-bold">My Dashboard</h1>

            <p className="text-xs text-muted-foreground">          <p className="text-muted-foreground">Track your tasks and progress</p>

              Currently working on        </div>

            </p>

          </CardContent>        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        </Card>          {stats.map((stat) => {

            const Icon = stat.icon

        <Card>            return (

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">              <Card key={stat.title}>

            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>

          </CardHeader>                  <Icon className="h-4 w-4 text-muted-foreground" />

          <CardContent>                </CardHeader>

            <div className="text-2xl font-bold">{stats.completedToday}</div>                <CardContent>

            <p className="text-xs text-muted-foreground">                  <div className="text-2xl font-bold">{stat.value}</div>

              Total: {stats.completedTotal}                <p className="text-xs text-muted-foreground">{stat.description}</p>

            </p>              </CardContent>

          </CardContent>            </Card>

        </Card>          )

        })}

        <Card>      </div>

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">

            <CardTitle className="text-sm font-medium">Overdue</CardTitle>      <div className="mt-8">

            <AlertCircle className="h-4 w-4 text-destructive" />        <Card>

          </CardHeader>          <CardHeader>

          <CardContent>            <CardTitle>Active Tasks</CardTitle>

            <div className="text-2xl font-bold text-destructive">            <CardDescription>Tasks you need to work on</CardDescription>

              {stats.overdue}          </CardHeader>

            </div>          <CardContent>

            <p className="text-xs text-muted-foreground">            {activeTasks.length === 0 ? (

              Need immediate attention              <p className="text-sm text-muted-foreground">You have no active tasks.</p>

            </p>            ) : (

          </CardContent>              <div className="space-y-4">

        </Card>                {activeTasks.map((task) => (

      </div>                  <div key={task.id} className="flex items-start justify-between rounded-lg border p-4">

                    <div className="space-y-1">

      {/* Additional Stats */}                      <div className="flex items-center gap-2">

      <div className="grid gap-4 md:grid-cols-2">                        <h3 className="font-semibold">{task.title}</h3>

        <Card>                        <Badge variant={getPriorityColor(task.priority)}>

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">                          {task.priority}

            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>                        </Badge>

            <ListTodo className="h-4 w-4 text-muted-foreground" />                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>

          </CardHeader>                          {task.status.replace('_', ' ')}

          <CardContent>                        </span>

            <div className="text-2xl font-bold">{stats.totalTasks}</div>                      </div>

            <p className="text-xs text-muted-foreground">                      <p className="text-sm text-muted-foreground">

              All assigned tasks                        {task.service.name} · Order #{task.order.orderNumber}

            </p>                      </p>

          </CardContent>                      <p className="text-sm text-muted-foreground">

        </Card>                        Team: {task.team.name}

                      </p>

        <Card>                      {task.deadline && (

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">                        <p className="text-xs text-muted-foreground">

            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>                          Deadline: {format(new Date(task.deadline), 'PPp')}

            <TrendingUp className="h-4 w-4 text-muted-foreground" />                        </p>

          </CardHeader>                      )}

          <CardContent>                    </div>

            <div className="text-2xl font-bold">{stats.averageCompletionTimeHours}h</div>                    <Button size="sm" variant="outline">

            <p className="text-xs text-muted-foreground">                      View

              Average time to complete                    </Button>

            </p>                  </div>

          </CardContent>                ))}

        </Card>              </div>

      </div>            )}

          </CardContent>

      {/* Recent Tasks */}        </Card>

      <Card>      </div>

        <CardHeader>      </div>

          <div className="flex items-center justify-between">    </>

            <div>  )

              <CardTitle>Recent Tasks</CardTitle>}

              <CardDescription>Your latest assigned tasks</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/member/tasks">View All Tasks</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks assigned yet</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task: any) => (
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
                      Order: {task.orderNumber} | {task.serviceName}
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
              {upcomingDeadlines.map((task: any) => (
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
                      Order: {task.orderNumber} | {task.serviceName}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(task.deadline), 'MMM d, hh:mm a')}
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
