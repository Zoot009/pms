'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from 'axios'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const serviceSchema = z
  .object({
    name: z.string().min(1, 'Service name is required'),
    type: z.enum(['SERVICE_TASK', 'ASKING_SERVICE']),
    teamId: z.string().min(1, 'Team assignment is required'),
    timeLimit: z.number().positive().optional(),
    description: z.string().optional(),
    detailStructure: z.string().optional(),
    isMandatory: z.boolean(),
    hasTaskCount: z.boolean(),
    taskCount: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      // If hasTaskCount is true, taskCount must be provided
      if (data.hasTaskCount && !data.taskCount) {
        return false
      }
      return true
    },
    {
      message: 'Task count is required when "Has Task Count" is enabled',
      path: ['taskCount'],
    }
  )

type ServiceFormValues = z.infer<typeof serviceSchema>

interface Team {
  id: string
  name: string
}

export default function NewServicePage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      type: undefined,
      teamId: '',
      timeLimit: undefined,
      description: '',
      detailStructure: '',
      isMandatory: false,
      hasTaskCount: false,
      taskCount: undefined,
    },
  })

  const serviceType = form.watch('type')
  const hasTaskCount = form.watch('hasTaskCount')

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await axios.get<{ teams: Team[] }>('/api/admin/teams')
        setTeams(response.data.teams.filter((team: any) => team.isActive))
      } catch (error) {
        toast.error('Failed to load teams')
        console.error('Error fetching teams:', error)
      } finally {
        setIsLoadingTeams(false)
      }
    }

    fetchTeams()
  }, [])

  async function onSubmit(data: ServiceFormValues) {
    setIsSubmitting(true)
    try {
      // Only include detailStructure if service type is ASKING_SERVICE
      const payload = {
        ...data,
        detailStructure:
          data.type === 'ASKING_SERVICE' ? data.detailStructure : undefined,
        taskCount: data.hasTaskCount ? data.taskCount : null,
      }

      await axios.post('/api/admin/services', payload)
      toast.success('Service created successfully')
      router.push('/admin/services')
      router.refresh()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to create service')
      } else {
        toast.error('An unexpected error occurred')
      }
      console.error('Error creating service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Service</h1>
          <p className="text-muted-foreground">Add a new service to the system</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Information</CardTitle>
          <CardDescription>
            Enter the details for the new service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter service name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SERVICE_TASK">Service Task</SelectItem>
                          <SelectItem value="ASKING_SERVICE">Details Task</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Team *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingTeams}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The team responsible for this service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (hours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter time limit in hours"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum time allowed to complete this service (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isMandatory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Mandatory Service</FormLabel>
                        <FormDescription>
                          Mark this service as mandatory for order types
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasTaskCount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Has Task Count</FormLabel>
                        <FormDescription>
                          Enable if this service has a specific task count (e.g., number of pages)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {hasTaskCount && (
                  <FormField
                    control={form.control}
                    name="taskCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Count</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter task count"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Default number of tasks for this service
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter service description"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        General description of the service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {serviceType === 'ASKING_SERVICE' && (
                  <FormField
                    control={form.control}
                    name="detailStructure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detail Structure</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter detail structure for this service"
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Extra details or structure information for asking services
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Service
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/services">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
