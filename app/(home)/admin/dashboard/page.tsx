import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/prisma'
import { Users, UsersRound, Briefcase, FileText } from 'lucide-react'

export default async function AdminDashboard() {
  // Get statistics
  const [userCount, teamCount, serviceCount, orderCount] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.team.count({ where: { isActive: true } }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.order.count(),
  ])

  const stats = [
    {
      title: 'Total Users',
      value: userCount,
      icon: Users,
      description: 'Active users in system',
    },
    {
      title: 'Total Teams',
      value: teamCount,
      icon: UsersRound,
      description: 'Active teams',
    },
    {
      title: 'Total Services',
      value: serviceCount,
      icon: Briefcase,
      description: 'Available services',
    },
    {
      title: 'Total Orders',
      value: orderCount,
      icon: FileText,
      description: 'All time orders',
    },
  ]

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the admin panel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Quick actions coming soon</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
