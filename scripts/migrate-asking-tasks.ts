/**
 * Migration script to convert existing Task records with ASKING_SERVICE type
 * to AskingTask records
 */

import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration of asking service tasks...')

  // Find all tasks with ASKING_SERVICE type
  const askingServiceTasks = await prisma.task.findMany({
    where: {
      service: {
        type: 'ASKING_SERVICE',
      },
    },
    include: {
      service: true,
      order: true,
    },
  })

  console.log(`Found ${askingServiceTasks.length} asking service tasks to migrate`)

  if (askingServiceTasks.length === 0) {
    console.log('No asking service tasks found. Migration complete.')
    return
  }

  // Create AskingTask records for each
  for (const task of askingServiceTasks) {
    console.log(`Migrating task ${task.id} - ${task.title}`)

    // Check if AskingTask already exists for this order/service
    const existingAskingTask = await prisma.askingTask.findFirst({
      where: {
        orderId: task.orderId,
        serviceId: task.serviceId,
      },
    })

    if (existingAskingTask) {
      console.log(`  -> AskingTask already exists for this order/service, skipping`)
      continue
    }

    // Create new AskingTask
    await prisma.askingTask.create({
      data: {
        orderId: task.orderId,
        serviceId: task.serviceId,
        teamId: task.teamId,
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        currentStage: 'ASKED',
        priority: task.priority,
        deadline: task.deadline,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    })

    console.log(`  -> Created AskingTask`)

    // Optionally delete the old Task record
    // Uncomment if you want to remove the old records
    // await prisma.task.delete({
    //   where: { id: task.id },
    // })
    // console.log(`  -> Deleted old Task record`)
  }

  console.log('Migration complete!')
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
