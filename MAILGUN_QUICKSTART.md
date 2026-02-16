# Mailgun Quick Start for @dealguard.org

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Mailgun Credentials

1. Go to https://www.mailgun.com/ and sign up (free tier: 5,000 emails/month)
2. Go to **Sending** → **Domains** → **Add New Domain**
3. Enter: `dealguard.org`
4. Go to **Domain Settings** → **SMTP credentials**
5. Copy your credentials:
   - Username: `postmaster@dealguard.org`
   - Password: Click "Reset Password" to generate
   - Host: `smtp.mailgun.org`
   - Port: `587`

### Step 2: Update Backend .env

Edit `fouad-ai/backend/.env` and update these lines:

```env
# Email - Mailgun Configuration
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@dealguard.org"
SMTP_PASSWORD="your-actual-mailgun-password-here"
EMAIL_FROM="DealGuard <noreply@dealguard.org>"
INBOUND_EMAIL_DOMAIN="dealguard.org"

# Email Testing Mode (emails go to you instead of actual users)
EMAIL_TEST_MODE="true"
EMAIL_TEST_RECIPIENT="your-personal-email@gmail.com"
```

### Step 3: Test Email Sending

```bash
cd fouad-ai/backend
npm run test:email
```

✅ Check your inbox at the test recipient email!

### Step 4: Test Deal Creation → Email

```bash
# Make sure backend and Redis are running
npm run dev  # In one terminal
redis-server # In another terminal (if not running)

# Then run the test
npm run test:deal-email
```

✅ You should receive email(s) with deal details!

---

## 🎯 Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run test:email` | Test SMTP connection and send test email |
| `npm run test:deal-email` | Create test deal and verify email notifications |

---

## 🔧 DNS Setup (For Production)

**⚠️ Required before going live!**

Add these DNS records to your domain registrar (GoDaddy, Cloudflare, etc.):

### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:mailgun.org ~all
```

### DKIM Record
```
Type: TXT
Host: smtp._domainkey
Value: [Get from Mailgun dashboard]
```

### MX Records (for receiving emails)
```
Type: MX
Priority: 10
Value: mxa.mailgun.org

Type: MX
Priority: 10
Value: mxb.mailgun.org
```

**Verification:** Check Mailgun dashboard → Domain Settings → DNS Records
- All records should show green checkmarks (may take 24-48 hours)

---

## 📧 Email Flow

### When a Deal is Created:
1. All parties receive: **"New Deal Created: D-2025-XXX"**
2. Email includes:
   - Deal number, title, and details
   - Recipient's role (Buyer/Seller)
   - Deal-specific email address
   - List of all parties

### Other Notifications:
- Evidence submitted/reviewed
- Custody funding status
- Milestone approvals
- Contract status changes

---

## 🐛 Troubleshooting

### Email Not Sent?
```bash
# Check backend logs
cd fouad-ai/backend
npm run dev

# Check Redis
redis-cli ping
# Should return: PONG

# Verify SMTP credentials
npm run test:email
```

### Email in Spam?
- Check Mailgun domain verification status
- Ensure all DNS records are added
- Check Mailgun dashboard → Logs
- Domain reputation may take time to build

### Still in Sandbox Mode?
- Mailgun free tier is in "sandbox mode"
- Can only send to authorized recipients
- Go to **Sending** → **Authorized Recipients** → Add your email
- Or request account review to remove sandbox

---

## 🔒 Security Checklist

- [ ] `.env` file is in `.gitignore` (never commit secrets!)
- [ ] Strong SMTP password (rotate regularly)
- [ ] Test mode enabled during development
- [ ] Test mode disabled in production
- [ ] Webhook secret is random and secure
- [ ] Monitor email deliverability and bounce rates

---

## 🎉 Production Deployment

When ready to go live:

1. **Verify Domain:**
   - All DNS records added and verified (green checkmarks)
   - Domain out of sandbox mode

2. **Disable Test Mode:**
   ```env
   EMAIL_TEST_MODE="false"
   ```

3. **Deploy:**
   - Update environment variables in production
   - Restart backend server
   - Monitor Mailgun dashboard for delivery stats

4. **Monitor:**
   - Check bounce rates (should be < 5%)
   - Watch for spam complaints
   - Review delivery logs daily

---

## 📞 Support

- **Mailgun Docs:** https://documentation.mailgun.com/
- **Mailgun Support:** support@mailgun.com
- **DealGuard Setup:** See `MAILGUN_SETUP_DEALGUARD.md` for detailed guide
