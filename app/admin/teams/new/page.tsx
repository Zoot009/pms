'use client'

import { useState, useEffect } from 'react'
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
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  leaderId: z.string().min(1, 'Team leader is required'),
})

type TeamFormData = z.infer<typeof teamSchema>

interface Leader {
  id: string
  email: string
  displayName: string | null
  role: string
}

export default function NewTeamPage() {
  const router = useRouter()
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  })

  // Fetch potential team leaders
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const { data } = await axios.get('/api/admin/teams/leaders')
        setLeaders(data.leaders)
      } catch (error) {
        console.error('Error fetching leaders:', error)
        toast.error('Failed to load team leaders')
      }
    }

    fetchLeaders()
  }, [])

  const onSubmit = async (data: TeamFormData) => {
    setIsLoading(true)
    try {
      const response = await axios.post('/api/admin/teams', data)
      toast.success('Team created successfully')
      router.push(`/admin/teams/${response.data.team.id}`)
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to create team' : 'Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Team</h1>
          <p className="text-muted-foreground">Add a new team with a team leader</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>Enter the details for the new team</CardDescription>
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
              <Select onValueChange={(value) => setValue('leaderId', value)}>
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

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating...' : 'Create Team'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/teams">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
