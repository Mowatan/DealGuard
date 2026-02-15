# Mailgun Quick Setup for DealGuard

## Your Mailgun Info (from Java code)

**Sandbox Domain:** `sandbox1812ca2dee134b18b28c68574b10a8e1.mailgun.org`

**Note:** Sandbox domains can only send emails to **authorized recipients**. You need to add your email address in Mailgun dashboard.

## Step 1: Get Your SMTP Credentials

1. Go to https://app.mailgun.com/
2. Click on **Sending** → **Domain settings**
3. Select your sandbox domain
4. Click on **SMTP credentials**
5. Copy your **SMTP password** (or reset it if needed)

## Step 2: Update Your .env File

Edit `fouad-ai/backend/.env` and update these values:

```bash
# Email - Mailgun Configuration
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@sandbox1812ca2dee134b18b28c68574b10a8e1.mailgun.org"
SMTP_PASSWORD="YOUR_SMTP_PASSWORD_HERE"
EMAIL_FROM="DealGuard <postmaster@sandbox1812ca2dee134b18b28c68574b10a8e1.mailgun.org>"
INBOUND_EMAIL_DOMAIN="sandbox1812ca2dee134b18b28c68574b10a8e1.mailgun.org"

# Email Testing Mode (IMPORTANT for sandbox)
EMAIL_TEST_MODE="true"
EMAIL_TEST_RECIPIENT="mohamedelwatan1@gmail.com"
```

## Step 3: Authorize Your Email in Mailgun

**IMPORTANT:** Sandbox domains require authorized recipients!

1. Go to https://app.mailgun.com/
2. Navigate to **Sending** → **Domain settings** → Your sandbox domain
3. Click on **Authorized Recipients**
4. Add `mohamedelwatan1@gmail.com`
5. Check your email and click the confirmation link

## Step 4: Test Email Sending

Create this test script: `fouad-ai/backend/scripts/test-mailgun.ts`

```typescript
import { emailService } from '../src/lib/email.service';

async function testMailgun() {
  console.log('🧪 Testing Mailgun email...');

  try {
    const result = await emailService.sendEmail({
      to: 'mohamedelwatan1@gmail.com',
      subject: 'DealGuard Test Email',
      template: 'deal-created',
      variables: {
        dealNumber: 'TEST-2025-001',
        dealTitle: 'Test Deal',
        dealValue: '100,000 EGP',
        parties: ['Party A', 'Party B'],
        dealUrl: 'http://localhost:3000/deals/test',
      }
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.log('❌ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

testMailgun();
```

Run the test:
```bash
cd fouad-ai/backend
npx tsx scripts/test-mailgun.ts
```

## Step 5: Upgrade to Production Domain (Optional)

Sandbox is limited to 300 emails/day and requires authorized recipients.

**For production:**

1. **Add your domain** in Mailgun:
   - Go to **Sending** → **Domains** → **Add New Domain**
   - Enter your domain (e.g., `dealguard.org`)

2. **Verify DNS records**:
   - Add the TXT, MX, and CNAME records Mailgun provides
   - Wait for verification (can take up to 48 hours)

3. **Update .env**:
   ```bash
   SMTP_USER="postmaster@dealguard.org"
   EMAIL_FROM="DealGuard <noreply@dealguard.org>"
   INBOUND_EMAIL_DOMAIN="dealguard.org"
   EMAIL_TEST_MODE="false"  # Disable test mode
   ```

## Common Issues

### "Unauthorized recipients"
- Make sure you've authorized your email in Mailgun dashboard
- Check the confirmation email and click the link

### "Authentication failed"
- Verify your SMTP_PASSWORD is correct
- Try resetting the SMTP password in Mailgun

### "Connection timeout"
- Check your firewall isn't blocking port 587
- Verify SMTP_HOST is exactly `smtp.mailgun.org`

### Emails not arriving
- Check spam folder
- Verify EMAIL_TEST_RECIPIENT in .env matches authorized email
- Check Mailgun logs: https://app.mailgun.com/app/logs

## Email Templates

Your backend already has these templates in `backend/templates/emails/`:

- `deal-created.html` - New deal notification
- `party-invitation.html` - Invite parties to deal
- `milestone-approved.html` - Milestone completion
- `contract-effective.html` - Contract activated
- `custody-funding-verified.html` - Funds received
- And more...

All templates use the Mailgun layout with DealGuard branding!

## Next Steps

1. Update your `.env` file with Mailgun credentials
2. Authorize your email in Mailgun dashboard
3. Run the test script
4. Check your inbox (and spam folder)
5. When ready, upgrade to a production domain

## Support

- **Mailgun Dashboard:** https://app.mailgun.com/
- **Mailgun Docs:** https://documentation.mailgun.com/
- **SMTP Settings:** https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp
