# Test Admin Notifications

Quick test script to verify admin email notifications are working correctly.

## What This Tests

1. **New User Signup Notification** - Simulates a new user creating an account
2. **New Deal Creation Notification** - Simulates a new deal being created

## Prerequisites

Make sure you have:
- Redis running (required for email queue)
- Mailgun configured with valid API key
- Backend server running (or at least the email worker)

## How to Run

### Option 1: Using ts-node (Development)
```bash
cd backend
npx ts-node scripts/test-admin-notifications.ts
```

### Option 2: Using npm script (if configured)
```bash
cd backend
npm run test:admin-notifications
```

## Expected Output

```
🧪 Testing Admin Email Notifications

📧 Admin email: trust@dealguard.org

1️⃣ Testing NEW USER SIGNUP notification...
✅ New user notification queued successfully

2️⃣ Testing NEW DEAL CREATION notification...
✅ New deal notification queued successfully

🎉 All notifications queued successfully!

📬 Check your inbox at: trust@dealguard.org
⏱️  Emails should arrive within 1-2 minutes

📊 Queue Status: 2 jobs waiting

⏳ Waiting 5 seconds for worker to process jobs...
✅ Test complete! You can now exit (Ctrl+C)
```

## What to Check

### 1. Check Email Queue
```bash
# Connect to Redis
redis-cli

# Check queue length
LLEN bull:email-sending:wait

# Should see jobs being added
```

### 2. Check Backend Logs
Look for:
```
Sending email: admin-new-user to trust@dealguard.org
✅ Email sent successfully
Sending email: admin-new-deal to trust@dealguard.org
✅ Email sent successfully
```

### 3. Check Mailgun Dashboard
- Visit: https://app.mailgun.com/mg/dashboard
- Go to "Logs" → "Sending"
- Look for emails to trust@dealguard.org
- Verify delivery status

### 4. Check Inbox
- Open trust@dealguard.org inbox
- Look for two new emails:
  - "New User Signup - test.user@example.com"
  - "New Deal Created - DEAL-2026-9999"

## Troubleshooting

### Issue: "Redis connection refused"
**Solution:** Start Redis
```bash
# Windows
wsl redis-server
# or use Docker
docker run -d -p 6379:6379 redis

# Mac/Linux
redis-server
```

### Issue: "Mailgun API error"
**Solution:** Check environment variables
```bash
# Verify these are set
echo $MAILGUN_API_KEY
echo $MAILGUN_DOMAIN
echo $EMAIL_FROM
```

### Issue: "Template not found"
**Solution:** Check template files exist
```bash
ls backend/templates/emails/admin-new-user.html
ls backend/templates/emails/admin-new-deal.html
```

### Issue: "Emails not arriving"
**Possible Causes:**
1. EMAIL_TEST_MODE is enabled → Check EMAIL_TEST_RECIPIENT
2. Mailgun domain not verified → Verify domain in Mailgun dashboard
3. Invalid admin email → Check ADMIN_EMAIL environment variable
4. Email in spam folder → Check spam/junk folder

## Testing in Production

**DO NOT** run this test script in production directly.

Instead, trigger real events:
1. **Test User Signup:** Create a new account via the frontend
2. **Test Deal Creation:** Create a test deal via the UI or API

## Environment Variables

The script uses these environment variables:
```bash
ADMIN_EMAIL=trust@dealguard.org  # Where notifications are sent
MAILGUN_API_KEY=key-...          # Your Mailgun API key
MAILGUN_DOMAIN=mg.dealguard.org  # Your Mailgun domain
EMAIL_FROM="DealGuard <noreply@dealguard.org>"
REDIS_URL=redis://localhost:6379  # Redis connection
```

## Success Criteria

✅ Script completes without errors
✅ Queue shows 2 jobs added
✅ Backend logs show emails being sent
✅ Mailgun dashboard shows delivered emails
✅ trust@dealguard.org inbox receives both emails
✅ Emails render correctly (no broken HTML)
✅ All template variables display properly
✅ Links work correctly

## Next Steps

Once this test passes:
1. Test with real user signup
2. Test with real deal creation
3. Monitor production inbox for notifications
4. Consider setting up email forwarding rules
5. Set up alerts for failed notifications

## Notes

- Test emails have subject lines starting with "New User Signup" or "New Deal Created"
- The test uses fake data (Test User, Test Deal, etc.)
- Jobs are added with priority 3 (normal priority)
- The script waits 5 seconds before exiting to allow processing

## Support

If you encounter issues:
1. Check the main README: `ADMIN_EMAIL_NOTIFICATIONS_COMPLETE.md`
2. Review backend logs for detailed error messages
3. Verify all prerequisites are running
4. Test Mailgun configuration separately
