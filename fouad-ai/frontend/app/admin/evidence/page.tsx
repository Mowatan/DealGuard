'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { quarantineApi, ApiError } from '@/lib/api-client';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EvidenceReviewPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [quarantined, setQuarantined] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchQuarantined();
    }
  }, [isLoaded, isSignedIn]);

  const fetchQuarantined = async () => {
    try {
      const token = await getToken();
      const data = await quarantineApi.listQuarantined(token);
      setQuarantined(data || []);
      setError('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load quarantined evidence');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (evidenceId: string) => {
    const notes = prompt('Enter release notes (optional):');

    setProcessingId(evidenceId);
    try {
      const token = await getToken();
      await quarantineApi.release(evidenceId, notes || undefined, token);
      await fetchQuarantined();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to release evidence: ${err.message}`);
      } else {
        setError('Failed to release evidence');
      }
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Evidence Review</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Review and manage quarantined evidence
          </p>
        </div>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Evidence Review</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review and manage quarantined evidence
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarantined</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quarantined.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
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

      {/* Evidence List */}
      <Card>
        {quarantined.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No quarantined evidence</p>
            <p className="text-sm text-muted-foreground mt-2">
              Quarantined items will appear here for review
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-4 pt-6">
            {quarantined.map((item: any) => (
              <div
                key={item.id}
                className="flex items-start justify-between border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item.subject || 'Untitled'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deal: {item.deal?.title || item.dealId}
                  </p>
                  {item.quarantineReason && (
                    <p className="text-sm text-destructive mt-2">
                      <strong>Reason:</strong> {item.quarantineReason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">QUARANTINED</Badge>
                  {processingId === item.id ? (
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRelease(item.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Release
                    </Button>
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
