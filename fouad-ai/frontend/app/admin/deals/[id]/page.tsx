'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { dealsApi, evidenceApi, custodyApi, blockchainApi, contractsApi, ApiError } from '@/lib/api-client';
import Link from 'next/link';
import { ArrowLeft, Users, FileText, Shield, Wallet, Link as LinkIcon, Plus, Upload, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminDealDetailPage() {
  const params = useParams();
  const dealId = params.id as string;
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [deal, setDeal] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [custody, setCustody] = useState<any[]>([]);
  const [anchors, setAnchors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contract creation state
  const [showContractModal, setShowContractModal] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);
  const [contractTerms, setContractTerms] = useState('{}');
  const [milestones, setMilestones] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDealData();
    }
  }, [dealId, isLoaded, isSignedIn]);

  const fetchDealData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const [dealData, auditData] = await Promise.all([
        dealsApi.getById(dealId, token),
        dealsApi.getAudit(dealId, token),
      ]);

      setDeal(dealData);
      setAuditTrail(auditData);

      // Fetch related data
      try {
        const [evidenceData, custodyData, anchorsData] = await Promise.all([
          evidenceApi.listByDeal(dealId, undefined, token),
          custodyApi.listByDeal(dealId, token),
          blockchainApi.listByDeal(dealId, token),
        ]);
        setEvidence(evidenceData || []);
        setCustody(custodyData || []);
        setAnchors(anchorsData || []);
      } catch (err) {
        console.error('Failed to fetch related data:', err);
      }
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

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreatingContract(true);

    try {
      const token = await getToken();

      // Parse terms JSON
      let termsJson;
      try {
        termsJson = JSON.parse(contractTerms);
      } catch (err) {
        setError('Invalid JSON in contract terms');
        setCreatingContract(false);
        return;
      }

      // Create contract
      const newContract = await contractsApi.create({
        dealId: dealId,
        termsJson,
        milestones: milestones.map((m, idx) => ({
          title: m.title,
          description: m.description || undefined,
          order: idx + 1,
          conditionsJson: m.conditionsJson || {},
          releaseAmount: m.releaseAmount ? parseFloat(m.releaseAmount) : undefined,
          currency: m.currency || 'EGP',
        })),
      }, token);

      // Upload document if selected
      if (docFile && newContract.id) {
        setUploadingDoc(true);
        try {
          await contractsApi.uploadDocument(newContract.id, docFile, token);
        } catch (err) {
          console.error('Failed to upload document:', err);
        }
        setUploadingDoc(false);
      }

      // Close modal and refresh
      setShowContractModal(false);
      setContractTerms('{}');
      setMilestones([]);
      setDocFile(null);
      await fetchDealData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to create contract: ${err.message}`);
      } else {
        setError('Failed to create contract');
      }
      console.error(err);
    } finally {
      setCreatingContract(false);
      setUploadingDoc(false);
    }
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { title: '', description: '', releaseAmount: '', currency: 'EGP', conditionsJson: {} },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: string, value: any) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <p className="text-center text-gray-600">Loading authentication...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-6">
        <p className="text-center text-gray-600">Please sign in to view this page</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-center text-gray-600">Loading deal...</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="space-y-6">
        <p className="text-center text-gray-600">Deal not found</p>
      </div>
    );
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
          <div className="flex items-center gap-3">
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

            {/* Service Tier Badge */}
            {deal.serviceTier && (
              <span
                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-lg ${
                  deal.serviceTier === 'GOVERNANCE_ADVISORY'
                    ? 'bg-blue-100 text-blue-800'
                    : deal.serviceTier === 'DOCUMENT_CUSTODY'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {deal.serviceTier === 'GOVERNANCE_ADVISORY' && '🛡️ Tier 1'}
                {deal.serviceTier === 'DOCUMENT_CUSTODY' && '📦 Tier 2'}
                {deal.serviceTier === 'FINANCIAL_ESCROW' && '🔐 Tier 3'}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

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

          {/* Service Tier Info */}
          {deal.serviceTier && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Service Tier
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tier:</span>
                  <span className="font-medium text-gray-900">
                    {deal.serviceTier === 'GOVERNANCE_ADVISORY' && 'Governance & Advisory (Tier 1)'}
                    {deal.serviceTier === 'DOCUMENT_CUSTODY' && 'Document Custody (Tier 2)'}
                    {deal.serviceTier === 'FINANCIAL_ESCROW' && 'Financial Escrow (Tier 3)'}
                  </span>
                </div>
                {deal.estimatedValue && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Value:</span>
                    <span className="font-medium text-gray-900">
                      {parseFloat(deal.estimatedValue).toLocaleString()} {deal.currency || 'EGP'}
                    </span>
                  </div>
                )}
                {deal.serviceFee && (
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Service Fee:</span>
                    <span className="text-lg font-bold text-blue-700">
                      {parseFloat(deal.serviceFee).toLocaleString()} EGP
                    </span>
                  </div>
                )}
              </div>

              {/* Tier-specific sections */}
              {deal.serviceTier === 'DOCUMENT_CUSTODY' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Document Custody</h3>
                  <p className="text-sm text-gray-600">
                    Physical document storage and custody features will be available here
                  </p>
                </div>
              )}

              {deal.serviceTier === 'FINANCIAL_ESCROW' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Financial Escrow</h3>
                  <p className="text-sm text-gray-600">
                    Escrow account and disbursement controls will be available here
                  </p>
                </div>
              )}
            </div>
          )}

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
          {deal.contracts?.[0] ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Contract v{deal.contracts[0].version}
                  </h2>
                </div>
                {deal.contracts[0].isEffective && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Effective
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {deal.contracts[0].milestones?.map((milestone: any) => (
                  <div key={milestone.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">
                      {milestone.order}. {milestone.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {milestone.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">Contract</h2>
                </div>
                <button
                  onClick={() => setShowContractModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Contract
                </button>
              </div>
              <p className="text-sm text-gray-500">No contract created yet</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Evidence Items</span>
                <span className="text-sm font-medium">{evidence.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Custody Records</span>
                <span className="text-sm font-medium">{custody.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Blockchain Anchors</span>
                <span className="text-sm font-medium">{anchors.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Creation Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Create Contract</h2>
              <button
                onClick={() => setShowContractModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-6">
              {/* Contract Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Terms (JSON)
                </label>
                <textarea
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                  placeholder='{"description": "Standard escrow terms", ...}'
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Milestones
                  </label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Milestone
                  </button>
                </div>
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Milestone {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Milestone title"
                            value={milestone.title}
                            onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <textarea
                            placeholder="Description (optional)"
                            value={milestone.description}
                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Release amount"
                            value={milestone.releaseAmount}
                            onChange={(e) => updateMilestone(index, 'releaseAmount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <select
                            value={milestone.currency}
                            onChange={(e) => updateMilestone(index, 'currency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="EGP">EGP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {milestones.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No milestones added. Click "Add Milestone" to create one.
                    </p>
                  )}
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Document (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {docFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {docFile.name}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={creatingContract || uploadingDoc}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {creatingContract || uploadingDoc ? 'Creating...' : 'Create Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  disabled={creatingContract || uploadingDoc}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
