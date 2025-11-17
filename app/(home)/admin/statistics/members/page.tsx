import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { UserRole } from '@/lib/generated/prisma'
import MemberStatistics from './member-statistics'

export const metadata: Metadata = {
  title: 'Member Statistics | Admin',
  description: 'View detailed task statistics for individual members',
}

export default async function MemberStatisticsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    redirect('/auth/unauthorized')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Member Statistics</h2>
          <p className="text-muted-foreground">
            Detailed task statistics for individual team members
          </p>
        </div>
      </div>
      <MemberStatistics />
    </div>
  )
}
