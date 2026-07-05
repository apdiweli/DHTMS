# ✅ Email System - How It Works

## Current Setup (Already Dynamic!)

The email system **already sends to each owner dynamically**. Here's how:

### 📧 Email Flow

```
Tax Generated → System gets owner from database → Sends email to owner.email
```

### Example:

**Property 1** owned by **John Doe** (email: `john@example.com`)
- Tax generated → Email sent to `john@example.com` ✓

**Property 2** owned by **Jane Smith** (email: `jane@example.com`)  
- Tax generated → Email sent to `jane@example.com` ✓

**Property 3** owned by **Bob Wilson** (email: `bob@example.com`)
- Tax generated → Email sent to `bob@example.com` ✓

## Configuration Needed

### `.env` File Settings (System Email - The Sender)

```env
EMAIL_USER=taxsystem@gmail.com        ← Your system's Gmail (sends FROM this)
EMAIL_PASS=abcd efgh ijkl mnop        ← App password for above account
```

This is **ONE email account** that the system uses to **send emails to all owners**.

### Owner Emails (Recipients - Already in Database)

Each owner's email is stored in the `User` model:
- Field: `email` (line 5 in User.js)
- Example: When you create an owner, you enter their email
- The system automatically uses this email when sending notifications

## ✅ What You Need to Do

1. **Create a Gmail account for your tax system** (e.g., `hargeisatax@gmail.com`)
2. **Get an App Password** for that account
3. **Update `.env`** with those credentials:
   ```env
   EMAIL_USER=hargeisatax@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```
4. **Restart backend**

## 🎯 Result

When you generate tax for any property:
- System looks up the owner in database
- Gets their email address (e.g., `owner123@gmail.com`)
- Sends email FROM `hargeisatax@gmail.com` TO `owner123@gmail.com`
- **Completely automatic and dynamic!**

## Code Reference

See line 89 in `notificationService.js`:
```javascript
emailService.sendEmail(owner.email, emailSubject, emailHtml);
                       ^^^^^^^^^^^
                       This is dynamic - gets each owner's email from database
```
