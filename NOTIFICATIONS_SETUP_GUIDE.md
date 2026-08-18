# 📧 SMS & Email Notifications Setup Guide

This guide will help you set up Twilio (SMS) and SendGrid (Email) so candidates receive notifications automatically.

---

## 📱 Part 1: Twilio Setup (SMS Notifications)

### Step 1: Create Twilio Account

1. Go to **[https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)**
2. Click **"Start your free trial"**
3. Fill in your details:
   - Email
   - Password
   - First Name / Last Name
4. Verify your email address
5. Verify your phone number (enter your personal phone)

### Step 2: Get Your Credentials

After logging in to Twilio Console:

1. You'll see your **Dashboard**
2. Look for the "Account Info" section
3. Copy these values:
   - **Account SID** (looks like: `AC1234567890abcdef...`)
   - **Auth Token** (click the eye icon to reveal it)

### Step 3: Get a Phone Number

1. In the left sidebar, click **"Phone Numbers"** → **"Manage"** → **"Buy a number"**
2. Select your country (e.g., India)
3. Check **"SMS"** capability
4. Click **"Search"**
5. Choose a number and click **"Buy"**
6. Confirm the purchase (trial accounts get 1 free number)
7. Copy the phone number (format: `+919876543210`)

### Step 4: Add to .env File

Open `backend/.env` and fill in:

```env
TWILIO_ACCOUNT_SID=AC1234567890abcdef...
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+919876543210
```

---

## 📧 Part 2: SendGrid Setup (Email Notifications)

### Step 1: Create SendGrid Account

1. Go to **[https://signup.sendgrid.com/](https://signup.sendgrid.com/)**
2. Fill in your details:
   - Email
   - Password
   - Company Name (can be "Personal" or your company)
3. Verify your email address
4. Complete the signup process

### Step 2: Create API Key

1. Log in to SendGrid
2. In the left sidebar, click **"Settings"** → **"API Keys"**
3. Click **"Create API Key"** (top right)
4. Give it a name: `Speech Analyzer`
5. Choose **"Full Access"**
6. Click **"Create & View"**
7. **COPY THE API KEY** (you won't see it again!)
   - It looks like: `SG.abc123...`

### Step 3: Verify Sender Email

Before you can send emails, SendGrid needs to verify your sender email:

1. Go to **"Settings"** → **"Sender Authentication"**
2. Click **"Verify a Single Sender"**
3. Fill in the form:
   - **From Name**: Speech Analyzer (or your company name)
   - **From Email Address**: your email (e.g., `yourname@gmail.com`)
   - **Reply To**: same email
   - **Company Address**: any address
   - **City, State, ZIP, Country**: your location
4. Click **"Create"**
5. Check your email inbox for verification link
6. Click the link to verify

### Step 4: Add to .env File

Open `backend/.env` and fill in:

```env
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=yourname@gmail.com
```

(Use the email you verified in Step 3)

---

## 🔄 Part 3: Restart Your Backend Server

After updating the `.env` file:

1. **Stop the backend server** (in the terminal where it's running, press `Ctrl+C`)
2. **Start it again**:
   ```bash
   cd backend
   npm run dev
   ```
3. You should see: `SPEECH ANALYZER backend running on port 3001`

---

## ✅ Part 4: Test the Notifications

### Test SMS (Approve Initial Round)

1. Go to admin dashboard: `http://localhost:3000/admin`
2. Click on a candidate with status "Pending Initial Approval"
3. Click **"✓ Approve Initial Round"**
4. You should see: **"Candidate approved for HR round. SMS sent."**
5. Check if the candidate received an SMS with their unique code

### Test Email (Approve Final Selection)

1. Find a candidate with status "Pending HR Round" or "Approved"
2. Click **"✓ Approve Final Selection"**
3. You should see: **"Candidate approved. Selection SMS and offer email sent."**
4. Check if:
   - Candidate received an SMS
   - Candidate received an email (with offer letter if you uploaded one)

---

## 🆓 Free Tier Limits

### Twilio Free Trial
- **$15.50 credit** (can send ~450 SMS in India)
- Can only send SMS to **verified phone numbers**
- To add verified numbers: Go to "Phone Numbers" → "Manage" → "Verified Caller IDs"

### SendGrid Free Plan
- **100 emails per day** (forever free)
- Perfect for testing and small deployments

---

## 🔒 Security Notes

1. **Never commit `.env` file to Git** (it's already in `.gitignore`)
2. **Never share your API keys publicly**
3. For production, use proper environment variable management (e.g., AWS Secrets Manager, Azure Key Vault)

---

## ❓ Troubleshooting

### "SMS failed to send"
- Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- Check that `TWILIO_FROM_NUMBER` is in correct format: `+919876543210`
- If trial account, verify the recipient's phone number in Twilio console

### "Email failed to send"
- Check that `SENDGRID_API_KEY` is correct (starts with `SG.`)
- Check that `SENDGRID_FROM_EMAIL` is verified in SendGrid console
- Check SendGrid dashboard for error logs

### Backend doesn't restart
- Make sure you saved the `.env` file
- Stop the server completely (`Ctrl+C`) and start again
- Check for syntax errors in `.env` (no quotes around values needed)

---

## 📞 Need Help?

If you encounter issues:
1. Check backend console logs for error messages
2. Check Twilio/SendGrid dashboard for delivery status
3. Make sure phone numbers are in international format (`+` prefix)

---

**That's it! Your notifications should now work perfectly. 🎉**
