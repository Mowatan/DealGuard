'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

/**
 * InvitationChecker - Auto-processes pending invitations after signup/login
 *
 * This component checks localStorage for a pending invitation token.
 * If found and user is authenticated, it automatically processes the invitation
 * (accept or decline) and redirects appropriately.
 */
export function InvitationChecker() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return;

    // Only proceed if user is authenticated
    if (!userId) return;

    // Check for pending invitation in localStorage
    const pendingToken = localStorage.getItem('pendingInvitation');
    const pendingAction = localStorage.getItem('pendingInvitationAction');

    if (pendingToken && pendingAction) {
      console.log(`📨 Found pending invitation, auto-${pendingAction}ing...`, pendingToken);

      // Clear localStorage immediately to prevent re-processing
      localStorage.removeItem('pendingInvitation');
      localStorage.removeItem('pendingInvitationAction');

      // Determine endpoint based on action
      const endpoint = pendingAction === 'accept' ? 'accept' : 'decline';

      // Auto-process the invitation
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${pendingToken}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(
          pendingAction === 'decline' ? { reason: 'Declined by user' } : {}
        ),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to ${pendingAction} invitation`);
          }
          return res.json();
        })
        .then((data) => {
          console.log(`✅ Invitation ${pendingAction}ed successfully:`, data);
          if (pendingAction === 'accept' && data.dealId) {
            // Redirect to deal page with success message
            router.push(`/deals/${data.dealId}?message=invitation-accepted`);
          } else if (pendingAction === 'decline') {
            // Redirect to home with decline message
            router.push('/?message=invitation-declined');
          }
        })
        .catch((err) => {
          console.error(`❌ Failed to auto-${pendingAction} invitation:`, err);
          // On error, redirect back to invitation page so user can manually retry
          router.push(`/invitations/${pendingToken}`);
        });
    }
  }, [userId, isLoaded, router]);

  // This component doesn't render anything
  return null;
}
