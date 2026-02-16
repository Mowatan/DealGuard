'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Package,
  Truck,
  Clock,
  Search,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Building2,
  Loader2,
  RefreshCw,
  MapPin,
} from 'lucide-react';

interface PendingDocument {
  id: string;
  documentType: string;
  description: string;
  deliveryMethod: string;
  courierService?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: string;
  authorizedReceiverName: string;
  status: string;
  createdAt: string;
  deal: {
    id: string;
    dealNumber: string;
    title: string;
  };
}

export default function PendingDeliveriesPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_DELIVERY' | 'IN_TRANSIT'>(
    'ALL'
  );

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/custody-documents/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        throw new Error('Failed to fetch pending documents');
      }
    } catch (error) {
      console.error('Failed to fetch pending documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending deliveries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchPendingDocuments(false);
  };

  const handleLogReceipt = (documentId: string) => {
    router.push(`/admin/custody-documents/${documentId}/receipt`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      PENDING_DELIVERY: { label: 'Pending Delivery', variant: 'outline' },
      IN_TRANSIT: { label: 'In Transit', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return (
      <Badge variant={config.variant} className="font-medium">
        {config.label}
      </Badge>
    );
  };

  const getDeliveryMethodIcon = (method: string) => {
    switch (method) {
      case 'COURIER':
        return <Truck className="w-4 h-4" />;
      case 'HAND_DELIVERY':
        return <Package className="w-4 h-4" />;
      case 'REGISTERED_MAIL':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const formatDeliveryMethod = (method: string) => {
    return method.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isOverdue = (expectedDate?: string) => {
    if (!expectedDate) return false;
    return new Date(expectedDate) < new Date();
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    // Status filter
    if (statusFilter !== 'ALL' && doc.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        doc.deal.dealNumber.toLowerCase().includes(search) ||
        doc.deal.title.toLowerCase().includes(search) ||
        doc.description.toLowerCase().includes(search) ||
        doc.trackingNumber?.toLowerCase().includes(search) ||
        doc.authorizedReceiverName.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const pendingCount = documents.filter((d) => d.status === 'PENDING_DELIVERY').length;
  const inTransitCount = documents.filter((d) => d.status === 'IN_TRANSIT').length;
  const overdueCount = documents.filter(
    (d) => d.expectedDeliveryDate && isOverdue(d.expectedDeliveryDate)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pending Deliveries</h1>
              <p className="text-slate-600 mt-1">Documents expected to arrive at the office</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Pending</p>
                <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Delivery</p>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Transit</p>
                <p className="text-2xl font-bold text-slate-900">{inTransitCount}</p>
              </div>
              <Truck className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by deal number, title, tracking number, or receiver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('ALL')}
              size="sm"
            >
              All ({documents.length})
            </Button>
            <Button
              variant={statusFilter === 'PENDING_DELIVERY' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('PENDING_DELIVERY')}
              size="sm"
            >
              Pending ({pendingCount})
            </Button>
            <Button
              variant={statusFilter === 'IN_TRANSIT' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('IN_TRANSIT')}
              size="sm"
            >
              In Transit ({inTransitCount})
            </Button>
          </div>
        </div>
      </Card>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No documents match your filters'
                : 'No pending deliveries'}
            </h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'All documents have been received or there are no active custody requests'}
            </p>
          </div>
        </Card>
      )}

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.map((doc) => {
          const overdue = isOverdue(doc.expectedDeliveryDate);

          return (
            <Card
              key={doc.id}
              className={`p-6 hover:shadow-md transition ${
                overdue ? 'border-2 border-red-200 bg-red-50' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Section - Document Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <h3 className="text-lg font-semibold text-slate-900">
                          {formatDocumentType(doc.documentType)}
                        </h3>
                        {getStatusBadge(doc.status)}
                        {overdue && (
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{doc.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700">
                        {doc.deal.dealNumber} - {doc.deal.title}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      {getDeliveryMethodIcon(doc.deliveryMethod)}
                      <span className="text-slate-600">Method:</span>
                      <span className="font-medium text-slate-900">
                        {formatDeliveryMethod(doc.deliveryMethod)}
                      </span>
                    </div>

                    {doc.courierService && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">Courier:</span>
                        <span className="font-medium text-slate-900">{doc.courierService}</span>
                      </div>
                    )}

                    {doc.trackingNumber && (
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">Tracking:</span>
                        <code className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">
                          {doc.trackingNumber}
                        </code>
                      </div>
                    )}

                    {doc.expectedDeliveryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">Expected:</span>
                        <span className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
                          {new Date(doc.expectedDeliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="flex items-center gap-2 text-amber-900">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        <strong>Authorized Receiver:</strong> {doc.authorizedReceiverName}
                      </span>
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Right Section - Action Button */}
                <div className="flex flex-col justify-center items-center lg:items-end gap-3 lg:min-w-[200px]">
                  <Button
                    onClick={() => handleLogReceipt(doc.id)}
                    size="lg"
                    className="w-full lg:w-auto"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Document Arrived
                  </Button>

                  <p className="text-xs text-slate-500 text-center lg:text-right">
                    Created {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      {documents.length > 0 && (
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Important Reminders:</p>
              <ul className="space-y-1 ml-4">
                <li>
                  • Verify the authorized receiver matches before accepting any document
                </li>
                <li>• Check document condition and refuse if damaged or tampered</li>
                <li>• Take photo of received document as evidence</li>
                <li>
                  • If wrong person attempts delivery, click "Document Arrived" then select
                  "Refuse Delivery"
                </li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
