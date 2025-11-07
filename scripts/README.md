# Database Seeding Scripts

This folder contains scripts to populate your database with initial data for testing and development.

## Quick Start - Seed Everything at Once

To populate your entire database with all data, simply run:

```bash
npx tsx scripts/seed-database.ts
```

This master script will run all seeding scripts in the correct order:
1. Create admin user
2. Create teams
3. Add member users
4. Create services
5. Create order types

## Individual Scripts

You can also run each script individually if needed:

### 1. Create Admin User

```bash
npx tsx scripts/create-admin.ts
```

Creates an admin user account for system administration.

### 2. Create Teams

```bash
npx tsx scripts/create-teams.ts
```

Creates teams in the system. **Note:** All services are currently assigned to "Website Optimization Team" for easier testing.

### 3. Add Members

```bash
npx tsx scripts/add-members.ts
```

Creates member user accounts and assigns them to teams.

**Members added:**
- Aishwarya (ZOOT1049)
- Ronit (ZOOT1012)
- Pranali (ZOOT1074)
- Srushti (ZOOT1072)
- Narayan (ZOOT1003)
- Robin (ZOOT1004)

Default credentials:
- Email: `<firstname>@pms.com` (lowercase)
- Password: `admin123`

### 4. Create Services

```bash
npx tsx scripts/create-services.ts
```

Creates service tasks and detail tasks (asking services).

**Services created:**
- 9 Service Tasks: Website Analysis, Keyword Research, On-Page SEO, Website Development, Responsive Design, Backlink Building, Guest Posting, SWOT Analysis, Competitor Analysis
- 6 Detail Tasks: Website Access Details, Hosting Details, Domain Details, Analytics Access, Social Media Access, Business Information

**Note:** All services are assigned to "Website Optimization Team" for testing purposes.

### 5. Create Order Types

```bash
npx tsx scripts/create-order-types.ts
```

Creates order type packages with service associations.

**Order types created:**
- Basic SEO Package (7 days)
- Complete SEO Package (14 days)
- Website Development Package (21 days)
- Backlink Building Package (30 days)
- Business Analysis Package (7 days)
- Starter Package (5 days)
- Premium SEO & Development (30 days)
- Social Media Integration (10 days)
- Quick SEO Audit (3 days)
- Enterprise Package (45 days)

## Prerequisites

Make sure you have the following in your `.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=your_database_connection_string
```

You can find the service role key in your Supabase project settings under API.

## Testing Setup

All services are currently assigned to **"Website Optimization Team"** for easier testing. This means you only need to login as one member from that team to test all functionality without switching between multiple accounts.

## Troubleshooting

If scripts fail:
1. Check your database connection
2. Verify your `.env` configuration
3. Ensure migrations are up to date: `npx prisma migrate dev`
4. Run failed scripts individually to see detailed errors

## Login Credentials

After running the seeding scripts:

**Admin:**
- Check console output for admin credentials

**Members:**
- Email: `<firstname>@pms.com` (e.g., `aishwarya@pms.com`)
- Password: `admin123`

## Post-Seeding Steps

1. Login as admin
2. Verify teams at `/admin/teams`
3. Verify services at `/admin/services`
4. Verify order types at `/admin/order-types`
5. Create your first order!

## Script Details

### seed-database.ts
Master script that runs all seeding scripts in the correct order with:
- Colored console output for better visibility
- Progress tracking and summary
- Error handling and retry logic
- Automatic stopping on required script failures
