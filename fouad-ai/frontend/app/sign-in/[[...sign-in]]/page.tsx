'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { copyToSessionStorage } from '@/lib/invitation-storage';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  // Copy invitation from localStorage to sessionStorage for better reliability
  useEffect(() => {
    copyToSessionStorage();
  }, []);

  // Build the redirect URL after sign-in
  const redirectUrl = redirect || '/deals';

  // Check if this is an invitation flow
  const isInvitationFlow = redirect?.includes('/invitations/');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {isInvitationFlow && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <strong>Sign in to accept the deal invitation.</strong>
              <br />
              You'll be redirected to complete the acceptance.
            </p>
          </div>
        )}

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl={redirectUrl}
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
