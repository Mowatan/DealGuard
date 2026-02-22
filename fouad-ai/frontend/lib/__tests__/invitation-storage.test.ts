/**
 * Tests for invitation-storage.ts
 * Critical: Tests private browsing fallback and storage operations
 */

import {
  storeInvitation,
  clearInvitation,
  getPendingInvitation,
  copyToSessionStorage,
} from '../invitation-storage';

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

describe('invitation-storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('storeInvitation', () => {
    it('should store invitation token and action in localStorage', () => {
      storeInvitation('test-token-123', 'accept');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('pendingInvitation', 'test-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pendingInvitationAction', 'accept');
    });

    it('should handle decline action', () => {
      storeInvitation('test-token-456', 'decline');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('pendingInvitation', 'test-token-456');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pendingInvitationAction', 'decline');
    });

    it('should use memory fallback when localStorage throws (private browsing)', () => {
      // Simulate private browsing mode
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => storeInvitation('test-token-789', 'accept')).not.toThrow();

      // Should still be retrievable via memory fallback
      const pending = getPendingInvitation();
      expect(pending).toEqual({ token: 'test-token-789', action: 'accept' });
    });
  });

  describe('getPendingInvitation', () => {
    it('should retrieve invitation from sessionStorage first', () => {
      sessionStorageMock.setItem('clerkMetadata_pendingInvitation', 'session-token');
      sessionStorageMock.setItem('clerkMetadata_pendingInvitationAction', 'accept');

      const result = getPendingInvitation();

      expect(result).toEqual({ token: 'session-token', action: 'accept' });
    });

    it('should fallback to localStorage if sessionStorage is empty', () => {
      localStorageMock.setItem('pendingInvitation', 'local-token');
      localStorageMock.setItem('pendingInvitationAction', 'decline');

      const result = getPendingInvitation();

      expect(result).toEqual({ token: 'local-token', action: 'decline' });
    });

    it('should return null if no invitation stored', () => {
      const result = getPendingInvitation();

      expect(result).toBeNull();
    });

    it('should handle storage exceptions gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('SecurityError');
      });

      // Should not throw, should return null
      expect(() => getPendingInvitation()).not.toThrow();
      expect(getPendingInvitation()).toBeNull();
    });
  });

  describe('clearInvitation', () => {
    it('should clear all storage layers', () => {
      // Set up some data
      localStorageMock.setItem('pendingInvitation', 'token');
      localStorageMock.setItem('pendingInvitationAction', 'accept');
      sessionStorageMock.setItem('clerkMetadata_pendingInvitation', 'token');
      sessionStorageMock.setItem('clerkMetadata_pendingInvitationAction', 'accept');

      clearInvitation();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pendingInvitation');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pendingInvitationAction');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('clerkMetadata_pendingInvitation');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('clerkMetadata_pendingInvitationAction');
    });

    it('should be idempotent (safe to call multiple times)', () => {
      clearInvitation();
      clearInvitation();
      clearInvitation();

      // Should not throw
      expect(getPendingInvitation()).toBeNull();
    });

    it('should handle storage exceptions gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('SecurityError');
      });

      // Should not throw
      expect(() => clearInvitation()).not.toThrow();
    });
  });

  describe('copyToSessionStorage', () => {
    it('should copy from localStorage to sessionStorage', () => {
      localStorageMock.setItem('pendingInvitation', 'copy-token');
      localStorageMock.setItem('pendingInvitationAction', 'accept');

      copyToSessionStorage();

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'clerkMetadata_pendingInvitation',
        'copy-token'
      );
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'clerkMetadata_pendingInvitationAction',
        'accept'
      );
    });

    it('should do nothing if localStorage is empty', () => {
      copyToSessionStorage();

      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});
