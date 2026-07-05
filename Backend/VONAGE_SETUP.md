# Vonage SMS Setup Guide

## Why Vonage?
Twilio was blocked on your network. Vonage (formerly Nexmo) is accessible and will work for SMS notifications.

## Setup Steps

### 1. Create Vonage Account
1. Go to [https://dashboard.nexmo.com/sign-up](https://dashboard.nexmo.com/sign-up)
2. Sign up with your email
3. Verify your email address
4. Complete the registration

### 2. Get Your Credentials
1. After logging in, you'll see the **Dashboard**
2. Look for the **API Settings** section at the top
3. Copy these two values:
   - **API Key** (e.g., `a1b2c3d4`)
   - **API Secret** (e.g., `AbCdEfGhIjKlMnOp`)

### 3. Update `.env` File
Open `Backend/.env` and update these lines:

```env
VONAGE_API_KEY=a1b2c3d4
VONAGE_API_SECRET=AbCdEfGhIjKlMnOp
VONAGE_FROM=TaxSystem
```

### 4. Restart Backend Server
1. Stop the current server (Ctrl+C in the terminal)
2. Run `npm run dev` again
3. You should see: `[SMS Service] Vonage Client initialized`

## Testing

Generate a tax record for a property owner who has a phone number in the database. Check the backend console for:
- `[SMS Service] ✓ SMS sent successfully to +1234567890`

## Important Notes

### Free Trial Limitations
- Vonage free trial gives you €2 credit
- You can only send SMS to **verified numbers** initially
- To verify a number: Dashboard → Numbers → Verify a number

### Phone Number Format
Phone numbers must be in **international format**:
- ✅ Correct: `+252612488048`
- ❌ Wrong: `0612488048`

### Troubleshooting

**Error: "Invalid credentials"**
- Double-check your API Key and Secret
- Make sure there are no extra spaces

**Error: "Insufficient balance"**
- Add credit to your Vonage account
- Or verify the recipient's number for free testing

**SMS not received**
- Check if the phone number is in international format
- Verify the number in Vonage dashboard
- Check spam/blocked messages on the phone
