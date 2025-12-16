'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Revision error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold">Something went wrong!</h2>
      <p className="text-center text-muted-foreground max-w-md">
        {error.message || 'An error occurred while loading revision data.'}
      </p>
      <Button onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}
