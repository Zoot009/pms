import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '../lib/generated/prisma'

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const prisma = new PrismaClient()

// Member data from the file
const members = [
  { firstName: 'Aishwarya', employeeId: 'ZOOT1049' },
  { firstName: 'Ronit', employeeId: 'ZOOT1012' },
  { firstName: 'Pranali', employeeId: 'ZOOT1074' },
  { firstName: 'Srushti', employeeId: 'ZOOT1072' },
  { firstName: 'Narayan', employeeId: 'ZOOT1003' },
  { firstName: 'Robin', employeeId: 'ZOOT1004' },
  { firstName: 'Karuna', employeeId: 'ZOOT1006' },
  { firstName: 'Shreedhar', employeeId: 'ZOOT1007' },
  { firstName: 'Kunal', employeeId: 'ZOOT1008' },
  { firstName: 'Sopan', employeeId: 'ZOOT1025' },
  { firstName: 'Pratik', employeeId: 'ZOOT1031' },
  { firstName: 'Neha', employeeId: 'ZOOT1042' },
  { firstName: 'Monika', employeeId: 'ZOOT1059' },
  { firstName: 'Jannat', employeeId: 'ZOOT1060' },
  { firstName: 'Sneha', employeeId: 'ZOOT1061' },
  { firstName: 'Kashish', employeeId: 'ZOOT1066' },
  { firstName: 'Divya', employeeId: 'ZOOT1067' },
  { firstName: 'Shruti', employeeId: 'ZOOT1068' },
  { firstName: 'Prarthana', employeeId: 'ZOOT1069' },
  { firstName: 'Asmita', employeeId: 'ZOOT1071' },
  { firstName: 'Sashidaran', employeeId: 'ZOOT1076' },
  { firstName: 'Kritika', employeeId: 'ZOOT1078' },
]

async function addMembers() {
  console.log('Starting to add members...\n')

  let successCount = 0
  let errorCount = 0

  for (const member of members) {
    const email = `${member.firstName.toLowerCase()}@pms.com`
    const password = 'admin123'

    try {
      console.log(`Processing: ${member.firstName} (${member.employeeId})...`)

      // Check if user already exists in Supabase
      const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingAuthUser?.users.find((u) => u.email === email)

      let authUserId: string

      if (userExists) {
        console.log(`  ⚠️  User already exists in Supabase Auth: ${email}`)
        authUserId = userExists.id
      } else {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            display_name: member.firstName,
            first_name: member.firstName,
            employee_id: member.employeeId,
          },
        })

        if (authError) {
          throw new Error(`Supabase Auth error: ${authError.message}`)
        }

        if (!authData.user) {
          throw new Error('Failed to create user in Supabase Auth')
        }

        authUserId = authData.user.id
        console.log(`  ✅ Created in Supabase Auth (ID: ${authUserId})`)
      }

      // Check if user exists in database
      const existingDbUser = await prisma.user.findUnique({
        where: { id: authUserId },
      })

      if (existingDbUser) {
        console.log(`  ⚠️  User already exists in database`)
        // Update the user to ensure data is in sync
        await prisma.user.update({
          where: { id: authUserId },
          data: {
            email,
            displayName: member.firstName,
            firstName: member.firstName,
            employeeId: member.employeeId,
            role: 'MEMBER',
            isActive: true,
          },
        })
        console.log(`  ✅ Updated user in database`)
      } else {
        // Create user in database
        await prisma.user.create({
          data: {
            id: authUserId,
            email,
            displayName: member.firstName,
            firstName: member.firstName,
            employeeId: member.employeeId,
            role: 'MEMBER',
            isActive: true,
          },
        })
        console.log(`  ✅ Created in database`)
      }

      successCount++
      console.log(`  ✅ Successfully processed ${member.firstName}\n`)
    } catch (error) {
      errorCount++
      console.error(`  ❌ Error processing ${member.firstName}:`, error)
      console.error(`     Email: ${email}\n`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`Total members: ${members.length}`)
  console.log(`✅ Successfully processed: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)
  console.log('\nAll users have been configured with:')
  console.log('  Email: <firstname>@pms.com')
  console.log('  Password: admin123')
  console.log('  Role: MEMBER')
}

async function main() {
  try {
    await addMembers()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
