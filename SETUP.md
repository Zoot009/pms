# Project Management System (PMS)

A comprehensive project management system built with Next.js, Prisma, Supabase, and shadcn/ui.

## 🚀 Features

- **Multi-Role Authentication**: Admin, Team Leader, Member, and Order Creator roles
- **Team Management**: Create teams with leaders and members
- **Service Management**: Define reusable service templates (Service Task & Asking Service)
- **Order Types**: Create order templates with multiple services
- **Order Management**: Track customer orders with delivery dates
- **Task Management**: Automatic task creation and assignment workflow
- **Audit Trail**: Complete logging of all system activities
- **Role-Based Dashboards**: Customized views for each user role

## 📋 Prerequisites

- Node.js 18+ and npm
- A Supabase account ([supabase.com](https://supabase.com))
- PostgreSQL database (via Supabase)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your credentials

### 3. Set Up Environment Variables

Update your `.env` file with your Supabase credentials:

```env
# Database (from Supabase > Project Settings > Database)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Supabase (from Supabase > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run Database Migration

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate Prisma Client

### 5. Create Your First Admin User

In Supabase Dashboard:
1. Go to Authentication > Users
2. Click "Add User"
3. Create a user with email and password
4. Copy the User ID

Then, in your database (Supabase > SQL Editor):

```sql
-- Insert admin user
INSERT INTO users (id, email, display_name, role, is_active)
VALUES ('USER_ID_FROM_SUPABASE', 'admin@example.com', 'Admin User', 'ADMIN', true);
```

### 6. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📱 User Roles & Dashboards

### Admin (`/admin/dashboard`)
- Manage users, teams, services, and order types
- View system-wide statistics
- Access audit logs
- Full system control

### Team Leader (`/team-leader/dashboard`)
- View team tasks and members
- Assign tasks to team members with priorities and deadlines
- Track team workload
- Monitor task progress

### Member (`/member/dashboard`)
- View assigned tasks
- Update task status (NOT_ASSIGNED → ASSIGNED → IN_PROGRESS → COMPLETED/OVERDUE)
- Track personal workload
- View deadlines

### Order Creator (`/orders`)
- Create new customer orders
- Select order types
- View order status

## 🔄 System Workflow

### 1. Admin Setup Phase
```
Create Services → Create Teams → Assign Services to Teams → Create Order Types
```

### 2. Order Processing
```
Order Created → Services Auto-Generated → Tasks Created for Teams → Team Leaders Assign to Members
```

### 3. Task Execution
```
NOT_ASSIGNED → ASSIGNED (by Team Leader) → IN_PROGRESS (by Member) → COMPLETED (by Member)
```

### 4. Task Types

**Service Task**: Simple task with status tracking
- Example: Web Development, Testing, Design

**Asking Service**: Stage-based workflow with multiple steps
- Stages: ASKED → SHARED → VERIFIED → INFORMED_TEAM
- Example: Client information gathering, requirement collection

## 🗂️ Project Structure

```
d:\pms\
├── app/
│   ├── admin/              # Admin dashboard and pages
│   ├── team-leader/        # Team leader dashboard and pages
│   ├── member/             # Member dashboard and pages
│   ├── login/              # Login page
│   ├── unauthorized/       # Access denied page
│   ├── api/
│   │   └── auth/           # Auth API routes
│   ├── layout.tsx
│   └── page.tsx            # Root redirect
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── dashboard-sidebar.tsx
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── auth-utils.ts       # Auth helper functions
│   ├── prisma.ts           # Prisma client
│   └── utils.ts
├── prisma/
│   └── schema.prisma       # Database schema
├── middleware.ts           # Auth middleware
└── .env                    # Environment variables
```

## 🔐 Authentication Flow

1. User signs in via Supabase Auth
2. Middleware checks authentication
3. User synced to database with role
4. Redirected to role-specific dashboard
5. Protected routes check permissions

## 📊 Database Models

- **User**: Authentication and profile
- **Team**: Teams with leaders
- **TeamMember**: Team membership (many-to-many)
- **Service**: Service templates
- **OrderType**: Order templates with services
- **Order**: Customer orders
- **Task**: Work items for team members
- **AskingTask**: Stage-based tasks
- **AuditLog**: Activity tracking

## 🎨 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **UI**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Date**: date-fns

## 🚧 Next Steps

1. **Run Migration**: `npx prisma migrate dev --name init`
2. **Create Admin User**: Follow step 5 above
3. **Start Dev Server**: `npm run dev`
4. **Login**: Visit http://localhost:3000
5. **Create Teams**: Admin Panel → Teams
6. **Create Services**: Admin Panel → Services
7. **Create Order Types**: Admin Panel → Order Types
8. **Start Managing**: Begin creating orders and assigning tasks!

## 📝 Notes

- All timestamps are stored in UTC
- Audit logs track all CRUD operations
- Tasks cannot move backward in status
- Team leaders can reassign tasks
- Deadlines must be before order delivery date

## 🐛 Troubleshooting

### Prisma Client Not Found
```bash
npx prisma generate
```

### Auth Errors
- Check `.env` file has correct Supabase credentials
- Verify user exists in Supabase Auth AND database

### Database Connection Issues
- Verify `DATABASE_URL` and `DIRECT_URL` in `.env`
- Check Supabase project is running

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

Built with ❤️ using Next.js, Prisma, and Supabase
