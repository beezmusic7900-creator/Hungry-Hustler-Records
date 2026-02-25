import { eq } from 'drizzle-orm';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import * as schema from '../db/schema.js';

/**
 * Extract Bearer token from Authorization header
 */
export function getBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

/**
 * Middleware to check if the current user is an admin using Bearer token
 * Returns the admin status, session info, or null if not authenticated
 */
export async function checkAdminStatus(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ isAdmin: boolean; userId: string } | null> {
  try {
    const token = getBearerToken(request);

    if (!token) {
      app.logger.debug('No Bearer token found in Authorization header');
      return null;
    }

    // Get the current session using Bearer token
    const sessionRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/auth/get-session`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!sessionRes.ok) {
      app.logger.debug('No valid session found for token');
      return null;
    }

    const session = (await sessionRes.json()) as { user?: { id: string } };
    if (!session.user?.id) {
      app.logger.debug('Session user not found');
      return null;
    }

    const userId = session.user.id;

    // Check if user is an admin
    const adminRecords = await app.db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.userId, userId));

    const isAdmin = adminRecords.length > 0 && adminRecords[0].isAdmin;
    app.logger.debug({ userId, isAdmin }, 'Admin status checked');

    return { isAdmin, userId };
  } catch (error) {
    app.logger.error({ err: error }, 'Error checking admin status');
    return null;
  }
}

/**
 * Middleware wrapper for admin-only routes
 * Automatically returns 401 if not authenticated or 403 if not admin
 */
export async function requireAdmin(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ isAdmin: boolean; userId: string } | void> {
  const adminStatus = await checkAdminStatus(app, request, reply);

  if (!adminStatus) {
    app.logger.warn({ path: request.url }, 'Admin access denied: no session');
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  if (!adminStatus.isAdmin) {
    app.logger.warn({ userId: adminStatus.userId, path: request.url }, 'Admin access denied: not admin');
    return reply.status(403).send({ error: 'Forbidden' });
  }

  return adminStatus;
}
