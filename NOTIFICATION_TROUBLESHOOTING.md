# Notification System Troubleshooting Guide

## Issue: Notifications Not Appearing in Frontend

### ✅ Backend Status: WORKING
- Notification model created successfully
- Notification service functions working
- API routes registered correctly
- Test notification created in database successfully
- Backend server running on port 5000

### 🔍 Diagnosis Steps

#### Step 1: Check if Frontend is Running
```powershell
# In Frontend directory
npm run dev
```
Frontend should start on http://localhost:5173 (or similar port)

#### Step 2: Open Browser Console
1. Open the application in your browser
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for any errors related to:
   - NotificationContext
   - NotificationBell
   - API calls to `/api/notifications`

#### Step 3: Check Network Tab
1. In Developer Tools, go to Network tab
2. Filter by "notifications"
3. Look for requests to:
   - `GET /api/notifications/unread-count`
   - `GET /api/notifications`
4. Check if requests are:
   - ✅ Status 200 (success)
   - ❌ Status 401 (not authenticated)
   - ❌ Status 500 (server error)
   - ❌ Failed (CORS or network issue)

#### Step 4: Verify User is Logged In
- Notifications only work for authenticated users
- Check if you're logged in with a valid token
- Try logging out and logging back in

#### Step 5: Check if NotificationBell is Rendered
1. In browser, inspect the header area
2. Look for the bell icon component
3. If not visible, check browser console for React errors

### 🔧 Common Issues and Solutions

#### Issue 1: Frontend Not Running
**Solution**: Start the frontend development server
```powershell
cd "c:\Users\ccm\Desktop\House Taxation Managment system\Frontend"
npm run dev
```

#### Issue 2: CORS Errors
**Symptom**: Console shows "CORS policy" errors
**Solution**: Backend already has CORS enabled, but verify:
- Backend is running on port 5000
- Frontend API calls are going to http://localhost:5000

#### Issue 3: Authentication Token Missing
**Symptom**: 401 Unauthorized errors in Network tab
**Solution**: 
- Log out and log back in
- Check localStorage for 'token' key
- Verify token is being sent in Authorization header

#### Issue 4: NotificationContext Not Wrapped
**Symptom**: Error "useNotifications must be used within NotificationProvider"
**Solution**: Already fixed - NotificationProvider is wrapped in main.jsx

#### Issue 5: No Notifications in Database
**Symptom**: API returns empty array
**Solution**: 
- Generate a tax record for a property
- Make a payment on a tax record
- Run the test script: `node test_create_notification.js`

### 📋 Manual Testing Steps

#### Test Tax Generation Notification:

1. **Login as Tax Officer**
2. **Go to Tax Management page**
3. **Generate tax for a property** that has an owner with a linked user account
4. **Check backend console** for any errors
5. **Login as the Owner** (the property owner)
6. **Check the notification bell** in the header
7. **Should see unread count badge**
8. **Click bell to see notification**

#### Test Payment Notification:

1. **Login as Owner or Tax Officer**
2. **Go to Payment Records page**
3. **Record a payment** for a tax record
4. **Login as Tax Officer** (same jurisdiction as property)
5. **Check notification bell**
6. **Login as Super Admin**
7. **Check notification bell**

### 🧪 Quick Verification

Run this in Backend directory to create a test notification:
```powershell
node test_create_notification.js
```

Then:
1. Login to frontend as the owner shown in the test output
2. Check notification bell
3. Should see 1 unread notification

### 📊 Check Database Directly

```powershell
node quick_check.js
```

This shows:
- Number of notifications in database
- Which owners have linked user accounts

### ⚠️ Important Notes

1. **Owners MUST have linked user accounts** to receive notifications
   - When creating an owner, a user account should be created automatically
   - Check: Owner record has `userId` field populated

2. **Notifications poll every 30 seconds**
   - New notifications may take up to 30 seconds to appear
   - Or refresh the page to fetch immediately

3. **Check browser console for errors**
   - React errors will prevent NotificationBell from rendering
   - API errors will prevent notifications from loading

### 🆘 If Still Not Working

1. **Clear browser cache and localStorage**
2. **Restart both backend and frontend servers**
3. **Check all console logs** (browser and backend terminal)
4. **Verify the bell icon is visible** in the header
5. **Try creating a test notification** with the test script
6. **Check if the test notification appears** in the frontend

### 📞 Debug Information to Collect

If notifications still don't work, collect this information:

1. Browser console errors (screenshot)
2. Network tab showing `/api/notifications` requests
3. Backend terminal output when generating tax
4. Output of `node quick_check.js`
5. Which user you're logged in as (role, email)
6. Whether the NotificationBell component is visible in the header
