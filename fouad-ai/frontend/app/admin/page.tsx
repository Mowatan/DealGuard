import { dealsApi } from '@/lib/api-client';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

async function getDashboardData() {
  try {
    const deals = await dealsApi.list({ limit: 100 });
    return deals;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return { deals: [] };
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardData();
  const deals = data.deals || [];

  // Calculate statistics
  const totalDeals = deals.length;
  const activeDeals = deals.filter((d: any) =>
    ['IN_VERIFICATION', 'FUNDED_VERIFIED', 'SIGNED_RECORDED'].includes(d.status)
  ).length;
  const completedDeals = deals.filter((d: any) =>
    ['CLOSED', 'RELEASE_CONFIRMED', 'RETURN_CONFIRMED'].includes(d.status)
  ).length;
  const pendingDeals = deals.filter((d: any) =>
    ['DRAFT', 'PROPOSED', 'ACCEPTED_BY_ALL'].includes(d.status)
  ).length;

  const stats = [
    {
      name: 'Total Deals',
      value: totalDeals,
      icon: FileText,
      color: 'blue',
    },
    {
      name: 'Active Deals',
      value: activeDeals,
      icon: Clock,
      color: 'yellow',
    },
    {
      name: 'Completed',
      value: completedDeals,
      icon: CheckCircle,
      color: 'green',
    },
    {
      name: 'Pending Review',
      value: pendingDeals,
      icon: AlertCircle,
      color: 'red',
    },
  ];

  const recentDeals = deals.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of all deals and pending actions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.name}
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg bg-${stat.color}-100`}
              >
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Deals */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Deals
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentDeals.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No deals found
            </div>
          ) : (
            recentDeals.map((deal: any) => (
              <Link
                key={deal.id}
                href={`/admin/deals/${deal.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {deal.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {deal.dealNumber}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        deal.status.includes('COMPLETED') || deal.status.includes('CONFIRMED')
                          ? 'bg-green-100 text-green-800'
                          : deal.status.includes('PENDING') || deal.status.includes('DRAFT')
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {deal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        {recentDeals.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Link
              href="/admin/deals"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all deals →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Link
          href="/admin/deals?status=PENDING"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-sm font-medium text-gray-900">
            Pending Review
          </h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {pendingDeals}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Deals awaiting approval
          </p>
        </Link>

        <Link
          href="/admin/evidence"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-sm font-medium text-gray-900">
            Evidence Review
          </h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">-</p>
          <p className="mt-1 text-sm text-gray-500">
            New evidence submitted
          </p>
        </Link>

        <Link
          href="/admin/custody"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-sm font-medium text-gray-900">
            Custody Actions
          </h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">-</p>
          <p className="mt-1 text-sm text-gray-500">
            Awaiting verification
          </p>
        </Link>
      </div>
    </div>
  );
}
