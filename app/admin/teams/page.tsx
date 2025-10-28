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
import { Plus, Users } from 'lucide-react'
import { format } from 'date-fns'

async function getTeamsList() {
  const teams = await prisma.team.findMany({
    include: {
      leader: true,
      _count: {
        select: {
          members: true,
          services: true,
          tasks: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return teams
}

function TeamsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  )
}

async function TeamsTable() {
  const teams = await getTeamsList()

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
            <TableHead>Team Name</TableHead>
            <TableHead>Team Leader</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Active Tasks</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No teams found. Create your first team to get started.
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{team.name}</div>
                    {team.slug && (
                      <div className="text-sm text-muted-foreground">{team.slug}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={team.leader.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(team.leader.displayName, team.leader.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{team.leader.displayName || team.leader.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{team._count.members}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{team._count.services}</Badge>
                </TableCell>
                <TableCell>
                  <Badge>{team._count.tasks}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(team.createdAt), 'MMM d, yyyy')}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/teams/${team.id}`}>
                      <Users className="h-4 w-4 mr-1" />
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

export default function TeamsPage() {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground">Manage teams, leaders, and members</p>
          </div>
          <Button asChild>
            <Link href="/admin/teams/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Teams</CardTitle>
            <CardDescription>
              A list of all teams with their leaders and member counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TeamsTableSkeleton />}>
              <TeamsTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
