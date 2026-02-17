# Mailgun HTTP API Setup for Railway

## Why HTTP API Instead of SMTP?

**Railway (and most PaaS providers) block outbound SMTP connections** (ports 25, 465, 587) for security and anti-spam reasons.

❌ **SMTP**: Connection timeouts on Railway
✅ **HTTP API**: Works perfectly on Railway

## Getting Your Mailgun API Key

1. **Sign up / Log in** to Mailgun: https://app.mailgun.com/

2. **Go to Settings → API Keys**
   - URL: https://app.mailgun.com/settings/api_security

3. **Copy your Private API key**
   - Format: `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Keep this secret! Don't commit to git

4. **Note your domain**
   - Should be: `mg.dealguard.org`
   - Must be verified (green checkmark)

## Environment Variables for Railway

Add these to your Railway backend service:

```env
# Required
MAILGUN_API_KEY=key-your-actual-api-key-here
MAILGUN_DOMAIN=mg.dealguard.org
EMAIL_FROM=DealGuard <noreply@dealguard.org>

# Optional (but recommended for testing)
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your-email@example.com
```

### How to Add in Railway:

1. Go to your Railway project
2. Click on **backend** service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add each variable above
6. Click **Deploy**

## Verifying Domain Setup

Your domain `mg.dealguard.org` needs DNS records:

### Required DNS Records:

1. **TXT Record** (for domain verification)
   ```
   mg.dealguard.org    TXT    v=spf1 include:mailgun.org ~all
   ```

2. **TXT Record** (for DKIM)
   ```
   k1._domainkey.mg.dealguard.org    TXT    [value from Mailgun]
   ```

3. **CNAME Records** (for tracking)
   ```
   email.mg.dealguard.org    CNAME    mailgun.org
   ```

4. **MX Records** (for receiving emails)
   ```
   mg.dealguard.org    MX    10    mxa.mailgun.org
   mg.dealguard.org    MX    10    mxb.mailgun.org
   ```

### Check Verification Status:

Go to: https://app.mailgun.com/app/sending/domains/mg.dealguard.org/verify

Should show: ✅ **Verified** (green checkmark)

## Testing Emails

### Test Mode (Recommended for Development)

```env
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your-email@example.com
```

**What this does:**
- All emails are redirected to your test recipient
- Original recipients are logged but not used
- Safe for testing without spamming real users

### Production Mode

```env
EMAIL_TEST_MODE=false
```

**What this does:**
- Emails sent to actual recipients
- Use only after testing thoroughly!

## Code Changes Made

### Before (SMTP - didn't work on Railway):
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.mailgun.org',
  port: 587,
  auth: { user: 'postmaster@...', pass: '...' }
});

await transporter.sendMail({ ... });
```

### After (HTTP API - works on Railway):
```typescript
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

await mg.messages.create(domain, { ... });
```

## What's Unchanged

✅ Template loading still works
✅ Variable substitution still works
✅ Test mode still works
✅ Error handling still works
✅ All existing code calling `emailService.sendEmail()` still works

## Troubleshooting

### "Email service: Mailgun API configuration incomplete"

**Cause**: Missing `MAILGUN_API_KEY` or `MAILGUN_DOMAIN`

**Fix**: Add both variables to Railway environment

### "Forbidden - See https://documentation.mailgun.com/docs/mailgun/api-reference/intro/#errors"

**Cause**: Invalid API key or domain not verified

**Fix**:
1. Check API key is correct (starts with `key-`)
2. Verify domain at https://app.mailgun.com/

### "Domain not found"

**Cause**: Domain doesn't exist in your Mailgun account

**Fix**: Create domain `mg.dealguard.org` in Mailgun or use existing domain

### Emails not arriving

**Possible causes:**
1. Test mode is on → Check `EMAIL_TEST_RECIPIENT`
2. Domain not verified → Check Mailgun dashboard
3. DNS records not propagated → Wait 24-48 hours
4. Emails going to spam → Check SPF/DKIM records

## Mailgun Free Tier Limits

- ✅ **5,000 emails/month** for 3 months
- ✅ Then **1,000 emails/month** forever (free tier)
- ✅ Pay-as-you-go after that: $0.80 per 1,000 emails

## Migration from SMTP

No changes needed in your application code! The switch is transparent:

```typescript
// This still works exactly the same:
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Deal Created',
  template: 'deal-created',
  variables: { dealNumber: 'D-2025-001' }
});
```

## Support

- Mailgun Documentation: https://documentation.mailgun.com/
- API Reference: https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/
- Mailgun Support: https://help.mailgun.com/

## Quick Verification Checklist

- [ ] Mailgun account created
- [ ] Domain `mg.dealguard.org` added
- [ ] DNS records configured
- [ ] Domain shows as **Verified** (green checkmark)
- [ ] API key copied
- [ ] `MAILGUN_API_KEY` added to Railway
- [ ] `MAILGUN_DOMAIN` added to Railway
- [ ] Backend redeployed
- [ ] Test email sent successfully
