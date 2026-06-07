import { UserRole } from '@prisma/client';
import { authorize, requireAdmin, requireSuperAdmin } from '../authorize';

/**
 * Builds a fake Fastify request/reply pair for exercising the authorize
 * middleware. `reply.code().send()` records the status; a null status means
 * the middleware allowed the request through (never touched reply).
 */
function makeReqReply(role: UserRole | undefined) {
  const state: { status: number | null; payload: any } = { status: null, payload: null };
  const reply: any = {
    code(status: number) {
      state.status = status;
      return reply;
    },
    send(payload: any) {
      state.payload = payload;
      return reply;
    },
  };
  const request: any = role ? { user: { id: 'u1', role } } : {};
  return { request, reply, state };
}

async function run(mw: any, role: UserRole | undefined) {
  const { request, reply, state } = makeReqReply(role);
  await mw(request, reply);
  return state;
}

describe('authorize middleware role hierarchy', () => {
  it('allows ADMIN and SUPER_ADMIN on requireAdmin', async () => {
    expect((await run(requireAdmin, 'ADMIN')).status).toBeNull();
    expect((await run(requireAdmin, 'SUPER_ADMIN')).status).toBeNull();
  });

  it('DENIES SENIOR_ESCROW_OFFICER on requireAdmin (must not reach admin-gated routes)', async () => {
    const state = await run(requireAdmin, 'SENIOR_ESCROW_OFFICER');
    expect(state.status).toBe(403);
  });

  it('denies lower roles on requireAdmin', async () => {
    expect((await run(requireAdmin, 'ESCROW_OFFICER')).status).toBe(403);
    expect((await run(requireAdmin, 'PARTY_USER')).status).toBe(403);
    expect((await run(requireAdmin, 'USER')).status).toBe(403);
  });

  it('only SUPER_ADMIN passes requireSuperAdmin', async () => {
    expect((await run(requireSuperAdmin, 'SUPER_ADMIN')).status).toBeNull();
    expect((await run(requireSuperAdmin, 'ADMIN')).status).toBe(403);
    expect((await run(requireSuperAdmin, 'SENIOR_ESCROW_OFFICER')).status).toBe(403);
  });

  it('admins satisfy a senior-escrow-officer requirement (higher includes lower)', async () => {
    expect((await run(authorize(['SENIOR_ESCROW_OFFICER']), 'ADMIN')).status).toBeNull();
    expect((await run(authorize(['SENIOR_ESCROW_OFFICER']), 'SENIOR_ESCROW_OFFICER')).status).toBeNull();
    expect((await run(authorize(['SENIOR_ESCROW_OFFICER']), 'ESCROW_OFFICER')).status).toBe(403);
  });

  it('returns 401 when no authenticated user is present', async () => {
    expect((await run(requireAdmin, undefined)).status).toBe(401);
  });
});
