'use client'

import { useState, useEffect, use } from 'react'
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
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
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

interface OrderType {
  id: string
  name: string
  timeLimitDays: number
  description: string | null
  isActive: boolean
  services: {
    serviceId: string
  }[]
  _count: {
    orders: number
  }
}

export default function EditOrderTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [orderType, setOrderType] = useState<OrderType | null>(null)
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isLoadingOrderType, setIsLoadingOrderType] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

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
    async function fetchData() {
      try {
        const [servicesResponse, orderTypeResponse] = await Promise.all([
          axios.get<Service[]>('/api/admin/services'),
          axios.get<OrderType>(`/api/admin/order-types/${resolvedParams.id}`),
        ])

        setServices(servicesResponse.data.filter((service: any) => service.isActive))
        setOrderType(orderTypeResponse.data)

        // Populate form with order type data
        form.reset({
          name: orderTypeResponse.data.name,
          timeLimitDays: orderTypeResponse.data.timeLimitDays,
          description: orderTypeResponse.data.description || '',
          serviceIds: orderTypeResponse.data.services.map((s) => s.serviceId),
        })
      } catch (error) {
        toast.error('Failed to load data')
        console.error('Error fetching data:', error)
      } finally {
        setIsLoadingServices(false)
        setIsLoadingOrderType(false)
      }
    }

    fetchData()
  }, [resolvedParams.id, form])

  async function onSubmit(data: OrderTypeFormValues) {
    setIsSubmitting(true)
    try {
      const response = await axios.patch(
        `/api/admin/order-types/${resolvedParams.id}`,
        data
      )

      setOrderType(response.data)
      toast.success('Order type updated successfully')
      router.refresh()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to update order type')
      } else {
        toast.error('An unexpected error occurred')
      }
      console.error('Error updating order type:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleStatus() {
    if (!orderType) return

    setIsTogglingStatus(true)
    try {
      const response = await axios.patch(
        `/api/admin/order-types/${resolvedParams.id}/status`
      )

      setOrderType(response.data)
      toast.success(
        `Order type ${response.data.isActive ? 'activated' : 'deactivated'} successfully`
      )
      router.refresh()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || 'Failed to update order type status'
        )
      } else {
        toast.error('An unexpected error occurred')
      }
      console.error('Error toggling status:', error)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await axios.delete(`/api/admin/order-types/${resolvedParams.id}`)
      toast.success('Order type deleted successfully')
      router.push('/admin/order-types')
      router.refresh()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Failed to delete order type')
      } else {
        toast.error('An unexpected error occurred')
      }
      console.error('Error deleting order type:', error)
    } finally {
      setIsDeleting(false)
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

  if (isLoadingOrderType) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!orderType) {
    return (
      <div className="p-8">
        <p>Order type not found</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/order-types">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Edit Order Type</h1>
              <Badge variant={orderType.isActive ? 'default' : 'secondary'}>
                {orderType.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">Update order type information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={orderType.isActive ? 'outline' : 'default'}
            onClick={handleToggleStatus}
            disabled={isTogglingStatus}
          >
            {isTogglingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {orderType.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the order type "{orderType.name}".
                  {orderType._count.orders > 0 && (
                    <span className="block mt-2 text-red-600 font-medium">
                      Warning: This order type has {orderType._count.orders} associated order(s).
                    </span>
                  )}
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Type Information</CardTitle>
              <CardDescription>
                Update the basic details for the order type
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
                      <FormDescription>
                        Default time limit for orders of this type
                      </FormDescription>
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
              Update Order Type
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
