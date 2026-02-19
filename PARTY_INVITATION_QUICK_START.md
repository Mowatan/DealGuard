# Party Invitation System - Quick Start Guide

## 🚀 Quick Start

### Prerequisites
1. PostgreSQL database running
2. SMTP credentials configured in `.env`
3. Backend and frontend servers running

### Setup

#### 1. Apply Database Migration
```bash
cd fouad-ai/backend
npx prisma generate
npx prisma migrate dev --name add_invitation_system
```

#### 2. Configure Email (Backend .env)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASSWORD=your-password
EMAIL_FROM=DealGuard <noreply@dealguard.org>
FRONTEND_URL=http://localhost:3000

# Optional: Test mode
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your-test-email@example.com
```

#### 3. Start Servers
```bash
# Terminal 1 - Backend
cd fouad-ai/backend
npm run dev

# Terminal 2 - Frontend
cd fouad-ai/frontend
npm run dev
```

## 🧪 Testing

### Backend Test Script
```bash
cd fouad-ai/backend
npx tsx scripts/test-party-invitation.ts
```

This will:
- ✅ Create a test deal with 3 parties
- ✅ Verify invitation tokens are generated
- ✅ Test fetching invitation details
- ✅ Test confirming invitations
- ✅ Test deal status updates
- ✅ Test duplicate confirmations
- ✅ Test invalid tokens

### Manual Testing Flow

#### 1. Create a Deal
```bash
curl -X POST http://localhost:3001/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Property Purchase Deal",
    "description": "Purchase of commercial property",
    "parties": [
      {
        "role": "BUYER",
        "name": "Alice Johnson",
        "isOrganization": false,
        "contactEmail": "alice@example.com"
      },
      {
        "role": "SELLER",
        "name": "Bob Smith",
        "isOrganization": false,
        "contactEmail": "bob@example.com"
      }
    ],
    "creatorName": "Alice Johnson",
    "creatorEmail": "alice@example.com"
  }'
```

#### 2. Check Email
- Check inbox for `bob@example.com`
- Email subject: "You've been invited to join a DealGuard transaction"
- Click "Review & Confirm Participation" button

#### 3. Confirm Invitation
- Opens: `http://localhost:3000/confirm-invitation/{TOKEN}`
- View deal details
- If not logged in: Redirected to sign-up
- After sign-up/login: Click "Confirm Participation"
- Redirected to deal page

#### 4. Verify Status
```bash
# Get deal details
curl http://localhost:3001/api/deals/{DEAL_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check:
# - party.invitationStatus should be "ACCEPTED"
# - deal.allPartiesConfirmed should be true (when all parties accept)
# - deal.status should be "ACCEPTED" (when all parties accept)
```

## 📊 API Endpoints

### Get Invitation Details (Public)
```http
GET /api/deals/invitations/:token
```

**Response:**
```json
{
  "party": {
    "id": "...",
    "name": "Bob Smith",
    "role": "SELLER",
    "contactEmail": "bob@example.com",
    "invitationStatus": "PENDING"
  },
  "deal": {
    "id": "...",
    "dealNumber": "DEAL-2025-0001",
    "title": "Property Purchase Deal",
    "totalAmount": "500000",
    "currency": "EGP"
  },
  "otherParties": [...]
}
```

### Confirm Invitation (Public)
```http
POST /api/deals/invitations/:token/confirm
```

**Response:**
```json
{
  "message": "Invitation confirmed successfully",
  "party": {...},
  "deal": {...},
  "allPartiesAccepted": true
}
```

## 🎯 User Flow

### For Deal Creator (Alice)
1. Login to DealGuard
2. Go to "Create Deal"
3. Fill in deal details
4. Add parties (Bob as SELLER)
5. Submit deal
6. ✅ Alice gets "Deal Created" email
7. ✅ Bob gets "You've Been Invited" email

### For Invited Party (Bob)
1. 📧 Receives invitation email
2. 🔗 Clicks "Review & Confirm Participation"
3. 👀 Views deal details and terms
4. 📝 Signs up (if no account)
5. ✅ Confirms participation
6. 🎉 Redirected to deal page

### After All Parties Confirm
- Deal status: CREATED → ACCEPTED
- `allPartiesConfirmed` = true
- Audit log created
- Deal ready for next phase (funding)

## 🔍 Debugging

### Check Invitation Token
```sql
SELECT id, name, role, "invitationStatus", "invitationToken"
FROM "Party"
WHERE "dealId" = 'YOUR_DEAL_ID';
```

### Check Audit Logs
```sql
SELECT "eventType", actor, "entityType", "entityId", "newState", timestamp
FROM "AuditEvent"
WHERE "dealId" = 'YOUR_DEAL_ID'
ORDER BY timestamp DESC;
```

### Check Email Queue
```bash
# If using BullMQ with Redis
redis-cli
> KEYS bull:email-sending:*
> LRANGE bull:email-sending:waiting 0 -1
```

## 📝 Files Modified/Created

### Backend
- ✅ `prisma/schema.prisma` - Added invitation fields
- ✅ `src/modules/deals/deals.service.ts` - Invitation logic
- ✅ `src/modules/deals/deals.routes.ts` - API endpoints
- ✅ `templates/emails/party-invitation.html` - Email template
- ✅ `scripts/test-party-invitation.ts` - Test script

### Frontend
- ✅ `app/confirm-invitation/[token]/page.tsx` - Confirmation page
- ✅ `app/sign-up/[[...sign-up]]/page.tsx` - Enhanced sign-up

## 🐛 Common Issues

### Issue: Email not sent
**Solution:**
- Check SMTP credentials in `.env`
- Check email queue: `redis-cli KEYS bull:email-sending:*`
- Check backend logs for email errors
- Verify `EMAIL_TEST_MODE=true` and `EMAIL_TEST_RECIPIENT` set

### Issue: Invitation token invalid
**Solution:**
- Token might have been used from database directly (encoded)
- Get token from email link or API response
- Check party record: `SELECT "invitationToken" FROM "Party" WHERE id = '...'`

### Issue: "Can't confirm invitation" error
**Solution:**
- Check party status: might already be ACCEPTED
- Check token exists in database
- Check API endpoint is `/api/deals/invitations/:token/confirm` (not `/deals/:id/...`)

### Issue: Deal status not updating to ACCEPTED
**Solution:**
- Check all parties have `invitationStatus = 'ACCEPTED'`
- Check `allPartiesConfirmed` field in Deal table
- Check audit logs for `ALL_PARTIES_ACCEPTED` event

## 💡 Tips

1. **Test Mode**: Set `EMAIL_TEST_MODE=true` to redirect all emails to a test account
2. **Audit Trail**: Check `AuditEvent` table for complete invitation history
3. **Token Security**: Tokens are 64-char hex strings (256-bit entropy)
4. **Idempotency**: Confirming twice returns "already accepted" without error
5. **No Auth Required**: Invitation endpoints are public (token is the auth)

## 🎉 Success Criteria

Your implementation is working correctly when:

✅ Creating deal generates unique invitation tokens for all parties
✅ Invitation emails sent to all non-creator parties
✅ Email contains correct deal details and confirmation link
✅ Confirmation page loads without authentication
✅ Sign-up flow preserves invitation context
✅ Confirming invitation updates party status to ACCEPTED
✅ All parties accepting updates deal to ACCEPTED status
✅ Audit logs created for all invitation events
✅ Duplicate confirmations handled gracefully
✅ Invalid tokens return appropriate errors

## 📚 Related Documentation

- Main documentation: `PARTY_INVITATION_SYSTEM_COMPLETE.md`
- Email setup: `EMAIL_SETUP_GUIDE.md`
- API documentation: Backend Swagger/OpenAPI docs
- Frontend components: `fouad-ai/frontend/components/ui/`

## 🆘 Support

If you encounter issues:
1. Check backend logs: `cd fouad-ai/backend && npm run dev`
2. Check frontend logs: Browser console
3. Run test script: `npx tsx scripts/test-party-invitation.ts`
4. Check database: Use Prisma Studio `npx prisma studio`
5. Check email queue: Redis CLI

---

**Status:** ✅ Ready for Production
**Last Updated:** February 15, 2025
