const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to get token - works in both client and server components
async function getAuthToken(): Promise<string | null> {
  // For client components, use window.__clerk
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore - Clerk's global instance
      const clerk = window.Clerk;
      if (clerk?.session) {
        return await clerk.session.getToken();
      }
    } catch (error) {
      console.error('Failed to get client auth token:', error);
    }
    return null;
  }

  // For server components, import dynamically
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { getToken } = await auth();
    return await getToken();
  } catch (error) {
    console.error('Failed to get server auth token:', error);
    return null;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.message || `HTTP ${response.status}`,
      response.status,
      error
    );
  }

  return response.json();
}

// Deals API
export const dealsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi<any>(`/api/deals${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => fetchApi<any>(`/api/deals/${id}`),

  create: (data: any) =>
    fetchApi<any>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    fetchApi<any>(`/api/deals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getAudit: (id: string) => fetchApi<any>(`/api/deals/${id}/audit`),
};

// Evidence API
export const evidenceApi = {
  listByDeal: (dealId: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<any>(`/api/evidence/deal/${dealId}${query}`);
  },

  getById: (id: string) => fetchApi<any>(`/api/evidence/${id}`),

  review: (id: string, data: { status: string; reviewNotes?: string }) =>
    fetchApi<any>(`/api/evidence/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  requestMapping: (id: string) =>
    fetchApi<any>(`/api/evidence/${id}/suggest-mapping`, {
      method: 'POST',
    }),
};

// Custody API
export const custodyApi = {
  listByDeal: (dealId: string) =>
    fetchApi<any>(`/api/custody/deal/${dealId}`),

  verify: (id: string) =>
    fetchApi<any>(`/api/custody/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  authorize: (id: string, action: 'RELEASE' | 'RETURN') =>
    fetchApi<any>(`/api/custody/${id}/authorize`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
};

// Contracts API
export const contractsApi = {
  getById: (id: string) => fetchApi<any>(`/api/contracts/${id}`),

  getAcceptanceStatus: (id: string) =>
    fetchApi<any>(`/api/contracts/${id}/acceptance-status`),
};

// Blockchain API
export const blockchainApi = {
  listByDeal: (dealId: string) =>
    fetchApi<any>(`/api/blockchain/deal/${dealId}`),

  getById: (id: string) => fetchApi<any>(`/api/blockchain/${id}`),

  verify: (id: string) => fetchApi<any>(`/api/blockchain/${id}/verify`),
};

// Users API
export const usersApi = {
  me: () => fetchApi<any>('/api/users/me'),
};

// Milestones API (Phase 2)
export const milestonesApi = {
  getById: (id: string) => fetchApi<any>(`/api/milestones/${id}`),

  listByContract: (contractId: string) =>
    fetchApi<any>(`/api/milestones/contract/${contractId}`),

  submitApproval: (id: string, data: { partyId?: string; notes?: string }) =>
    fetchApi<any>(`/api/milestones/${id}/approvals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listApprovals: (id: string) =>
    fetchApi<any>(`/api/milestones/${id}/approvals`),

  setRequirements: (
    id: string,
    data: {
      requireAdminApproval?: boolean;
      requireBuyerApproval?: boolean;
      requireSellerApproval?: boolean;
    }
  ) =>
    fetchApi<any>(`/api/milestones/${id}/requirements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  evaluateReadiness: (id: string) =>
    fetchApi<any>(`/api/milestones/${id}/evaluate-readiness`, {
      method: 'POST',
    }),
};

// KYC API (Phase 2)
export const kycApi = {
  getStatus: (partyId: string) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}`),

  listPending: () => fetchApi<any>('/api/kyc/pending'),

  uploadDocument: async (partyId: string, file: File) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/kyc/parties/${partyId}/documents`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error
      );
    }

    return response.json();
  },

  submitForVerification: (partyId: string) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/submit`, {
      method: 'POST',
    }),

  verify: (partyId: string, notes?: string) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  reject: (partyId: string, rejectionReason: string) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    }),

  getDocumentsPresigned: (partyId: string) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/documents`),
};

// Disputes API (Phase 2)
export const disputesApi = {
  create: (data: {
    dealId: string;
    milestoneId?: string;
    issueType: string;
    narrative: string;
  }) =>
    fetchApi<any>('/api/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getById: (id: string) => fetchApi<any>(`/api/disputes/${id}`),

  listByDeal: (dealId: string) =>
    fetchApi<any>(`/api/disputes/deal/${dealId}`),

  listOpen: () => fetchApi<any>('/api/disputes/open'),

  addMediation: (id: string, note: string) =>
    fetchApi<any>(`/api/disputes/${id}/mediation`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  resolve: (id: string, resolutionNotes: string) =>
    fetchApi<any>(`/api/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
    }),
};

// Quarantine API (Phase 2)
export const quarantineApi = {
  listQuarantined: () => fetchApi<any>('/api/evidence/quarantined'),

  release: (evidenceId: string, releaseNotes?: string) =>
    fetchApi<any>(`/api/evidence/${evidenceId}/release`, {
      method: 'POST',
      body: JSON.stringify({ releaseNotes }),
    }),
};
