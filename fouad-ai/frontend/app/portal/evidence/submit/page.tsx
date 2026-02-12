import { Upload } from 'lucide-react';

export default function SubmitEvidencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit Evidence</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload documents and proof for your deals
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Evidence Upload
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            File upload functionality coming soon
          </p>
          <p className="text-xs text-gray-500">
            For now, please email evidence to your deal's dedicated email address
          </p>
        </div>
      </div>
    </div>
  );
}
