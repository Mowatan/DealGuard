'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

/**
 * InvitationChecker - Auto-accepts pending invitations after signup/login
 *
 * This component checks localStorage for a pending invitation token.
 * If found and user is authenticated, it automatically accepts the invitation
 * and redirects the user to the deal page.
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

    if (pendingToken && pendingAction === 'accept') {
      console.log('📨 Found pending invitation, auto-accepting...', pendingToken);

      // Clear localStorage immediately to prevent re-processing
      localStorage.removeItem('pendingInvitation');
      localStorage.removeItem('pendingInvitationAction');

      // Auto-accept the invitation
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${pendingToken}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to accept invitation');
          }
          return res.json();
        })
        .then((data) => {
          console.log('✅ Invitation accepted successfully:', data);
          if (data.dealId) {
            // Redirect to deal page with success message
            router.push(`/deals/${data.dealId}?message=invitation-accepted`);
          }
        })
        .catch((err) => {
          console.error('❌ Failed to auto-accept invitation:', err);
          // On error, redirect back to invitation page so user can manually retry
          router.push(`/invitations/${pendingToken}`);
        });
    }
  }, [userId, isLoaded, router]);

  // This component doesn't render anything
  return null;
}
