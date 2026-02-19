'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface ProgressData {
  stage: string;
  stageDescription: string;
  progressPercentage: number;
  blockers: string[] | null;
  stats: {
    totalParties: number;
    acceptedParties: number;
    pendingParties: number;
    totalMilestones: number;
    completedMilestones: number;
    pendingMilestones: number;
  };
  parties: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    order: number;
  }>;
}

export function DealProgress({ dealId }: { dealId: string }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchProgress();
  }, [dealId]);

  const fetchProgress = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/deals/${dealId}/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load progress');
      }

      const progressData = await res.json();
      setData(progressData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
      setError('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading progress...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>;
  }

  if (!data) return null;

  const stageColors: Record<string, string> = {
    CREATED: 'bg-gray-500',
    PENDING_APPROVAL: 'bg-yellow-500',
    ACTIVE: 'bg-blue-500',
    IN_PROGRESS: 'bg-purple-500',
    COMPLETED: 'bg-green-500',
    CANCELLED: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Stage Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Deal Progress</h3>
          <p className="text-gray-600 mt-1">{data.stageDescription}</p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-white font-semibold ${
            stageColors[data.stage as keyof typeof stageColors] || 'bg-gray-500'
          }`}
        >
          {data.stage.replace('_', ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Overall Progress</span>
          <span className="font-semibold">{data.progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${data.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Blockers (if any) */}
      {data.blockers && data.blockers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">Action Required</h4>
              <ul className="space-y-1">
                {data.blockers.map((blocker, i) => (
                  <li key={i} className="text-yellow-700 text-sm">
                    • {blocker}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {data.stats.acceptedParties}/{data.stats.totalParties}
          </div>
          <div className="text-sm text-blue-700">Parties Accepted</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {data.stats.completedMilestones}/{data.stats.totalMilestones}
          </div>
          <div className="text-sm text-purple-700">Milestones Done</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{data.progressPercentage}%</div>
          <div className="text-sm text-green-700">Complete</div>
        </div>
      </div>

      {/* Party Status */}
      <div className="space-y-3">
        <h4 className="font-semibold">Party Status</h4>
        <div className="space-y-2">
          {data.parties.map((party) => (
            <div
              key={party.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div>
                <div className="font-medium">{party.name}</div>
                <div className="text-sm text-gray-600">{party.role}</div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  party.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-700'
                    : party.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {party.status === 'ACCEPTED' ? '✓ Accepted' : party.status === 'PENDING' ? '⏳ Pending' : party.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Status */}
      {data.milestones.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Milestone Status</h4>
          <div className="space-y-2">
            {data.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    milestone.status === 'APPROVED'
                      ? 'bg-green-500'
                      : milestone.status === 'PENDING'
                      ? 'bg-yellow-500'
                      : 'bg-gray-300'
                  }`}
                >
                  {milestone.status === 'APPROVED' ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span className="text-white font-semibold">{milestone.order}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {milestone.title || `Milestone ${milestone.order}`}
                  </div>
                  <div className="text-sm text-gray-600">{milestone.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
