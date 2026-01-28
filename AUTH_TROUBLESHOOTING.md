# Authentication Troubleshooting Guide

## Issue: Login shows "account does not exist" but account exists in Supabase

### I've added debugging tools to help identify the issue:

## 1. Enhanced Debug Logging

Both login and signup forms now include detailed console logging:
- 🔐 Login attempts
- ❌ Detailed error messages
- ✅ Success confirmations

**To use:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to login/signup
4. Check the console for detailed error messages

## 2. Supabase Debug Component

A debug panel appears on the **login page** (bottom-right corner, only in development mode):

**To use:**
1. Go to `/login`
2. Click "Test Connection" button in the debug panel
3. Check if Supabase connection is working

## Common Issues & Solutions

### Issue 1: Email Confirmation Required
**Symptom:** "Email not confirmed" error

**Solution:**
1. Check your email inbox for confirmation email from Supabase
2. Click the confirmation link
3. Try logging in again

**In Supabase Dashboard:**
- Go to: Authentication > Settings > Email Auth
- Check if "Enable email confirmations" is ON
- For development, you can temporarily disable it

### Issue 2: Wrong Email/Password
**Symptom:** "Invalid login credentials" error

**Solution:**
1. Double-check email spelling
2. Check password (case-sensitive)
3. Try "Forgot Password" to reset

### Issue 3: Account Doesn't Exist
**Symptom:** "Invalid login credentials" (Supabase doesn't distinguish for security)

**Solution:**
1. Try signing up with the email
2. If it says "already registered", the account exists but password is wrong
3. Use password reset

### Issue 4: Supabase Configuration
**Symptom:** Connection errors, "Missing Supabase environment variables"

**Check `.env.local` file:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Verify in Supabase Dashboard:**
1. Go to Project Settings > API
2. Copy the URL and anon key
3. Update `.env.local`
4. Restart dev server: `npm run dev`

### Issue 5: RLS (Row Level Security) Policies
**Symptom:** Can login but can't access data

**Check in Supabase:**
1. Go to: Database > Tables
2. Check if RLS is enabled on `workshops`, `employees`, `orders` tables
3. Verify policies allow authenticated users to read their data

## Testing Steps

### Test 1: Verify Supabase Connection
```bash
# In browser console after visiting /login
# Click "Test Connection" in debug panel
```

### Test 2: Check Existing User
```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'your-email@example.com';
```

### Test 3: Check Employee Record
```sql
-- In Supabase SQL Editor
SELECT * FROM employees WHERE email = 'your-email@example.com';
```

### Test 4: Manual Password Reset
1. Go to Supabase Dashboard
2. Authentication > Users
3. Find user by email
4. Click "..." > "Reset password"
5. Check email for reset link

## What Changed

### login-form.tsx
- ✅ Added detailed console logging
- ✅ Better error messages in German
- ✅ Toast notifications for feedback
- ✅ More specific error handling

### signup-form.tsx
- ✅ Added detailed console logging
- ✅ Better error messages
- ✅ Toast notifications
- ✅ Warning if employee record fails

### LoginPage.tsx
- ✅ Added SupabaseDebug component (dev only)

## How to Use Debug Mode

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser DevTools:**
   - Chrome/Edge: F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
   - Firefox: F12 or Ctrl+Shift+K (Cmd+Option+K on Mac)

3. **Try to login:**
   - Watch the Console tab for detailed logs
   - Look for 🔐, ❌, or ✅ emoji markers

4. **Check the debug panel:**
   - Click "Test Connection" button
   - Expand "Details" to see full response

## Expected Console Output

### Successful Login:
```
🔐 Login attempt: { email: "user@example.com", hasPassword: true }
✅ Login successful
```

### Failed Login:
```
🔐 Login attempt: { email: "user@example.com", hasPassword: true }
❌ Login error: { message: "Invalid login credentials", status: 400, ... }
Error details: { message: "Invalid login credentials", status: 400, name: "AuthApiError" }
```

## Next Steps

1. **Open browser console** and try logging in
2. **Share the console output** with me if you still have issues
3. **Use the debug panel** to test Supabase connection
4. **Check Supabase Dashboard** for user status

## Supabase Dashboard Checks

### Check 1: User Exists
1. Go to: Authentication > Users
2. Search for email
3. Check "Email Confirmed?" status
4. Check "Last Sign In" time

### Check 2: Email Settings
1. Go to: Authentication > Settings > Email
2. Check "Enable email confirmations"
3. For development, consider disabling this
4. Check "Confirm email" template is configured

### Check 3: Auth Settings
1. Go to: Authentication > Settings > Auth
2. Check "Site URL" is correct
3. Check "Redirect URLs" include your localhost

## Quick Fix: Disable Email Confirmation (Development Only)

1. Go to Supabase Dashboard
2. Authentication > Settings > Email Auth
3. **Disable** "Enable email confirmations"
4. Try logging in again

⚠️ **Remember to re-enable this in production!**

## Still Having Issues?

After trying the above steps, please provide:
1. Console log output (copy/paste the error)
2. Debug panel results
3. Screenshot of Supabase user status
4. Any error messages you see

This will help me identify the exact issue!
