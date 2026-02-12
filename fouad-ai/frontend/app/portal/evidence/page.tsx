import { FileText } from 'lucide-react';

export default function PortalEvidencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Evidence</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your submitted documents and their review status
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-12 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No evidence submitted yet</p>
          <p className="text-sm mt-2">
            Submit documents for your deals to track them here
          </p>
        </div>
      </div>
    </div>
  );
}
