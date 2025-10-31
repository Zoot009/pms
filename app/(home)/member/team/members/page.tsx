'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

interface TeamMember {
  id: string
  displayName: string
  email: string
  activeTasksCount: number
  inProgressCount: number
  completedTodayCount: number
  overdueCount: number
  workloadLevel: 'Low' | 'Medium' | 'High'
  recentTasks: {
    id: string
    title: string
    status: string
    priority: string
    service: {
      name: string
    }
  }[]
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/team-leader/members-workload')
      setMembers(response.data.members)
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }

  const getWorkloadBadge = (level: string) => {
    const colors: Record<string, string> = {
      Low: 'bg-green-100 text-green-800 border-green-200',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      High: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return (
      <Badge variant="outline" className={`${colors[level] || ''}`}>
        {level} Workload
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      NOT_ASSIGNED: { label: 'UNASSIGNED', variant: 'secondary' },
      ASSIGNED: { label: 'ASSIGNED', variant: 'default' },
      IN_PROGRESS: { label: 'IN PROGRESS', variant: 'default' },
      COMPLETED: { label: 'COMPLETED', variant: 'outline' },
      OVERDUE: { label: 'OVERDUE', variant: 'destructive' },
    }
    const config = variants[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {
      LOW: { variant: 'secondary' },
      MEDIUM: { variant: 'default' },
      HIGH: { variant: 'default' },
      URGENT: { variant: 'destructive' },
    }
    const config = variants[priority] || { variant: 'default' as const }
    return <Badge variant={config.variant} className="text-xs">{priority}</Badge>
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold">Team Members Workload</h1>
          <p className="text-muted-foreground">
            Monitor team member performance and workload distribution
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Workload</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.workloadLevel === 'Low').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium Workload</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.workloadLevel === 'Medium').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Workload</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.workloadLevel === 'High').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members Overview</CardTitle>
            <CardDescription>Detailed workload information for each team member</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No team members found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Workload</TableHead>
                      <TableHead className="text-center">Active Tasks</TableHead>
                      <TableHead className="text-center">In Progress</TableHead>
                      <TableHead className="text-center">Completed Today</TableHead>
                      <TableHead className="text-center">Overdue</TableHead>
                      <TableHead>Recent Tasks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(member.displayName, member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.displayName || 'No Name'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getWorkloadBadge(member.workloadLevel)}</TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">{member.activeTasksCount}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">{member.inProgressCount}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-green-600">
                            {member.completedTodayCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {member.overdueCount > 0 ? (
                            <div className="font-medium text-destructive flex items-center justify-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {member.overdueCount}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">-</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.recentTasks.length > 0 ? (
                            <div className="space-y-1 max-w-[300px]">
                              {member.recentTasks.slice(0, 3).map((task) => (
                                <div
                                  key={task.id}
                                  className="text-xs p-2 bg-muted rounded flex items-center justify-between gap-2"
                                >
                                  <div className="flex-1 truncate">
                                    <div className="font-medium truncate">{task.title}</div>
                                    <div className="text-muted-foreground truncate">
                                      {task.service?.name || 'Custom Task'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {getStatusBadge(task.status)}
                                    {getPriorityBadge(task.priority)}
                                  </div>
                                </div>
                              ))}
                              {member.recentTasks.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{member.recentTasks.length - 3} more tasks
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No active tasks</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workload Distribution */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-600">Low Workload Members</CardTitle>
              <CardDescription>Available for new task assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members
                  .filter((m) => m.workloadLevel === 'Low')
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.displayName, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {member.displayName || member.email}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white">
                        {member.activeTasksCount} tasks
                      </Badge>
                    </div>
                  ))}
                {members.filter((m) => m.workloadLevel === 'Low').length === 0 && (
                  <p className="text-sm text-muted-foreground">No members with low workload</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-yellow-600">Medium Workload Members</CardTitle>
              <CardDescription>Moderately loaded team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members
                  .filter((m) => m.workloadLevel === 'Medium')
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.displayName, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {member.displayName || member.email}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white">
                        {member.activeTasksCount} tasks
                      </Badge>
                    </div>
                  ))}
                {members.filter((m) => m.workloadLevel === 'Medium').length === 0 && (
                  <p className="text-sm text-muted-foreground">No members with medium workload</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-orange-600">High Workload Members</CardTitle>
              <CardDescription>At capacity - avoid new assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members
                  .filter((m) => m.workloadLevel === 'High')
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.displayName, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {member.displayName || member.email}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white">
                        {member.activeTasksCount} tasks
                      </Badge>
                    </div>
                  ))}
                {members.filter((m) => m.workloadLevel === 'High').length === 0 && (
                  <p className="text-sm text-muted-foreground">No members with high workload</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
