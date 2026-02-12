import { dealsApi } from '@/lib/api-client';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  let deals;
  try {
    const data = await dealsApi.list({ limit: 100 });
    deals = data.deals || [];
  } catch (error) {
    deals = [];
  }

  const getStatusIcon = (status: string) => {
    if (status.includes('CONFIRMED') || status === 'CLOSED') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Deals</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage your escrow deals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deals</p>
              <p className="text-2xl font-semibold text-gray-900">{deals.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {deals.filter((d: any) => !['CLOSED', 'CANCELLED'].includes(d.status)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {deals.filter((d: any) => d.status === 'CLOSED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deals List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Deals</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {deals.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No deals found</p>
              <p className="text-sm mt-2">You don't have any deals assigned yet</p>
            </div>
          ) : (
            deals.map((deal: any) => (
              <Link
                key={deal.id}
                href={`/portal/deals/${deal.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(deal.status)}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {deal.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {deal.dealNumber} • {new Date(deal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      deal.status.includes('CONFIRMED') || deal.status === 'CLOSED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {deal.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href="/portal/evidence/submit"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <Upload className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">Submit Evidence</h3>
          <p className="mt-2 text-sm text-gray-600">
            Upload documents and proof for your deals
          </p>
        </Link>

        <Link
          href="/portal/evidence"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <FileText className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">View Evidence</h3>
          <p className="mt-2 text-sm text-gray-600">
            Check status of your submitted documents
          </p>
        </Link>
      </div>
    </div>
  );
}
