'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { dealsApi, evidenceApi, ApiError } from '@/lib/api-client';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Evidence {
  id: string;
  subject: string;
  description?: string;
  status: string;
  sourceType?: string;
  createdAt: string;
  milestoneId?: string;
  dealId: string;
}

interface Deal {
  id: string;
  dealNumber: string;
  title: string;
}

interface EvidenceByDeal {
  deal: Deal;
  evidence: Evidence[];
}

export default function PortalEvidencePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [evidenceByDeal, setEvidenceByDeal] = useState<EvidenceByDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchEvidence();
    }
  }, [isLoaded, isSignedIn]);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await getToken();

      // Get all deals for current user
      const dealsData = await dealsApi.list({ limit: 100, token });
      const deals = dealsData.deals || [];

      // Fetch evidence for each deal
      const evidencePromises = deals.map(async (deal: any) => {
        try {
          const evidenceItems = await evidenceApi.listByDeal(deal.id, undefined, token);
          return {
            deal: {
              id: deal.id,
              dealNumber: deal.dealNumber,
              title: deal.title,
            },
            evidence: evidenceItems || [],
          };
        } catch (err) {
          // If evidence fetch fails for a deal, return empty array
          return {
            deal: {
              id: deal.id,
              dealNumber: deal.dealNumber,
              title: deal.title,
            },
            evidence: [],
          };
        }
      });

      const results = await Promise.all(evidencePromises);
      // Filter out deals with no evidence
      const withEvidence = results.filter((r) => r.evidence.length > 0);
      setEvidenceByDeal(withEvidence);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load evidence');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RECEIVED':
      case 'REVIEWED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'QUARANTINED':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RECEIVED':
      case 'REVIEWED':
        return 'bg-green-100 text-green-800';
      case 'QUARANTINED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Evidence</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your submitted documents and their review status
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading evidence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Evidence</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your submitted documents and their review status
          </p>
        </div>
        <Link
          href="/portal/evidence/submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Submit Evidence
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {evidenceByDeal.length === 0 && !error ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No evidence submitted yet</p>
            <p className="text-sm mt-2">
              Submit documents for your deals to track them here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {evidenceByDeal.map(({ deal, evidence }) => (
            <div key={deal.id} className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">{deal.title}</h2>
                <p className="text-sm text-gray-600">{deal.dealNumber}</p>
              </div>
              <div className="divide-y divide-gray-200">
                {evidence.map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {getStatusIcon(item.status)}
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {item.subject || 'Untitled Evidence'}
                          </h3>
                          {item.description && (
                            <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              Submitted {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                            {item.sourceType && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {item.sourceType}
                              </span>
                            )}
                            {item.milestoneId && (
                              <Link
                                href={`/portal/deals/${deal.id}#milestone-${item.milestoneId}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View Milestone
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`ml-4 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
