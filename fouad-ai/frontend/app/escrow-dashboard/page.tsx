'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovalRequestList } from '@/components/approvals/ApprovalRequestList';
import { ApprovalStats } from '@/components/approvals/ApprovalStats';
import { Shield, ShieldCheck, Crown, AlertCircle } from 'lucide-react';

type UserRole = 'USER' | 'ESCROW_OFFICER' | 'SENIOR_ESCROW_OFFICER' | 'SUPER_ADMIN';

export default function EscrowDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole>('USER');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const role = (user.publicMetadata?.role as UserRole) || 'USER';
      setUserRole(role);

      // Only allow escrow officers, senior officers, and super admins
      const authorized = ['ESCROW_OFFICER', 'SENIOR_ESCROW_OFFICER', 'SUPER_ADMIN'].includes(role);
      setIsAuthorized(authorized);

      if (!authorized) {
        router.push('/portal');
      }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return <Crown className="h-6 w-6 text-yellow-600" />;
      case 'SENIOR_ESCROW_OFFICER':
        return <ShieldCheck className="h-6 w-6 text-blue-600" />;
      case 'ESCROW_OFFICER':
        return <Shield className="h-6 w-6 text-green-600" />;
      default:
        return null;
    }
  };

  const getRoleTitle = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return 'Super Admin Dashboard';
      case 'SENIOR_ESCROW_OFFICER':
        return 'Senior Escrow Officer Dashboard';
      case 'ESCROW_OFFICER':
        return 'Escrow Officer Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getRoleDescription = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return 'Level 3: Unlimited authority - Override any decision';
      case 'SENIOR_ESCROW_OFFICER':
        return 'Level 2: Approve deals up to $1M - Make final decisions';
      case 'ESCROW_OFFICER':
        return 'Level 1: Review and recommend - Prepare cases for senior review';
      default:
        return '';
    }
  };

  const getAuthorityBadge = () => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-yellow-600">Unlimited Authority</Badge>;
      case 'SENIOR_ESCROW_OFFICER':
        return <Badge className="bg-blue-600">Up to $1M Authority</Badge>;
      case 'ESCROW_OFFICER':
        return <Badge className="bg-green-600">Review Authority</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {getRoleIcon()}
          <h1 className="text-3xl font-bold">{getRoleTitle()}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-gray-600">{getRoleDescription()}</p>
          {getAuthorityBadge()}
        </div>
      </div>

      {/* Authority Limit Warning for Senior Officers */}
      {userRole === 'SENIOR_ESCROW_OFFICER' && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Authority Limit</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800">
              As a Senior Escrow Officer, you can approve deals up to <strong>$1,000,000</strong>.
              Deals exceeding this amount require Super Admin approval.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <ApprovalStats userRole={userRole} />

      {/* Main Content - Approval Requests */}
      <div className="mt-8">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-review">In Review</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <ApprovalRequestList
              userRole={userRole}
              status="PENDING"
            />
          </TabsContent>

          <TabsContent value="in-review" className="mt-6">
            <ApprovalRequestList
              userRole={userRole}
              status={['OFFICER_RECOMMENDED_APPROVE', 'OFFICER_RECOMMENDED_REJECT']}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <ApprovalRequestList
              userRole={userRole}
              status={['SENIOR_APPROVED', 'SENIOR_REJECTED', 'ADMIN_OVERRIDDEN']}
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <ApprovalRequestList
              userRole={userRole}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
