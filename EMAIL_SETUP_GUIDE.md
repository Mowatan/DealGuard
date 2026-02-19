# Email Notification System - Quick Setup Guide

## Step 1: Sign Up for Mailgun (Free Tier)

1. Go to https://www.mailgun.com/
2. Click "Sign Up" (free tier includes 5,000 emails/month)
3. Complete the registration process
4. Verify your email address

## Step 2: Get Your Sandbox Credentials

After logging into Mailgun:

1. Navigate to **Sending** → **Domains** in the left sidebar
2. You'll see a sandbox domain like `sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org`
3. Click on the sandbox domain
4. Note down these credentials:
   - **SMTP Hostname**: `smtp.mailgun.org`
   - **SMTP Port**: `587` (or `465` for SSL)
   - **SMTP Username**: `postmaster@sandboxXXX.mailgun.org`
   - **SMTP Password**: Click "Reset Password" if you don't have it

## Step 3: Add Authorized Recipients (Sandbox Mode)

**Important**: Mailgun sandbox can only send to authorized email addresses!

1. In your Mailgun dashboard, go to **Sending** → **Domains**
2. Click on your sandbox domain
3. Scroll to **Authorized Recipients** section
4. Click "Add Recipient"
5. Enter your email address for testing
6. Check your email and click the verification link
7. Repeat for any other test email addresses

## Step 4: Update Your .env File

Open `fouad-ai/backend/.env` and update these values:

```bash
# Replace XXXXXXXX with your actual sandbox domain
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org"
SMTP_PASSWORD="your-actual-mailgun-password"
EMAIL_FROM="Fouad AI <noreply@sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org>"

# Enable test mode to redirect all emails to one address
EMAIL_TEST_MODE="true"
EMAIL_TEST_RECIPIENT="your-verified-email@example.com"
```

## Step 5: Restart Your Backend Server

```bash
cd fouad-ai/backend
npm run dev
```

Watch for this log message:
```
✅ Queue workers started
Email service initialized successfully
```

## Step 6: Test Email Notifications

### Test 1: Deal Creation Email

Create a new deal via the API or frontend:

```bash
# Example API call
curl -X POST http://localhost:4000/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Deal for Email",
    "description": "Testing email notifications",
    "parties": [
      {
        "role": "BUYER",
        "name": "John Doe",
        "isOrganization": false,
        "contactEmail": "buyer@example.com"
      },
      {
        "role": "SELLER",
        "name": "Jane Smith",
        "isOrganization": false,
        "contactEmail": "seller@example.com"
      }
    ]
  }'
```

**Expected Result:**
- Check your `EMAIL_TEST_RECIPIENT` inbox
- You should receive a "New Deal Created" email
- Email should include deal number, parties, and deal email address

### Test 2: Evidence Submission Email

Submit evidence via email or API:

```bash
# Send email to: deal-XXXX@fouad.ai (use actual deal email from Test 1)
# Subject: Test Evidence
# Body: This is test evidence
# Attach: Any test file
```

**Expected Result:**
- "Evidence Received Successfully" confirmation email
- If evidence has issues: "Evidence Quarantined" alert to admins

### Test 3: Check Mailgun Dashboard

1. Go to Mailgun dashboard → **Sending** → **Logs**
2. You should see your sent emails listed
3. Check delivery status (Delivered, Failed, etc.)
4. View email content and recipient

## Step 7: Monitor Email Queue

### Option A: Console Logs
Watch your backend console for:
```
Email sent successfully: {
  messageId: '...',
  template: 'deal-created',
  recipients: ['test@example.com'],
  dealId: '...'
}
```

### Option B: BullMQ Dashboard (Optional)
If you have BullMQ Board installed:

```bash
# Install globally
npm install -g bull-board

# Run dashboard
npx bull-board

# Open http://localhost:3000
```

You'll see:
- `email-sending` queue
- Completed jobs count
- Failed jobs (if any)
- Job details and retry attempts

## Troubleshooting

### Problem: "Email service not configured"
**Solution**: Check that all SMTP_ environment variables are set correctly

### Problem: "No valid email recipients"
**Solution**:
- Verify email addresses in party records
- Check that EMAIL_TEST_RECIPIENT is set (in test mode)

### Problem: Emails not arriving
**Solutions**:
1. Check spam/junk folder
2. Verify email is authorized in Mailgun sandbox
3. Check Mailgun logs for delivery status
4. Verify SMTP credentials are correct

### Problem: "Connection refused" or SMTP errors
**Solutions**:
1. Check SMTP_HOST and SMTP_PORT are correct
2. Try port 465 instead of 587
3. Verify your Mailgun account is active
4. Check if firewall is blocking SMTP ports

### Problem: Queue not processing
**Solutions**:
1. Verify Redis is running: `redis-cli ping` (should return PONG)
2. Check queue worker logs in console
3. Restart backend server

## Testing Checklist

- [ ] Mailgun account created and verified
- [ ] Sandbox credentials copied to .env
- [ ] Test email address authorized in Mailgun
- [ ] Backend server restarted
- [ ] Deal creation sends email ✉️
- [ ] Evidence submission sends confirmation ✉️
- [ ] Contract acceptance sends notification ✉️
- [ ] All emails appear in Mailgun logs
- [ ] No errors in backend console
- [ ] Emails render correctly in Gmail/Outlook

## Production Setup (Future)

When ready for production:

1. **Add Custom Domain to Mailgun**
   - Navigate to **Sending** → **Domains**
   - Click "Add New Domain"
   - Enter: `fouad.ai`
   - Follow DNS setup instructions

2. **Update DNS Records**
   - Add SPF record
   - Add DKIM records
   - Add DMARC policy
   - Verify in Mailgun dashboard

3. **Update Environment Variables**
   ```bash
   SMTP_USER="noreply@fouad.ai"
   EMAIL_FROM="Fouad AI <noreply@fouad.ai>"
   EMAIL_TEST_MODE="false"  # Disable test mode!
   ```

4. **Test Gradually**
   - Start with small volume
   - Monitor bounce and complaint rates
   - Build sender reputation over time

## Email Template Customization

Templates are located in: `fouad-ai/backend/templates/emails/`

To customize:
1. Edit the HTML file directly
2. Use `{{variableName}}` for dynamic content
3. Keep inline CSS for email client compatibility
4. Test changes by restarting server (templates are cached)

## Support

For issues or questions:
- Check backend console logs
- Review Mailgun dashboard logs
- Verify .env configuration
- Ensure Redis is running
- Check that queue workers started successfully

---

**Quick Start Summary:**
1. Sign up for Mailgun → Get sandbox credentials
2. Authorize your test email in Mailgun dashboard
3. Update .env with credentials
4. Restart backend server
5. Create a deal and check your email!

**Estimated Setup Time**: 10-15 minutes
