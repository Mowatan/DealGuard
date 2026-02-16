'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitationToken');
  const returnUrl = searchParams.get('returnUrl');
  const email = searchParams.get('email');

  // Build the redirect URL after sign-up
  const redirectUrl = invitationToken && returnUrl
    ? returnUrl
    : '/deals';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {invitationToken && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <strong>You're signing up to join a deal.</strong>
              <br />
              Complete sign-up to confirm your participation.
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
