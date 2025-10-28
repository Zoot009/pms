import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '../lib/generated/prisma/index.js'

const prisma = new PrismaClient()

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function createAdminUser() {
  try {
    console.log('Creating admin user...')

    const adminEmail = 'admin@pms.com'
    const adminPassword = 'admin123456'

    // Check if admin already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      console.log('✅ Admin user already exists!')
      console.log('Email:', adminEmail)
      console.log('Password:', adminPassword)
      return
    }

    // Create user in Supabase Auth
    console.log('Creating user in Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        full_name: 'Admin User',
      },
    })

    if (authError) {
      throw new Error(`Supabase Auth error: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create user in Supabase')
    }

    console.log('✅ User created in Supabase Auth')

    // Create user in database
    console.log('Creating user in database...')
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log('')
    console.log('Login credentials:')
    console.log('==================')
    console.log('Email:', adminEmail)
    console.log('Password:', adminPassword)
    console.log('==================')
    console.log('')
    console.log('You can now login at: http://localhost:3000/login')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
