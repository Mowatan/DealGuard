import { dealsApi } from '@/lib/api-client';
import { StatCards } from '@/components/dashboard/stat-cards';
import { ActionButtons } from '@/components/dashboard/action-buttons';
import { RecentDeals } from '@/components/dashboard/recent-deals';

export const dynamic = 'force-dynamic';

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
  const recentDeals = deals.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back
        </h1>
        <ActionButtons />
      </div>
      <StatCards deals={deals} />
      <RecentDeals deals={recentDeals} />
    </div>
  );
}
