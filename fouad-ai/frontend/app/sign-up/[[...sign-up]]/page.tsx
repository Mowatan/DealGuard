'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const invitationToken = searchParams.get('invitationToken');
  const returnUrl = searchParams.get('returnUrl');
  const email = searchParams.get('email');

  // Extract invitation info from localStorage (set by invitation page)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingToken = localStorage.getItem('pendingInvitation');
      const pendingAction = localStorage.getItem('pendingInvitationAction');

      // Store in sessionStorage for Clerk metadata (will be picked up after signup)
      if (pendingToken && pendingAction) {
        sessionStorage.setItem('clerkMetadata_pendingInvitation', pendingToken);
        sessionStorage.setItem('clerkMetadata_pendingInvitationAction', pendingAction);
      }
    }
  }, []);

  // Build the redirect URL after sign-up (priority: redirect > returnUrl > default)
  const redirectUrl = redirect || (invitationToken && returnUrl ? returnUrl : '/deals');

  // Check if this is an invitation flow
  const isInvitationFlow = redirect?.includes('/invitations/') || invitationToken;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {isInvitationFlow && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <strong>You're signing up to join a deal.</strong>
              <br />
              Complete sign-up and you'll automatically be added to the transaction.
            </p>
          </div>
        )}

        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
        />
      </div>
    </div>
  );
}
