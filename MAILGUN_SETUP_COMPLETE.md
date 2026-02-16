# ✅ Mailgun Setup for @dealguard.org - READY TO CONFIGURE

## 📋 What's Been Done

✅ Email service implemented with nodemailer
✅ Email templates created for all notifications
✅ Email queue system configured with Redis + BullMQ
✅ Test scripts created for validation
✅ Environment variables configured
✅ Documentation created

## 🚀 What You Need to Do Now

### 1. Sign Up for Mailgun (5 minutes)

1. Go to: https://www.mailgun.com/
2. Sign up for free account (5,000 emails/month)
3. Add domain: `dealguard.org`
4. Get SMTP credentials from: **Domain Settings** → **SMTP credentials**

### 2. Update .env File (1 minute)

Edit `fouad-ai/backend/.env` and replace these values:

```env
SMTP_PASSWORD="GET-FROM-MAILGUN-DASHBOARD"
EMAIL_TEST_RECIPIENT="your-email@example.com"
```

With your actual Mailgun password and your personal email.

### 3. Test Email Sending (2 minutes)

```bash
cd fouad-ai/backend

# Test SMTP connection
npm run test:email

# Test deal creation → email notification
npm run test:deal-email
```

✅ Check your inbox!

### 4. Add DNS Records (For Production)

Add these to your domain registrar (GoDaddy, Cloudflare, etc.):

**Required Records:**
- SPF (TXT): `v=spf1 include:mailgun.org ~all`
- DKIM (TXT): [Get from Mailgun dashboard]
- MX Records: `mxa.mailgun.org` and `mxb.mailgun.org`

**Verification:** Check Mailgun dashboard for green checkmarks

### 5. Go Live

When DNS is verified:

```env
# In .env, change:
EMAIL_TEST_MODE="false"
```

## 📧 Email Notifications That Work

### ✅ Deal Created
- **Trigger:** New deal created via API
- **Recipients:** All parties (buyer, seller, etc.)
- **Content:** Deal details, email address, party list
- **Template:** `deal-created.html`

### ✅ Evidence Submitted
- **Trigger:** Evidence uploaded or emailed
- **Recipients:** Deal parties + admin
- **Template:** `evidence-received.html`

### ✅ Evidence Reviewed
- **Trigger:** Admin approves/rejects evidence
- **Recipients:** Evidence submitter
- **Template:** `evidence-reviewed.html`

### ✅ Custody Events
- **Triggers:** Funding submitted, verified, released
- **Templates:**
  - `custody-funding-submitted.html`
  - `custody-funding-verified.html`
  - `custody-release-authorized.html`

### ✅ Milestones
- **Trigger:** Milestone approved
- **Template:** `milestone-approved.html`

### ✅ Contract Status
- **Trigger:** Contract becomes effective
- **Template:** `contract-effective.html`

## 🔧 Test Commands

| Command | Purpose | Prerequisites |
|---------|---------|--------------|
| `npm run test:email` | Test SMTP connection | SMTP credentials in .env |
| `npm run test:deal-email` | Test deal creation email flow | Backend + Redis running |

## 📁 Files Created

- `MAILGUN_QUICKSTART.md` - Quick 5-minute setup guide
- `MAILGUN_SETUP_DEALGUARD.md` - Detailed setup instructions
- `fouad-ai/backend/scripts/test-email.ts` - SMTP test script
- `fouad-ai/backend/scripts/test-deal-email.ts` - Deal notification test
- `fouad-ai/backend/.env` - Updated with @dealguard.org

## 🏗️ Architecture Overview

```
Deal Creation
    ↓
Deal Service (deals.service.ts)
    ↓
Email Queue (Redis + BullMQ)
    ↓
Email Worker (queue.ts)
    ↓
Email Service (email.service.ts)
    ↓
Nodemailer + SMTP
    ↓
Mailgun
    ↓
User Inbox ✉️
```

## 🐛 Troubleshooting

### Issue: "Email service not configured"
**Solution:** Set SMTP credentials in `.env`

### Issue: "Failed to send email"
**Solution:**
1. Check Mailgun credentials
2. Verify Redis is running: `redis-cli ping`
3. Check backend logs

### Issue: Email not received
**Solution:**
1. Check spam folder
2. Verify EMAIL_TEST_RECIPIENT is correct
3. Check Mailgun dashboard logs
4. Ensure domain is verified (not sandbox)

### Issue: DNS not verified
**Solution:**
1. Use https://mxtoolbox.com/ to check records
2. Wait 24-48 hours for propagation
3. Contact domain registrar if issues persist

## 🔒 Security Notes

- ✅ `.env` is in `.gitignore` (never commit secrets)
- ✅ Test mode prevents accidental emails to users
- ✅ Email service fails gracefully if not configured
- ✅ Rate limiting enabled (5 emails/second)
- ✅ Webhook secret for inbound email authentication

## 📊 Mailgun Limits

**Free Tier (First 3 Months):**
- 5,000 emails per month
- No credit card required
- Sandbox mode (authorized recipients only)

**After Trial:**
- Pay-as-you-go: $0.80 per 1,000 emails
- Foundation: $35/month for 50,000 emails
- Scale: $90/month for 100,000 emails

## 🎯 Next Steps

1. [ ] Sign up for Mailgun
2. [ ] Add dealguard.org domain
3. [ ] Update `.env` with credentials
4. [ ] Run `npm run test:email`
5. [ ] Run `npm run test:deal-email`
6. [ ] Add DNS records (for production)
7. [ ] Verify domain in Mailgun
8. [ ] Disable test mode
9. [ ] Deploy to production
10. [ ] Monitor email delivery

## 📞 Support Resources

- **Mailgun Docs:** https://documentation.mailgun.com/
- **Mailgun Support:** support@mailgun.com
- **Backend Logs:** Check console output when running `npm run dev`
- **Redis Health:** `redis-cli ping` should return `PONG`
- **Email Templates:** `fouad-ai/backend/templates/emails/`

---

**Ready to configure Mailgun?** Start with `MAILGUN_QUICKSTART.md`! 🚀
