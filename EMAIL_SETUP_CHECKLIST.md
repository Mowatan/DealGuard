# 📧 Email Notifications Setup Checklist

## 🎯 Goal
Enable email notifications for deal creation and other events using Mailgun with @dealguard.org domain.

---

## ✅ Setup Steps

### Step 1: Install Redis (Required for Email Queue)
**Time:** 5 minutes

**Choose one method:**

**Option A: Docker (Easiest)**
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

**Option B: WSL**
```bash
wsl --install  # If not already installed
sudo apt install redis-server -y
sudo service redis-server start
```

**Verify:**
```bash
redis-cli ping
# Should return: PONG
```

📖 **Detailed guide:** `REDIS_SETUP_WINDOWS.md`

---

### Step 2: Sign Up for Mailgun
**Time:** 5 minutes

1. Go to: https://www.mailgun.com/
2. Create free account (5,000 emails/month)
3. Click **Add New Domain**
4. Enter: `dealguard.org`
5. Choose region (US or EU)

---

### Step 3: Get Mailgun SMTP Credentials
**Time:** 2 minutes

1. Go to **Sending** → **Domains** → **dealguard.org**
2. Click **Domain Settings** → **SMTP credentials**
3. Copy or reset password for `postmaster@dealguard.org`

**You'll need:**
- Username: `postmaster@dealguard.org`
- Password: [from Mailgun dashboard]
- Host: `smtp.mailgun.org`
- Port: `587`

---

### Step 4: Update Backend .env File
**Time:** 1 minute

Edit: `fouad-ai/backend/.env`

**Replace these two lines:**
```env
SMTP_PASSWORD="GET-FROM-MAILGUN-DASHBOARD"
EMAIL_TEST_RECIPIENT="your-email@example.com"
```

**With your actual values:**
```env
SMTP_PASSWORD="your-actual-mailgun-password"
EMAIL_TEST_RECIPIENT="your-personal-email@gmail.com"
```

---

### Step 5: Test Email Configuration
**Time:** 2 minutes

```bash
cd fouad-ai/backend

# Test SMTP connection
npm run test:email
```

**Expected result:**
```
✅ Email sent successfully!
📬 Check your inbox at: your-personal-email@gmail.com
```

Check your email inbox (including spam folder)!

---

### Step 6: Test Deal Creation → Email Flow
**Time:** 3 minutes

**Terminal 1 - Start Redis:**
```bash
# Docker
docker start redis

# Or WSL
sudo service redis-server start
```

**Terminal 2 - Start Backend:**
```bash
cd fouad-ai/backend
npm run dev
```

**Terminal 3 - Run Test:**
```bash
cd fouad-ai/backend
npm run test:deal-email
```

**Expected result:**
```
✅ Deal created successfully!
📧 You should receive 2 email(s) at: your-personal-email@gmail.com
```

---

### Step 7: Add DNS Records (For Production)
**Time:** 10 minutes (+ 24-48hrs for propagation)

**⚠️ Required before sending to real users!**

Add these records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

1. **SPF Record (TXT)**
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:mailgun.org ~all
   ```

2. **DKIM Record (TXT)**
   ```
   Type: TXT
   Host: smtp._domainkey
   Value: [Copy from Mailgun dashboard]
   ```

3. **MX Records** (for receiving emails)
   ```
   Type: MX
   Priority: 10
   Value: mxa.mailgun.org

   Type: MX
   Priority: 10
   Value: mxb.mailgun.org
   ```

**Verify:**
- Check Mailgun dashboard for green checkmarks
- Use https://mxtoolbox.com/ to verify DNS propagation

---

### Step 8: Go Live (When DNS is Ready)
**Time:** 1 minute

Edit `fouad-ai/backend/.env`:
```env
# Change from:
EMAIL_TEST_MODE="true"

# To:
EMAIL_TEST_MODE="false"
```

Restart backend server.

---

## 📊 Progress Tracker

- [ ] Redis installed and running (`redis-cli ping`)
- [ ] Mailgun account created
- [ ] dealguard.org domain added to Mailgun
- [ ] SMTP credentials obtained
- [ ] `.env` file updated with credentials
- [ ] `npm run test:email` successful
- [ ] Backend server running (`npm run dev`)
- [ ] `npm run test:deal-email` successful
- [ ] Email received in inbox
- [ ] DNS records added to domain registrar
- [ ] DNS records verified in Mailgun (green checkmarks)
- [ ] Test mode disabled (`EMAIL_TEST_MODE="false"`)
- [ ] Production deployment complete

---

## 🔍 Quick Diagnostics

### Is Redis running?
```bash
redis-cli ping
# Should return: PONG
```

### Are SMTP credentials correct?
```bash
npm run test:email
# Should send email successfully
```

### Is email queue processing?
Check backend logs for:
```
✅ Queue workers started
Sending email: deal-created to ...
Email sent successfully: { messageId: '...' }
```

### Why no email received?
1. Check spam/junk folder
2. Verify `EMAIL_TEST_RECIPIENT` is correct
3. Check Mailgun dashboard → Logs
4. Ensure domain is not in sandbox mode (or add authorized recipient)
5. Verify SMTP password is correct

---

## 📧 Email Notifications Enabled

Once setup is complete, emails are automatically sent for:

- ✅ **Deal Created** - All parties notified
- ✅ **Evidence Submitted** - Admin + parties notified
- ✅ **Evidence Reviewed** - Submitter notified
- ✅ **Custody Funding** - Status updates
- ✅ **Milestone Approved** - Parties notified
- ✅ **Contract Effective** - All parties notified

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `EMAIL_SETUP_CHECKLIST.md` | **👈 This file** - Step-by-step checklist |
| `MAILGUN_QUICKSTART.md` | Quick 5-minute Mailgun setup |
| `MAILGUN_SETUP_DEALGUARD.md` | Detailed Mailgun setup guide |
| `MAILGUN_SETUP_COMPLETE.md` | Architecture and troubleshooting |
| `REDIS_SETUP_WINDOWS.md` | Redis installation for Windows |

---

## 🚨 Important Notes

- **Never commit `.env` file** - Contains sensitive credentials
- **Test mode** - Emails go to `EMAIL_TEST_RECIPIENT` only
- **Production mode** - Emails go to actual recipients
- **Sandbox mode** - Mailgun limits to authorized recipients (free tier)
- **DNS propagation** - Can take 24-48 hours
- **Rate limiting** - 5 emails per second (configured)
- **Free tier** - 5,000 emails/month for first 3 months

---

## 🎉 Success Criteria

**You've completed setup when:**

1. ✅ `redis-cli ping` returns `PONG`
2. ✅ `npm run test:email` sends email successfully
3. ✅ `npm run test:deal-email` creates deal and sends emails
4. ✅ You receive emails in your inbox
5. ✅ Mailgun dashboard shows green checkmarks for DNS
6. ✅ Backend logs show "Email sent successfully"

---

## 📞 Need Help?

**Common issues:**
- Redis not running → See `REDIS_SETUP_WINDOWS.md`
- SMTP errors → Check credentials in `.env`
- No email received → Check spam, verify domain
- DNS not verified → Wait 24-48hrs, check with mxtoolbox.com

**Resources:**
- Mailgun docs: https://documentation.mailgun.com/
- Mailgun support: support@mailgun.com
- Redis docs: https://redis.io/docs/

---

**Ready to start?** Begin with Step 1! 🚀
