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
    // Log error to console in development
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold">Something went wrong!</h2>
      <p className="text-center text-muted-foreground max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && error.digest && (
        <p className="text-xs text-muted-foreground mt-4">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
