'use client';

import { useEffect, useState } from 'react';
import { disputesApi, ApiError } from '@/lib/api-client';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export default function DisputesQueuePage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const data = await disputesApi.listOpen();
      setDisputes(data || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-700';
      case 'OPEN':
        return 'bg-red-100 text-red-700';
      case 'IN_MEDIATION':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Disputes Queue</h1>
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Disputes Queue</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and mediate open disputes
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Open Disputes</p>
              <p className="text-2xl font-semibold text-gray-900">{disputes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">In Mediation</p>
              <p className="text-2xl font-semibold text-gray-900">
                {disputes.filter(d => d.status === 'IN_MEDIATION').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-semibold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {disputes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No open disputes</p>
            <p className="text-sm mt-2">Disputes will appear here when parties raise issues</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {disputes.map((dispute: any) => (
              <div key={dispute.id} className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{dispute.issueType}</h3>
                    <p className="text-sm text-gray-500 mt-1">Deal: {dispute.dealId}</p>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispute.status)}`}>
                    {dispute.status}
                  </span>
                </div>
                {dispute.narrative && (
                  <p className="text-sm text-gray-600 mt-2">{dispute.narrative}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created {new Date(dispute.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
