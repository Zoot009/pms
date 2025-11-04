# Public User Signup Feature

## Overview
This application supports public user registration, which can be enabled or disabled by developers through a simple environment variable configuration.

## How to Enable/Disable Signup

### Environment Variable Configuration

Add the following to your `.env.local` file (or `.env` for production):

```bash
# Enable public user signup (set to 'true' to enable, 'false' or omit to disable)
NEXT_PUBLIC_ENABLE_SIGNUP=true
```

**To enable signup:**
```bash
NEXT_PUBLIC_ENABLE_SIGNUP=true
```

**To disable signup:**
```bash
NEXT_PUBLIC_ENABLE_SIGNUP=false
```
or simply remove/comment out the variable.

## Features

### When Signup is ENABLED:
- ✅ Users can access `/auth/sign-up` page
- ✅ "Sign up" link appears on the login page
- ✅ Users can self-register with email, name, and password
- ✅ Email confirmation is required before login
- ✅ New users are automatically assigned the `MEMBER` role
- ✅ Users are synced with the database upon email confirmation

### When Signup is DISABLED:
- ❌ `/auth/sign-up` page shows "Sign Up Disabled" message
- ❌ No "Sign up" link on the login page
- ❌ Users can only be created by admins via `/admin/users`
- ✅ Existing admin user creation workflow remains unchanged

## Signup Flow

1. **User Registration**
   - User fills out signup form with:
     - First Name (required)
     - Last Name (optional)
     - Email (required)
     - Phone (optional)
     - Password (required, minimum 6 characters)
     - Confirm Password (required)

2. **Email Confirmation**
   - User receives a confirmation email from Supabase
   - User clicks the confirmation link
   - User is redirected to `/auth/confirm`

3. **Database Sync**
   - Upon email confirmation, user is automatically created in the database
   - Default role: `MEMBER`
   - User can now log in and access the application

4. **First Login**
   - User logs in with email and password
   - User is redirected to the dashboard

## Admin User Creation vs Self-Signup

### Admin Created Users:
- Created via `/admin/users` page
- Admin sets: first name, last name, email, phone, employee ID, and role
- Default password: `[FirstName]@123`
- Email confirmation sent automatically
- Email is pre-confirmed
- Can be assigned any role (ADMIN, MEMBER, ORDER_CREATOR)

### Self-Registered Users:
- Created via `/auth/sign-up` page
- User sets: first name, last name, email, phone, and password
- Password chosen by user (minimum 6 characters)
- Must confirm email before login
- Always assigned `MEMBER` role
- Can request role changes from admin

## Technical Details

### Files Modified:

1. **`/lib/feature-flags.ts`** - Feature flag configuration
2. **`/app/auth/sign-up/page.tsx`** - Signup page with feature flag check
3. **`/components/auth/sign-up-form.tsx`** - Improved signup form component
4. **`/components/auth/login-form.tsx`** - Added conditional signup link
5. **`/app/auth/login/page.tsx`** - Pass feature flag to login form
6. **`/app/auth/confirm/route.ts`** - Auto-sync users on email confirmation
7. **`/app/api/auth/sync-user/route.ts`** - Manual user sync endpoint

### Database Schema:

When a user signs up, the following record is created:

```typescript
{
  id: string,              // From Supabase Auth
  email: string,           // User's email
  firstName: string,       // Required
  lastName: string | null, // Optional
  displayName: string,     // Auto-generated from first + last name
  phone: string | null,    // Optional
  role: "MEMBER",          // Default role for self-registered users
  isActive: true,          // Active by default
  employeeId: null,        // Only set by admin
}
```

### Security Considerations:

- ✅ Email verification required before login
- ✅ Password minimum length: 6 characters
- ✅ Self-registered users can only be assigned MEMBER role
- ✅ Role upgrades require admin intervention
- ✅ Feature can be completely disabled via environment variable

## Supabase Configuration

### Required Redirect URLs:

Add these URLs to your Supabase Dashboard → Authentication → URL Configuration:

**Production:**
```
https://pms.zootcloud.com/auth/confirm
https://pms.zootcloud.com/auth/login
```

**Development:**
```
http://localhost:3000/auth/confirm
http://localhost:3000/auth/login
```

### Email Templates:

**Confirmation Email (Signup):**
Use Supabase's default "Confirm Signup" template or customize it.
The link should point to `{{ .ConfirmationURL }}` which will redirect to `/auth/confirm`.

## Troubleshooting

### Signup link not showing on login page:
- Check that `NEXT_PUBLIC_ENABLE_SIGNUP=true` is set
- Restart the development server
- Clear browser cache

### User created but not in database:
- Check `/app/auth/confirm/route.ts` logs for sync errors
- Manually sync user via API: `POST /api/auth/sync-user`
- Check Prisma database connection

### Confirmation email not received:
- Check Supabase email service configuration
- Check spam folder
- Verify redirect URLs are configured in Supabase

### User can't log in after signup:
- Ensure user confirmed their email
- Check Supabase Auth Users table for confirmation status
- Verify user exists in database
- Check user's `isActive` status

## Testing

### Test Signup Flow (Enabled):

1. Set `NEXT_PUBLIC_ENABLE_SIGNUP=true`
2. Restart server
3. Go to `/auth/login`
4. Click "Sign up" link
5. Fill out registration form
6. Check email for confirmation link
7. Click confirmation link
8. Log in with credentials

### Test Signup Flow (Disabled):

1. Set `NEXT_PUBLIC_ENABLE_SIGNUP=false` or remove the variable
2. Restart server
3. Go to `/auth/sign-up`
4. Verify "Sign Up Disabled" message is shown
5. Go to `/auth/login`
6. Verify no "Sign up" link is present

## Future Enhancements

Potential improvements:
- Add CAPTCHA to prevent bot registrations
- Add email domain whitelist/blacklist
- Add approval workflow for new signups
- Add social login options (Google, GitHub, etc.)
- Add phone number verification
- Add terms of service acceptance checkbox
