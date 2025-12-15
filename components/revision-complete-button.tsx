'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
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
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RevisionCompleteButtonProps {
  orderId: string
  orderNumber: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function RevisionCompleteButton({
  orderId,
  orderNumber,
  variant = 'default',
  size = 'sm',
}: RevisionCompleteButtonProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/orders/${orderId}/complete-revision`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision', 'revision-orders'] })
      queryClient.invalidateQueries({ queryKey: ['revision', 'completed-revisions'] })
      toast.success('Revision marked as completed')
      setOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete revision')
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={completeMutation.isPending}>
          {completeMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Mark as Completed
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Revision as Completed?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to mark revision for order <strong>{orderNumber}</strong> as completed?
            This will move it to the completed revisions section.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={completeMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              completeMutation.mutate()
            }}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              'Yes, Mark as Completed'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
