'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, FileText, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

type UserRole = 'USER' | 'ESCROW_OFFICER' | 'SENIOR_ESCROW_OFFICER' | 'SUPER_ADMIN';
type ApprovalStatus =
  | 'PENDING'
  | 'OFFICER_RECOMMENDED_APPROVE'
  | 'OFFICER_RECOMMENDED_REJECT'
  | 'SENIOR_APPROVED'
  | 'SENIOR_REJECTED'
  | 'ADMIN_OVERRIDDEN'
  | 'WITHDRAWN';

interface ApprovalRequest {
  id: string;
  type: string;
  status: ApprovalStatus;
  reason: string;
  createdAt: string;
  deal: {
    id: string;
    dealNumber: string;
    title: string;
    totalAmount?: number;
    currency: string;
  };
  requestedByUser: {
    name: string;
    email: string;
  };
  officer?: {
    name: string;
  };
  officerRecommendation?: string;
}

interface ApprovalRequestListProps {
  userRole: UserRole;
  status?: ApprovalStatus | ApprovalStatus[];
}

export function ApprovalRequestList({ userRole, status }: ApprovalRequestListProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [status]);

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (status) {
        if (Array.isArray(status)) {
          status.forEach(s => params.append('status', s));
        } else {
          params.set('status', status);
        }
      }

      const response = await fetch(`/api/approvals?${params}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch approval requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    const { getToken } = await import('@clerk/nextjs');
    return await getToken();
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const statusConfig = {
      PENDING: { label: 'Pending', className: 'bg-orange-100 text-orange-800' },
      OFFICER_RECOMMENDED_APPROVE: { label: 'Recommended: Approve', className: 'bg-blue-100 text-blue-800' },
      OFFICER_RECOMMENDED_REJECT: { label: 'Recommended: Reject', className: 'bg-purple-100 text-purple-800' },
      SENIOR_APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      SENIOR_REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
      ADMIN_OVERRIDDEN: { label: 'Admin Override', className: 'bg-yellow-100 text-yellow-800' },
      WITHDRAWN: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getApprovalTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; color: string }> = {
      DEAL_ACTIVATION: { label: 'Deal Activation', color: 'bg-blue-500' },
      MILESTONE_APPROVAL: { label: 'Milestone', color: 'bg-purple-500' },
      FUND_RELEASE: { label: 'Fund Release', color: 'bg-green-500' },
      DISPUTE_RESOLUTION: { label: 'Dispute', color: 'bg-red-500' },
      CONTRACT_MODIFICATION: { label: 'Contract Change', color: 'bg-yellow-500' },
      PARTY_REMOVAL: { label: 'Party Removal', color: 'bg-orange-500' },
      DEAL_CANCELLATION: { label: 'Cancellation', color: 'bg-gray-500' },
    };

    const config = typeConfig[type] || { label: type, color: 'bg-gray-500' };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const formatAmount = (amount: number | undefined, currency: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/escrow-dashboard/approvals/${requestId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No approval requests</h3>
          <p className="text-gray-500">
            {status === 'PENDING' && 'No pending requests at this time.'}
            {Array.isArray(status) && status.includes('OFFICER_RECOMMENDED_APPROVE') && 'No requests awaiting your decision.'}
            {!status && 'No approval requests found.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Requests ({requests.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <div className="font-medium">{request.deal.dealNumber}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {request.deal.title}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getApprovalTypeBadge(request.type)}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      {formatAmount(request.deal.totalAmount, request.deal.currency)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm font-medium">{request.requestedByUser.name}</div>
                    <div className="text-xs text-gray-500">{request.requestedByUser.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {format(new Date(request.createdAt), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(request.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
