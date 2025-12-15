'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Alert, AlertDescription } from '@/components/ui/alert'

import { Plus, UserCog, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

/** Validation schema and types */
const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'ORDER_CREATOR', 'REVISION_MANAGER']),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface User {
  id: string
  email: string
  displayName: string | null
  avatar: string | null
  role: string
  employeeId: string | null
  isActive: boolean
  createdAt: Date
  _count: {
    teamMemberships: number
    leadingTeams: number
  }
}

/** Fetch helper used in UsersTable (server/client fetch) */
async function getUsersList(): Promise<User[]> {
  const response = await fetch('/api/admin/users', { cache: 'no-store' })
  if (!response.ok) return []
  const data = await response.json()
  return data.users || []
}

/** Skeleton shown while table data loads */
function UserTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  )
}

/** Main page component */
export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      employeeId: '',
      role: 'MEMBER',
    },
  })

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/admin/users')
      setUsers(response.data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await axios.post('/api/admin/users', data)
      toast.success('User created successfully! Welcome email sent.')
      setShowCreateModal(false)
      form.reset()
      fetchUsers()
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.error || 'Failed to create user'
        : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'MEMBER':
        return 'secondary'
      case 'ORDER_CREATOR':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return (email?.slice(0, 2).toUpperCase() as string) || 'U'
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>
        <div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users in the system with their roles and status
            {users.length > 0 && ' • '}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <UserTableSkeleton />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.displayName || 'No Name'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.employeeId || '-'}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {user._count.leadingTeams > 0 && (
                              <span className="text-muted-foreground">Leading: {user._count.leadingTeams}</span>
                            )}
                            {user._count.leadingTeams > 0 && user._count.teamMemberships > 0 && ' • '}
                            {user._count.teamMemberships > 0 && (
                              <span className="text-muted-foreground">Member: {user._count.teamMemberships}</span>
                            )}
                            {user._count.leadingTeams === 0 && user._count.teamMemberships === 0 && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/users/${user.id}`}>
                              <UserCog className="h-4 w-4 mr-1" />
                              Manage
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. A welcome email with login credentials will be sent.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormDescription>This will be used for login</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="ORDER_CREATOR">Order Creator</SelectItem>
                        <SelectItem value="REVISION_MANAGER">Revision Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Determines what the user can access</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false)
                    form.reset()
                    setError(null)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}