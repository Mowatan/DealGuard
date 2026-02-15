'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { dealsApi, milestonesApi, usersApi, ApiError, apiClient } from '@/lib/api-client';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileEdit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProposeAmendmentModal } from '@/components/deals/amendments/ProposeAmendmentModal';
import { PendingAmendments } from '@/components/deals/amendments/PendingAmendments';
import { AmendmentHistory } from '@/components/deals/amendments/AmendmentHistory';
import { DeleteDealButton } from '@/components/deals/amendments/DeleteDealButton';
import { ProgressTracker } from '@/components/deals/ProgressTracker';

interface Deal {
  id: string;
  dealNumber: string;
  title: string;
  description: string;
  status: string;
  emailAddress: string;
  assetType?: string;
  jurisdiction?: string;
  totalAmount?: number;
  currency?: string;
  parties: Array<{
    id: string;
    role: string;
    name: string;
    contactEmail: string;
    kycStatus?: string;
  }>;
  contracts: Array<{
    id: string;
    version: number;
    isEffective: boolean;
    milestones: Array<{
      id: string;
      name: string;
      order: number;
      status: string;
      payoutAmount?: number;
      currency?: string;
      conditionText?: string;
      approvalRequirement?: {
        requireAdminApproval: boolean;
        requireBuyerApproval: boolean;
        requireSellerApproval: boolean;
      };
      _count?: {
        approvals: number;
      };
    }>;
  }>;
  evidenceItems: Array<{
    id: string;
    subject: string;
    createdAt: string;
    status: string;
    sourceType?: string;
    milestoneId?: string;
  }>;
  custodyRecords: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
  }>;
  disputes?: Array<{
    id: string;
    issueType: string;
    status: string;
    createdAt: string;
  }>;
  amendments?: Array<{
    id: string;
    proposedBy: string;
    proposedByName: string;
    status: string;
    proposedChanges: any;
    createdAt: string;
    updatedAt: string;
    responses: Array<{
      id: string;
      partyId: string;
      party: {
        name: string;
        role: string;
      };
      responseType: string;
      notes?: string;
      respondedAt: string;
    }>;
    adminResolution?: {
      resolutionType: string;
      notes: string;
      resolvedAt: string;
      resolvedBy: string;
    };
  }>;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [approvingMilestone, setApprovingMilestone] = useState<string | null>(null);
  const [proposeAmendmentModalOpen, setProposeAmendmentModalOpen] = useState(false);
  const [amendments, setAmendments] = useState<any[]>([]);
  const [loadingAmendments, setLoadingAmendments] = useState(false);

  // Check authentication
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      console.warn('⚠️ User not signed in, redirecting to /sign-in');
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDeal();
      fetchCurrentUser();
      fetchAmendments();
    }
  }, [dealId, isLoaded, isSignedIn]);

  const fetchCurrentUser = async () => {
    try {
      const token = await getToken();
      const user = await usersApi.me(token);
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchDeal = async () => {
    try {
      const token = await getToken();
      const data = await dealsApi.getById(dealId, token);
      setDeal(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load deal');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAmendments = async () => {
    try {
      setLoadingAmendments(true);
      const token = await getToken();
      const response = await apiClient.get(`/api/deals/${dealId}/amendments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAmendments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch amendments:', err);
      // Don't show error toast, amendments are optional
    } finally {
      setLoadingAmendments(false);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    if (!currentUser || !deal) return;

    // Find partyId for current user
    const userParty = deal.parties.find(
      (p) => p.contactEmail === currentUser.email
    );

    if (!userParty) {
      setError('You are not a party to this deal');
      return;
    }

    const notes = prompt('Enter approval notes (optional):');
    if (notes === null) return; // User cancelled

    setApprovingMilestone(milestoneId);
    try {
      const token = await getToken();
      await milestonesApi.submitApproval(milestoneId, {
        partyId: userParty.id,
        notes: notes || undefined,
      }, token);

      // Refresh deal to show updated approval status
      await fetchDeal();
      setError(''); // Clear any previous errors
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to approve milestone: ${err.message}`);
      } else {
        setError('Failed to approve milestone');
      }
      console.error(err);
    } finally {
      setApprovingMilestone(null);
    }
  };

  const canApproveMilestone = (milestone: any): boolean => {
    if (!currentUser || !deal) return false;
    if (milestone.status !== 'READY_FOR_REVIEW') return false;

    // Find current user's party
    const userParty = deal.parties.find(
      (p) => p.contactEmail === currentUser.email
    );

    if (!userParty) return false;

    // Check if user's role is required for approval
    const req = milestone.approvalRequirement;
    if (!req) return false;

    if (req.requireAdminApproval && currentUser.role === 'ADMIN') return true;
    if (req.requireBuyerApproval && userParty.role === 'BUYER') return true;
    if (req.requireSellerApproval && userParty.role === 'SELLER') return true;

    return false;
  };

  const getKycStatusColor = (status?: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    if (status === 'APPROVED') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (status === 'READY_FOR_REVIEW') {
      return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
    if (status === 'DISPUTED') {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-center text-slate-600">
          {!isLoaded ? 'Checking authentication...' : 'Loading deal...'}
        </p>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="container mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error || 'Deal not found'}
          </div>
          <Link href="/deals" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to deals
          </Link>
        </div>
      </div>
    );
  }

  const contract = deal.contracts.find((c) => c.isEffective) || deal.contracts[0];
  const hasDisputes = deal.disputes && deal.disputes.length > 0;
  const quarantinedEvidence = deal.evidenceItems.filter(e => e.status === 'QUARANTINED');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/deals" className="text-sm text-blue-600 hover:underline mb-2 block">
            ← Back to deals
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
          <div className="flex gap-4 items-center mt-2 text-sm text-slate-600">
            <span>{deal.dealNumber}</span>
            <span className="px-2 py-1 bg-slate-100 rounded">
              {deal.status.replace(/_/g, ' ')}
            </span>
            {hasDisputes && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {deal.disputes!.length} Dispute{deal.disputes!.length > 1 ? 's' : ''}
              </span>
            )}
            {quarantinedEvidence.length > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {quarantinedEvidence.length} Quarantined
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          {['progress', 'overview', 'contract', 'evidence', 'custody', 'amendments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'progress' && (
          <div>
            <ProgressTracker dealId={deal.id} />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Deal Information
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-slate-500">Deal Email</dt>
                  <dd className="font-mono text-sm">{deal.emailAddress}</dd>
                </div>
                {deal.assetType && (
                  <div>
                    <dt className="text-sm text-slate-500">Asset Type</dt>
                    <dd className="text-sm">{deal.assetType}</dd>
                  </div>
                )}
                {deal.jurisdiction && (
                  <div>
                    <dt className="text-sm text-slate-500">Jurisdiction</dt>
                    <dd className="text-sm">{deal.jurisdiction}</dd>
                  </div>
                )}
                {deal.totalAmount && (
                  <div>
                    <dt className="text-sm text-slate-500">Total Amount</dt>
                    <dd className="text-sm font-semibold">
                      {deal.totalAmount.toLocaleString()} {deal.currency || 'USD'}
                    </dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-sm text-slate-500">Description</dt>
                  <dd className="text-sm">{deal.description || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Parties ({deal.parties.length})
              </h2>
              <div className="space-y-3">
                {deal.parties.map((party) => (
                  <div key={party.id} className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-medium">{party.name}</div>
                      <div className="text-sm text-slate-500">{party.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">{party.contactEmail}</div>
                      {party.kycStatus && (
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${getKycStatusColor(party.kycStatus)}`}>
                          KYC: {party.kycStatus}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hasDisputes && (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Active Disputes
                </h2>
                <div className="space-y-3">
                  {deal.disputes!.map((dispute) => (
                    <div key={dispute.id} className="border border-red-100 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-red-900">{dispute.issueType}</div>
                          <div className="text-sm text-red-700 mt-1">
                            Status: {dispute.status} • {new Date(dispute.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contract' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              Contract {contract ? `v${contract.version}` : ''}
              {contract?.isEffective && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Effective
                </span>
              )}
            </h2>
            {contract && contract.milestones.length > 0 ? (
              <div className="space-y-4">
                {contract.milestones
                  .sort((a, b) => a.order - b.order)
                  .map((milestone) => (
                    <div
                      key={milestone.id}
                      className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          {getMilestoneStatusIcon(milestone.status)}
                          <div>
                            <div className="font-medium text-slate-900">
                              {milestone.order}. {milestone.name}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              Status: {milestone.status.replace(/_/g, ' ')}
                            </div>
                            {milestone.conditionText && (
                              <div className="text-sm text-slate-500 mt-2">
                                {milestone.conditionText}
                              </div>
                            )}
                          </div>
                        </div>
                        {milestone.payoutAmount && (
                          <div className="text-right">
                            <div className="font-semibold text-slate-900">
                              {milestone.payoutAmount.toLocaleString()} {milestone.currency || deal.currency || 'USD'}
                            </div>
                            <div className="text-xs text-slate-500">Payout Amount</div>
                          </div>
                        )}
                      </div>

                      {/* Approval Requirements & Status */}
                      {milestone.approvalRequirement && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                                <span className="text-slate-600">
                                  Approvals Required:
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {milestone.approvalRequirement.requireAdminApproval && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    Admin
                                  </span>
                                )}
                                {milestone.approvalRequirement.requireBuyerApproval && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    Buyer
                                  </span>
                                )}
                                {milestone.approvalRequirement.requireSellerApproval && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    Seller
                                  </span>
                                )}
                              </div>
                              {milestone._count && (
                                <span className="text-slate-600">
                                  ({milestone._count.approvals} approval{milestone._count.approvals !== 1 ? 's' : ''} submitted)
                                </span>
                              )}
                            </div>
                            {canApproveMilestone(milestone) && (
                              <button
                                onClick={() => handleApproveMilestone(milestone.id)}
                                disabled={approvingMilestone === milestone.id}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {approvingMilestone === milestone.id ? 'Approving...' : 'Approve Milestone'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-slate-500">No contract or milestones defined yet</p>
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              Evidence ({deal.evidenceItems.length})
            </h2>
            {deal.evidenceItems.length > 0 ? (
              <div className="space-y-3">
                {deal.evidenceItems.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${
                      item.status === 'QUARANTINED'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.subject || 'Untitled'}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                        {item.sourceType && (
                          <div className="text-xs text-slate-500 mt-1">
                            Source: {item.sourceType}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            item.status === 'QUARANTINED'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.status === 'ACCEPTED' || item.status === 'MAPPED_TO_MILESTONE'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        {item.milestoneId && (
                          <div className="text-xs text-slate-500 mt-1">
                            Linked to milestone
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No evidence submitted yet</p>
            )}
          </div>
        )}

        {activeTab === 'custody' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              Custody Records ({deal.custodyRecords.length})
            </h2>
            {deal.custodyRecords.length > 0 ? (
              <div className="space-y-3">
                {deal.custodyRecords.map((record) => (
                  <div key={record.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">
                          {record.amount.toLocaleString()} {record.currency}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {record.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No custody records yet</p>
            )}
          </div>
        )}

        {activeTab === 'amendments' && (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3 justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileEdit className="w-6 h-6" />
                Deal Amendments
              </h2>
              <div className="flex gap-3">
                <Button
                  onClick={() => setProposeAmendmentModalOpen(true)}
                  className="gap-2"
                >
                  <FileEdit className="w-4 h-4" />
                  Propose Amendment
                </Button>
                <DeleteDealButton
                  dealId={dealId}
                  dealNumber={deal.dealNumber}
                  dealStatus={deal.status}
                  hasCustodyItems={deal.custodyRecords.length > 0}
                  hasEscrowFunds={deal.custodyRecords.some(r => r.status === 'HELD')}
                  activeMilestonesCount={
                    contract?.milestones.filter(m =>
                      m.status !== 'APPROVED' && m.status !== 'COMPLETED'
                    ).length || 0
                  }
                  onSuccess={fetchDeal}
                />
              </div>
            </div>

            {/* Pending Amendments */}
            {amendments.filter(a => a.status === 'PENDING' || a.status === 'DISPUTED').length > 0 && (
              <PendingAmendments
                dealId={dealId}
                amendments={amendments.filter(a => a.status === 'PENDING' || a.status === 'DISPUTED')}
                parties={deal.parties}
                currentUserId={currentUser?.id}
                currentUserPartyId={
                  deal.parties.find(p => p.contactEmail === currentUser?.email)?.id
                }
                onRefresh={() => {
                  fetchAmendments();
                  fetchDeal();
                }}
              />
            )}

            {/* Amendment History */}
            <AmendmentHistory amendments={amendments} />
          </div>
        )}
      </div>

      {/* Propose Amendment Modal */}
      <ProposeAmendmentModal
        dealId={dealId}
        open={proposeAmendmentModalOpen}
        onOpenChange={setProposeAmendmentModalOpen}
        onSuccess={() => {
          fetchAmendments();
          fetchDeal();
        }}
      />
    </div>
  );
}
