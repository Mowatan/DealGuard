'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { disputesApi, ApiError } from '@/lib/api-client';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DisputesQueuePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDisputes();
    }
  }, [isLoaded, isSignedIn]);

  const fetchDisputes = async () => {
    try {
      const token = await getToken();
      const data = await disputesApi.listOpen(token);
      setDisputes(data || []);
      setError('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load disputes');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (disputeId: string) => {
    const notes = prompt('Enter resolution notes:');
    if (!notes) return;

    setProcessingId(disputeId);
    try {
      const token = await getToken();
      await disputesApi.resolve(disputeId, notes, token);
      await fetchDisputes();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to resolve dispute: ${err.message}`);
      } else {
        setError('Failed to resolve dispute');
      }
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'RESOLVED':
        return 'default';
      case 'OPEN':
        return 'destructive';
      case 'IN_MEDIATION':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Disputes Queue</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Review and mediate open disputes
          </p>
        </div>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Disputes Queue</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review and mediate open disputes
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
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Mediation</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {disputes.filter(d => d.status === 'IN_MEDIATION').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      {/* Disputes List */}
      <Card>
        {disputes.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No open disputes</p>
            <p className="text-sm text-muted-foreground mt-2">
              Disputes will appear here when parties raise issues
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-4 pt-6">
            {disputes.map((dispute: any) => (
              <div
                key={dispute.id}
                className="flex items-start justify-between border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{dispute.issueType}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deal: {dispute.deal?.title || dispute.dealId}
                  </p>
                  {dispute.narrative && (
                    <p className="text-sm text-muted-foreground mt-2">{dispute.narrative}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(dispute.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(dispute.status)}>
                    {dispute.status}
                  </Badge>
                  {processingId === dispute.id ? (
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleResolve(dispute.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
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
