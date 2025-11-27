'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ServiceActions } from './service-actions'

interface Service {
  id: string
  name: string
  type: string
  description: string | null
  timeLimit: number | null
  isMandatory: boolean
  requiresCompletionNote: boolean
  team: {
    id: string
    name: string
  }
}

interface ServicesTableProps {
  services: Service[]
}

export function ServicesTable({ services }: ServicesTableProps) {
  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'SERVICE_TASK':
        return <Badge variant="default">Service Task</Badge>
      case 'ASKING_SERVICE':
        return <Badge variant="secondary">Details Task</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Assigned Team</TableHead>
            <TableHead>Time Limit</TableHead>
            <TableHead>Completion Note</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No services found. Create your first service to get started.
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{service.name}</div>
                    {service.isMandatory && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getServiceTypeBadge(service.type)}</TableCell>
                <TableCell>
                  <span className="text-sm">{service.team.name}</span>
                </TableCell>
                <TableCell>
                  {service.timeLimit ? (
                    <span className="text-sm">{service.timeLimit} hours</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {service.requiresCompletionNote ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                      Required
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground max-w-xs truncate block">
                    {service.description || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <ServiceActions
                    serviceId={service.id}
                    serviceName={service.name}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
