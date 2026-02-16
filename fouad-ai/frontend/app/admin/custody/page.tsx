'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { dealsApi, custodyApi, ApiError } from '@/lib/api-client';
import { Wallet, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustodyRecord {
  id: string;
  dealId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface CustodyByDeal {
  deal: {
    id: string;
    dealNumber: string;
    title: string;
  };
  records: CustodyRecord[];
}

export default function CustodyPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [custodyByDeal, setCustodyByDeal] = useState<CustodyByDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCustody();
    }
  }, [isLoaded, isSignedIn]);

  const fetchCustody = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await getToken();

      // Get all deals
      const dealsData = await dealsApi.list({ limit: 100, token });
      const deals = dealsData.deals || [];

      // Fetch custody records for each deal
      const custodyPromises = deals.map(async (deal: any) => {
        try {
          const records = await custodyApi.listByDeal(deal.id, token);
          return {
            deal: {
              id: deal.id,
              dealNumber: deal.dealNumber,
              title: deal.title,
            },
            records: records || [],
          };
        } catch (err) {
          return {
            deal: {
              id: deal.id,
              dealNumber: deal.dealNumber,
              title: deal.title,
            },
            records: [],
          };
        }
      });

      const results = await Promise.all(custodyPromises);
      // Filter out deals with no custody records
      const withRecords = results.filter((r) => r.records.length > 0);
      setCustodyByDeal(withRecords);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load custody records');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (recordId: string) => {
    setProcessingId(recordId);
    try {
      const token = await getToken();
      await custodyApi.verify(recordId, token);
      await fetchCustody(); // Refresh list
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to verify: ${err.message}`);
      } else {
        setError('Failed to verify custody record');
      }
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAuthorize = async (recordId: string, action: 'RELEASE' | 'RETURN') => {
    const confirm = window.confirm(
      `Are you sure you want to authorize ${action} for this custody record?`
    );
    if (!confirm) return;

    setProcessingId(recordId);
    try {
      const token = await getToken();
      await custodyApi.authorize(recordId, action, token);
      await fetchCustody(); // Refresh list
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to authorize: ${err.message}`);
      } else {
        setError('Failed to authorize custody action');
      }
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate stats
  const allRecords = custodyByDeal.flatMap((c) => c.records);
  const pendingCount = allRecords.filter((r) => r.status === 'PENDING_VERIFICATION').length;
  const verifiedCount = allRecords.filter((r) => r.status === 'VERIFIED').length;
  const awaitingAuthCount = allRecords.filter((r) =>
    ['AWAITING_RELEASE', 'AWAITING_RETURN'].includes(r.status)
  ).length;
  const totalAmount = allRecords.reduce((sum, r) => {
    if (r.status !== 'RELEASED' && r.status !== 'RETURNED') {
      return sum + r.amount;
    }
    return sum;
  }, 0);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'VERIFIED':
        return 'default'; // green
      case 'PENDING_VERIFICATION':
        return 'secondary'; // yellow
      case 'AWAITING_RELEASE':
      case 'AWAITING_RETURN':
        return 'outline'; // blue
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Custody Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Verify funding and authorize releases
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading custody records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Custody Management</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Verify funding and authorize releases
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Authorization</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingAuthCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total in Custody</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAmount.toLocaleString()} EGP
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custody Records */}
      {custodyByDeal.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No custody records found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Funding records will appear here when parties submit proof
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {custodyByDeal.map(({ deal, records }) => (
            <Card key={deal.id}>
              <CardHeader>
                <CardTitle>{deal.title}</CardTitle>
                <CardDescription>{deal.dealNumber}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {record.amount.toLocaleString()} {record.currency}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                          {record.verifiedAt && (
                            <p className="text-xs text-muted-foreground">
                              Verified {new Date(record.verifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(record.status)}>
                        {record.status.replace(/_/g, ' ')}
                      </Badge>
                      {processingId === record.id ? (
                        <span className="text-sm text-muted-foreground">Processing...</span>
                      ) : (
                        <>
                          {record.status === 'PENDING_VERIFICATION' && (
                            <Button
                              size="sm"
                              onClick={() => handleVerify(record.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Verify
                            </Button>
                          )}
                          {record.status === 'AWAITING_RELEASE' && (
                            <Button
                              size="sm"
                              onClick={() => handleAuthorize(record.id, 'RELEASE')}
                            >
                              Authorize Release
                            </Button>
                          )}
                          {record.status === 'AWAITING_RETURN' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAuthorize(record.id, 'RETURN')}
                            >
                              Authorize Return
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
