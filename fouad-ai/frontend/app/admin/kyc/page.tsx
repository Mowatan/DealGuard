'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { kycApi, ApiError } from '@/lib/api-client';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function KYCQueuePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchPendingKyc();
    }
  }, [isLoaded, isSignedIn]);

  const fetchPendingKyc = async () => {
    try {
      const token = await getToken();
      const data = await kycApi.listPending(token);
      setPendingKyc(data || []);
      setError('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load KYC queue');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (partyId: string) => {
    setProcessingId(partyId);
    try {
      const token = await getToken();
      await kycApi.verify(partyId, 'Documents verified by admin', token);
      await fetchPendingKyc();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to verify KYC: ${err.message}`);
      } else {
        setError('Failed to verify KYC');
      }
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (partyId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessingId(partyId);
    try {
      const token = await getToken();
      await kycApi.reject(partyId, reason, token);
      await fetchPendingKyc();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to reject KYC: ${err.message}`);
      } else {
        setError('Failed to reject KYC');
      }
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'VERIFIED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">KYC Queue</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Review and verify party KYC submissions
          </p>
        </div>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KYC Queue</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review and verify party KYC submissions
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingKyc.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      {/* KYC List */}
      <Card>
        {pendingKyc.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending KYC submissions</p>
            <p className="text-sm text-muted-foreground mt-2">
              KYC submissions will appear here when parties submit documents
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-4 pt-6">
            {pendingKyc.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item.name || 'Unknown Party'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Role: {item.role} • Deal: {item.deal?.title || item.dealId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.kycDocumentUrls?.length || 0} document(s) uploaded
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(item.kycStatus)}>
                    {item.kycStatus}
                  </Badge>
                  {processingId === item.id ? (
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerify(item.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(item.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
