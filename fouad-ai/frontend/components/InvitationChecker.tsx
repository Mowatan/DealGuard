'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { getPendingInvitation, clearInvitation } from '@/lib/invitation-storage';
import { invitationsApi } from '@/lib/api-client';

/**
 * InvitationChecker - Auto-processes pending invitations after signup/login
 *
 * This component checks for pending invitation tokens across multiple storage layers:
 * 1. sessionStorage (most reliable - survives cache clears, set during signup)
 * 2. localStorage (fallback for backwards compatibility)
 *
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

    // Check for pending invitation
    const pending = getPendingInvitation();

    if (pending) {
      console.log(`📨 Found pending invitation, auto-${pending.action}ing...`, pending.token);

      // Clear storage immediately to prevent re-processing
      clearInvitation();

      // Determine endpoint based on action
      const endpoint = pending.action === 'accept' ? 'accept' : 'decline';

      // Auto-process the invitation
      const processInvitation = async () => {
        try {
          if (pending.action === 'accept') {
            const data = await invitationsApi.accept(pending.token);
            console.log('✅ Invitation accepted successfully:', data);
            router.push(`/deals/${data.dealId}?message=invitation-accepted`);
          } else {
            const data = await invitationsApi.decline(pending.token, 'Declined by user');
            console.log('✅ Invitation declined successfully:', data);
            router.push('/?message=invitation-declined');
          }
        } catch (err) {
          console.error(`❌ Failed to auto-${pending.action} invitation:`, err);
          // On error, redirect back to invitation page so user can manually retry
          router.push(`/invitations/${pending.token}`);
        }
      };

      processInvitation();
    }
  }, [userId, isLoaded, router]);

  // This component doesn't render anything
  return null;
}
