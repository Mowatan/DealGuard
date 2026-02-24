'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type UserRole = 'USER' | 'ESCROW_OFFICER' | 'SENIOR_ESCROW_OFFICER' | 'SUPER_ADMIN';

interface ApprovalStatsProps {
  userRole: UserRole;
}

interface Stats {
  pending: number;
  approvedToday: number;
  rejected: number;
  overridden: number;
}

export function ApprovalStats({ userRole }: ApprovalStatsProps) {
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approvedToday: 0,
    rejected: 0,
    overridden: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userRole]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/approvals/stats', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch approval stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    // Get Clerk token
    const { getToken } = await import('@clerk/nextjs');
    return await getToken();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Pending Review */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
          <p className="text-xs text-gray-500 mt-1">
            {userRole === 'ESCROW_OFFICER' && 'Assigned to you'}
            {userRole === 'SENIOR_ESCROW_OFFICER' && 'Awaiting your decision'}
            {userRole === 'SUPER_ADMIN' && 'Total pending'}
          </p>
        </CardContent>
      </Card>

      {/* Approved Today */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{stats.approvedToday}</div>
          <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
        </CardContent>
      </Card>

      {/* Rejected */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rejected
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <p className="text-xs text-gray-500 mt-1">Total declined</p>
        </CardContent>
      </Card>

      {/* Admin Overridden */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              Overridden
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">{stats.overridden}</div>
          <p className="text-xs text-gray-500 mt-1">Admin interventions</p>
        </CardContent>
      </Card>
    </div>
  );
}
