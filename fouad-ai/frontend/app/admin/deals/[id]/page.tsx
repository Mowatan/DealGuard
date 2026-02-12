import { dealsApi, evidenceApi, custodyApi, blockchainApi } from '@/lib/api-client';
import Link from 'next/link';
import { ArrowLeft, Users, FileText, Shield, Wallet, Link as LinkIcon } from 'lucide-react';

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await dealsApi.getById(id);
  const auditTrail = await dealsApi.getAudit(id);

  // Fetch related data
  let evidence, custody, anchors;
  try {
    evidence = await evidenceApi.listByDeal(id);
    custody = await custodyApi.listByDeal(id);
    anchors = await blockchainApi.listByDeal(id);
  } catch (error) {
    evidence = { items: [] };
    custody = { records: [] };
    anchors = { anchors: [] };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/deals"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to deals
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
                : deal.status.includes('CANCELLED')
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {deal.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Deal Info Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Description
            </h2>
            <p className="text-sm text-gray-600">
              {deal.description || 'No description provided'}
            </p>
          </div>

          {/* Parties */}
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
                    <div className="text-sm font-medium text-gray-900">
                      {party.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {party.role} • {party.contactEmail}
                    </div>
                  </div>
                  {party.isOrganization && (
                    <span className="text-xs text-gray-500">Organization</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contract */}
          {deal.contracts?.[0] && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 mr-2 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Contract
                </h2>
              </div>
              <div className="space-y-3">
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

          {/* Evidence */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Evidence
                </h2>
              </div>
              <Link
                href={`/admin/evidence?dealId=${deal.id}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {evidence.items?.slice(0, 3).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.subject || 'Evidence submitted'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      item.reviewStatus === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : item.reviewStatus === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {item.reviewStatus || 'PENDING'}
                  </span>
                </div>
              ))}
              {evidence.items?.length === 0 && (
                <p className="text-sm text-gray-500">No evidence submitted</p>
              )}
            </div>
          </div>

          {/* Custody */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Custody Records
                </h2>
              </div>
              <Link
                href={`/admin/custody?dealId=${deal.id}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {custody.records?.slice(0, 3).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {record.amount} {record.currency}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.status?.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              ))}
              {custody.records?.length === 0 && (
                <p className="text-sm text-gray-500">No custody records</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Update Status
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Add Note
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Export Report
              </button>
            </div>
          </div>

          {/* Blockchain Anchors */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <LinkIcon className="w-5 h-5 mr-2 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">
                Blockchain
              </h2>
            </div>
            <div className="space-y-2">
              {anchors.anchors?.slice(0, 3).map((anchor: any) => (
                <div
                  key={anchor.id}
                  className="p-3 bg-gray-50 rounded-lg text-xs"
                >
                  <div className="font-medium text-gray-900">
                    {anchor.eventType?.replace(/_/g, ' ')}
                  </div>
                  <div className="text-gray-500 truncate">
                    {anchor.dataHash}
                  </div>
                  <div className="text-gray-400 mt-1">
                    {anchor.status || 'PENDING'}
                  </div>
                </div>
              ))}
              {anchors.anchors?.length === 0 && (
                <p className="text-sm text-gray-500">No blockchain anchors</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Activity Timeline
            </h2>
            <div className="space-y-4">
              {auditTrail?.events?.slice(0, 5).map((event: any) => (
                <div key={event.id} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-0 last:pb-0">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {event.action?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {(!auditTrail?.events || auditTrail.events.length === 0) && (
                <p className="text-sm text-gray-500">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
