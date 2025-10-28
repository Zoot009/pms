import { PrismaClient, UserRole } from '../lib/generated/prisma'

const prisma = new PrismaClient()

// Team data from the file
const teams = [
  {
    name: 'Website Optimization Team',
    leader: 'Divya',
    members: ['Shreedhar', 'Kunal', 'Jannat', 'Shruti', 'Kritika'],
  },
  {
    name: 'Website Development team',
    leader: 'Robin',
    members: ['Shreedhar', 'Kunal'],
  },
  {
    name: 'Order Delivery Team',
    leader: 'Narayan',
    members: ['Prarthana', 'Sneha', 'Monika'],
  },
  {
    name: 'Backlinks Team',
    leader: 'Pranali',
    members: ['Asmita', 'Kashish', 'Ronit', 'Srushti'],
  },
  {
    name: 'In Progress Zoom Call Follow-up',
    leader: 'Pratik',
    members: ['Aishwarya'],
  },
  {
    name: 'Ubersuggest Zoom Call Pitching Follow-up',
    leader: 'Pratik',
    members: ['Prarthana'],
  },
  {
    name: 'Access Team',
    leader: 'Aishwarya',
    members: ['Sashidaran', 'Sopan', 'Neha'],
  },
  {
    name: 'SWOT Team',
    leader: 'Divya',
    members: ['Kritika', 'Shruti', 'Jannat'],
  },
]

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Helper function to find user by first name
async function findUserByFirstName(firstName: string) {
  const user = await prisma.user.findFirst({
    where: {
      firstName: {
        equals: firstName,
        mode: 'insensitive',
      },
      isActive: true,
    },
  })

  if (!user) {
    throw new Error(`User not found: ${firstName}`)
  }

  return user
}

async function createTeams() {
  console.log('Starting to create teams...\n')

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (const teamData of teams) {
    try {
      console.log(`Processing team: ${teamData.name}`)
      console.log(`  Leader: ${teamData.leader}`)
      console.log(`  Members: ${teamData.members.join(', ')}`)

      // Find the leader
      const leader = await findUserByFirstName(teamData.leader)
      console.log(`  ✅ Found leader: ${leader.displayName || leader.firstName} (${leader.email})`)

      // Note: Leaders remain with their current role (MEMBER, ADMIN, etc.)
      // The team relationship defines them as leaders

      // Generate slug
      const slug = generateSlug(teamData.name)

      // Check if team already exists
      const existingTeam = await prisma.team.findFirst({
        where: {
          OR: [{ name: teamData.name }, { slug: slug }],
        },
      })

      let team
      if (existingTeam) {
        console.log(`  ⚠️  Team already exists, updating...`)
        team = await prisma.team.update({
          where: { id: existingTeam.id },
          data: {
            name: teamData.name,
            slug: slug,
            leaderId: leader.id,
            isActive: true,
          },
        })
        console.log(`  ✅ Updated team`)
      } else {
        // Create the team
        team = await prisma.team.create({
          data: {
            name: teamData.name,
            slug: slug,
            leaderId: leader.id,
            isActive: true,
          },
        })
        console.log(`  ✅ Created team (ID: ${team.id})`)
      }

      // Find and add all members
      const memberIds: string[] = []
      for (const memberName of teamData.members) {
        try {
          const member = await findUserByFirstName(memberName)
          memberIds.push(member.id)
          console.log(`  ✅ Found member: ${member.displayName || member.firstName}`)
        } catch (error) {
          console.log(`  ⚠️  Member not found: ${memberName}`)
        }
      }

      // Remove existing team members (if updating)
      if (existingTeam) {
        await prisma.teamMember.deleteMany({
          where: { teamId: team.id },
        })
        console.log(`  🗑️  Removed existing team members`)
      }

      // Add team members
      if (memberIds.length > 0) {
        await prisma.teamMember.createMany({
          data: memberIds.map((userId) => ({
            teamId: team.id,
            userId: userId,
            isActive: true,
          })),
          skipDuplicates: true,
        })
        console.log(`  ✅ Added ${memberIds.length} team members`)
      }

      successCount++
      console.log(`  ✅ Successfully processed team: ${teamData.name}\n`)
    } catch (error) {
      errorCount++
      const errorMsg = `Failed to create team "${teamData.name}": ${
        error instanceof Error ? error.message : String(error)
      }`
      errors.push(errorMsg)
      console.error(`  ❌ ${errorMsg}\n`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total teams: ${teams.length}`)
  console.log(`✅ Successfully processed: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)

  if (errors.length > 0) {
    console.log('\nErrors:')
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`)
    })
  }

  console.log('\nTeams have been created with their leaders and members!')
  console.log('Note: Team leaders have been automatically upgraded to TEAM_LEADER role if they were MEMBER.')
}

async function main() {
  try {
    await createTeams()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
