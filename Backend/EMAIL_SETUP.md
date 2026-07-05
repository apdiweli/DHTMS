# Email Configuration Guide

## Current Status
The email service is now configured but requires your email credentials to send real emails.

## Setup Instructions

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "House Tax System"
   - Copy the 16-character password

3. **Update `.env` file** with your credentials:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM="House Tax System <your-email@gmail.com>"
   ```

4. **Restart the backend server** (Ctrl+C and run `npm run dev` again)

### Option 2: Other Email Providers

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

#### Mailtrap (Testing Only)
```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASS=your-mailtrap-password
```

## Testing

After configuration, generate a tax record for a property owner who has an email address. Check:
1. Backend console for success message: `[Email Service] ✓ Email sent successfully`
2. The owner's email inbox for the tax notification

## Troubleshooting

- **"Authentication failed"**: Check your email/password are correct
- **"Connection timeout"**: Check EMAIL_HOST and EMAIL_PORT
- **Still seeing mock mode**: Restart the backend server after updating .env
- **Gmail blocking**: Make sure you're using an App Password, not your regular password
