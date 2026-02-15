'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, AlertCircle, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface ProgressStage {
  id: string;
  stageKey: string;
  stageName: string;
  stageOrder: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'SKIPPED';
  enteredAt?: string;
  completedAt?: string;
  notes?: string;
  metadata: {
    description: string;
    actorType: string;
    estimatedDuration?: string;
    icon?: string;
  };
}

interface EscrowOfficer {
  id: string;
  name: string;
  email: string;
  currentMessage?: string;
  lastUpdatedAt: string;
}

interface ProgressData {
  stages: ProgressStage[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
    currentStage?: ProgressStage;
  };
  escrowOfficer?: EscrowOfficer | null;
}

interface ProgressTrackerProps {
  dealId: string;
}

export function ProgressTracker({ dealId }: ProgressTrackerProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Only fetch if auth is loaded and user is signed in
    if (isLoaded && isSignedIn) {
      fetchProgress();

      // Poll every 30 seconds for updates
      const interval = setInterval(fetchProgress, 30000);

      return () => clearInterval(interval);
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
      setError('Please sign in to view progress');
    }
  }, [dealId, isLoaded, isSignedIn]);

  async function fetchProgress() {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error('Authentication required');
      }

      const res = await fetch(`/api/deals/${dealId}/progress`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setProgressData(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch progress:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-slate-600">Loading progress tracker...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-6">
          <p className="text-red-800">Failed to load progress: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!progressData || progressData.stages.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-slate-600">Progress tracker not initialized for this deal.</p>
        </CardContent>
      </Card>
    );
  }

  const { stages, progress, escrowOfficer } = progressData;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-6 h-6 text-blue-600 animate-pulse" />;
      case 'BLOCKED':
        return <AlertCircle className="w-6 h-6 text-amber-600" />;
      case 'SKIPPED':
        return <Circle className="w-6 h-6 text-slate-400" />;
      default:
        return <Circle className="w-6 h-6 text-slate-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 border-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-100 border-blue-500 shadow-lg';
      case 'BLOCKED':
        return 'bg-amber-100 border-amber-500';
      case 'SKIPPED':
        return 'bg-slate-50 border-slate-300';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'border-green-500';
      case 'IN_PROGRESS':
        return 'border-blue-500';
      case 'BLOCKED':
        return 'border-amber-500';
      default:
        return 'border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deal Progress</CardTitle>
            <Badge variant="outline" className="text-lg font-bold px-4 py-1">
              {progress.percentage}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress.percentage} className="h-3" />
          <div className="flex justify-between text-sm text-slate-600 mt-2">
            <span>
              {progress.completed} of {progress.total} stages completed
            </span>
            {progress.currentStage && (
              <span className="font-medium text-blue-600">
                Current: {progress.currentStage.stageName}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Escrow Officer Card (if applicable) */}
      {escrowOfficer && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <User className="w-5 h-5" />
              Your Escrow Officer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold text-lg text-blue-900">
                {escrowOfficer.name}
              </p>
              <p className="text-sm text-blue-700">{escrowOfficer.email}</p>

              {escrowOfficer.currentMessage && (
                <div className="mt-3 p-3 bg-white rounded-md border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    {escrowOfficer.currentMessage}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Updated {new Date(escrowOfficer.lastUpdatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            {/* Stages */}
            <div className="space-y-6">
              {stages.map((stage, index) => (
                <div key={stage.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full border-4 flex items-center justify-center bg-white ${getBorderColor(
                        stage.status
                      )}`}
                    >
                      {getStatusIcon(stage.status)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div
                      className={`border-2 rounded-lg p-4 transition-all duration-300 ${getStatusColor(
                        stage.status
                      )}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded">
                              STAGE {stage.stageOrder}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {stage.metadata.actorType}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-lg mt-1">
                            {stage.stageName}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {stage.metadata.description}
                          </p>
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant={
                            stage.status === 'COMPLETED' || stage.status === 'IN_PROGRESS'
                              ? 'default'
                              : 'outline'
                          }
                          className="ml-2"
                        >
                          {stage.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Timestamps and info */}
                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        {stage.enteredAt && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Started:</span>
                            <span>
                              {new Date(stage.enteredAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {stage.completedAt && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Completed:</span>
                            <span>
                              {new Date(stage.completedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {stage.metadata.estimatedDuration &&
                          stage.status === 'IN_PROGRESS' && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Estimated duration:</span>
                              <span>{stage.metadata.estimatedDuration}</span>
                            </div>
                          )}
                        {stage.notes && (
                          <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                            <span className="font-medium block">Notes:</span>
                            <span className="text-slate-700">{stage.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* YOU ARE HERE indicator */}
                      {stage.status === 'IN_PROGRESS' && (
                        <div className="mt-3 flex items-center gap-2 text-blue-700 font-semibold">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                          <span className="text-sm">← YOU ARE HERE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
