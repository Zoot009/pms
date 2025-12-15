'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, UserX, UserCheck, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const userFormSchema = z.object({
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
  firstName: string | null
  lastName: string | null
  avatar: string | null
  employeeId: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  _count: {
    teamMemberships: number
    leadingTeams: number
  }
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
  })

  useEffect(() => {
    fetchUser()
  }, [resolvedParams.id])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${resolvedParams.id}`)
      if (!response.ok) throw new Error('Failed to fetch user')
      
      const data = await response.json()
      setUser(data.user)
      
      // Set form values
      form.reset({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        employeeId: data.user.employeeId || '',
        role: data.user.role,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: UserFormValues) => {
    setSaving(true)
    setError(null)

    try {
      await axios.patch(`/api/admin/users/${resolvedParams.id}`, data)
      await fetchUser()
      router.refresh()
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || err.response?.data?.error || 'Failed to update user' : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!user) return

    try {
      await axios.patch(`/api/admin/users/${resolvedParams.id}/status`, { isActive: !user.isActive })
      await fetchUser()
      router.refresh()
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || 'Failed to update status' : 'Failed to update status')
    }
  }

  const handleDeleteUser = async () => {
    if (!user) return

    try {
      await axios.delete(`/api/admin/users/${resolvedParams.id}`)
      router.push('/admin/users')
      router.refresh()
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || err.response?.data?.error || 'Failed to delete user' : 'Failed to delete user')
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
    return email?.slice(0, 2).toUpperCase() || 'U'
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">User Details</h1>
          <p className="text-muted-foreground">Manage user information and permissions</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant={user.isActive ? 'destructive' : 'default'}>
              {user.isActive ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {user.isActive ? 'Deactivate User' : 'Activate User'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {user.isActive
                  ? 'This will prevent the user from logging in. You can reactivate them later.'
                  : 'This will allow the user to log in again.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleStatus}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This action cannot be undone. 
                All user data, team memberships, and assigned tasks will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUser}
                className="bg-destructive  text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(user.displayName, user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{user.displayName || 'No Name'}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teams (Member):</span>
                <span className="font-medium">{user._count.teamMemberships}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teams (Leader):</span>
                <span className="font-medium">{user._count.leadingTeams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login:</span>
                <span className="font-medium">
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined:</span>
                <span className="font-medium">
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Information</CardTitle>
            <CardDescription>Update user details and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ORDER_CREATOR">Order Creator</SelectItem>
                          <SelectItem value="REVISION_MANAGER">Revision Manager</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Determines what the user can access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
