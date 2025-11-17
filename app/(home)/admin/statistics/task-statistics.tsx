'use client'

import { useState, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { CalendarIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface TeamStats {
  teamId: string
  teamName: string
  totalTasks: number
  notAssigned: number
  assigned: number
  inProgress: number
  paused: number
  completed: number
  overdue: number
  completionRate: number
}

interface MemberStats {
  userId: string
  userName: string
  userEmail: string
  teams: string
  totalTasks: number
  inProgress: number
  paused: number
  completed: number
  overdue: number
  completedThisWeek: number
  completedThisMonth: number
  completionRate: number
}

interface StatisticsData {
  teamStats: TeamStats[]
  memberStats: MemberStats[]
  summary: {
    totalTasks: number
    totalAskingTasks: number
    totalTeams: number
    totalMembers: number
  }
}

const ITEMS_PER_PAGE = 10

export default function TaskStatistics() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()
  const [teamPage, setTeamPage] = useState(1)
  const [memberPage, setMemberPage] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      let startDate = ''
      let endDate = ''

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = format(customStartDate, 'yyyy-MM-dd')
        endDate = format(customEndDate, 'yyyy-MM-dd')
      } else if (dateRange !== 'all') {
        const now = new Date()
        endDate = format(now, 'yyyy-MM-dd')

        switch (dateRange) {
          case '7days':
            startDate = format(subDays(now, 7), 'yyyy-MM-dd')
            break
          case '30days':
            startDate = format(subDays(now, 30), 'yyyy-MM-dd')
            break
          case 'thisMonth':
            startDate = format(startOfMonth(now), 'yyyy-MM-dd')
            endDate = format(endOfMonth(now), 'yyyy-MM-dd')
            break
        }
      }

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/admin/statistics/tasks?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch statistics')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange, customStartDate, customEndDate])

  const handleRefresh = () => {
    fetchData()
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400'
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const paginateData = <T,>(data: T[], page: number): T[] => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return data.slice(start, start + ITEMS_PER_PAGE)
  }

  const totalTeamPages = data ? Math.ceil(data.teamStats.length / ITEMS_PER_PAGE) : 0
  const totalMemberPages = data ? Math.ceil(data.memberStats.length / ITEMS_PER_PAGE) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter statistics by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={(value) => {
                setDateRange(value)
                setTeamPage(1)
                setMemberPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !customStartDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !customEndDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalTasks}</div>
              <p className="text-xs text-muted-foreground">Service tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Asking Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalAskingTasks}</div>
              <p className="text-xs text-muted-foreground">Asking tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalTeams}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalMembers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Statistics Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Team Statistics</CardTitle>
            <CardDescription>Task distribution and performance by team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Not Assigned</TableHead>
                    <TableHead className="text-center">Assigned</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-center">Paused</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-center">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginateData(data.teamStats, teamPage).length > 0 ? (
                    paginateData(data.teamStats, teamPage).map((team) => (
                      <TableRow key={team.teamId}>
                        <TableCell className="font-medium">{team.teamName}</TableCell>
                        <TableCell className="text-center">{team.totalTasks}</TableCell>
                        <TableCell className="text-center">
                          {team.notAssigned > 0 ? (
                            <Badge variant="secondary">{team.notAssigned}</Badge>
                          ) : (
                            team.notAssigned
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.assigned > 0 ? (
                            <Badge variant="outline">{team.assigned}</Badge>
                          ) : (
                            team.assigned
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.inProgress > 0 ? (
                            <Badge variant="default">{team.inProgress}</Badge>
                          ) : (
                            team.inProgress
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.paused > 0 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {team.paused}
                            </Badge>
                          ) : (
                            team.paused
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.completed > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {team.completed}
                            </Badge>
                          ) : (
                            team.completed
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {team.overdue > 0 ? (
                            <Badge variant="destructive">{team.overdue}</Badge>
                          ) : (
                            team.overdue
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('font-semibold', getCompletionRateColor(team.completionRate))}>
                            {team.completionRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No team data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Team Pagination */}
            {totalTeamPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(teamPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(teamPage * ITEMS_PER_PAGE, data.teamStats.length)} of {data.teamStats.length} teams
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTeamPage(p => Math.max(1, p - 1))}
                    disabled={teamPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTeamPage(p => Math.min(totalTeamPages, p + 1))}
                    disabled={teamPage === totalTeamPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Member Statistics Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Member Statistics</CardTitle>
            <CardDescription>Task performance by individual members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead className="text-center">Total Tasks</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-center">Paused</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-center">This Week</TableHead>
                    <TableHead className="text-center">This Month</TableHead>
                    <TableHead className="text-center">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginateData(data.memberStats, memberPage).length > 0 ? (
                    paginateData(data.memberStats, memberPage).map((member) => (
                      <TableRow key={member.userId}>
                        <TableCell>
                          <div className="font-medium">{member.userName}</div>
                          <div className="text-sm text-muted-foreground">{member.userEmail}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="text-sm truncate" title={member.teams}>
                            {member.teams || 'No team'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{member.totalTasks}</TableCell>
                        <TableCell className="text-center">
                          {member.inProgress > 0 ? (
                            <Badge variant="default">{member.inProgress}</Badge>
                          ) : (
                            member.inProgress
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.paused > 0 ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {member.paused}
                            </Badge>
                          ) : (
                            member.paused
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.completed > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {member.completed}
                            </Badge>
                          ) : (
                            member.completed
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.overdue > 0 ? (
                            <Badge variant="destructive">{member.overdue}</Badge>
                          ) : (
                            member.overdue
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">{member.completedThisWeek}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">{member.completedThisMonth}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('font-semibold', getCompletionRateColor(member.completionRate))}>
                            {member.completionRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No member data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Member Pagination */}
            {totalMemberPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(memberPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(memberPage * ITEMS_PER_PAGE, data.memberStats.length)} of {data.memberStats.length} members
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                    disabled={memberPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMemberPage(p => Math.min(totalMemberPages, p + 1))}
                    disabled={memberPage === totalMemberPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
