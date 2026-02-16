# Mailgun Setup Guide for @dealguard.org

## Step 1: Create Mailgun Account and Add Domain

1. **Sign up for Mailgun**
   - Go to https://www.mailgun.com/
   - Create a free account (includes 5,000 emails/month for 3 months)

2. **Add dealguard.org Domain**
   - Go to **Sending** → **Domains** → **Add New Domain**
   - Enter: `dealguard.org`
   - Choose region: **US** or **EU** (choose closest to your users)
   - Click **Add Domain**

3. **Verify Domain with DNS Records**
   Mailgun will provide DNS records. Add these to your domain registrar:

   **TXT Records (SPF & DKIM):**
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:mailgun.org ~all

   Type: TXT
   Host: smtp._domainkey
   Value: [DKIM key provided by Mailgun - long string]
   ```

   **MX Records (for receiving emails):**
   ```
   Type: MX
   Host: @
   Priority: 10
   Value: mxa.mailgun.org

   Type: MX
   Host: @
   Priority: 10
   Value: mxb.mailgun.org
   ```

   **CNAME Record (for tracking):**
   ```
   Type: CNAME
   Host: email
   Value: mailgun.org
   ```

4. **Wait for Verification**
   - DNS propagation can take 24-48 hours
   - Check status in Mailgun dashboard
   - You'll see a green checkmark when verified

## Step 2: Get SMTP Credentials

1. Go to **Sending** → **Domain Settings** → **SMTP credentials**
2. Click **Add SMTP User** or use the default `postmaster@dealguard.org`
3. Copy the credentials:
   - **SMTP Username:** `postmaster@dealguard.org`
   - **SMTP Password:** [Click "Reset Password" to generate]
   - **SMTP Host:** `smtp.mailgun.org`
   - **SMTP Port:** `587` (TLS) or `465` (SSL)

## Step 3: Configure Backend Environment

Update `fouad-ai/backend/.env`:

```env
# Email - Mailgun Production Configuration
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@dealguard.org"
SMTP_PASSWORD="your-mailgun-smtp-password"
EMAIL_FROM="DealGuard <noreply@dealguard.org>"
INBOUND_EMAIL_DOMAIN="dealguard.org"

# Email Testing Mode (set to false for production)
EMAIL_TEST_MODE="true"
EMAIL_TEST_RECIPIENT="your-personal-email@gmail.com"

# Webhook for inbound email
INBOUND_EMAIL_WEBHOOK_SECRET="generate-random-secret-here"
```

## Step 4: Configure Inbound Email Webhook (Optional)

If you want to receive emails at deal-specific addresses (e.g., `D-2025-001@dealguard.org`):

1. Go to **Receiving** → **Routes** in Mailgun dashboard
2. Create a new route:
   - **Expression Type:** Match Recipient
   - **Recipient:** `.*@dealguard.org`
   - **Actions:**
     - Forward to URL: `https://your-backend-domain.com/api/webhooks/inbound-email`
     - Set Priority: 5
3. Set the webhook secret in your `.env` file

## Step 5: Test Email Sending

Run the test script:

```bash
cd fouad-ai/backend
npm run test:email
```

This will:
1. Send a test email to `EMAIL_TEST_RECIPIENT`
2. Verify SMTP connection
3. Confirm template rendering

## Step 6: Production Deployment

When ready for production:

1. **Disable Test Mode:**
   ```env
   EMAIL_TEST_MODE="false"
   # EMAIL_TEST_RECIPIENT can be removed or commented out
   ```

2. **Verify Sending Domain Status:**
   - Ensure dealguard.org is fully verified in Mailgun
   - Check domain reputation score

3. **Request Account Review:**
   - If still in sandbox, request account review from Mailgun
   - Provide business details and use case
   - Once approved, you can send to any email address

## Email Flow in DealGuard

### Deal Creation Email
When a deal is created, all parties receive:
- **Subject:** `New Deal Created: [Deal Number]`
- **Content:**
  - Deal details (number, title, created date)
  - Recipient's role
  - Deal-specific email address
  - List of all parties

### Other Email Notifications
- **Evidence Received:** When evidence is submitted
- **Evidence Reviewed:** When admin reviews evidence
- **Custody Funding:** When funds are submitted/verified
- **Milestone Approved:** When a milestone is approved
- **Contract Effective:** When contract is finalized

## Troubleshooting

### Email Not Sending
1. Check backend logs for SMTP errors
2. Verify SMTP credentials in `.env`
3. Ensure Redis is running (required for email queue)
4. Check Mailgun dashboard for delivery logs

### Domain Not Verified
1. Use https://mxtoolbox.com/ to verify DNS records
2. Ensure all DNS records are added correctly
3. Wait 24-48 hours for propagation
4. Contact Mailgun support if issues persist

### Rate Limiting
- Free tier: 5,000 emails/month for first 3 months
- After trial: Pay-as-you-go ($0.80 per 1,000 emails)
- Foundation plan: $35/month for 50,000 emails

## Security Best Practices

1. **Never commit `.env` file** - it contains sensitive credentials
2. **Use strong SMTP password** - rotate regularly
3. **Enable webhook authentication** - verify incoming requests
4. **Monitor deliverability** - check bounce rates and spam reports
5. **Use HTTPS for webhooks** - encrypt inbound email data

## Next Steps

1. ✅ Set up Mailgun account
2. ✅ Add and verify dealguard.org domain
3. ✅ Configure SMTP credentials in `.env`
4. ✅ Test email sending
5. ✅ Deploy to production
6. 📧 Monitor email delivery and user feedback
