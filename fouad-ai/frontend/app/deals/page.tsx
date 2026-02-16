'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { dealsApi, ApiError } from '@/lib/api-client';

interface Deal {
  id: string;
  dealNumber: string;
  title: string;
  status: string;
  createdAt: string;
  parties: Array<{
    id: string;
    role: string;
    name: string;
  }>;
  _count: {
    contracts: number;
    evidenceItems: number;
  };
}

export default function DealsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) {
      console.log('⏳ Waiting for Clerk to load...');
      return;
    }

    // Check if user is signed in
    if (!isSignedIn) {
      console.warn('⚠️ User not signed in, redirecting to /sign-in');
      router.push('/sign-in');
      return;
    }

    console.log('✅ User is signed in, fetching deals...');
    fetchDeals();
  }, [isLoaded, isSignedIn, router]);

  const fetchDeals = async () => {
    try {
      const token = await getToken();
      const data = await dealsApi.list({ limit: 100, token });
      setDeals(data.deals || []);
    } catch (err) {
      console.error('❌ Failed to fetch deals:', err);

      if (err instanceof ApiError) {
        // Handle authentication errors
        if (err.status === 401 || err.data?.authRequired) {
          setError('Please sign in to view deals.');
          // Redirect to sign in after a brief delay
          setTimeout(() => router.push('/sign-in'), 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load deals. Make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PROPOSED: 'bg-blue-100 text-blue-700',
    ACCEPTED_BY_ALL: 'bg-green-100 text-green-700',
    SIGNED_RECORDED: 'bg-purple-100 text-purple-700',
    FUNDED_VERIFIED: 'bg-indigo-100 text-indigo-700',
    IN_VERIFICATION: 'bg-yellow-100 text-yellow-700',
    CLOSED: 'bg-slate-100 text-slate-700',
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="container mx-auto">
          <p className="text-center text-slate-600">
            {!isLoaded ? 'Checking authentication...' : 'Loading deals...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-2xl font-bold text-slate-900">
                DealGuard
              </Link>
              <p className="text-sm text-slate-600 mt-1">Deal Management</p>
            </div>
            <Link
              href="/deals/new"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              + New Deal
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {deals.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No deals found</p>
            <Link
              href="/deals/new"
              className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              Create Your First Deal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="block bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:border-slate-300 hover:shadow transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {deal.title}
                    </h3>
                    <p className="text-sm text-slate-500">{deal.dealNumber}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusColors[deal.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {deal.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex gap-6 text-sm text-slate-600">
                  <div>
                    <strong>{deal.parties.length}</strong> parties
                  </div>
                  <div>
                    <strong>{deal._count.contracts}</strong> contracts
                  </div>
                  <div>
                    <strong>{deal._count.evidenceItems}</strong> evidence items
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Created {new Date(deal.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
