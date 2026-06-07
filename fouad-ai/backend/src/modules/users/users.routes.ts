import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';

/**
 * User routes.
 *
 * AUTHENTICATION MODEL: Clerk is the sole authentication provider.
 * Users are provisioned automatically by the `authenticate` middleware on first
 * sight of a valid Clerk token (see middleware/auth.ts).
 *
 * The legacy local email/password endpoints (`POST /register`, `POST /login`)
 * were REMOVED for security:
 *   - `/register` was public and accepted an arbitrary `role` (including
 *     SUPER_ADMIN), allowing trivial privilege escalation.
 *   - `/login` issued a custom JWT signed with JWT_SECRET that the Clerk-based
 *     `authenticate` middleware never verifies, so it was a dead but dangerous
 *     second authentication path.
 *
 * If administrative user/role management is needed, add it as an explicit
 * endpoint guarded by `authenticate` + `requireSuperAdmin` (see middleware/authorize.ts).
 */
export async function usersRoutes(server: FastifyInstance) {
  // Get current user (protected route)
  server.get(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (request) => {
      // User is already attached by authenticate middleware
      return {
        user: request.user,
      };
    }
  );
}
