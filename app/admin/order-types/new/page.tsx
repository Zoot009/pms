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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const orderTypeSchema = z.object({
  name: z.string().min(1, 'Order type name is required'),
  timeLimitDays: z.number().positive('Time limit must be greater than 0'),
  description: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, 'Select at least one service'),
})

type OrderTypeFormValues = z.infer<typeof orderTypeSchema>

interface Service {
  id: string
  name: string
  type: string
  timeLimit: number | null
  team: {
    id: string
    name: string
  }
}

export default function NewOrderTypePage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<OrderTypeFormValues>({
    resolver: zodResolver(orderTypeSchema),
    defaultValues: {
      name: '',
      timeLimitDays: undefined,
      description: '',
      serviceIds: [],
    },
  })

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await axios.get<Service[]>('/api/admin/services')
        setServices(response.data.filter((service: any) => service.isActive))
      } catch (error) {
        toast.error('Failed to load services')
        console.error('Error fetching services:', error)
      } finally {
        setIsLoadingServices(false)
      }
    }

    fetchServices()
  }, [])

  async function onSubmit(data: OrderTypeFormValues) {
    setIsSubmitting(true)
    try {
      await axios.post('/api/admin/order-types', data)
      toast.success('Order type created successfully')
      router.push('/admin/order-types')
      router.refresh()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to create order type')
      } else {
        toast.error('An unexpected error occurred')
      }
      console.error('Error creating order type:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'SERVICE_TASK':
        return <Badge variant="default" className="text-xs">Service Task</Badge>
      case 'ASKING_SERVICE':
        return <Badge variant="secondary" className="text-xs">Details Task</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/order-types">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Order Type</h1>
          <p className="text-muted-foreground">Add a new order type to the system</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Type Information</CardTitle>
              <CardDescription>
                Enter the basic details for the new order type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Type Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Basic, Gold, Premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeLimitDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (days) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter time limit in days"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter order type description"
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description of the order type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Services (Tasks) to Include</CardTitle>
              <CardDescription>
                Choose which services should be included in this order type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="serviceIds"
                render={() => (
                  <FormItem>
                    {isLoadingServices ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : services.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No active services found. Please create services first.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {services.map((service) => (
                          <FormField
                            key={service.id}
                            control={form.control}
                            name="serviceIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={service.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(service.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, service.id])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== service.id)
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <FormLabel className="font-medium cursor-pointer">
                                        {service.name}
                                      </FormLabel>
                                      {getServiceTypeBadge(service.type)}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs">
                                          {service.team.name}
                                        </Badge>
                                      </span>
                                      {service.timeLimit && (
                                        <span className="text-xs">
                                          Time: {service.timeLimit}h
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order Type
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/order-types">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
