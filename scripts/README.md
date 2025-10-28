# Add Members Script

This script adds all members from the temp.txt file to the database and syncs them with Supabase Auth.

## Prerequisites

Make sure you have the `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file. This is the service role key (not the anon key) which has admin privileges.

Add this to your `.env` file:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find this key in your Supabase project settings under API.

## How to Run

From the project root directory, run:

```bash
npx tsx scripts/add-members.ts
```

Or if you have tsx installed globally:

```bash
tsx scripts/add-members.ts
```

## What the Script Does

1. **Creates users in Supabase Auth** with:
   - Email: `<firstname>@pms.com` (lowercase)
   - Password: `admin123`
   - Email auto-confirmed

2. **Creates/Updates users in the database** with:
   - Role: MEMBER
   - Employee ID from the list
   - Active status: true
   - Display name and first name set to their name

## Members Being Added

- Aishwarya (ZOOT1049)
- Ronit (ZOOT1012)
- Pranali (ZOOT1074)
- Srushti (ZOOT1072)
- Narayan (ZOOT1003)
- Robin (ZOOT1004)
- Karuna (ZOOT1006)
- Shreedhar (ZOOT1007)
- Kunal (ZOOT1008)
- Sopan (ZOOT1025)
- Pratik (ZOOT1031)
- Neha (ZOOT1042)
- Monika (ZOOT1059)
- Jannat (ZOOT1060)
- Sneha (ZOOT1061)
- Kashish (ZOOT1066)
- Divya (ZOOT1067)
- Shruti (ZOOT1068)
- Prarthana (ZOOT1069)
- Asmita (ZOOT1071)
- Sashidaran (ZOOT1076)
- Kritika (ZOOT1078)

## Login Credentials

After running the script, all members can log in with:
- Email: `<their_firstname>@pms.com` (e.g., `aishwarya@pms.com`)
- Password: `admin123`

## Error Handling

The script will:
- Check if users already exist before creating
- Update existing users if they're already in the database
- Show a summary of successful and failed operations
- Continue processing even if some users fail

## Notes

- The script uses the Supabase Admin API which requires the service role key
- All emails will be auto-confirmed (no email verification required)
- Users can change their passwords after first login
- All users are created with the MEMBER role
