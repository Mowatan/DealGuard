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

// Helper to get token - for server components only
// Client components should pass token directly from useAuth() hook
async function getAuthToken(providedToken?: string | null): Promise<string | null> {
  // If token is provided (from client component), use it
  if (providedToken !== undefined) {
    return providedToken;
  }

  // For server components, import dynamically
  if (typeof window === 'undefined') {
    try {
      console.log('🔐 [AUTH] Attempting to get server auth token...');
      const { auth } = await import('@clerk/nextjs/server');
      const { getToken } = await auth();
      const token = await getToken();
      console.log('🔐 [AUTH] Server token obtained:', !!token);
      return token;
    } catch (error) {
      console.error('❌ [AUTH] Failed to get server auth token:', error);
      return null;
    }
  }

  // Client-side without provided token
  console.error('❌ [AUTH] Client component must provide token from useAuth() hook');
  return null;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token: providedToken, ...fetchOptions } = options;
  const token = await getAuthToken(providedToken);

  // Check if we need authentication for this endpoint
  const requiresAuth = !endpoint.includes('/api/webhooks');

  if (requiresAuth && !token) {
    console.error('❌ [API] No authentication token available');
    throw new ApiError(
      'Authentication required. Please sign in to continue.',
      401,
      { authRequired: true }
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`📡 [API] ${options.method || 'GET'} ${endpoint}`, {
    hasToken: !!token,
    headers: Object.keys(headers),
  });

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  console.log(`📡 [API] Response: ${response.status} ${response.statusText}`);

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
  list: (params?: { status?: string; page?: number; limit?: number; token?: string | null }) => {
    const { token, ...queryParams } = params || {};
    const query = new URLSearchParams(queryParams as any).toString();
    return fetchApi<any>(`/api/deals${query ? `?${query}` : ''}`, { token });
  },

  getById: (id: string, token?: string | null) => fetchApi<any>(`/api/deals/${id}`, { token }),

  create: (data: any, token?: string | null) =>
    fetchApi<any>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  updateStatus: (id: string, status: string, token?: string | null) =>
    fetchApi<any>(`/api/deals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      token,
    }),

  getAudit: (id: string, token?: string | null) => fetchApi<any>(`/api/deals/${id}/audit`, { token }),
};

// Evidence API
export const evidenceApi = {
  listByDeal: (dealId: string, status?: string, token?: string | null) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<any>(`/api/evidence/deal/${dealId}${query}`, { token });
  },

  getById: (id: string, token?: string | null) => fetchApi<any>(`/api/evidence/${id}`, { token }),

  create: async (data: {
    dealId: string;
    milestoneId?: string;
    subject?: string;
    description?: string;
    files?: File[];
    token?: string | null;
  }) => {
    const { token, ...formFields } = data;
    const authToken = await getAuthToken(token);
    const formData = new FormData();

    // Add metadata fields
    formData.append('dealId', formFields.dealId);
    if (formFields.milestoneId) formData.append('milestoneId', formFields.milestoneId);
    if (formFields.subject) formData.append('subject', formFields.subject);
    if (formFields.description) formData.append('description', formFields.description);
    formData.append('sourceType', 'UPLOAD');

    // Add files
    if (formFields.files && formFields.files.length > 0) {
      formFields.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/evidence`,
      {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
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

  review: (id: string, data: { status: string; reviewNotes?: string }, token?: string | null) =>
    fetchApi<any>(`/api/evidence/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  requestMapping: (id: string, token?: string | null) =>
    fetchApi<any>(`/api/evidence/${id}/suggest-mapping`, {
      method: 'POST',
      token,
    }),
};

// Custody API
export const custodyApi = {
  listByDeal: (dealId: string, token?: string | null) =>
    fetchApi<any>(`/api/custody/deal/${dealId}`, { token }),

  verify: (id: string, token?: string | null) =>
    fetchApi<any>(`/api/custody/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({}),
      token,
    }),

  authorize: (id: string, action: 'RELEASE' | 'RETURN', token?: string | null) =>
    fetchApi<any>(`/api/custody/${id}/authorize`, {
      method: 'POST',
      body: JSON.stringify({ action }),
      token,
    }),
};

// Contracts API
export const contractsApi = {
  getById: (id: string, token?: string | null) => fetchApi<any>(`/api/contracts/${id}`, { token }),

  create: (data: {
    dealId: string;
    termsJson: Record<string, any>;
    milestones?: Array<{
      title: string;
      description?: string;
      order: number;
      conditionsJson?: Record<string, any>;
      evidenceChecklistJson?: Record<string, any>;
      releaseAmount?: number;
      returnAmount?: number;
      currency?: string;
      deadline?: string;
      gracePeriodDays?: number;
    }>;
  }, token?: string | null) =>
    fetchApi<any>('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  uploadDocument: async (contractId: string, file: File, token?: string | null) => {
    const authToken = await getAuthToken(token);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/contracts/${contractId}/document`,
      {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
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

  accept: (contractId: string, partyId: string, token?: string | null) =>
    fetchApi<any>(`/api/contracts/${contractId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ partyId }),
      token,
    }),

  getAcceptanceStatus: (id: string, token?: string | null) =>
    fetchApi<any>(`/api/contracts/${id}/acceptance-status`, { token }),
};

// Blockchain API
export const blockchainApi = {
  listByDeal: (dealId: string, token?: string | null) =>
    fetchApi<any>(`/api/blockchain/deal/${dealId}`, { token }),

  getById: (id: string, token?: string | null) => fetchApi<any>(`/api/blockchain/${id}`, { token }),

  verify: (id: string, token?: string | null) => fetchApi<any>(`/api/blockchain/${id}/verify`, { token }),
};

// Users API
export const usersApi = {
  me: (token?: string | null) => fetchApi<any>('/api/users/me', { token }),
};

// Milestones API (Phase 2)
export const milestonesApi = {
  getById: (id: string, token?: string | null) => fetchApi<any>(`/api/milestones/${id}`, { token }),

  listByContract: (contractId: string, token?: string | null) =>
    fetchApi<any>(`/api/milestones/contract/${contractId}`, { token }),

  submitApproval: (id: string, data: { partyId?: string; notes?: string }, token?: string | null) =>
    fetchApi<any>(`/api/milestones/${id}/approvals`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  listApprovals: (id: string, token?: string | null) =>
    fetchApi<any>(`/api/milestones/${id}/approvals`, { token }),

  setRequirements: (
    id: string,
    data: {
      requireAdminApproval?: boolean;
      requireBuyerApproval?: boolean;
      requireSellerApproval?: boolean;
    },
    token?: string | null
  ) =>
    fetchApi<any>(`/api/milestones/${id}/requirements`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  evaluateReadiness: (id: string, token?: string | null) =>
    fetchApi<any>(`/api/milestones/${id}/evaluate-readiness`, {
      method: 'POST',
      token,
    }),
};

// KYC API (Phase 2)
export const kycApi = {
  getStatus: (partyId: string, token?: string | null) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}`, { token }),

  listPending: (token?: string | null) => fetchApi<any>('/api/kyc/pending', { token }),

  uploadDocument: async (partyId: string, file: File, token?: string | null) => {
    const authToken = await getAuthToken(token);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/kyc/parties/${partyId}/documents`,
      {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
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

  submitForVerification: (partyId: string, token?: string | null) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/submit`, {
      method: 'POST',
      token,
    }),

  verify: (partyId: string, notes?: string, token?: string | null) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
      token,
    }),

  reject: (partyId: string, rejectionReason: string, token?: string | null) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
      token,
    }),

  getDocumentsPresigned: (partyId: string, token?: string | null) =>
    fetchApi<any>(`/api/kyc/parties/${partyId}/documents`, { token }),
};

// Disputes API (Phase 2)
export const disputesApi = {
  create: (data: {
    dealId: string;
    milestoneId?: string;
    issueType: string;
    narrative: string;
  }, token?: string | null) =>
    fetchApi<any>('/api/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getById: (id: string, token?: string | null) => fetchApi<any>(`/api/disputes/${id}`, { token }),

  listByDeal: (dealId: string, token?: string | null) =>
    fetchApi<any>(`/api/disputes/deal/${dealId}`, { token }),

  listOpen: (token?: string | null) => fetchApi<any>('/api/disputes/open', { token }),

  addMediation: (id: string, note: string, token?: string | null) =>
    fetchApi<any>(`/api/disputes/${id}/mediation`, {
      method: 'POST',
      body: JSON.stringify({ note }),
      token,
    }),

  resolve: (id: string, resolutionNotes: string, token?: string | null) =>
    fetchApi<any>(`/api/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
      token,
    }),
};

// Quarantine API (Phase 2)
export const quarantineApi = {
  listQuarantined: (token?: string | null) => fetchApi<any>('/api/evidence/quarantined', { token }),

  release: (evidenceId: string, releaseNotes?: string, token?: string | null) =>
    fetchApi<any>(`/api/evidence/${evidenceId}/release`, {
      method: 'POST',
      body: JSON.stringify({ releaseNotes }),
      token,
    }),
};

// Generic API client for endpoints not yet migrated to specific API objects
export const apiClient = {
  get: async (endpoint: string, options: { headers?: Record<string, string> } = {}) => {
    // Don't add /api prefix if endpoint already starts with /api or is a direct route
    const url = endpoint.startsWith('/api') ? `${API_BASE_URL}${endpoint}` : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error
      );
    }

    const data = await response.json();
    return { data };
  },

  post: async (endpoint: string, data: any, options: { headers?: Record<string, string> } = {}) => {
    const url = endpoint.startsWith('/api') ? `${API_BASE_URL}${endpoint}` : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
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
  },

  patch: async (endpoint: string, data: any, options: { headers?: Record<string, string> } = {}) => {
    const url = endpoint.startsWith('/api') ? `${API_BASE_URL}${endpoint}` : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
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
  },

  delete: async (endpoint: string, options: { headers?: Record<string, string> } = {}) => {
    const url = endpoint.startsWith('/api') ? `${API_BASE_URL}${endpoint}` : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
  },
};
