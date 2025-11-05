import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { ServicesTable } from './services-table'

async function getServicesList(searchQuery?: string) {
  const services = await prisma.service.findMany({
    where: searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasks: true,
          askingTasks: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return services
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const services = await getServicesList(params.search)
  
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Services Management</h1>
            <p className="text-muted-foreground">Manage services and task types</p>
          </div>
          <Button asChild>
            <Link href="/order-creator/services/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Link>
          </Button>
        </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Services</CardTitle>
              <CardDescription>
                A list of all services with their assigned teams
              </CardDescription>
            </div>
            <div className="w-72">
              <form action="/order-creator/services" method="get">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    name="search"
                    placeholder="Search services..."
                    className="pl-8"
                    defaultValue={params.search}
                  />
                </div>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ServicesTable services={services} />
        </CardContent>
      </Card>
      </div>
    </>
  )
}
