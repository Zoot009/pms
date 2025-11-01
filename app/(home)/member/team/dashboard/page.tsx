import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ClipboardList,
  UserPlus
} from 'lucide-react'

async function getTeamLeaderData(userId: string) {
  // Get teams where user is leader
  const teams = await prisma.team.findMany({
    where: {
      leaderId: userId,
      isActive: true,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  const teamIds = teams.map((t) => t.id)

  // Get all tasks for team's services
  const allTasks = await prisma.task.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      service: {
        select: {
          name: true,
        },
      },
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          deliveryDate: true,
        },
      },
      assignedUser: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get team members
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  })

  const now = new Date()

  // Calculate metrics
  const metrics = {
    totalTasks: allTasks.length,
    unassignedTasks: allTasks.filter((t) => t.status === 'NOT_ASSIGNED').length,
    assignedTasks: allTasks.filter((t) => t.status === 'ASSIGNED').length,
    inProgressTasks: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completedTasks: allTasks.filter((t) => t.status === 'COMPLETED').length,
    overdueTasks: allTasks.filter(
      (t) => t.deadline && new Date(t.deadline) < now && t.status !== 'COMPLETED'
    ).length,
    totalTeamMembers: teamMembers.length,
  }

  return {
    teams,
    allTasks,
    teamMembers,
    metrics,
  }
}

export default async function TeamLeaderDashboard() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const data = await getTeamLeaderData(user.id)
  const { metrics, allTasks } = data

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Team Leader Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your team and assign tasks efficiently
        </p>
      </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned Tasks</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.unassignedTasks}</div>
              <p className="text-xs text-muted-foreground">
                Pending assignment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">
                Currently being worked on
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                Tasks finished
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {metrics.overdueTasks}
              </div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign Tasks
              </CardTitle>
              <CardDescription>
                {metrics.unassignedTasks} task{metrics.unassignedTasks !== 1 ? 's' : ''} waiting to be assigned to team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/member/team/assign-tasks">
                  Go to Task Assignment
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Team Tasks
              </CardTitle>
              <CardDescription>
                View all {metrics.totalTasks} tasks across your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/member/team/team-tasks">
                  View All Tasks
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  {metrics.totalTeamMembers} active team member{metrics.totalTeamMembers !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/member/team/members">View All Members</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Recent Tasks Requiring Attention */}
        {metrics.unassignedTasks > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tasks Pending Assignment</CardTitle>
              <CardDescription>
                Recent tasks that need to be assigned to team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allTasks
                  .filter((t) => t.status === 'NOT_ASSIGNED')
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Order: {task.order.orderNumber} | Service: {task.service?.name || 'Custom Task'}
                        </div>
                      </div>
                      <Button asChild size="sm">
                        <Link href="/member/team/assign-tasks">Assign</Link>
                      </Button>
                    </div>
                  ))}
                {metrics.unassignedTasks > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="link" asChild>
                      <Link href="/member/team/assign-tasks">
                        View all {metrics.unassignedTasks} unassigned tasks →
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </>
  )
}
