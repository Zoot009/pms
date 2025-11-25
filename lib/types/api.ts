// ============================================
// ORDER TYPES
// ============================================

export interface OrderStats {
  totalTasks: number
  completedTasks: number
  unassignedTasks: number
  overdueTasks: number
  mandatoryRemaining: number
  daysOld: number
}

export interface AskingTask {
  id: string
  title: string
  description?: string
  completedAt?: string | null
  isMandatory: boolean
  service: {
    id: string
    name: string
    type: string
  }
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  amount: string
  orderDate: string
  deliveryDate: string
  status: string
  isCustomized: boolean
  orderType: {
    id: string
    name: string
  }
  statistics: OrderStats
  askingTasks?: AskingTask[]
}

export interface GroupedOrders {
  [date: string]: Order[]
}

export interface OrdersResponse {
  orders: Order[]
  groupedByDate: GroupedOrders
  hasMore: boolean
  total: number
}

export interface OrdersQueryParams {
  status?: string
  search?: string
  page?: number
  limit?: number
  daysLeft?: string
}

// ============================================
// ASKING TASK TYPES
// ============================================

export interface AskingTaskDetailed {
  id: string
  title: string
  currentStage: string
  priority: string
  deadline: string | null
  isFlagged: boolean
  completedAt: string | null
  notes?: string | null
  order: {
    id: string
    orderNumber: string
    customerName: string
    deliveryDate: string
    amount: any
    folderLink: string | null
  } | null
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

export interface AskingTasksResponse {
  tasks: AskingTaskDetailed[]
  hasMore: boolean
  total: number
}

export interface AskingTasksQueryParams {
  status?: string
  flagged?: string
  stage?: string
  search?: string
  page?: number
  limit?: number
}

export interface CompleteAskingTaskRequest {
  notes?: string
}

// ============================================
// TEAM TYPES
// ============================================

export interface TeamMember {
  id: string
  userId: string
  isActive: boolean
  joinedAt: string
  user: {
    id: string
    email: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
  }
}

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  leaderId: string
  leader: {
    id: string
    email: string
    displayName: string | null
  }
  members?: TeamMember[]
  _count?: {
    members: number
  }
}

export interface TeamsResponse {
  teams: Team[]
  total: number
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  role: 'ADMIN' | 'MEMBER' | 'ORDER_CREATOR'
  isActive: boolean
}

export interface UserWithPermissions extends User {
  canEdit: boolean
  isTeamLeader: boolean
}

// ============================================
// MUTATION TYPES
// ============================================

export interface UpdateOrderStatusRequest {
  status: string
}

export interface ExtendDeliveryRequest {
  days: number
  reason?: string
}

export interface UpdateOrderServicesRequest {
  serviceIds: string[]
}

export interface FlagAskingTaskRequest {
  isFlagged: boolean
}

export interface UpdateAskingTaskStageRequest {
  stage: string
  confirmation?: string
  updateRequest?: string
}
