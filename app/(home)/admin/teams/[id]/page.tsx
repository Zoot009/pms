'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, UserPlus, UserMinus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  leaderId: z.string().min(1, 'Team leader is required'),
})

type TeamFormData = z.infer<typeof teamSchema>

interface TeamMember {
  id: string
  userId: string
  joinedAt: string
  isActive: boolean
  user: {
    id: string
    email: string
    displayName: string | null
    avatar: string | null
    role: string
  }
}

interface Team {
  id: string
  name: string
  slug: string | null
  isActive: boolean
  createdAt: string
  leader: {
    id: string
    email: string
    displayName: string | null
    avatar: string | null
  }
  members: TeamMember[]
  _count: {
    services: number
    tasks: number
  }
}

interface AvailableUser {
  id: string
  email: string
  displayName: string | null
  role: string
}

interface Leader {
  id: string
  email: string
  displayName: string | null
  role: string
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  })

  // Fetch team details
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const { data } = await axios.get(`/api/admin/teams/${resolvedParams.id}`)
        setTeam(data.team)
        reset({
          name: data.team.name,
          leaderId: data.team.leader.id,
        })
      } catch (error) {
        console.error('Error fetching team:', error)
        toast.error('Failed to load team details')
      }
    }

    fetchTeam()
  }, [resolvedParams.id, reset])

  // Fetch potential leaders
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const { data } = await axios.get('/api/admin/teams/leaders')
        setLeaders(data.leaders)
      } catch (error) {
        console.error('Error fetching leaders:', error)
      }
    }

    fetchLeaders()
  }, [])

  // Fetch available users for adding to team
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const { data } = await axios.get(`/api/admin/teams/${resolvedParams.id}/available-users`)
        setAvailableUsers(data.users)
      } catch (error) {
        console.error('Error fetching available users:', error)
      }
    }

    if (team) {
      fetchAvailableUsers()
    }
  }, [resolvedParams.id, team])

  const onSubmit = async (data: TeamFormData) => {
    setIsLoading(true)
    try {
      const response = await axios.patch(`/api/admin/teams/${resolvedParams.id}`, data)
      setTeam(response.data.team)
      toast.success('Team updated successfully')
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to update team' : 'Failed to update team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    setIsAddingMember(true)
    try {
      const response = await axios.post(`/api/admin/teams/${resolvedParams.id}/members`, { userId: selectedUserId })
      setTeam(response.data.team)
      setSelectedUserId('')
      
      // Refresh available users
      const usersResponse = await axios.get(`/api/admin/teams/${resolvedParams.id}/available-users`)
      setAvailableUsers(usersResponse.data.users)
      
      toast.success('Member added successfully')
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to add member' : 'Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (membershipId: string) => {
    try {
      const response = await axios.delete(`/api/admin/teams/${resolvedParams.id}/members/${membershipId}`)
      setTeam(response.data.team)
      
      // Refresh available users
      const usersResponse = await axios.get(`/api/admin/teams/${resolvedParams.id}/available-users`)
      setAvailableUsers(usersResponse.data.users)
      
      toast.success('Member removed successfully')
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to remove member' : 'Failed to remove member')
    }
  }

  const handleToggleStatus = async () => {
    if (!team) return

    try {
      const response = await axios.patch(`/api/admin/teams/${resolvedParams.id}/status`)
      setTeam(response.data.team)
      toast.success(`Team ${response.data.team.isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error('Error updating team status:', error)
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to update status' : 'Failed to update status')
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

  if (!team) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">Manage team details and members</p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant={team.isActive ? 'destructive' : 'default'}>
                {team.isActive ? 'Deactivate' : 'Activate'} Team
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {team.isActive ? 'Deactivate' : 'Activate'} Team?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {team.isActive
                    ? 'This will deactivate the team. Members will no longer be able to access team features.'
                    : 'This will activate the team. Members will be able to access team features.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleStatus}>
                  {team.isActive ? 'Deactivate' : 'Activate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Team Leader</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={team.leader.avatar || undefined} />
                <AvatarFallback>
                  {getInitials(team.leader.displayName, team.leader.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {team.leader.displayName || team.leader.email}
                </div>
                <div className="text-sm text-muted-foreground">{team.leader.email}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{team.members.length}</div>
            <p className="text-sm text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services & Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Services:</span>
                <Badge variant="secondary">{team._count.services}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Tasks:</span>
                <Badge>{team._count.tasks}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Team Information</CardTitle>
          <CardDescription>Update team name, slug, and leader</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Development Team"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaderId">Team Leader *</Label>
              <Select
                value={watch('leaderId')}
                onValueChange={(value) => setValue('leaderId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team leader" />
                </SelectTrigger>
                <SelectContent>
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      <div className="flex items-center gap-2">
                        <span>{leader.displayName || leader.email}</span>
                        <span className="text-xs text-muted-foreground">
                          ({leader.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaderId && (
                <p className="text-sm text-red-500">{errors.leaderId.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Add or remove members from this team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a user to add" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.displayName || user.email}</span>
                      <span className="text-xs text-muted-foreground">({user.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMember}
              disabled={isAddingMember || !selectedUserId}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No members yet. Add members to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  team.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.user.avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.user.displayName, member.user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.user.displayName || member.user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{member.user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <UserMinus className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove{' '}
                                {member.user.displayName || member.user.email} from this
                                team?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
