'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { dealsApi, evidenceApi, ApiError } from '@/lib/api-client';
import { Upload, FileText } from 'lucide-react';

interface Deal {
  id: string;
  dealNumber: string;
  title: string;
  contracts?: Array<{
    id: string;
    milestones: Array<{
      id: string;
      name: string;
      order: number;
    }>;
  }>;
}

export default function SubmitEvidencePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [milestones, setMilestones] = useState<any[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDeals();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (selectedDealId) {
      const deal = deals.find((d) => d.id === selectedDealId);
      if (deal && deal.contracts && deal.contracts.length > 0) {
        const allMilestones = deal.contracts.flatMap((c) => c.milestones || []);
        setMilestones(allMilestones.sort((a, b) => a.order - b.order));
      } else {
        setMilestones([]);
      }
      setSelectedMilestoneId('');
    }
  }, [selectedDealId, deals]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await dealsApi.list({ limit: 100, token });
      setDeals(data.deals || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load deals');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!selectedDealId) {
      setError('Please select a deal');
      return;
    }

    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      await evidenceApi.create({
        dealId: selectedDealId,
        milestoneId: selectedMilestoneId || undefined,
        subject: subject || undefined,
        description: description || undefined,
        files,
        token,
      });

      setSuccess(true);
      // Reset form
      setSelectedDealId('');
      setSelectedMilestoneId('');
      setSubject('');
      setDescription('');
      setFiles([]);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/portal/evidence');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit evidence');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submit Evidence</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload documents and proof for your deals
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit Evidence</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload documents and proof for your deals
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          Evidence submitted successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="space-y-6">
          {/* Deal Selection */}
          <div>
            <label htmlFor="deal" className="block text-sm font-medium text-gray-700 mb-2">
              Select Deal <span className="text-red-500">*</span>
            </label>
            <select
              id="deal"
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={submitting}
            >
              <option value="">-- Select a deal --</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title} ({deal.dealNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Milestone Selection (Optional) */}
          {milestones.length > 0 && (
            <div>
              <label htmlFor="milestone" className="block text-sm font-medium text-gray-700 mb-2">
                Link to Milestone (Optional)
              </label>
              <select
                id="milestone"
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">-- No specific milestone --</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    Milestone {milestone.order}: {milestone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Proof of Payment, Contract Signature"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about this evidence..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>

          {/* File Upload */}
          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Files <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <input
                type="file"
                id="file-input"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={submitting}
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Choose Files
              </label>
              <p className="text-sm text-gray-500 mt-2">
                or drag and drop files here
              </p>
              {files.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected files:</p>
                  <ul className="space-y-1">
                    {files.map((file, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <FileText className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !selectedDealId || files.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Evidence'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/portal/evidence')}
              disabled={submitting}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
