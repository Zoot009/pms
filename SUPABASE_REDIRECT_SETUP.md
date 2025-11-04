# Supabase Welcome Email Configuration

## Overview
This document explains how new users are created and welcomed to the system.

## User Creation Flow
When an admin creates a new user:
1. User account is created in Supabase Auth with a default password
2. Default password format: `[FirstName]@123` (e.g., if first name is "John", password is "John@123")
3. User account is created in the database
4. A welcome email is sent via Supabase's invite functionality
5. User can immediately log in with their email and default password

## Default Password
- **Format**: `[FirstName]@123`
- **Example**: User with first name "Sarah" gets password "Sarah@123"
- **Security**: Users are encouraged to change this password after first login

## Email Configuration

### 1. Configure Redirect URLs in Supabase Dashboard

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Add the following URLs to **Redirect URLs**:

   **For Production:**
   ```
   https://pms.zootcloud.com/auth/login
   https://pms.zootcloud.com/auth/confirm
   ```

   **For Local Development:**
   ```
   http://localhost:3000/auth/login
   http://localhost:3000/auth/confirm
   ```

3. Save the configuration

### 2. Customize Email Template

The welcome email template (`SUPABASE_EMAIL_TEMPLATE.html`) should be uploaded to Supabase:

1. Go to **Authentication** → **Email Templates**
2. Select **"Invite User"** template
3. Upload or paste the content from `SUPABASE_EMAIL_TEMPLATE.html`
4. The template includes:
   - User's email address
   - Default password format information
   - Confirmation button/link
   - Security reminder to change password

Key template variables:
- `{{ .Email }}` - User's email address
- `{{ .ConfirmationURL }}` - Link to confirm and login
- `{{ .SiteURL }}` - Your site URL

### 3. Verify Site URL

1. Go to **Settings** → **General** → **Configuration**
2. Ensure **Site URL** is set correctly:
   - Production: `https://pms.zootcloud.com`
   - Development: `http://localhost:3000`

## Testing the Flow

### Test New User Creation:
1. Admin goes to `/admin/users` and creates a new user (e.g., first name "John", email "john@example.com")
2. System creates user with default password "John@123"
3. User receives welcome email
4. User clicks the confirmation link in the email
5. User is redirected to login page
6. User logs in with email and default password "John@123"
7. User should change their password from profile settings

### Test Forgot Password (for existing users):
1. Go to `/auth/forgot-password`
2. Enter email and submit
3. Check email for reset link
4. Click link → redirects to `/auth/confirm?token_hash=...&type=recovery`
5. Automatically redirects to `/auth/update-password`
6. User sets new password

## API Response

When a user is created, the API returns:
```json
{
  "user": { ... },
  "defaultPassword": "John@123",
  "message": "User created successfully. Welcome email sent. Default password is: John@123"
}
```

The admin can see the default password and communicate it to the user if needed (though the email should inform them of the format).

## Important Notes

- Users can log in immediately with their default password
- Default password format is clear and communicated in the welcome email
- Users are encouraged to change their password after first login
- The welcome email uses Supabase's invite functionality
- Make sure `NEXT_PUBLIC_APP_URL` is set correctly in your `.env` file
- The Supabase Service Role Key is used for admin operations

## Troubleshooting

### Welcome email not received:
- Check Supabase logs in Dashboard → Logs
- Verify email service is configured in Supabase (SMTP or Supabase's email service)
- Check spam folder
- Ensure the "Invite User" email template is enabled

### "Invalid redirect URL" error:
- Add the full URL to Supabase Redirect URLs
- Check that the URL protocol matches (http vs https)
- Clear browser cache

### User cannot login:
- Verify the default password format: `[FirstName]@123`
- Check that email is confirmed in Supabase Auth Users table
- Ensure user exists in both Supabase Auth and database
