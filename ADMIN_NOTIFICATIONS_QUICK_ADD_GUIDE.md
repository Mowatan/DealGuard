# Quick Guide: Adding More Admin Notifications

This guide shows you how to quickly add new admin email notifications following the same pattern.

## Steps to Add a New Notification

### Step 1: Create Email Template

Create: `backend/templates/emails/admin-[notification-name].html`

**Template Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Notification Subject</title>
  <style>
    /* Copy styles from existing admin templates */
    /* Use appropriate gradient color for header */
  </style>
</head>
<body>
  <div class="email-wrapper">
    <table class="email-container">
      <!-- Header with gradient -->
      <tr>
        <td class="email-header">
          <h1>DealGuard Admin</h1>
          <p class="tagline">Platform Activity Notification</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td class="email-content">
          <!-- Alert badge with icon -->
          <div class="alert-badge">
            <div class="icon">🎯</div>
            <h2>Event Title</h2>
            <p>Event description</p>
          </div>

          <!-- Details box -->
          <div class="details-box">
            <h3>Event Information</h3>
            <div class="detail-row">
              <div class="detail-label">Field Name</div>
              <div class="detail-value">{{variableName}}</div>
            </div>
            <!-- Add more detail rows -->
          </div>

          <!-- CTA Button -->
          <div class="cta-section">
            <a href="{{actionUrl}}" class="cta-button">View Details</a>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="email-footer">
          <p class="company-name">DealGuard Admin Notifications</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
```

### Step 2: Add Notification Logic

In the relevant service file (e.g., `deals.service.ts`, `auth.ts`, etc.):

```typescript
// Get admin email
const adminEmail = process.env.ADMIN_EMAIL || 'trust@dealguard.org';

try {
  await emailSendingQueue.add('send-email', {
    to: adminEmail,
    subject: `Event Title - ${identifier}`,
    template: 'admin-notification-name',
    variables: {
      field1: value1,
      field2: value2,
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
      // Add all variables used in template
    },
  });
} catch (emailError) {
  console.error('Failed to send admin notification:', emailError);
  // Don't block the main operation
}
```

### Step 3: Test It

```bash
# Create test script or use existing test framework
npx ts-node scripts/test-admin-notifications.ts
```

---

## Common Notification Examples

### 1. Deal Cancelled

**Template:** `admin-deal-cancelled.html`
**Trigger:** When a deal is cancelled
**Color:** Red gradient (#ef4444 → #dc2626)

```typescript
// In deals.service.ts - cancelDeal function
await emailSendingQueue.add('send-email', {
  to: process.env.ADMIN_EMAIL || 'trust@dealguard.org',
  subject: `Deal Cancelled - ${deal.dealNumber}`,
  template: 'admin-deal-cancelled',
  variables: {
    dealNumber: deal.dealNumber,
    dealTitle: deal.title,
    cancelledBy: user.name,
    cancelledByEmail: user.email,
    cancellationReason: reason,
    dealValue: deal.totalAmount?.toString() || 'N/A',
    currency: deal.currency,
    cancelledAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
  },
});
```

### 2. All Parties Accepted (Deal Active)

**Template:** `admin-deal-active.html`
**Trigger:** When all parties accept and deal becomes active
**Color:** Green gradient (#10b981 → #059669)

```typescript
// In deals.service.ts - acceptPartyInvitation function (when allAccepted)
await emailSendingQueue.add('send-email', {
  to: process.env.ADMIN_EMAIL || 'trust@dealguard.org',
  subject: `Deal Activated - ${deal.dealNumber}`,
  template: 'admin-deal-active',
  variables: {
    dealNumber: deal.dealNumber,
    dealTitle: deal.title,
    dealId: deal.id,
    serviceTier: deal.serviceTier,
    totalAmount: deal.totalAmount?.toString() || 'TBD',
    currency: deal.currency,
    partiesCount: parties.length,
    activatedAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
  },
});
```

### 3. Dispute Opened

**Template:** `admin-dispute-opened.html`
**Trigger:** When a dispute is created
**Color:** Orange gradient (#f59e0b → #d97706)
**Priority:** HIGH

```typescript
// In disputes.service.ts - createDispute function
await emailSendingQueue.add('send-email', {
  to: process.env.ADMIN_EMAIL || 'trust@dealguard.org',
  subject: `🚨 URGENT: Dispute Opened - ${deal.dealNumber}`,
  template: 'admin-dispute-opened',
  variables: {
    dealNumber: deal.dealNumber,
    dealTitle: deal.title,
    disputeId: dispute.id,
    raisedBy: user.name,
    raisedByEmail: user.email,
    disputeReason: dispute.reason,
    disputeDescription: dispute.description,
    dealValue: deal.totalAmount?.toString() || 'N/A',
    currency: deal.currency,
    urgency: 'HIGH',
    openedAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
  },
});
```

### 4. High-Value Deal Alert

**Template:** `admin-high-value-deal.html`
**Trigger:** When deal value exceeds threshold (e.g., $100k)
**Color:** Gold gradient (#eab308 → #ca8a04)

```typescript
// In deals.service.ts - createDeal function (after deal creation)
const HIGH_VALUE_THRESHOLD = 100000;

if (deal.totalAmount && deal.totalAmount >= HIGH_VALUE_THRESHOLD) {
  await emailSendingQueue.add('send-email', {
    to: process.env.ADMIN_EMAIL || 'trust@dealguard.org',
    subject: `💰 High-Value Deal Created - ${deal.dealNumber}`,
    template: 'admin-high-value-deal',
    variables: {
      dealNumber: deal.dealNumber,
      dealTitle: deal.title,
      dealId: deal.id,
      totalAmount: deal.totalAmount.toString(),
      currency: deal.currency,
      creatorName: creator?.name || 'Unknown',
      creatorEmail: creator?.email || 'Unknown',
      serviceTier: deal.serviceTier,
      partiesCount: deal.parties.length,
      threshold: HIGH_VALUE_THRESHOLD.toString(),
      createdAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
    },
  });
}
```

### 5. Party Invitation Accepted

**Template:** `admin-party-accepted.html`
**Trigger:** When a party accepts an invitation
**Color:** Blue gradient (#3b82f6 → #2563eb)

```typescript
// In deals.service.ts - acceptPartyInvitation function
await emailSendingQueue.add('send-email', {
  to: process.env.ADMIN_EMAIL || 'trust@dealguard.org',
  subject: `Party Accepted - ${deal.dealNumber}`,
  template: 'admin-party-accepted',
  variables: {
    dealNumber: deal.dealNumber,
    dealTitle: deal.title,
    partyName: party.name,
    partyRole: party.role,
    partyEmail: party.contactEmail,
    remainingParties: deal.parties.filter(p => p.invitationStatus !== 'ACCEPTED').length,
    totalParties: deal.parties.length,
    acceptedAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
  },
});
```

### 6. User Role Upgraded

**Template:** `admin-role-upgraded.html`
**Trigger:** When user role changes (especially to admin/case officer)
**Color:** Purple gradient (#667eea → #764ba2)

```typescript
// In users.service.ts - upgradeUserRole function
await emailSendingQueue.add('send-email', {
  to: process.env.ADMIN_EMAIL || 'trust@dealguard.org',
  subject: `User Role Upgraded - ${user.email}`,
  template: 'admin-role-upgraded',
  variables: {
    userName: user.name,
    userEmail: user.email,
    userId: user.id,
    oldRole: oldRole,
    newRole: newRole,
    upgradedBy: adminUser.name,
    upgradedByEmail: adminUser.email,
    upgradedAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
  },
});
```

---

## Recommended Gradient Colors

Use these for different notification types:

| Notification Type | Gradient | Use For |
|------------------|----------|---------|
| 🎉 Success/New | #10b981 → #059669 (Green) | New deals, activations |
| 👤 User Events | #667eea → #764ba2 (Purple) | New users, role changes |
| 🚨 Urgent/Alert | #ef4444 → #dc2626 (Red) | Disputes, cancellations |
| ⚠️ Warning | #f59e0b → #d97706 (Orange) | Issues, disputes |
| 💰 Financial | #eab308 → #ca8a04 (Gold) | High-value deals |
| 📋 Info | #3b82f6 → #2563eb (Blue) | Party acceptances, status changes |

---

## Best Practices

### 1. Keep It Non-Blocking
```typescript
try {
  await emailSendingQueue.add(/* ... */);
} catch (emailError) {
  console.error('Failed to send notification:', emailError);
  // Don't throw - let the main operation succeed
}
```

### 2. Use Cairo Timezone
```typescript
timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
```

### 3. Include Action Links
```html
<a href="https://dealguard.org/admin/deals/{{dealId}}" class="cta-button">
  View Deal Details
</a>
```

### 4. Add Context
Include enough information so admin doesn't need to click through:
- Who triggered the event
- When it happened
- Key metrics/amounts
- Current status

### 5. Use Descriptive Subjects
- ✅ `New Deal Created - DEAL-2026-0001`
- ✅ `🚨 URGENT: Dispute Opened - DEAL-2026-0001`
- ❌ `Notification`
- ❌ `New Event`

### 6. Test Before Deploying
Always create a test script for new notifications.

---

## Checklist for New Notification

- [ ] Create HTML template in `backend/templates/emails/`
- [ ] Choose appropriate gradient color scheme
- [ ] Add all necessary template variables
- [ ] Include Cairo timezone for timestamps
- [ ] Add CTA button with action link
- [ ] Add notification logic in service file
- [ ] Wrap in try-catch (non-blocking)
- [ ] Use `process.env.ADMIN_EMAIL || 'trust@dealguard.org'`
- [ ] Create test case
- [ ] Test locally
- [ ] Verify email renders correctly
- [ ] Deploy to staging/production
- [ ] Monitor first few notifications

---

## Quick Copy-Paste Template

```typescript
// ========================================
// ADMIN NOTIFICATION: [NOTIFICATION NAME]
// ========================================

const adminEmail = process.env.ADMIN_EMAIL || 'trust@dealguard.org';

try {
  await emailSendingQueue.add('send-email', {
    to: adminEmail,
    subject: `[Event Title] - ${identifier}`,
    template: 'admin-[notification-name]',
    variables: {
      // Core info
      identifier: entity.identifier,
      title: entity.title,
      id: entity.id,

      // Actor info
      actorName: user.name || 'Unknown',
      actorEmail: user.email || 'Unknown',

      // Event details
      eventDetails: 'value',

      // Timestamp (Cairo time)
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),

      // Add more variables as needed
    },
  });

  console.log(`✅ Admin notification sent: [notification-name]`);
} catch (emailError) {
  console.error('Failed to send admin notification:', emailError);
  // Don't block the main operation
}
```

---

## Support

For questions or issues:
1. Check main documentation: `ADMIN_EMAIL_NOTIFICATIONS_COMPLETE.md`
2. Review existing templates for examples
3. Test with `test-admin-notifications.ts` script
4. Check backend logs for detailed error messages

---

**Last Updated:** 2026-02-19
**Status:** Active Pattern ✅
