import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'
import TaskStatistics from './task-statistics'

export const metadata: Metadata = {
  title: 'Task Statistics | Admin',
  description: 'View task statistics by team and individual members',
}

export default async function StatisticsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    redirect('/auth/unauthorized')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Task Statistics</h2>
      </div>
      <TaskStatistics />
    </div>
  )
}
