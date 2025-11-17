'use client'

import { useState, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { CalendarIcon, RefreshCw, Search, User, ChevronDown, ChevronUp } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface Team {
  id: string
  name: string
}

interface ServiceTasks {
  total: number
  notAssigned: number
  assigned: number
  inProgress: number
  paused: number
  completed: number
  overdue: number
  completedThisWeek: number
  completedThisMonth: number
}

interface AskingTasks {
  total: number
  active: number
  completed: number
  overdue: number
  completedThisWeek: number
  completedThisMonth: number
}

interface Combined {
  totalTasks: number
  totalCompleted: number
  totalActive: number
  totalOverdue: number
  completionRate: number
  completedThisWeek: number
  completedThisMonth: number
}

interface MemberStat {
  userId: string
  userName: string
  email: string
  employeeId: string | null
  role: string
  isActive: boolean
  teams: Team[]
  serviceTasks: ServiceTasks
  askingTasks: AskingTasks
  combined: Combined
}

interface MemberStatisticsData {
  members: MemberStat[]
  teams: Team[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasMore: boolean
  }
}

export default function MemberStatistics() {
  const [data, setData] = useState<MemberStatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (teamFilter !== 'all') params.append('team', teamFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/statistics/members?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch member statistics')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching member statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchData()
  }, [dateRange, customStartDate, customEndDate, teamFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchData()
  }, [page])

  const handleRefresh = () => {
    fetchData()
  }

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(1)
  }

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedRows(newExpanded)
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400'
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'ORDER_CREATOR':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

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
          <CardDescription>Filter member statistics by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Members</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Name, email, or employee ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                  }}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
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

            {/* Team Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {data?.teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Member Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
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

            {/* Refresh Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button onClick={handleRefresh} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Statistics Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Member Task Statistics</CardTitle>
            <CardDescription>
              Showing {data.members.length} of {data.pagination.totalCount} members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead className="text-center">Total Tasks</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-center">This Week</TableHead>
                    <TableHead className="text-center">This Month</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.length > 0 ? (
                    data.members.map((member) => (
                      <>
                        <TableRow key={member.userId} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(member.userId)}
                            >
                              {expandedRows.has(member.userId) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {member.userName}
                                {!member.isActive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                              {member.employeeId && (
                                <div className="text-xs text-muted-foreground">
                                  ID: {member.employeeId}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getRoleBadgeColor(member.role)}>
                              {member.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {member.teams.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {member.teams.map((team) => (
                                    <Badge key={team.id} variant="outline" className="text-xs">
                                      {team.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No team</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {member.combined.totalTasks}
                          </TableCell>
                          <TableCell className="text-center">
                            {member.combined.totalActive > 0 ? (
                              <Badge variant="default">{member.combined.totalActive}</Badge>
                            ) : (
                              member.combined.totalActive
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {member.combined.totalCompleted > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              >
                                {member.combined.totalCompleted}
                              </Badge>
                            ) : (
                              member.combined.totalCompleted
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {member.combined.totalOverdue > 0 ? (
                              <Badge variant="destructive">{member.combined.totalOverdue}</Badge>
                            ) : (
                              member.combined.totalOverdue
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {member.combined.completedThisWeek}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {member.combined.completedThisMonth}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'font-semibold',
                                getCompletionRateColor(member.combined.completionRate)
                              )}
                            >
                              {member.combined.completionRate}%
                            </span>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details */}
                        {expandedRows.has(member.userId) && (
                          <TableRow>
                            <TableCell colSpan={11} className="bg-muted/30 p-6">
                              <div className="grid gap-6 md:grid-cols-2">
                                {/* Service Tasks Details */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-base">Service Tasks</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Total:</span>
                                        <span className="font-semibold">
                                          {member.serviceTasks.total}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Not Assigned:</span>
                                        <Badge variant="secondary">
                                          {member.serviceTasks.notAssigned}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Assigned:</span>
                                        <Badge variant="outline">
                                          {member.serviceTasks.assigned}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">In Progress:</span>
                                        <Badge variant="default">
                                          {member.serviceTasks.inProgress}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Paused:</span>
                                        <Badge
                                          variant="secondary"
                                          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                        >
                                          {member.serviceTasks.paused}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Completed:</span>
                                        <Badge
                                          variant="secondary"
                                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        >
                                          {member.serviceTasks.completed}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Overdue:</span>
                                        <Badge variant="destructive">
                                          {member.serviceTasks.overdue}
                                        </Badge>
                                      </div>
                                      <div className="border-t pt-2 mt-2">
                                        <div className="flex justify-between items-center text-sm">
                                          <span>Completed This Week:</span>
                                          <span className="font-medium">
                                            {member.serviceTasks.completedThisWeek}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span>Completed This Month:</span>
                                          <span className="font-medium">
                                            {member.serviceTasks.completedThisMonth}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Asking Tasks Details */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-base">Asking Tasks</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Total:</span>
                                        <span className="font-semibold">
                                          {member.askingTasks.total}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Active:</span>
                                        <Badge variant="default">{member.askingTasks.active}</Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Completed:</span>
                                        <Badge
                                          variant="secondary"
                                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        >
                                          {member.askingTasks.completed}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">Overdue:</span>
                                        <Badge variant="destructive">
                                          {member.askingTasks.overdue}
                                        </Badge>
                                      </div>
                                      <div className="border-t pt-2 mt-2">
                                        <div className="flex justify-between items-center text-sm">
                                          <span>Completed This Week:</span>
                                          <span className="font-medium">
                                            {member.askingTasks.completedThisWeek}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span>Completed This Month:</span>
                                          <span className="font-medium">
                                            {member.askingTasks.completedThisMonth}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalCount} total members)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
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
