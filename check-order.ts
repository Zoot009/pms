import prisma from './lib/prisma'

async function checkOrder() {
  const order = await prisma.order.findUnique({
    where: { id: 'cmi6yfmkl0001l704zar4ztut' },
    include: {
      tasks: true,
      askingTasks: true,
      orderType: {
        include: {
          services: true
        }
      }
    }
  })

  if (!order) {
    console.log('Order not found!')
    return
  }

  console.log('Order:', order.orderNumber)
  console.log('Status:', order.status)
  console.log('Tasks:', order.tasks.length)
  console.log('Asking Tasks:', order.askingTasks.length)
  console.log('Order Type Services:', order.orderType.services?.length || 0)
  console.log('\nOrder should appear on delivery page:', order.status === 'PENDING' || order.status === 'IN_PROGRESS')

  await prisma.$disconnect()
}

checkOrder()
