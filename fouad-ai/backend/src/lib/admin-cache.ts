import { prisma } from './prisma';

/**
 * Simple in-memory cache for admin emails
 * Reduces repeated DB queries for admin notifications
 */

interface AdminEmailsCache {
  emails: string[];
  timestamp: number;
}

let adminEmailsCache: AdminEmailsCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get admin emails with caching
 * Cache invalidates after 5 minutes
 *
 * @returns Array of admin email addresses
 */
export async function getAdminEmails(): Promise<string[]> {
  const now = Date.now();

  // Return cached emails if cache is still valid
  if (adminEmailsCache && (now - adminEmailsCache.timestamp) < CACHE_TTL) {
    return adminEmailsCache.emails;
  }

  // Fetch fresh admin emails
  const admins = await prisma.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'SUPER_ADMIN'],
      },
    },
    select: {
      email: true,
    },
  });

  const emails = admins.map(admin => admin.email);

  // Update cache
  adminEmailsCache = {
    emails,
    timestamp: now,
  };

  return emails;
}

/**
 * Invalidate the admin emails cache
 * Call this when admin roles change
 */
export function invalidateAdminCache(): void {
  adminEmailsCache = null;
}
