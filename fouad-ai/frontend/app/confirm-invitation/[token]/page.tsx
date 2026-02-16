'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';

interface InvitationData {
  party: {
    id: string;
    name: string;
    role: string;
    contactEmail: string;
    invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    invitedAt: string;
    respondedAt?: string;
  };
  deal: {
    id: string;
    dealNumber: string;
    title: string;
    description: string;
    totalAmount: string;
    currency: string;
    status: string;
  };
  otherParties: Array<{
    name: string;
    role: string;
    invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  }>;
}

export default function ConfirmInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/deals/invitations/${token}`);

      if (!response.ok) {
        throw new Error('Invalid or expired invitation');
      }

      const data = await response.json();
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!isSignedIn) {
      // Redirect to sign-up with deal context
      router.push(`/sign-up?invitationToken=${token}&returnUrl=/confirm-invitation/${token}`);
      return;
    }

    try {
      setConfirming(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deals/invitations/${token}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to confirm invitation');
      }

      const result = await response.json();

      // Redirect to deal page
      router.push(`/deals/${result.deal.id}?confirmed=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm invitation');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { party, deal, otherParties } = invitation;
  const alreadyAccepted = party.invitationStatus === 'ACCEPTED';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Deal Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to participate in a transaction
          </p>
        </div>

        {/* Status Banner */}
        {alreadyAccepted && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">You have already accepted this invitation</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deal Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{deal.title}</CardTitle>
                <CardDescription className="mt-2">
                  Deal #{deal.dealNumber}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {deal.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{deal.description}</p>
              </div>
            )}

            {deal.totalAmount && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transaction Value</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {deal.totalAmount} {deal.currency}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Role */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{party.name}</p>
                <p className="text-sm text-gray-600">Role: {party.role}</p>
                <p className="text-sm text-gray-500">{party.contactEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Parties */}
        {otherParties.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Other Parties</CardTitle>
              <CardDescription>
                All parties must confirm before the deal can proceed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {otherParties.map((otherParty, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{otherParty.name}</p>
                        <p className="text-sm text-gray-600">{otherParty.role}</p>
                      </div>
                      <Badge
                        variant={
                          otherParty.invitationStatus === 'ACCEPTED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {otherParty.invitationStatus === 'ACCEPTED' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {otherParty.invitationStatus}
                      </Badge>
                    </div>
                    {index < otherParties.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!alreadyAccepted && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> By confirming your participation, you agree to
                    the terms of this transaction. {!isSignedIn && 'You will need to create an account to proceed.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="flex-1"
                    size="lg"
                  >
                    {confirming ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Confirming...
                      </>
                    ) : isSignedIn ? (
                      'Confirm Participation'
                    ) : (
                      'Sign Up & Confirm'
                    )}
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {alreadyAccepted && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={() => router.push(`/deals/${deal.id}`)}
                className="w-full"
                size="lg"
              >
                View Deal Details
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
