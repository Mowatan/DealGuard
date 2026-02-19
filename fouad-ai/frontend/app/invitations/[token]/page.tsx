'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Clock, Users, Mail, XCircle } from 'lucide-react';

interface InvitationData {
  party: {
    id: string;
    name: string;
    role: string;
    contactEmail: string;
    invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    respondedAt?: string;
  };
  deal: {
    id: string;
    dealNumber: string;
    title: string;
    status: string;
    serviceTier: string;
    currency: string;
    dealValue: string;
    parties: Array<{
      id: string;
      name: string;
      role: string;
      invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    }>;
  };
}

export default function InvitationAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${token}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid or expired invitation');
      }

      const data = await response.json();
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isSignedIn) {
      // Redirect to sign-up with invitation context
      router.push(`/sign-up?invitationToken=${token}&returnUrl=/invitations/${token}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${token}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      const result = await response.json();

      if (result.alreadyAccepted) {
        setSuccessMessage('You have already accepted this invitation!');
      } else {
        setSuccessMessage('Invitation accepted successfully!');
      }

      // Refresh invitation data
      await fetchInvitation();

      // Redirect to deal page after a short delay
      setTimeout(() => {
        router.push(`/deals/${result.dealId}?accepted=true`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this invitation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeclining(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${token}/decline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Declined by user',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline invitation');
      }

      setSuccessMessage('Invitation declined. The deal creator has been notified.');

      // Redirect to home after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
    } finally {
      setDeclining(false);
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
            <CardDescription className="mt-2">
              This invitation cannot be accessed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Common reasons:</strong>
                <br />• The invitation link has expired
                <br />• You've already responded to this invitation
                <br />• The deal creator cancelled the invitation
              </p>
            </div>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
              size="lg"
            >
              Return to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { party, deal } = invitation;
  const alreadyAccepted = party.invitationStatus === 'ACCEPTED';
  const alreadyDeclined = party.invitationStatus === 'DECLINED';
  const otherParties = deal.parties.filter((p) => p.id !== party.id);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full bg-blue-100 mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You've Been Invited
          </h1>
          <p className="text-gray-600">
            Transaction invitation from DealGuard
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Banner - Already Accepted */}
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

        {/* Status Banner - Already Declined */}
        {alreadyDeclined && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">You have declined this invitation</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Service Tier</h3>
                <p className="text-gray-600">{deal.serviceTier}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Transaction Value</h3>
                <p className="text-xl font-bold text-blue-600">
                  {deal.currency} {Number(deal.dealValue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Role */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Role in This Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{party.name}</p>
                <Badge className="mt-1">{party.role}</Badge>
                <p className="text-sm text-gray-500 mt-1">{party.contactEmail}</p>
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
                All parties must accept before the deal can proceed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {otherParties.map((otherParty, index) => (
                  <div key={otherParty.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{otherParty.name}</p>
                        <p className="text-sm text-gray-600">{otherParty.role}</p>
                      </div>
                      <Badge
                        variant={
                          otherParty.invitationStatus === 'ACCEPTED'
                            ? 'default'
                            : otherParty.invitationStatus === 'DECLINED'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {otherParty.invitationStatus === 'ACCEPTED' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : otherParty.invitationStatus === 'DECLINED' ? (
                          <XCircle className="h-3 w-3 mr-1" />
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
        {error && !successMessage && (
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
        {!alreadyAccepted && !alreadyDeclined && !successMessage && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Important:</strong> By accepting this invitation, you agree to
                    participate in this transaction under the terms specified.
                    {!isSignedIn && ' You will need to create an account to proceed.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={accepting || declining}
                    className="flex-1"
                    size="lg"
                  >
                    {accepting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Accepting...
                      </>
                    ) : isSignedIn ? (
                      'Accept Invitation'
                    ) : (
                      'Sign Up & Accept'
                    )}
                  </Button>
                  <Button
                    onClick={handleDecline}
                    disabled={accepting || declining}
                    variant="outline"
                    size="lg"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {declining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                        Declining...
                      </>
                    ) : (
                      'Decline'
                    )}
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

        {alreadyDeclined && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
