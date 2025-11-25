# Password Recovery Fix

## Changes Made

### 1. Updated Forgot Password Form
**File:** `components/auth/forgot-password-form.tsx`

Changed the `redirectTo` URL from:
```typescript
redirectTo: `${window.location.origin}/auth/confirm?type=recovery`
```

To:
```typescript
redirectTo: `${window.location.origin}/auth/update-password`
```

**Reason:** Supabase's password recovery flow sends tokens in the URL hash (fragment), not as query parameters. The update-password page is already configured to handle these hash parameters correctly.

## Required Supabase Configuration

**IMPORTANT:** You must configure the redirect URLs in your Supabase dashboard.

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration
2. Add the following URLs to **Redirect URLs**:
   ```
   https://pms.zootcloud.com/auth/update-password
   https://pms.zootcloud.com/auth/confirm
   ```
3. If testing locally, also add:
   ```
   http://localhost:3000/auth/update-password
   http://localhost:3000/auth/confirm
   ```
4. Click **Save**

**Note:** Both URLs are needed because:
- New recovery emails will use `/auth/update-password`
- Old recovery emails (already sent) still use `/auth/confirm`

## How It Works

### Password Recovery Flow:
1. User clicks "Forgot Password" and enters their email
2. Supabase sends an email with a recovery link
3. Link format: `https://pms.zootcloud.com/auth/update-password#access_token=...&refresh_token=...&type=recovery`
4. The `update-password-form.tsx` component:
   - Reads tokens from the URL hash
   - Calls `supabase.auth.setSession()` with these tokens
   - Establishes a valid session
   - Allows user to update their password
5. After password update, redirects to login page

### Security Notes:
- Tokens are in the URL hash (never sent to server)
- Middleware allows all `/auth/*` routes without authentication
- Session is established client-side before password update
- Old tokens are invalidated after password change

## Testing

### Local Testing:
1. Start your development server: `npm run dev`
2. Go to: http://localhost:3000/auth/forgot-password
3. Enter your email and click "Send reset link"
4. Check your email and click the recovery link
5. You should land on `/auth/update-password` with a session
6. Enter new password and submit

### Production Testing:
1. Ensure Supabase redirect URL is configured (see above)
2. Go to: https://pms.zootcloud.com/auth/forgot-password
3. Follow the same steps as local testing

## Troubleshooting

### Still redirecting to login?
- **Check Supabase dashboard:** Verify redirect URL is saved
- **Check browser console:** Look for errors in the update-password page
- **Verify email link:** The link should go to `/auth/update-password`, not `/auth/confirm`

### "No valid session found" error?
- The recovery link may have expired (tokens are valid for 1 hour by default)
- Request a new password reset link
- Check if your email client is modifying the URL (some clients strip hash parameters)

### Redirect URL not working?
- Supabase has strict redirect URL validation
- The URL must match exactly (including protocol: http vs https)
- Wildcards are not supported - you must list each URL explicitly
- Wait a few seconds after saving the configuration

## Next Steps

1. ✅ Code changes are complete
2. ⚠️ **Configure Supabase redirect URLs** (required)
3. Test the flow locally and in production
4. Monitor for any issues

## Rollback

If you need to revert to the previous flow:
1. Change `redirectTo` back to: `${window.location.origin}/auth/confirm?type=recovery`
2. Add `/auth/confirm` to Supabase redirect URLs
3. The confirm route will handle the OTP verification
