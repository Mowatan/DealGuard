/**
 * Invitation Storage Helper
 *
 * Centralized storage management for invitation flow.
 * Handles localStorage/sessionStorage with error handling for private browsing.
 */

export const INVITATION_STORAGE_KEYS = {
  // localStorage keys
  TOKEN: 'pendingInvitation',
  ACTION: 'pendingInvitationAction',
  // sessionStorage keys (more reliable, set during signup/signin)
  SESSION_TOKEN: 'clerkMetadata_pendingInvitation',
  SESSION_ACTION: 'clerkMetadata_pendingInvitationAction',
} as const;

export type InvitationAction = 'accept' | 'decline';

/**
 * Fallback storage for private browsing mode (when storage APIs throw)
 */
let memoryFallback: { token: string; action: InvitationAction } | null = null;

/**
 * Store invitation token and action in localStorage
 * Handles private browsing mode gracefully with memory fallback
 */
export function storeInvitation(token: string, action: InvitationAction): void {
  try {
    localStorage.setItem(INVITATION_STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(INVITATION_STORAGE_KEYS.ACTION, action);
  } catch (error) {
    // Safari private browsing, Firefox private mode, or quota exceeded
    console.warn('localStorage unavailable (private browsing?), using in-memory fallback');
    memoryFallback = { token, action };
  }
}

/**
 * Copy invitation from localStorage to sessionStorage
 * Called during signup/signin for better reliability
 */
export function copyToSessionStorage(): void {
  try {
    const token = localStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN) || memoryFallback?.token;
    const action = localStorage.getItem(INVITATION_STORAGE_KEYS.ACTION) || memoryFallback?.action;

    if (token && action) {
      sessionStorage.setItem(INVITATION_STORAGE_KEYS.SESSION_TOKEN, token);
      sessionStorage.setItem(INVITATION_STORAGE_KEYS.SESSION_ACTION, action);
    }
  } catch (error) {
    console.warn('sessionStorage unavailable, invitation may not persist through signup');
  }
}

/**
 * Get pending invitation from storage (checks sessionStorage first, then localStorage, then memory)
 */
export function getPendingInvitation(): { token: string; action: InvitationAction } | null {
  try {
    // Try sessionStorage first (most reliable)
    let token = sessionStorage.getItem(INVITATION_STORAGE_KEYS.SESSION_TOKEN);
    let action = sessionStorage.getItem(INVITATION_STORAGE_KEYS.SESSION_ACTION);

    // Fallback to localStorage
    if (!token || !action) {
      token = localStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN);
      action = localStorage.getItem(INVITATION_STORAGE_KEYS.ACTION);
    }

    // Fallback to memory
    if (!token || !action) {
      if (memoryFallback) {
        return memoryFallback;
      }
      return null;
    }

    return { token, action: action as InvitationAction };
  } catch (error) {
    // Storage unavailable, try memory fallback
    console.warn('Storage unavailable, checking memory fallback');
    return memoryFallback;
  }
}

/**
 * Clear all invitation data from all storage layers
 */
export function clearInvitation(): void {
  try {
    localStorage.removeItem(INVITATION_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(INVITATION_STORAGE_KEYS.ACTION);
  } catch (error) {
    // Ignore errors when clearing
  }

  try {
    sessionStorage.removeItem(INVITATION_STORAGE_KEYS.SESSION_TOKEN);
    sessionStorage.removeItem(INVITATION_STORAGE_KEYS.SESSION_ACTION);
  } catch (error) {
    // Ignore errors when clearing
  }

  // Clear memory fallback
  memoryFallback = null;
}
