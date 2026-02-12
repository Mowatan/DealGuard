import { dealsApi } from '@/lib/api-client';
import Link from 'next/link';
import { ArrowLeft, Users, FileText, Clock } from 'lucide-react';

export default async function PortalDealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await dealsApi.getById(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to my deals
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{deal.title}</h1>
            <p className="mt-2 text-sm text-gray-600">{deal.dealNumber}</p>
          </div>
          <span
            className={`inline-flex px-4 py-2 text-sm font-semibold rounded-lg ${
              deal.status.includes('CONFIRMED') || deal.status === 'CLOSED'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {deal.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-sm text-gray-600">{deal.description || 'No description provided'}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 mr-2 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Parties</h2>
            </div>
            <div className="space-y-3">
              {deal.parties?.map((party: any) => (
                <div
                  key={party.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{party.name}</div>
                    <div className="text-xs text-gray-500">
                      {party.role} • {party.contactEmail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {deal.contracts?.[0] && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 mr-2 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Contract</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-medium">{deal.contracts[0].version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">
                    {deal.contracts[0].status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Milestones:</span>
                  <span className="font-medium">
                    {deal.contracts[0].milestones?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/portal/evidence/submit?dealId=${deal.id}`}
                className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Submit Evidence
              </Link>
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                View Contract
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  Need Help?
                </h3>
                <p className="mt-1 text-xs text-blue-800">
                  Contact support if you have questions about this deal or need assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
