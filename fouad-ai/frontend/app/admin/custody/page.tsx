import { Wallet, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function CustodyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Custody Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Verify funding and authorize releases
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Verification</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Awaiting Authorization</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Wallet className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total in Custody</p>
              <p className="text-2xl font-semibold text-gray-900">0 EGP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custody Records */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-12 text-center text-gray-500">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No custody records found</p>
          <p className="text-sm mt-2">Funding records will appear here when parties submit proof</p>
        </div>
      </div>
    </div>
  );
}
