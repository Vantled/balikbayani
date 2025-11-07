// lib/server/request-context.ts
// Resolve contextual data (user, ip, agent) for API handlers.

import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import type { User } from '@/lib/types';

export interface RequestContext {
  user: User | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const parseIpAddress = (request: NextRequest): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) {
      return ip;
    }
  }
  // @ts-expect-error: NextRequest may expose an experimental `ip` property depending on runtime.
  if (request.ip) {
    // @ts-expect-error covered by fallback above.
    return request.ip as string;
  }
  return null;
};

export const getRequestContext = async (request: NextRequest): Promise<RequestContext> => {
  const token = request.cookies.get('bb_auth_token')?.value;
  let user: User | null = null;

  if (token) {
    try {
      user = await AuthService.validateSession(token);
    } catch (error) {
      console.error('Session validation failed during context resolution:', error);
    }
  }

  return {
    user,
    ipAddress: parseIpAddress(request),
    userAgent: request.headers.get('user-agent'),
  };
};

