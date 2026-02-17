# DealGuard Email Templates

Professional email templates for DealGuard transaction notifications.

## Templates Overview

### 1. deal-created.html
**Purpose:** Confirmation email sent to the deal creator when a transaction is successfully created.

**Subject Line:** "Your DealGuard Transaction Has Been Created - {{dealNumber}}"

**Template Variables:**
- `{{recipientName}}` - Name of the deal creator
- `{{recipientEmail}}` - Email of recipient (for unsubscribe link)
- `{{dealNumber}}` - Unique deal identifier (e.g., "DEAL-2026-0021")
- `{{dealTitle}}` - Title/name of the deal
- `{{serviceTier}}` - Service tier (Governance Advisory / Document Custody / Financial Escrow)
- `{{totalAmount}}` - Total transaction value (formatted number)
- `{{currency}}` - Currency code (EGP, USD, etc.)
- `{{partiesCount}}` - Number of parties invited to the deal
- `{{milestonesCount}}` - Number of milestones configured
- `{{dealUrl}}` - Direct link to deal dashboard
- `{{createdDate}}` - Formatted creation date

**Key Features:**
- ✓ Success badge with deal number
- ✓ Comprehensive transaction details
- ✓ Service tier badge styling
- ✓ "What Happens Next" section explaining the workflow
- ✓ Prominent CTA button to view dashboard
- ✓ Professional gradient header
- ✓ Mobile responsive design
- ✓ Unsubscribe link in footer

---

### 2. party-invitation.html
**Purpose:** Invitation email sent to each party invited to join a transaction.

**Subject Line:** "You've Been Invited to Join a Transaction on DealGuard"

**Template Variables:**
- `{{recipientName}}` - Name of the invited party
- `{{inviterName}}` - Name of the person who invited them
- `{{dealNumber}}` - Unique deal identifier
- `{{dealTitle}}` - Title/name of the deal
- `{{partyRole}}` - Role of this party (BUYER, SELLER, WITNESS, etc.)
- `{{serviceTier}}` - Service tier description
- `{{dealValue}}` - Transaction value (formatted)
- `{{currency}}` - Currency code
- `{{invitationUrl}}` - Unique invitation link with token
- `{{dealDescription}}` - Optional deal description (if available)

**Key Features:**
- ✓ Invitation badge with inviter name
- ✓ "What is DealGuard?" introduction for new users
- ✓ Role badge highlighting their specific role
- ✓ Action required callout box
- ✓ Prominent green CTA button
- ✓ Step-by-step next steps guide
- ✓ Trust-building messaging about security
- ✓ Mobile responsive design
- ✓ Support contact information

---

## Design System

### Color Palette
- **Primary Gradient:** `#667eea → #764ba2` (Purple/blue gradient for headers)
- **Success:** `#10b981 → #059669` (Green gradient for success states)
- **Info Blue:** `#3b82f6 → #2563eb` (Blue for invitations/info)
- **Warning:** `#fef3c7 → #fde68a` (Yellow for important info)
- **Alert Red:** `#fef2f2` with `#ef4444` border (For urgent actions)
- **Neutrals:** Gray scale from `#1f2937` (text) to `#f3f4f6` (background)

### Typography
- **Font Family:** System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, etc.)
- **Header:** 32px bold with gradient background
- **Main Text:** 16px with 1.6 line-height for readability
- **Details:** 14px for secondary information

### Components
- **Badges:** Gradient backgrounds with rounded corners, white text
- **Info Boxes:** Colored backgrounds with left border accent
- **CTA Buttons:** Large, gradient backgrounds with shadow, hover effects
- **Detail Rows:** Flex layout with label/value pairs, bordered bottom

### Mobile Responsiveness
- Breakpoint: 600px
- Stacks detail rows vertically on mobile
- Reduces padding and font sizes
- Maintains readability on small screens

---

## Email Client Compatibility

These templates are tested and compatible with:
- ✓ Gmail (web, iOS, Android)
- ✓ Apple Mail (macOS, iOS)
- ✓ Outlook (2016+, Office 365, web)
- ✓ Yahoo Mail
- ✓ ProtonMail
- ✓ Mobile devices (iOS, Android)

### Technical Implementation
- **HTML Tables:** Used for layout (email client compatibility)
- **Inline CSS:** All styles are inline for maximum compatibility
- **No External Resources:** Everything embedded (no external images/CSS)
- **Responsive:** CSS media queries for mobile optimization
- **Accessible:** Semantic HTML, proper alt text, high contrast

---

## Usage in Code

### Sending Deal Creation Email

```typescript
await emailService.sendEmail({
  to: dealCreator.email,
  subject: `Your DealGuard Transaction Has Been Created - ${deal.dealNumber}`,
  template: 'deal-created',
  variables: {
    recipientName: dealCreator.name,
    recipientEmail: dealCreator.email,
    dealNumber: deal.dealNumber,
    dealTitle: deal.title,
    serviceTier: deal.serviceTier,
    totalAmount: formatCurrency(deal.totalAmount),
    currency: deal.currency,
    partiesCount: deal.parties.length,
    milestonesCount: deal.milestones.length,
    dealUrl: `https://dealguard.org/deals/${deal.id}`,
    createdDate: formatDate(deal.createdAt),
  },
  dealId: deal.id,
});
```

### Sending Party Invitation Email

```typescript
await emailService.sendEmail({
  to: party.contactEmail,
  subject: "You've Been Invited to Join a Transaction on DealGuard",
  template: 'party-invitation',
  variables: {
    recipientName: party.name,
    inviterName: deal.createdBy.name,
    dealNumber: deal.dealNumber,
    dealTitle: deal.title,
    partyRole: party.role,
    serviceTier: deal.serviceTier,
    dealValue: formatCurrency(deal.totalAmount),
    currency: deal.currency,
    invitationUrl: `https://dealguard.org/deals/${deal.id}/accept?token=${party.invitationToken}`,
  },
  dealId: deal.id,
});
```

---

## Template Variables Best Practices

1. **Always Provide Fallbacks:** Ensure all variables have default values
2. **Format Currency:** Use proper currency formatting with symbols
3. **Format Dates:** Use human-readable date formats (e.g., "February 16, 2026")
4. **Encode URLs:** Ensure all URLs are properly encoded
5. **Validate Emails:** Check recipient email validity before sending
6. **Test Rendering:** Test with real data before deploying

---

## Future Enhancements

Potential additions to consider:
- [ ] Plain text versions of emails (for text-only clients)
- [ ] Multiple language support (i18n)
- [ ] Custom branding per organization
- [ ] Dark mode support
- [ ] Email preview/testing tool
- [ ] A/B testing capabilities
- [ ] Email analytics tracking

---

## Support

For questions about email templates:
- **Technical Issues:** support@dealguard.org
- **Design Feedback:** design@dealguard.org
- **Template Requests:** product@dealguard.org

---

Last Updated: February 16, 2026
Version: 2.0.0
