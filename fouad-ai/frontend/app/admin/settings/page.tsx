import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your account and system preferences
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-12 text-center text-gray-500">
          <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Settings page coming soon</p>
        </div>
      </div>
    </div>
  );
}
