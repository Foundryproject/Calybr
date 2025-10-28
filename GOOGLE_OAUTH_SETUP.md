# Google OAuth Setup Guide for Calybr

Follow these steps to enable Google Sign-In in your Calybr app.

## Step 1: Configure Google Cloud Console

### 1.1 Create OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**

### 1.2 Configure OAuth Consent Screen

1. Click **Configure Consent Screen**
2. Choose **External** (or Internal if you have Google Workspace)
3. Fill in required fields:
   - **App name**: Calybr
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. Click **Save and Continue**

### 1.3 Create iOS OAuth Client (if testing on iOS)

1. Click **Create Credentials** → **OAuth Client ID**
2. Select **iOS**
3. Fill in:
   - **Name**: Calybr iOS
   - **Bundle ID**: `com.calybr.app`
4. Click **Create**
5. **Copy the Client ID** (you'll need this)

### 1.4 Create Android OAuth Client (if testing on Android)

1. Get your SHA-1 fingerprint:
   ```bash
   # For Expo development build
   expo credentials:manager
   # Or manually get it from your keystore
   ```

2. Click **Create Credentials** → **OAuth Client ID**
3. Select **Android**
4. Fill in:
   - **Name**: Calybr Android
   - **Package name**: `com.calybr.app`
   - **SHA-1 certificate fingerprint**: Paste your SHA-1
5. Click **Create**

### 1.5 Create Web Client for OAuth Flow

1. Click **Create Credentials** → **OAuth Client ID**
2. Select **Web application**
3. Fill in:
   - **Name**: Calybr Web (OAuth Flow)
   - **Authorized redirect URIs**: (we'll add Supabase URL in next step)
4. Click **Create**
5. **Copy the Client ID and Client Secret** (you'll need these)

---

## Step 2: Configure Supabase

### 2.1 Add Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and click to expand

### 2.2 Enable Google Provider

1. Toggle **Enable Google provider** to ON
2. Enter credentials from Google Cloud Console:
   - **Client ID**: Paste Web Client ID from Step 1.5
   - **Client Secret**: Paste Web Client Secret from Step 1.5
3. Click **Save**

### 2.3 Get Redirect URLs

Supabase will show you the redirect URL. It looks like:
```
https://your-project.supabase.co/auth/v1/callback
```

### 2.4 Add Redirect URL to Google Cloud

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click on your **Web client** (from Step 1.5)
4. Under **Authorized redirect URIs**, click **Add URI**
5. Paste the Supabase callback URL: `https://your-project.supabase.co/auth/v1/callback`
6. Click **Save**

---

## Step 3: Configure Mobile App Deep Links

### 3.1 Add Expo Go URL (for development)

In Supabase Dashboard → Authentication → URL Configuration:

Add to **Redirect URLs**:
```
exp://**/--/auth/callback
calybr://auth/callback
```

**Important for Expo Go:**
- The `exp://**/--/auth/callback` wildcard allows any local IP
- When you run `npm start`, check your terminal for the actual URL (e.g., `exp://192.168.0.39:8081`)
- The wildcard `**` matches any IP/port combination for development

### 3.2 For Production Builds

Add to **Redirect URLs**:
```
calybr://auth/callback
```

---

## Step 4: Test Google Sign-In

### 4.1 Restart the App (Important!)

```bash
# Stop the current app (Ctrl+C or Cmd+C)
npm start --clear
```

**Make sure to clear cache!** This ensures the new OAuth code is loaded.

### 4.2 Try Google Sign-In

1. Open the app in Expo Go
2. Tap **"Sign in with Google"**
3. Browser should open with Google sign-in
4. Sign in with your Google account
5. After successful sign-in, it should redirect back to app
6. Check terminal logs to see the OAuth flow:
   - `Opening OAuth URL: ...`
   - `Using redirect URL: exp://...`
   - `WebBrowser result: ...`
   - `Got tokens from callback, setting session...`
   - `Session set successfully, handling auth...`
7. **New users** → Go through onboarding
8. **Returning users** → Go straight to main app

---

## Troubleshooting

### ❌ "Google Sign In requires Supabase configuration"
**Solution**: Make sure your `.env` file has:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### ❌ "redirect_uri_mismatch" error
**Solution**: 
1. Check that Supabase callback URL is added to Google Cloud Console
2. Make sure the URL exactly matches (including https://)

### ❌ OAuth popup doesn't redirect back to app
**Solution**: 
1. Verify `scheme: "calybr"` is in `app.config.js` (already done ✅)
2. Add `calybr://auth/callback` to Supabase redirect URLs
3. Restart the app: `npm start --clear`

### ❌ "App not authorized" or "Access Blocked"
**Solution**: 
1. Make sure OAuth Consent Screen is published
2. Add your email as a test user if in development mode
3. Add required scopes (email, profile, openid)

### ❌ User logs in but doesn't go through onboarding
**Solution**: The trigger should auto-create profile, but if not:
1. Check Supabase database: `profile` table should have user's row
2. Check `onboarding_completed` field is `false`
3. The app checks this field to show onboarding screen

### ❌ "new row violates row-level security policy for table device"
**Solution**: The device table needs INSERT policy. Run this in Supabase SQL Editor:
```sql
CREATE POLICY "Users can insert own devices"
  ON device FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Verify Setup

Run this SQL in Supabase SQL Editor to check user setup:

```sql
-- Check if user was created
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as name,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if profile was created
SELECT 
  user_id,
  first_name,
  last_name,
  email,
  onboarding_completed,
  created_at
FROM profile
ORDER BY created_at DESC
LIMIT 5;
```

---

## Summary Checklist

- [ ] Google Cloud OAuth client created (Web, iOS, Android)
- [ ] OAuth Consent Screen configured
- [ ] Supabase Google provider enabled with Client ID & Secret
- [ ] Supabase callback URL added to Google Cloud authorized URIs
- [ ] Deep link URLs (`calybr://auth/callback`) added to Supabase
- [ ] `.env` file has Supabase credentials
- [ ] App restarted with `npm start --clear`
- [ ] Tested Google sign-in flow
- [ ] New users go through onboarding ✅
- [ ] Returning users skip onboarding ✅

---

## Need Help?

If Google Sign-In still doesn't work:
1. Check Expo logs for errors: `npm start` (look at terminal output)
2. Check Supabase logs: Dashboard → Logs → Auth Logs
3. Check browser console during OAuth flow

The most common issue is redirect URI mismatch. Make sure all URLs match exactly!

