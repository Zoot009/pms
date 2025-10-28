import { Suspense } from 'react'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, UserCog } from 'lucide-react'
import { format } from 'date-fns'

async function getUsersList() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          teamMemberships: true,
          leadingTeams: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return users
}

function UserTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  )
}

async function UsersTable() {
  const users = await getUsersList()

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'MEMBER':
        return 'secondary'
      case 'ORDER_CREATOR':
        return 'outline'
      default:
        return 'secondary'
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Employee ID</TableHead>
            <TableHead>Teams</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.displayName || 'No Name'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {user.employeeId || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {user._count.leadingTeams > 0 && (
                      <span className="text-muted-foreground">
                        Leading: {user._count.leadingTeams}
                      </span>
                    )}
                    {user._count.leadingTeams > 0 && user._count.teamMemberships > 0 && ' • '}
                    {user._count.teamMemberships > 0 && (
                      <span className="text-muted-foreground">
                        Member: {user._count.teamMemberships}
                      </span>
                    )}
                    {user._count.leadingTeams === 0 && user._count.teamMemberships === 0 && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/users/${user.id}`}>
                      <UserCog className="h-4 w-4 mr-1" />
                      Manage
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function UsersPage() {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Manage system users and their roles</p>
          </div>
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              A list of all users in the system with their roles and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<UserTableSkeleton />}>
              <UsersTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
