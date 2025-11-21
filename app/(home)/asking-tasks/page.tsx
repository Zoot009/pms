'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { 
  Loader2,
  Search,
  CheckCircle2,
  Flag,
  ExternalLink,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { StageDetailsModal } from '@/components/stage-details-modal'

interface AskingTask {
  id: string
  title: string
  currentStage: string
  priority: string
  deadline: string | null
  isFlagged: boolean
  completedAt: string | null
  order: {
    id: string
    orderNumber: string
    customerName: string
    deliveryDate: string
    amount: any // Prisma Decimal type
    folderLink: string | null
  }
  service: {
    id: string
    name: string
  }
  team: {
    id: string
    name: string
  }
  assignedUser: {
    id: string
    email: string
    displayName: string | null
  } | null
  completedUser: {
    id: string
    email: string
    displayName: string | null
  } | null
}

export default function AskingTasksPage() {
  const [askingTasks, setAskingTasks] = useState<AskingTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [flaggedFilter, setFlaggedFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  
  // Complete dialog state
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AskingTask | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Stage details modal state
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
    setAskingTasks([])
    setHasMore(true)
    fetchAskingTasks(1, true)
  }, [statusFilter, flaggedFilter, stageFilter, activeTab, debouncedSearchQuery])

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000 &&
        !isLoadingMore &&
        hasMore
      ) {
        loadMoreTasks()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoadingMore, hasMore, page])

  const fetchAskingTasks = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      
      // Adjust status filter based on active tab
      let effectiveStatusFilter = statusFilter
      if (activeTab === 'pending') {
        effectiveStatusFilter = 'active' // Only fetch active tasks for pending tab
      } else if (activeTab === 'completed') {
        effectiveStatusFilter = 'completed' // Only fetch completed tasks for completed tab
      }
      
      const params = new URLSearchParams({
        status: effectiveStatusFilter,
        flagged: flaggedFilter,
        stage: stageFilter,
        search: debouncedSearchQuery,
        page: pageNum.toString(),
        limit: '20'
      })
      
      const response = await axios.get(`/api/asking-tasks?${params}`)
      
      if (reset) {
        setAskingTasks(response.data.askingTasks)
      } else {
        setAskingTasks(prev => [...prev, ...response.data.askingTasks])
      }
      
      setHasMore(response.data.hasMore)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching asking tasks:', error)
      toast.error('Failed to load asking tasks')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMoreTasks = () => {
    if (!isLoadingMore && hasMore) {
      fetchAskingTasks(page + 1, false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    setAskingTasks([])
    setHasMore(true)
    fetchAskingTasks(1, true)
  }

  const handleMarkComplete = async () => {
    if (!selectedTask) return

    try {
      setIsSubmitting(true)
      const response = await axios.patch(`/api/asking-tasks/${selectedTask.id}/complete`, {
        notes: completionNotes || undefined,
      })
      
      // Update the task in the local state instead of refetching
      const updatedTask = response.data.askingTask
      setAskingTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === selectedTask.id 
            ? { 
                ...task, 
                completedAt: updatedTask.completedAt, 
                completedUser: updatedTask.completedUser 
              }
            : task
        )
      )
      
      // Keep the order expanded so user can see the updated task
      setOpenOrders(prev => ({
        ...prev,
        [selectedTask.order.id]: true
      }))
      
      toast.success('Task marked as complete')
      setShowCompleteDialog(false)
      setSelectedTask(null)
      setCompletionNotes('')
    } catch (error: any) {
      console.error('Error completing task:', error)
      toast.error(error.response?.data?.error || 'Failed to complete task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShowDetails = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowStageModal(true)
  }

  const handleCloseStageModal = () => {
    setShowStageModal(false)
    setSelectedTaskId(null)
  }

  const handleStageUpdate = () => {
    // Refetch only the updated task instead of all tasks
    if (selectedTaskId) {
      axios.get(`/api/asking-tasks/${selectedTaskId}`)
        .then(response => {
          setAskingTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === selectedTaskId ? response.data : task
            )
          )
        })
        .catch(error => {
          console.error('Error refreshing task:', error)
          // If individual fetch fails, fall back to full refresh
          fetchAskingTasks()
        })
    } else {
      fetchAskingTasks()
    }
  }

  // Group tasks by order and separate into pending and completed
  const groupTasksByOrder = () => {
    const grouped = new Map<string, AskingTask[]>()
    askingTasks.forEach((task) => {
      const orderId = task.order.id
      if (!grouped.has(orderId)) {
        grouped.set(orderId, [])
      }
      grouped.get(orderId)!.push(task)
    })
    return Array.from(grouped.entries()).map(([orderId, tasks]) => ({
      orderId,
      orderNumber: tasks[0].order.orderNumber,
      customerName: tasks[0].order.customerName,
      deliveryDate: tasks[0].order.deliveryDate,
      amount: tasks[0].order.amount,
      folderLink: tasks[0].order.folderLink,
      tasks,
      hasIncompleteTasks: tasks.some(task => !task.completedAt),
      allTasksCompleted: tasks.every(task => task.completedAt),
    }))
  }

  const groupedOrders = groupTasksByOrder()
  const pendingOrders = groupedOrders.filter(order => order.hasIncompleteTasks)
  const completedOrders = groupedOrders.filter(order => order.allTasksCompleted)

  const toggleOrder = (orderId: string) => {
    setOpenOrders(prev => ({
      ...prev,
      [orderId]: prev[orderId] === undefined ? false : !prev[orderId]
    }))
  }

  const isOrderOpen = (orderId: string) => {
    return openOrders[orderId] === undefined ? true : openOrders[orderId]
  }

  const getStageBadge = (stage: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' }> = {
      ASKED: { variant: 'secondary' },
      SHARED: { variant: 'default' },
      VERIFIED: { variant: 'default' },
      INFORMED_TEAM: { variant: 'outline' },
    }
    const config = variants[stage] || { variant: 'outline' }
    return <Badge variant={config.variant}>{stage.replace('_', ' ')}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' }> = {
      LOW: { variant: 'secondary' },
      MEDIUM: { variant: 'default' },
      HIGH: { variant: 'default' },
      URGENT: { variant: 'destructive' },
    }
    const config = variants[priority] || { variant: 'default' }
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
        <h1 className="text-3xl font-bold">Asking Tasks</h1>
        <p className="text-muted-foreground">
          Manage client communication and asking service tasks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flaggedFilter} onValueChange={setFlaggedFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Flag status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
                <SelectItem value="unflagged">Unflagged Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="ASKED">Asked</SelectItem>
                <SelectItem value="SHARED">Shared</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="INFORMED_TEAM">Team Informed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, orders, customers..."
                  className="pl-8 pr-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Pending and Completed Orders */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'completed')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-2 py-0 text-xs">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="relative">
            Completed
            {completedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-2 py-0 text-xs">
                {completedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Orders Tab */}
        <TabsContent value="pending" className="mt-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  No pending asking tasks found
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => {
                const orderOpen = isOrderOpen(order.orderId)
                
                return (
                  <Card key={order.orderId}>
                    <Collapsible open={orderOpen} onOpenChange={() => toggleOrder(order.orderId)}>
                      <CardHeader className="cursor-pointer" onClick={() => toggleOrder(order.orderId)}>
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={orderOpen}
                            onCheckedChange={() => toggleOrder(order.orderId)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 mt-1"
                          />
                          <CollapsibleTrigger asChild>
                            <div className="flex items-start justify-between flex-1">
                              <div className="flex flex-col gap-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-xl">
                                    Order #{order.orderNumber}
                                  </CardTitle>
                                  <Badge variant="secondary">
                                    {order.tasks.length} {order.tasks.length === 1 ? 'task' : 'tasks'}
                                  </Badge>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                                    {order.tasks.filter(t => !t.completedAt).length} pending
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-md">
                                  <div>
                                    <span className="text-muted-foreground">Customer: </span>
                                    <span className="font-bold">{order.customerName}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Delivery: </span>
                                    <span className="font-medium">{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Amount: </span>
                                    <span className="font-medium">
                                      ${typeof order.amount === 'object' 
                                        ? parseFloat(order.amount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : parseFloat(String(order.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      }
                                    </span>
                                  </div>
                                  {order.folderLink && (
                                    <a
                                      href={order.folderLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Folder Link
                                    </a>
                                  )}
                                </div>
                              </div>
                              {orderOpen ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-3 pt-0">
                          {order.tasks.filter(task => !task.completedAt).map((task) => {
                            const isMandatory = task.priority === 'HIGH' || task.isFlagged
                            
                            return (
                              <div
                                key={task.id}
                                className={`flex items-center justify-between p-4 border rounded-lg ${
                                  task.isFlagged 
                                    ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10 dark:border-red-800' 
                                    : ''
                                }`}
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {task.service?.name || task.title}
                                    </span>
                                    {isMandatory && (
                                      <Badge variant="destructive" className="text-xs">
                                        MANDATORY
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Team: {task.team.name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getStageBadge(task.currentStage)}
                                    {task.deadline && (
                                      <span className="text-xs text-muted-foreground">
                                        Due: {format(new Date(task.deadline), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTask(task)
                                      setShowCompleteDialog(true)
                                    }}
                                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:border-red-700"
                                  >
                                    Mark Complete
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleShowDetails(task.id)}
                                  >
                                    Show Details
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Completed Orders Tab */}
        <TabsContent value="completed" className="mt-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  No completed orders found
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedOrders.map((order) => {
                const orderOpen = isOrderOpen(order.orderId)
                
                return (
                  <Card key={order.orderId}>
                    <Collapsible open={orderOpen} onOpenChange={() => toggleOrder(order.orderId)}>
                      <CardHeader className="cursor-pointer" onClick={() => toggleOrder(order.orderId)}>
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={orderOpen}
                            onCheckedChange={() => toggleOrder(order.orderId)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 mt-1"
                          />
                          <CollapsibleTrigger asChild>
                            <div className="flex items-start justify-between flex-1">
                              <div className="flex flex-col gap-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-xl">
                                    Order #{order.orderNumber}
                                  </CardTitle>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    All Complete
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-md">
                                  <div>
                                    <span className="text-muted-foreground">Customer: </span>
                                    <span className="font-bold">{order.customerName}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Delivery: </span>
                                    <span className="font-medium">{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Amount: </span>
                                    <span className="font-medium">
                                      ${typeof order.amount === 'object' 
                                        ? parseFloat(order.amount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : parseFloat(String(order.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      }
                                    </span>
                                  </div>
                                  {order.folderLink && (
                                    <a
                                      href={order.folderLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Folder Link
                                    </a>
                                  )}
                                </div>
                              </div>
                              {orderOpen ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-3 pt-0">
                          {order.tasks.map((task) => {
                            const isMandatory = task.priority === 'HIGH' || task.isFlagged
                            
                            return (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-4 border rounded-lg border-green-300 bg-green-50/50 dark:bg-green-950/10 dark:border-green-800"
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium line-through text-muted-foreground">
                                      {task.service?.name || task.title}
                                    </span>
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                      COMPLETED
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Team: {task.team.name}
                                  </div>
                                  {task.completedUser && (
                                    <div className="text-xs text-muted-foreground">
                                      Completed by {task.completedUser.displayName || task.completedUser.email} on {format(new Date(task.completedAt!), 'MMM d, yyyy, hh:mm a')}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    {getStageBadge(task.currentStage)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Button variant="outline" size="sm" disabled className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-800">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleShowDetails(task.id)}
                                  >
                                    Show Details
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading more tasks...</span>
        </div>
      )}

      {/* No More Items Indicator */}
      {!hasMore && askingTasks.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <span className="text-muted-foreground">No more tasks to load</span>
        </div>
      )}

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Task as Complete</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this task as complete?
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-2 text-sm">
              <div>
                <strong>Service:</strong> {selectedTask.service?.name || 'Custom Task'}
              </div>
              <div>
                <strong>Order:</strong> #{selectedTask.order.orderNumber}
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Completion Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any completion notes..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompleteDialog(false)
                setSelectedTask(null)
                setCompletionNotes('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkComplete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Details Modal */}
      {selectedTaskId && (
        <StageDetailsModal
          taskId={selectedTaskId}
          isOpen={showStageModal}
          onClose={handleCloseStageModal}
          onUpdate={handleStageUpdate}
        />
      )}
    </div>
  )
}
